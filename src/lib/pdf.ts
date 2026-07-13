import jsPDF from "jspdf";
import type { DuffelOrder } from "./types";
import { formatDate, formatMoney, formatTime } from "./format";

const PAGE_LEFT = 40;
const PAGE_RIGHT = 555;

function baseDoc(title: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Aerion", PAGE_LEFT, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, PAGE_LEFT, 70);
  doc.setDrawColor(200);
  doc.line(PAGE_LEFT, 80, PAGE_RIGHT, 80);
  return doc;
}

export function downloadTicketPdf(order: DuffelOrder) {
  const doc = baseDoc("Electronic Itinerary Receipt");
  let y = 110;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BOOKING REFERENCE", PAGE_LEFT, y);
  doc.setFontSize(18);
  doc.text(order.booking_reference, PAGE_LEFT, y + 20);
  y += 45;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PASSENGERS", PAGE_LEFT, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const p of order.passengers) {
    doc.text(`${p.given_name} ${p.family_name}${p.email ? `  —  ${p.email}` : ""}`, PAGE_LEFT, y);
    y += 14;
  }
  y += 12;

  order.slices.forEach((slice, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const label = order.slices.length > 1 ? (i === 0 ? "Outbound — " : "Return — ") : "";
    doc.text(`${label}${slice.origin.iata_code} → ${slice.destination.iata_code}`, PAGE_LEFT, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    slice.segments.forEach((seg) => {
      doc.text(
        `${seg.marketing_carrier.iata_code ?? ""}${seg.marketing_carrier_flight_number}   ${formatDate(seg.departing_at)}   ` +
          `${formatTime(seg.departing_at)} ${seg.origin.iata_code} → ${formatTime(seg.arriving_at)} ${seg.destination.iata_code}` +
          `${seg.aircraft?.name ? `   ${seg.aircraft.name}` : ""}`,
        PAGE_LEFT,
        y,
      );
      y += 13;
      for (const sp of seg.passengers ?? []) {
        const passenger = order.passengers.find((p) => p.id === sp.passenger_id);
        const seatText = sp.seat?.designator ? `Seat ${sp.seat.designator}` : "Seat not assigned";
        const bagText = sp.baggages?.length
          ? sp.baggages.map((b) => `${b.quantity} ${b.type.replace("_", " ")}`).join(" + ")
          : "";
        doc.text(
          `   ${passenger ? `${passenger.given_name} ${passenger.family_name}` : "Passenger"}: ${seatText}${bagText ? `  ·  ${bagText}` : ""}`,
          PAGE_LEFT,
          y,
        );
        y += 13;
      }
    });
    y += 10;
  });

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "This is an electronic itinerary receipt, not a boarding pass. Check in with the airline before departure.",
    PAGE_LEFT,
    y,
  );

  doc.save(`aerion-eticket-${order.booking_reference}.pdf`);
}

export function downloadInvoicePdf(order: DuffelOrder) {
  const doc = baseDoc("Invoice / Payment Receipt");
  let y = 110;

  doc.setFontSize(10);
  doc.text(`Invoice #: ${order.id}`, PAGE_LEFT, y);
  y += 14;
  doc.text(`Issue date: ${formatDate(order.created_at)}`, PAGE_LEFT, y);
  y += 14;
  doc.text(`Booking reference: ${order.booking_reference}`, PAGE_LEFT, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.text("Bill to", PAGE_LEFT, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  order.passengers.forEach((p) => {
    doc.text(`${p.given_name} ${p.family_name}${p.email ? ` (${p.email})` : ""}`, PAGE_LEFT, y);
    y += 14;
  });
  y += 16;

  const servicesTotal = (order.services ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0);
  const baseFare = Number(order.total_amount) - servicesTotal;

  doc.setFont("helvetica", "bold");
  doc.text("Description", PAGE_LEFT, y);
  doc.text("Amount", PAGE_RIGHT, y, { align: "right" });
  y += 6;
  doc.line(PAGE_LEFT, y, PAGE_RIGHT, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.text("Airfare", PAGE_LEFT, y);
  doc.text(formatMoney(baseFare, order.total_currency), PAGE_RIGHT, y, { align: "right" });
  y += 16;

  for (const s of order.services ?? []) {
    const label =
      s.type === "seat" ? `Seat selection${s.metadata?.designator ? ` (${s.metadata.designator})` : ""}` :
      s.type === "baggage" ? "Extra checked bag" :
      s.type;
    doc.text(label, PAGE_LEFT, y);
    doc.text(formatMoney(s.total_amount, s.total_currency), PAGE_RIGHT, y, { align: "right" });
    y += 16;
  }

  y += 6;
  doc.line(PAGE_LEFT, y, PAGE_RIGHT, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total paid", PAGE_LEFT, y);
  doc.text(formatMoney(order.total_amount, order.total_currency), PAGE_RIGHT, y, { align: "right" });
  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Paid via Duffel test-mode simulated balance — no real payment was processed.", PAGE_LEFT, y);

  doc.save(`aerion-invoice-${order.booking_reference}.pdf`);
}

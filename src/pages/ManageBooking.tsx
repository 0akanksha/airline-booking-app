import { useState } from "react";
import { Download, Receipt, Search } from "lucide-react";
import { findOrderByReference } from "../lib/api";
import type { DuffelOrder } from "../lib/types";
import { formatDate, formatMoney, formatTime } from "../lib/format";
import { downloadInvoicePdf, downloadTicketPdf } from "../lib/pdf";

export default function ManageBooking() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<DuffelOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const found = await findOrderByReference(reference.trim(), email.trim());
    setOrder(found ?? null);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="mb-1 text-2xl font-bold text-navy-950">Manage your booking</h1>
      <p className="mb-6 text-sm text-navy-700/70">Enter your booking reference and email to view it.</p>

      <form onSubmit={handleSearch} className="flex flex-col gap-4 rounded-xl border border-navy-900/10 bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Booking reference</span>
          <input
            required
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="e.g. SYZNR5"
            className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 uppercase tracking-widest focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Email used to book</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-navy-950 px-6 py-2.5 font-bold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Find booking"}
        </button>
      </form>

      {searched && !loading && !order && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          No booking found for that reference and email.
        </p>
      )}

      {order && (
        <div className="mt-6 rounded-xl border border-navy-900/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xl font-extrabold tracking-widest text-navy-950">{order.booking_reference}</p>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">Confirmed</span>
          </div>

          {order.slices.map((slice, i) => (
            <p key={i} className="text-sm text-navy-700/70">
              {slice.origin.iata_code} &rarr; {slice.destination.iata_code} &middot; {formatDate(slice.segments[0].departing_at)}{" "}
              &middot; {formatTime(slice.segments[0].departing_at)}
            </p>
          ))}

          <p className="mt-2 text-sm text-navy-700/70">
            {order.passengers.map((p) => `${p.given_name} ${p.family_name}`).join(", ")}
          </p>
          <p className="mt-2 font-bold text-navy-950">{formatMoney(order.total_amount, order.total_currency)}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => downloadTicketPdf(order)}
              className="flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
            >
              <Download className="h-3.5 w-3.5" /> Download e-ticket
            </button>
            <button
              onClick={() => downloadInvoicePdf(order)}
              className="flex items-center gap-2 rounded-lg border border-navy-900/15 px-4 py-2 text-xs font-bold text-navy-800 transition hover:bg-navy-950/5"
            >
              <Receipt className="h-3.5 w-3.5" /> Download invoice
            </button>
          </div>

          <p className="mt-4 text-xs text-navy-700/50">
            Cancellation isn't available for real-time bookings yet — contact support to change or cancel this trip.
          </p>
        </div>
      )}
    </div>
  );
}

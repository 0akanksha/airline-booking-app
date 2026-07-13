import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, PlaneTakeoff } from "lucide-react";
import type { Booking, Flight } from "../lib/types";
import { getBookingBySession } from "../lib/api";
import { formatDate, formatMoney, formatTime } from "../lib/format";

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 1500;

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [result, setResult] = useState<{ booking: Booking; flight: Flight } | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "timeout" | "missing">(sessionId ? "loading" : "missing");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const found = await getBookingBySession(sessionId!);
        if (cancelled) return;
        if (found) {
          setResult(found);
          setStatus("found");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) setStatus("timeout");
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-semibold text-navy-900">No booking to show</p>
        <p className="mt-1 text-sm text-navy-700/70">
          Look up an existing booking with your reference code and email.
        </p>
        <Link to="/manage" className="mt-4 inline-block font-semibold text-sky-500 underline">
          Manage a booking
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <PlaneTakeoff className="mx-auto h-10 w-10 animate-pulse text-navy-700/40" />
        <p className="mt-4 text-lg font-semibold text-navy-900">Confirming your payment&hellip;</p>
        <p className="mt-1 text-sm text-navy-700/70">This usually takes just a few seconds.</p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-semibold text-navy-900">Payment received — still confirming</p>
        <p className="mt-1 text-sm text-navy-700/70">
          Your payment went through but the booking is taking longer than expected to confirm. If you have your
          receipt email, try looking it up shortly with your reference code.
        </p>
        <Link to="/manage" className="mt-4 inline-block font-semibold text-sky-500 underline">
          Manage a booking
        </Link>
      </div>
    );
  }

  const { booking, flight } = result!;

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold text-navy-950">Booking confirmed</h1>
      <p className="mt-1 text-navy-700/70">A confirmation has been sent to {booking.passengerEmail}.</p>

      <div className="mt-8 rounded-xl border border-navy-900/10 bg-white p-6 text-left">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-navy-900/15 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/60">Booking reference</p>
            <p className="text-2xl font-extrabold tracking-widest text-navy-950">{booking.bookingReference}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
            {booking.status}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <p className="text-lg font-bold text-navy-950">{flight.originCode}</p>
            <p className="text-navy-700/60">{formatTime(flight.departureTime)}</p>
          </div>
          <div className="self-center text-navy-700/40">&rarr;</div>
          <div className="text-right">
            <p className="text-lg font-bold text-navy-950">{flight.destinationCode}</p>
            <p className="text-navy-700/60">{formatTime(flight.arrivalTime)}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-navy-700/70">{formatDate(flight.departureTime)}</p>

        <div className="mt-4 border-t border-navy-900/10 pt-4 text-sm text-navy-700/70">
          <p>
            {booking.passengerName} &middot; {booking.numSeats} {booking.numSeats === 1 ? "seat" : "seats"} &middot;{" "}
            {booking.seatClass}
          </p>
          <p className="mt-1 text-base font-bold text-navy-950">{formatMoney(booking.totalPrice)} paid</p>
        </div>
      </div>

      <Link to="/" className="mt-6 inline-block font-semibold text-sky-500 underline">
        Book another flight
      </Link>
    </div>
  );
}

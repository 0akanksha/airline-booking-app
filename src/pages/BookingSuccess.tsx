import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import type { DuffelOrder } from "../lib/types";
import { formatDate, formatMoney, formatTime } from "../lib/format";

interface LocationState {
  order: DuffelOrder;
  mealPreferences?: string[];
}

export default function BookingSuccess() {
  const location = useLocation();
  const state = location.state as LocationState | null;

  if (!state?.order) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-semibold text-navy-900">No booking to show</p>
        <p className="mt-1 text-sm text-navy-700/70">Look up an existing booking with your reference code and email.</p>
        <Link to="/manage" className="mt-4 inline-block font-semibold text-sky-500 underline">
          Manage a booking
        </Link>
      </div>
    );
  }

  const { order, mealPreferences } = state;

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h1 className="mt-4 text-2xl font-bold text-navy-950">Booking confirmed</h1>
      <p className="mt-1 text-navy-700/70">Confirmed via Duffel test mode — no real payment was made.</p>

      <div className="mt-8 rounded-xl border border-navy-900/10 bg-white p-6 text-left">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-navy-900/15 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/60">Booking reference</p>
            <p className="text-2xl font-extrabold tracking-widest text-navy-950">{order.booking_reference}</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
            Confirmed
          </span>
        </div>

        {order.slices.map((slice, i) => (
          <div key={i} className="mb-4 border-b border-navy-900/10 pb-4 last:mb-0 last:border-0 last:pb-0">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-lg font-bold text-navy-950">{slice.origin.iata_code}</p>
                <p className="text-navy-700/60">{formatTime(slice.segments[0].departing_at)}</p>
              </div>
              <div className="self-center text-navy-700/40">&rarr;</div>
              <div className="text-right">
                <p className="text-lg font-bold text-navy-950">{slice.destination.iata_code}</p>
                <p className="text-navy-700/60">{formatTime(slice.segments[slice.segments.length - 1].arriving_at)}</p>
              </div>
            </div>
            <p className="mt-1 text-sm text-navy-700/70">{formatDate(slice.segments[0].departing_at)}</p>
          </div>
        ))}

        {order.passengers.map((p, i) => {
          const seats = order.slices
            .flatMap((slice) => slice.segments)
            .map((seg) => ({
              route: `${seg.origin.iata_code}→${seg.destination.iata_code}`,
              designator: seg.passengers?.find((sp) => sp.passenger_id === p.id)?.seat?.designator ?? null,
            }))
            .filter((s) => s.designator);

          return (
            <div key={p.id} className="mt-3 border-t border-navy-900/10 pt-3 first:mt-0 first:border-0 first:pt-0">
              <p className="font-semibold text-navy-900">
                {p.given_name} {p.family_name}
              </p>
              {seats.length > 0 && (
                <p className="text-xs text-navy-700/60">
                  Seats: {seats.map((s) => `${s.designator} (${s.route})`).join(", ")}
                </p>
              )}
              {mealPreferences?.[i] && mealPreferences[i] !== "None" && (
                <p className="text-xs text-navy-700/60">Meal preference: {mealPreferences[i]} (demo only — not sent to the airline)</p>
              )}
            </div>
          );
        })}

        <p className="mt-4 border-t border-navy-900/10 pt-4 text-base font-bold text-navy-950">
          {formatMoney(order.total_amount, order.total_currency)} paid (test mode)
        </p>
      </div>

      <Link to="/" className="mt-6 inline-block font-semibold text-sky-500 underline">
        Book another flight
      </Link>
    </div>
  );
}

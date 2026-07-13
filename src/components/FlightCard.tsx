import { Link } from "react-router-dom";
import { PlaneTakeoff } from "lucide-react";
import type { Flight } from "../lib/types";
import { formatDuration, formatMoney, formatTime } from "../lib/format";

export default function FlightCard({ flight }: { flight: Flight }) {
  const lowSeats = flight.seatsAvailable <= 8;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-navy-900/10 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-950/5 text-navy-800 sm:flex">
          <PlaneTakeoff className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-navy-950">{formatTime(flight.departureTime)}</p>
            <p className="text-xs font-semibold text-navy-700/60">{flight.originCode}</p>
          </div>
          <div className="flex flex-col items-center px-1 text-navy-700/50">
            <span className="text-[11px]">{formatDuration(flight.durationMinutes)}</span>
            <div className="h-px w-14 bg-navy-900/15 sm:w-20" />
            <span className="text-[11px]">Nonstop</span>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-navy-950">{formatTime(flight.arrivalTime)}</p>
            <p className="text-xs font-semibold text-navy-700/60">{flight.destinationCode}</p>
          </div>
        </div>
        <div className="hidden border-l border-navy-900/10 pl-6 text-sm text-navy-700/70 md:block">
          <p className="font-semibold text-navy-900">{flight.airline}</p>
          <p>
            {flight.flightNumber} &middot; {flight.aircraft}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
        <div className="text-left sm:text-right">
          <p className="text-2xl font-extrabold text-navy-950">{formatMoney(flight.priceEconomy)}</p>
          <p className={`text-xs font-medium ${lowSeats ? "text-red-600" : "text-navy-700/50"}`}>
            {lowSeats ? `Only ${flight.seatsAvailable} seats left` : "Economy from"}
          </p>
        </div>
        <Link
          to={`/book/${flight.id}`}
          className="shrink-0 rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
        >
          Select
        </Link>
      </div>
    </div>
  );
}

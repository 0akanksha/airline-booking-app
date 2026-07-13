import { useState } from "react";
import { PlaneTakeoff, Radar, Search } from "lucide-react";
import { getLiveFlightStatus } from "../lib/api";
import type { LiveFlightStatus } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-sky-400/15 text-sky-600",
  active: "bg-emerald-50 text-emerald-700",
  landed: "bg-navy-950/5 text-navy-700/70",
  cancelled: "bg-red-50 text-red-700",
  incident: "bg-red-50 text-red-700",
  diverted: "bg-gold-400/20 text-gold-500",
};

function formatLiveTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TrackFlight() {
  const [flightNumber, setFlightNumber] = useState("");
  const [flights, setFlights] = useState<LiveFlightStatus[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFlights(null);
    const result = await getLiveFlightStatus(flightNumber.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFlights(result.flights);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-white">
          <Radar className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-bold text-navy-950">Track a flight</h1>
        <p className="mt-1 text-sm text-navy-700/60">
          Live status for any real-world flight — not limited to Aerion routes.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 rounded-xl border border-navy-900/10 bg-white p-4">
        <input
          required
          value={flightNumber}
          onChange={(e) => setFlightNumber(e.target.value)}
          placeholder="Flight number, e.g. BA283"
          className="flex-1 rounded-lg border border-navy-900/15 px-3 py-2.5 uppercase tracking-wide focus:border-sky-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Track"}
        </button>
      </form>

      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3 py-10 text-navy-700/50">
          <PlaneTakeoff className="h-8 w-8 animate-pulse" />
          <p>Fetching live data&hellip;</p>
        </div>
      )}

      {!loading && error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}

      {!loading &&
        flights?.map((f, i) => (
          <div key={i} className="mt-6 rounded-xl border border-navy-900/10 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/60">
                  {f.airline.name ?? "Unknown airline"}
                </p>
                <p className="text-xl font-extrabold text-navy-950">{f.flight.iata ?? f.flight.number}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  STATUS_STYLES[f.flight_status] ?? "bg-navy-950/5 text-navy-700/70"
                }`}
              >
                {f.flight_status}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-navy-950/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/50">Departure</p>
                <p className="mt-1 text-lg font-bold text-navy-950">{f.departure.iata ?? "—"}</p>
                <p className="text-sm text-navy-700/70">{f.departure.airport ?? "Unknown airport"}</p>
                {(f.departure.terminal || f.departure.gate) && (
                  <p className="mt-1 text-xs text-navy-700/60">
                    {f.departure.terminal && `Terminal ${f.departure.terminal}`}
                    {f.departure.terminal && f.departure.gate && " · "}
                    {f.departure.gate && `Gate ${f.departure.gate}`}
                  </p>
                )}
                <p className="mt-2 text-xs text-navy-700/60">Scheduled: {formatLiveTime(f.departure.scheduled)}</p>
                {f.departure.estimated && (
                  <p className="text-xs text-navy-700/60">Estimated: {formatLiveTime(f.departure.estimated)}</p>
                )}
                {f.departure.actual && <p className="text-xs text-navy-700/60">Actual: {formatLiveTime(f.departure.actual)}</p>}
              </div>

              <div className="rounded-lg bg-navy-950/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/50">Arrival</p>
                <p className="mt-1 text-lg font-bold text-navy-950">{f.arrival.iata ?? "—"}</p>
                <p className="text-sm text-navy-700/70">{f.arrival.airport ?? "Unknown airport"}</p>
                {(f.arrival.terminal || f.arrival.gate) && (
                  <p className="mt-1 text-xs text-navy-700/60">
                    {f.arrival.terminal && `Terminal ${f.arrival.terminal}`}
                    {f.arrival.terminal && f.arrival.gate && " · "}
                    {f.arrival.gate && `Gate ${f.arrival.gate}`}
                  </p>
                )}
                <p className="mt-2 text-xs text-navy-700/60">Scheduled: {formatLiveTime(f.arrival.scheduled)}</p>
                {f.arrival.estimated && (
                  <p className="text-xs text-navy-700/60">Estimated: {formatLiveTime(f.arrival.estimated)}</p>
                )}
                {f.arrival.actual && <p className="text-xs text-navy-700/60">Actual: {formatLiveTime(f.arrival.actual)}</p>}
              </div>
            </div>

            {f.aircraft?.registration && (
              <p className="mt-4 text-xs text-navy-700/50">Aircraft: {f.aircraft.registration}</p>
            )}
          </div>
        ))}
    </div>
  );
}

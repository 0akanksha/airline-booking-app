import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, Users } from "lucide-react";
import { CITIES } from "../lib/cities";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SearchForm() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [date, setDate] = useState(todayISO());
  const [passengers, setPassengers] = useState(1);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ origin, destination, date, passengers: String(passengers) });
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-xl shadow-navy-950/20 md:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] md:items-end md:gap-3 md:p-6"
    >
      <label className="block text-left">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">From</span>
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={swap}
        aria-label="Swap origin and destination"
        className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-navy-900/10 text-navy-700 transition hover:bg-navy-950/5 md:mb-1"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>

      <label className="block text-left">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">To</span>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-left">
        <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
          <CalendarDays className="h-3.5 w-3.5" /> Depart
        </span>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <label className="block text-left">
        <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
          <Users className="h-3.5 w-3.5" /> Passengers
        </span>
        <select
          value={passengers}
          onChange={(e) => setPassengers(Number(e.target.value))}
          className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "passenger" : "passengers"}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 px-6 py-2.5 font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:brightness-105 active:scale-[0.98]"
      >
        Search flights
      </button>
    </form>
  );
}

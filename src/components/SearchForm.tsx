import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CalendarDays, Users } from "lucide-react";
import PlaceAutocomplete from "./PlaceAutocomplete";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type TripType = "oneway" | "roundtrip";

export interface SearchFormInitial {
  origin?: string;
  originLabel?: string;
  destination?: string;
  destinationLabel?: string;
  date?: string;
  returnDate?: string;
  passengers?: number;
  tripType?: TripType;
}

export default function SearchForm({ initial }: { initial?: SearchFormInitial }) {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<TripType>(initial?.tripType ?? "oneway");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [returnDate, setReturnDate] = useState(initial?.returnDate ?? "");
  const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
  const [error, setError] = useState<string | null>(null);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) {
      setError("Pick a suggestion from the dropdown for both From and To.");
      return;
    }
    if (tripType === "roundtrip" && !returnDate) {
      setError("Pick a return date, or switch to one-way.");
      return;
    }
    const params = new URLSearchParams({ origin, destination, date, passengers: String(passengers) });
    if (tripType === "roundtrip") params.set("returnDate", returnDate);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl shadow-navy-950/20 md:p-6"
    >
      <div className="flex gap-2">
        {(["oneway", "roundtrip"] as TripType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTripType(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              tripType === t ? "bg-navy-950 text-white" : "bg-navy-950/5 text-navy-700/60 hover:bg-navy-950/10"
            }`}
          >
            {t === "oneway" ? "One-way" : "Round trip"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
        <PlaceAutocomplete
          label="From"
          placeholder="City, airport, or country"
          initialLabel={initial?.originLabel}
          onSelect={(p) => {
            setOrigin(p.iataCode);
            setError(null);
          }}
        />

        <button
          type="button"
          onClick={swap}
          aria-label="Swap origin and destination"
          className="mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-navy-900/10 text-navy-700 transition hover:bg-navy-950/5 md:mb-1"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <PlaceAutocomplete
          label="To"
          placeholder="City, airport, or country"
          initialLabel={initial?.destinationLabel}
          onSelect={(p) => {
            setDestination(p.iataCode);
            setError(null);
          }}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[140px] flex-1 text-left">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
            <CalendarDays className="h-3.5 w-3.5" /> Depart
          </span>
          <input
            required
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
          />
        </label>

        {tripType === "roundtrip" && (
          <label className="block min-w-[140px] flex-1 text-left">
            <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
              <CalendarDays className="h-3.5 w-3.5" /> Return
            </span>
            <input
              required
              type="date"
              value={returnDate}
              min={date || todayISO()}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-lg border border-navy-900/10 bg-navy-950/5 px-3 py-2.5 font-medium text-navy-900 focus:border-sky-500 focus:outline-none"
            />
          </label>
        )}

        <label className="block min-w-[140px] flex-1 text-left">
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
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

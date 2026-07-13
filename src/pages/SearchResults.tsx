import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PlaneTakeoff, SearchX } from "lucide-react";
import { searchFlights } from "../lib/api";
import type { Flight } from "../lib/types";
import { CITIES } from "../lib/cities";
import FlightCard from "../components/FlightCard";
import SearchForm from "../components/SearchForm";

function cityLabel(code: string) {
  const city = CITIES.find((c) => c.code === code);
  return city ? `${city.name} (${city.code})` : code;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  const origin = searchParams.get("origin") ?? "";
  const destination = searchParams.get("destination") ?? "";
  const date = searchParams.get("date") ?? "";
  const passengers = Number(searchParams.get("passengers") ?? 1);

  useEffect(() => {
    setLoading(true);
    searchFlights({ origin, destination, date, passengers }).then((results) => {
      setFlights(results);
      setLoading(false);
    });
  }, [origin, destination, date, passengers]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <SearchForm />
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-navy-950">
          {cityLabel(origin)} &rarr; {cityLabel(destination)}
        </h2>
        {!loading && <span className="text-sm text-navy-700/60">{flights.length} flights found</span>}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-20 text-navy-700/50">
          <PlaneTakeoff className="h-8 w-8 animate-pulse" />
          <p>Searching flights&hellip;</p>
        </div>
      )}

      {!loading && flights.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-900/15 py-16 text-center text-navy-700/60">
          <SearchX className="h-8 w-8" />
          <p className="font-semibold text-navy-900">No flights match this search</p>
          <p className="text-sm">Try a different date or route.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {flights.map((flight) => (
          <FlightCard key={flight.id} flight={flight} />
        ))}
      </div>
    </div>
  );
}

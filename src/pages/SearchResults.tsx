import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Globe2, SearchX } from "lucide-react";
import { searchFlights } from "../lib/api";
import type { DuffelOfferSummary } from "../lib/types";
import { formatIsoDuration, formatMoney, formatTime } from "../lib/format";
import SearchForm from "../components/SearchForm";

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const [offers, setOffers] = useState<DuffelOfferSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const origin = searchParams.get("origin") ?? "";
  const destination = searchParams.get("destination") ?? "";
  const date = searchParams.get("date") ?? "";
  const returnDate = searchParams.get("returnDate") ?? undefined;
  const passengers = Number(searchParams.get("passengers") ?? 1);

  useEffect(() => {
    setLoading(true);
    setError("");
    searchFlights({ origin, destination, date, returnDate, passengers }).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOffers(result.offers);
    });
  }, [origin, destination, date, returnDate, passengers]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <SearchForm
          initial={{
            origin,
            originLabel: origin,
            destination,
            destinationLabel: destination,
            date,
            returnDate,
            passengers,
            tripType: returnDate ? "roundtrip" : "oneway",
          }}
        />
      </div>

      <div className="mb-5 flex items-center gap-2">
        <Globe2 className="h-5 w-5 text-navy-700/50" />
        <h2 className="text-xl font-bold text-navy-950">
          {origin} &rarr; {destination}
          {returnDate && <span className="text-navy-700/50"> &middot; round trip</span>}
        </h2>
        {!loading && <span className="ml-auto text-sm text-navy-700/60">{offers.length} offers found</span>}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-20 text-navy-700/50">
          <Globe2 className="h-8 w-8 animate-pulse" />
          <p>Fetching live offers&hellip;</p>
        </div>
      )}

      {!loading && error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {!loading && !error && offers.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-navy-900/15 py-16 text-center text-navy-700/60">
          <SearchX className="h-8 w-8" />
          <p className="font-semibold text-navy-900">No offers found for this route/date</p>
          <p className="text-sm">Try a different date, or double-check the route.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex flex-col gap-4 rounded-xl border border-navy-900/10 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/60">{offer.owner.name}</p>
              {offer.slices.map((slice, i) => (
                <div key={i} className="mt-1 flex items-center gap-3">
                  <p className="text-lg font-bold text-navy-950">
                    {formatTime(slice.departingAt ?? "")} {slice.origin} &rarr; {formatTime(slice.arrivingAt ?? "")}{" "}
                    {slice.destination}
                  </p>
                  <span className="text-xs text-navy-700/50">
                    {formatIsoDuration(slice.duration)} &middot;{" "}
                    {slice.stops === 0 ? "Nonstop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
              <p className="text-2xl font-extrabold text-navy-950">{formatMoney(offer.totalAmount, offer.totalCurrency)}</p>
              <Link
                to={`/book/${offer.id}`}
                className="shrink-0 rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
              >
                Select
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

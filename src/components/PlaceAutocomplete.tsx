import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../lib/api";
import type { DuffelPlace } from "../lib/types";

interface PlaceAutocompleteProps {
  label: string;
  placeholder: string;
  initialLabel?: string;
  onSelect: (place: { iataCode: string; label: string }) => void;
}

function formatPlace(p: DuffelPlace) {
  const primary = p.name ?? p.cityName ?? p.iataCode;
  return p.type === "airport" && p.cityName && p.cityName !== p.name ? `${primary}, ${p.cityName}` : primary;
}

export default function PlaceAutocomplete({ label, placeholder, initialLabel, onSelect }: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<DuffelPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const places = await searchPlaces(query);
      setResults(places);
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleSelect(p: DuffelPlace) {
    if (!p.iataCode) return;
    const label = `${formatPlace(p)} (${p.iataCode})`;
    setQuery(label);
    setResults([]);
    setOpen(false);
    onSelect({ iataCode: p.iataCode, label });
  }

  return (
    <label className="relative block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">{label}</span>
      <input
        required
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
      />
      {open && (loading || results.length > 0) && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-navy-900/10 bg-white shadow-lg">
          {loading && <li className="px-3 py-2 text-sm text-navy-700/50">Searching…</li>}
          {!loading &&
            results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(p)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-navy-950/5"
                >
                  <span>
                    <span className="font-medium text-navy-900">{formatPlace(p)}</span>
                    {p.type === "city" && <span className="ml-1.5 text-navy-700/50">City &amp; nearby airports</span>}
                  </span>
                  <span className="shrink-0 rounded bg-navy-950/5 px-1.5 py-0.5 font-mono text-xs text-navy-700/70">
                    {p.iataCode}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </label>
  );
}

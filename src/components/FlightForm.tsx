import { useState } from "react";
import { CITIES } from "../lib/cities";
import type { Flight } from "../lib/types";

export interface FlightFormValues {
  flightNumber: string;
  airline: string;
  originCode: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  seatsTotal: number;
  priceEconomy: number;
  pricePremium: number;
  priceBusiness: number;
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function FlightForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save flight",
}: {
  initial?: Flight;
  onSubmit: (values: FlightFormValues) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<FlightFormValues>({
    flightNumber: initial?.flightNumber ?? "",
    airline: initial?.airline ?? "",
    originCode: initial?.originCode ?? CITIES[0].code,
    destinationCode: initial?.destinationCode ?? CITIES[1].code,
    departureTime: toLocalInput(initial?.departureTime) || toLocalInput(new Date().toISOString()),
    arrivalTime: toLocalInput(initial?.arrivalTime) || toLocalInput(new Date().toISOString()),
    aircraft: initial?.aircraft ?? "Airbus A320",
    seatsTotal: initial?.seatsTotal ?? 150,
    priceEconomy: initial?.priceEconomy ?? 150,
    pricePremium: initial?.pricePremium ?? 240,
    priceBusiness: initial?.priceBusiness ?? 420,
  });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FlightFormValues>(key: K, value: FlightFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({
      ...values,
      departureTime: new Date(values.departureTime).toISOString(),
      arrivalTime: new Date(values.arrivalTime).toISOString(),
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-navy-900/10 bg-white p-6 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Flight number</span>
        <input
          required
          value={values.flightNumber}
          onChange={(e) => set("flightNumber", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Airline</span>
        <input
          required
          value={values.airline}
          onChange={(e) => set("airline", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Origin</span>
        <select
          value={values.originCode}
          onChange={(e) => set("originCode", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Destination</span>
        <select
          value={values.destinationCode}
          onChange={(e) => set("destinationCode", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        >
          {CITIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Departure</span>
        <input
          required
          type="datetime-local"
          value={values.departureTime}
          onChange={(e) => set("departureTime", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Arrival</span>
        <input
          required
          type="datetime-local"
          value={values.arrivalTime}
          onChange={(e) => set("arrivalTime", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Aircraft</span>
        <input
          required
          value={values.aircraft}
          onChange={(e) => set("aircraft", e.target.value)}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Total seats</span>
        <input
          required
          type="number"
          min={1}
          value={values.seatsTotal}
          onChange={(e) => set("seatsTotal", Number(e.target.value))}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Economy $</span>
        <input
          required
          type="number"
          min={0}
          value={values.priceEconomy}
          onChange={(e) => set("priceEconomy", Number(e.target.value))}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Premium $</span>
        <input
          required
          type="number"
          min={0}
          value={values.pricePremium}
          onChange={(e) => set("pricePremium", Number(e.target.value))}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Business $</span>
        <input
          required
          type="number"
          min={0}
          value={values.priceBusiness}
          onChange={(e) => set("priceBusiness", Number(e.target.value))}
          className="w-full rounded-lg border border-navy-900/15 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
      </label>

      <div className="flex gap-3 pt-2 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-navy-900/15 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-navy-950/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

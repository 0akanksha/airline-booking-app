import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlaneTakeoff } from "lucide-react";
import { getFlight, startCheckout } from "../lib/api";
import type { Flight, SeatClass } from "../lib/types";
import { formatDate, formatDuration, formatMoney, formatTime } from "../lib/format";

const SEAT_CLASSES: { key: SeatClass; label: string }[] = [
  { key: "economy", label: "Economy" },
  { key: "premium", label: "Premium" },
  { key: "business", label: "Business" },
];

export default function BookingPage() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [seatClass, setSeatClass] = useState<SeatClass>("economy");
  const [numSeats, setNumSeats] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!flightId) return;
    getFlight(flightId).then((f) => {
      setFlight(f ?? null);
      setLoading(false);
    });
  }, [flightId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-navy-700/50">
        <PlaneTakeoff className="h-8 w-8 animate-pulse" />
        <p>Loading flight&hellip;</p>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-semibold text-navy-900">Flight not found</p>
        <button onClick={() => navigate("/")} className="mt-4 text-sky-500 underline">
          Back to search
        </button>
      </div>
    );
  }

  const priceMap = { economy: flight.priceEconomy, premium: flight.pricePremium, business: flight.priceBusiness };
  const total = priceMap[seatClass] * numSeats;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!flight) return;
    setSubmitting(true);
    const result = await startCheckout({
      flightId: flight.id,
      passengerName: name,
      passengerEmail: email,
      passengerPhone: phone,
      seatClass,
      numSeats,
    });
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-navy-950">Passenger details</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-navy-900/10 bg-white p-6">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Cabin class</span>
            <div className="grid grid-cols-3 gap-2">
              {SEAT_CLASSES.map((sc) => (
                <button
                  type="button"
                  key={sc.key}
                  onClick={() => setSeatClass(sc.key)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                    seatClass === sc.key
                      ? "border-navy-950 bg-navy-950 text-white"
                      : "border-navy-900/15 text-navy-800 hover:border-navy-900/30"
                  }`}
                >
                  {sc.label}
                  <span className="block text-xs font-normal opacity-70">{formatMoney(priceMap[sc.key])}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Passengers</span>
            <select
              value={numSeats}
              onChange={(e) => setNumSeats(Number(e.target.value))}
              className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
            >
              {Array.from({ length: Math.min(6, flight.seatsAvailable) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Full name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As it appears on your ID"
              className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Phone</span>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 px-6 py-3 font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:brightness-105 disabled:opacity-60"
          >
            {submitting ? "Redirecting to payment…" : `Proceed to payment — ${formatMoney(total)}`}
          </button>
        </form>
      </div>

      <aside className="h-fit rounded-xl border border-navy-900/10 bg-white p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">
          {flight.airline} &middot; {flight.flightNumber}
        </p>
        <h2 className="text-lg font-bold text-navy-950">
          {flight.originCode} &rarr; {flight.destinationCode}
        </h2>
        <p className="mt-1 text-sm text-navy-700/70">{formatDate(flight.departureTime)}</p>

        <div className="my-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-lg font-bold text-navy-950">{formatTime(flight.departureTime)}</p>
            <p className="text-navy-700/60">{flight.originCode}</p>
          </div>
          <div className="text-xs text-navy-700/50">{formatDuration(flight.durationMinutes)}</div>
          <div className="text-right">
            <p className="text-lg font-bold text-navy-950">{formatTime(flight.arrivalTime)}</p>
            <p className="text-navy-700/60">{flight.destinationCode}</p>
          </div>
        </div>

        <div className="border-t border-navy-900/10 pt-4">
          <div className="flex justify-between text-sm text-navy-700/70">
            <span>
              {SEAT_CLASSES.find((s) => s.key === seatClass)?.label} &times; {numSeats}
            </span>
            <span>{formatMoney(priceMap[seatClass] * numSeats)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-bold text-navy-950">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

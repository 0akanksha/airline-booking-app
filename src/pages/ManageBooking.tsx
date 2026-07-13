import { useState } from "react";
import { Search, TicketX } from "lucide-react";
import { cancelBooking, findBooking, getFlight } from "../lib/api";
import type { Booking, Flight } from "../lib/types";
import { formatDate, formatMoney, formatTime } from "../lib/format";

export default function ManageBooking() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    const found = await findBooking(reference.trim(), email.trim());
    setBooking(found ?? null);
    if (found) {
      const f = await getFlight(found.flightId);
      setFlight(f ?? null);
    } else {
      setFlight(null);
    }
    setLoading(false);
  }

  async function handleCancel() {
    if (!booking) return;
    setCancelling(true);
    const updated = await cancelBooking(booking.bookingReference, booking.passengerEmail);
    if (updated) setBooking(updated);
    setCancelling(false);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <h1 className="mb-1 text-2xl font-bold text-navy-950">Manage your booking</h1>
      <p className="mb-6 text-sm text-navy-700/70">Enter your booking reference and email to view or cancel it.</p>

      <form onSubmit={handleSearch} className="flex flex-col gap-4 rounded-xl border border-navy-900/10 bg-white p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Booking reference</span>
          <input
            required
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="e.g. 7QX9K2"
            className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 uppercase tracking-widest focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Email used to book</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-navy-950 px-6 py-2.5 font-bold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Find booking"}
        </button>
      </form>

      {searched && !loading && !booking && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          No booking found for that reference and email.
        </p>
      )}

      {booking && flight && (
        <div className="mt-6 rounded-xl border border-navy-900/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xl font-extrabold tracking-widest text-navy-950">{booking.bookingReference}</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                booking.status === "booked" ? "bg-emerald-50 text-emerald-700" : "bg-navy-950/5 text-navy-700/60"
              }`}
            >
              {booking.status}
            </span>
          </div>

          <p className="text-sm text-navy-700/70">
            {flight.originCode} &rarr; {flight.destinationCode} &middot; {formatDate(flight.departureTime)} &middot;{" "}
            {formatTime(flight.departureTime)}
          </p>
          <p className="mt-1 text-sm text-navy-700/70">
            {booking.passengerName} &middot; {booking.numSeats} {booking.numSeats === 1 ? "seat" : "seats"} &middot; {booking.seatClass}
          </p>
          <p className="mt-2 font-bold text-navy-950">{formatMoney(booking.totalPrice)}</p>

          {booking.status === "booked" && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <TicketX className="h-4 w-4" />
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

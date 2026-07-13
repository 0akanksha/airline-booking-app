import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Plus, Trash2 } from "lucide-react";
import { adminCreateFlight, adminDeleteFlight, adminListBookings, adminListFlights, adminUpdateFlight } from "../lib/api";
import type { Booking, Flight } from "../lib/types";
import { CITIES } from "../lib/cities";
import { formatDate, formatMoney, formatTime } from "../lib/format";
import FlightForm, { type FlightFormValues } from "../components/FlightForm";
import { useAuth } from "../contexts/AuthContext";

function cityName(code: string) {
  return CITIES.find((c) => c.code === code)?.name ?? code;
}

function toFlightPayload(values: FlightFormValues) {
  const durationMinutes = Math.max(
    15,
    Math.round((new Date(values.arrivalTime).getTime() - new Date(values.departureTime).getTime()) / 60000),
  );
  return {
    ...values,
    origin: cityName(values.originCode),
    destination: cityName(values.destinationCode),
    durationMinutes,
  };
}

type Tab = "flights" | "bookings";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>("flights");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  async function refresh() {
    const [f, b] = await Promise.all([adminListFlights(), adminListBookings()]);
    setFlights(f);
    setBookings(b);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  async function handleCreate(values: FlightFormValues) {
    await adminCreateFlight(toFlightPayload(values));
    setShowForm(false);
    refresh();
  }

  async function handleUpdate(values: FlightFormValues) {
    if (!editingFlight) return;
    await adminUpdateFlight(editingFlight.id, values);
    setEditingFlight(null);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this flight? This cannot be undone.")) return;
    await adminDeleteFlight(id);
    refresh();
  }

  function flightFor(id: string) {
    return flights.find((f) => f.id === id);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Admin dashboard</h1>
          <p className="text-sm text-navy-700/60">Manage flights and view bookings.</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-navy-900/15 px-4 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-950/5"
        >
          Sign out
        </button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-navy-900/10">
        {(["flights", "bookings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition ${
              tab === t ? "border-navy-950 text-navy-950" : "border-transparent text-navy-700/50 hover:text-navy-800"
            }`}
          >
            {t} {t === "flights" ? `(${flights.length})` : `(${bookings.length})`}
          </button>
        ))}
      </div>

      {tab === "flights" && (
        <div>
          {!showForm && !editingFlight && (
            <button
              onClick={() => setShowForm(true)}
              className="mb-5 flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" /> Add flight
            </button>
          )}

          {showForm && (
            <div className="mb-6">
              <FlightForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Add flight" />
            </div>
          )}

          {editingFlight && (
            <div className="mb-6">
              <FlightForm
                initial={editingFlight}
                onSubmit={handleUpdate}
                onCancel={() => setEditingFlight(null)}
                submitLabel="Save changes"
              />
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-navy-900/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 text-xs uppercase tracking-wide text-navy-700/50">
                <tr>
                  <th className="px-4 py-3">Flight</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Departs</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f.id} className="border-b border-navy-900/5 last:border-0">
                    <td className="px-4 py-3 font-semibold text-navy-950">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-navy-700/40" />
                        {f.flightNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {f.originCode} &rarr; {f.destinationCode}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(f.departureTime)}, {formatTime(f.departureTime)}
                    </td>
                    <td className="px-4 py-3">
                      {f.seatsAvailable}/{f.seatsTotal}
                    </td>
                    <td className="px-4 py-3">{formatMoney(f.priceEconomy)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setShowForm(false);
                          setEditingFlight(f);
                        }}
                        className="mr-3 text-xs font-semibold text-sky-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Delete flight"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {flights.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-navy-700/50">
                      No flights yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "bookings" && (
        <div className="overflow-x-auto rounded-xl border border-navy-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 text-xs uppercase tracking-wide text-navy-700/50">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Flight</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const f = flightFor(b.flightId);
                return (
                  <tr key={b.id} className="border-b border-navy-900/5 last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold text-navy-950">{b.bookingReference}</td>
                    <td className="px-4 py-3">
                      {b.passengerName}
                      <div className="text-xs text-navy-700/50">{b.passengerEmail}</div>
                    </td>
                    <td className="px-4 py-3">{f ? `${f.originCode} → ${f.destinationCode}` : "—"}</td>
                    <td className="px-4 py-3">
                      {b.numSeats} &middot; {b.seatClass}
                    </td>
                    <td className="px-4 py-3">{formatMoney(b.totalPrice)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                          b.status === "booked" ? "bg-emerald-50 text-emerald-700" : "bg-navy-950/5 text-navy-700/50"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-navy-700/50">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

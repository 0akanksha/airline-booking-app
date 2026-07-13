import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Receipt } from "lucide-react";
import { adminListOrders } from "../lib/api";
import type { DuffelOrder } from "../lib/types";
import { formatDate, formatMoney, formatTime } from "../lib/format";
import { downloadInvoicePdf, downloadTicketPdf } from "../lib/pdf";
import { useAuth } from "../contexts/AuthContext";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [orders, setOrders] = useState<DuffelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminListOrders()
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load bookings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/admin/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">Admin dashboard</h1>
          <p className="text-sm text-navy-700/60">Real-time bookings made through Aerion, via Duffel.</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-navy-900/15 px-4 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-950/5"
        >
          Sign out
        </button>
      </div>

      {loading && <p className="text-sm text-navy-700/50">Loading bookings&hellip;</p>}
      {!loading && error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-navy-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 text-xs uppercase tracking-wide text-navy-700/50">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Departs</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Booked</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-navy-950">{o.booking_reference}</td>
                  <td className="px-4 py-3">
                    {o.passengers.map((p) => `${p.given_name} ${p.family_name}`).join(", ")}
                    <div className="text-xs text-navy-700/50">{o.passengers[0]?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {o.slices.map((s) => `${s.origin.iata_code} → ${s.destination.iata_code}`).join(" · ")}
                  </td>
                  <td className="px-4 py-3">
                    {o.slices[0] && formatDate(o.slices[0].segments[0].departing_at)},{" "}
                    {o.slices[0] && formatTime(o.slices[0].segments[0].departing_at)}
                  </td>
                  <td className="px-4 py-3">{formatMoney(o.total_amount, o.total_currency)}</td>
                  <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => downloadTicketPdf(o)}
                        aria-label="Download e-ticket"
                        title="Download e-ticket"
                        className="rounded p-1.5 text-navy-700/60 transition hover:bg-navy-950/5 hover:text-navy-950"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadInvoicePdf(o)}
                        aria-label="Download invoice"
                        title="Download invoice"
                        className="rounded p-1.5 text-navy-700/60 transition hover:bg-navy-950/5 hover:text-navy-950"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-navy-700/50">
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

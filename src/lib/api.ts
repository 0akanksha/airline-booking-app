import type { Booking, Flight, LiveFlightStatus, SearchParams, SeatClass } from "./types";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function searchFlights(params: SearchParams): Promise<Flight[]> {
  const query = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    date: params.date,
    passengers: String(params.passengers),
  });
  return apiFetch<Flight[]>(`/flights/search?${query.toString()}`);
}

export async function getFlight(id: string): Promise<Flight | undefined> {
  try {
    return await apiFetch<Flight>(`/flights/${id}`);
  } catch {
    return undefined;
  }
}

export interface CreateBookingInput {
  flightId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatClass: SeatClass;
  numSeats: number;
}

// Redirects to Stripe Checkout — the booking itself is created by the
// webhook once payment is confirmed, not by this call (see server/routes/webhooks.ts).
export async function startCheckout(
  input: CreateBookingInput,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const { url } = await apiFetch<{ url: string }>("/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not start checkout" };
  }
}

export async function getBookingBySession(sessionId: string): Promise<{ booking: Booking; flight: Flight } | undefined> {
  try {
    return await apiFetch<{ booking: Booking; flight: Flight }>(`/bookings/by-session/${encodeURIComponent(sessionId)}`);
  } catch {
    return undefined;
  }
}

export async function findBooking(reference: string, email: string): Promise<Booking | undefined> {
  try {
    const { booking } = await apiFetch<{ booking: Booking; flight: Flight }>(
      `/bookings/lookup?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`,
    );
    return booking;
  } catch {
    return undefined;
  }
}

export async function cancelBooking(reference: string, email: string): Promise<Booking | undefined> {
  try {
    return await apiFetch<Booking>("/bookings/cancel", {
      method: "POST",
      body: JSON.stringify({ reference, email }),
    });
  } catch {
    return undefined;
  }
}

export async function getLiveFlightStatus(
  flightNumber: string,
): Promise<{ ok: true; flights: LiveFlightStatus[] } | { ok: false; error: string }> {
  try {
    const { flights } = await apiFetch<{ flights: LiveFlightStatus[] }>(
      `/flight-status?flightNumber=${encodeURIComponent(flightNumber)}`,
    );
    return { ok: true, flights };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not fetch flight status" };
  }
}

// --- Admin ---
// Auth itself (login/logout/session) lives in contexts/AuthContext.tsx.

export async function adminListFlights(): Promise<Flight[]> {
  return apiFetch<Flight[]>("/admin/flights");
}

export async function adminListBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>("/admin/bookings");
}

export async function adminCreateFlight(flight: Omit<Flight, "id" | "seatsAvailable" | "status">): Promise<Flight> {
  return apiFetch<Flight>("/admin/flights", { method: "POST", body: JSON.stringify(flight) });
}

export async function adminUpdateFlight(id: string, patch: Partial<Flight>): Promise<Flight | undefined> {
  return apiFetch<Flight>(`/admin/flights/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function adminDeleteFlight(id: string): Promise<void> {
  await apiFetch<void>(`/admin/flights/${id}`, { method: "DELETE" });
}

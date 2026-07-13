import type {
  BaggageServiceOption,
  DuffelOfferDetail,
  DuffelOfferSummary,
  DuffelOrder,
  DuffelPassengerInput,
  DuffelPlace,
  LiveFlightStatus,
  SeatOption,
} from "./types";

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

export async function searchPlaces(query: string): Promise<DuffelPlace[]> {
  if (query.trim().length < 2) return [];
  try {
    const { places } = await apiFetch<{ places: DuffelPlace[] }>(`/duffel/places?query=${encodeURIComponent(query)}`);
    return places;
  } catch {
    return [];
  }
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  passengers: number;
}

export async function searchFlights(
  params: FlightSearchParams,
): Promise<{ ok: true; offers: DuffelOfferSummary[] } | { ok: false; error: string }> {
  try {
    const { offers } = await apiFetch<{ offers: DuffelOfferSummary[] }>("/duffel/search", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { ok: true, offers };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Search failed" };
  }
}

export async function getOfferWithServices(
  offerId: string,
): Promise<{ offer: DuffelOfferDetail; baggageServices: BaggageServiceOption[] } | undefined> {
  try {
    return await apiFetch<{ offer: DuffelOfferDetail; baggageServices: BaggageServiceOption[] }>(
      `/duffel/offers/${encodeURIComponent(offerId)}`,
    );
  } catch {
    return undefined;
  }
}

export async function getSeatOptions(offerId: string): Promise<SeatOption[]> {
  try {
    const { seats } = await apiFetch<{ seats: SeatOption[] }>(`/duffel/offers/${encodeURIComponent(offerId)}/seatmaps`);
    return seats;
  } catch {
    return [];
  }
}

export async function createOrder(
  offerId: string,
  passengers: DuffelPassengerInput[],
  selectedServiceIds: string[],
): Promise<{ ok: true; order: DuffelOrder } | { ok: false; error: string }> {
  try {
    const { order } = await apiFetch<{ order: DuffelOrder }>("/duffel/orders", {
      method: "POST",
      body: JSON.stringify({
        offerId,
        passengers: passengers.map(({ mealPreference: _mealPreference, ...p }) => p),
        selectedServiceIds,
      }),
    });
    return { ok: true, order };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Booking failed" };
  }
}

export async function findOrderByReference(reference: string, email: string): Promise<DuffelOrder | undefined> {
  try {
    const { order } = await apiFetch<{ order: DuffelOrder }>(
      `/duffel/orders/by-reference?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`,
    );
    return order;
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

export async function adminListOrders(): Promise<DuffelOrder[]> {
  const { orders } = await apiFetch<{ orders: DuffelOrder[] }>("/admin/duffel-orders");
  return orders;
}

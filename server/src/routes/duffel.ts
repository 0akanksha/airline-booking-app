import { Router } from "express";
import { duffelFetch } from "../lib/duffel.js";
import type {
  DuffelOffer,
  DuffelOfferRequest,
  DuffelOrder,
  DuffelPlace,
  DuffelSeatMap,
} from "../lib/duffelTypes.js";

export const duffelRouter = Router();
export const duffelAdminRouter = Router();

// Backs the origin/destination autocomplete — Duffel's suggestions endpoint does
// fuzzy matching across airport names, city names, and (loosely) country names,
// so users can type "Tokyo" or "Japan" instead of needing to already know "NRT".
duffelRouter.get("/places", async (req, res) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  if (query.length < 2) return res.json({ places: [] });

  try {
    const places = await duffelFetch<DuffelPlace[]>(`/places/suggestions?query=${encodeURIComponent(query)}`);
    res.json({
      places: places
        .filter((p) => p.iata_code)
        .slice(0, 8)
        .map((p) => ({
          id: p.id,
          type: p.type,
          iataCode: p.iata_code,
          name: p.name,
          cityName: p.city_name,
          countryCode: p.iata_country_code,
        })),
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Place lookup failed" });
  }
});

function simplifyOffer(offer: DuffelOffer) {
  return {
    id: offer.id,
    totalAmount: offer.total_amount,
    totalCurrency: offer.total_currency,
    expiresAt: offer.expires_at,
    owner: { name: offer.owner.name, iataCode: offer.owner.iata_code },
    passengerCount: offer.passengers.length,
    slices: offer.slices.map((slice) => ({
      origin: slice.origin.iata_code,
      originName: slice.origin.name,
      destination: slice.destination.iata_code,
      destinationName: slice.destination.name,
      departingAt: slice.segments[0]?.departing_at ?? null,
      arrivingAt: slice.segments[slice.segments.length - 1]?.arriving_at ?? null,
      duration: slice.duration,
      stops: Math.max(0, slice.segments.length - 1),
    })),
  };
}

duffelRouter.post("/search", async (req, res) => {
  const { origin, destination, date, returnDate, passengers } = req.body;
  if (!origin || !destination || !date) {
    return res.status(400).json({ error: "origin, destination, and date are required" });
  }
  const numPassengers = Math.min(6, Math.max(1, Number(passengers) || 1));

  const slices = [{ origin: String(origin).toUpperCase(), destination: String(destination).toUpperCase(), departure_date: date }];
  if (returnDate) {
    slices.push({ origin: String(destination).toUpperCase(), destination: String(origin).toUpperCase(), departure_date: returnDate });
  }

  try {
    const offerRequest = await duffelFetch<DuffelOfferRequest>("/air/offer_requests?return_offers=true", {
      method: "POST",
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: numPassengers }, () => ({ type: "adult" })),
          cabin_class: "economy",
        },
      }),
    });

    res.json({ offers: offerRequest.offers.map(simplifyOffer) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Search failed" });
  }
});

// Extra checked-baggage ancillaries, simplified for the booking page's baggage
// selector. Not every offer/airline has any — an empty array is normal.
function simplifyBaggageServices(offer: DuffelOffer) {
  return (offer.available_services ?? [])
    .filter((s) => s.type === "baggage")
    .map((s) => ({
      id: s.id,
      passengerId: s.passenger_ids[0],
      amount: s.total_amount,
      currency: s.total_currency,
      maxWeightKg: s.metadata?.maximum_weight_kg ?? null,
    }));
}

duffelRouter.get("/offers/:offerId", async (req, res) => {
  try {
    const offer = await duffelFetch<DuffelOffer>(
      `/air/offers/${req.params.offerId}?return_available_services=true`,
    );
    res.json({ offer, baggageServices: simplifyBaggageServices(offer) });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : "Offer not found — it may have expired" });
  }
});

// Duffel's seat map includes every seat on the aircraft, most of which aren't
// purchasable through the API (no available_services entry) — only the ones
// with a price attached can actually be reserved via order creation, so those
// are the only ones surfaced here.
duffelRouter.get("/offers/:offerId/seatmaps", async (req, res) => {
  try {
    const seatMaps = await duffelFetch<DuffelSeatMap[]>(`/air/seat_maps?offer_id=${req.params.offerId}`);
    const seats: { id: string; designator: string | null; segmentId: string; passengerId: string; amount: string; currency: string }[] = [];

    for (const map of seatMaps) {
      for (const cabin of map.cabins) {
        for (const row of cabin.rows) {
          for (const section of row.sections) {
            for (const element of section.elements) {
              if (element.type !== "seat") continue;
              for (const service of element.available_services ?? []) {
                seats.push({
                  id: service.id,
                  designator: element.designator,
                  segmentId: map.segment_id,
                  passengerId: service.passenger_id,
                  amount: service.total_amount,
                  currency: service.total_currency,
                });
              }
            }
          }
        }
      }
    }

    res.json({ seats });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Seat map lookup failed" });
  }
});

interface PassengerInput {
  title: string;
  gender: string;
  givenName: string;
  familyName: string;
  bornOn: string;
  email: string;
  phoneNumber: string;
}

duffelRouter.post("/orders", async (req, res) => {
  const { offerId, passengers, selectedServiceIds } = req.body as {
    offerId?: string;
    passengers?: PassengerInput[];
    selectedServiceIds?: string[];
  };
  if (!offerId || !Array.isArray(passengers) || passengers.length === 0) {
    return res.status(400).json({ error: "offerId and passengers are required" });
  }
  const serviceIds = Array.isArray(selectedServiceIds) ? selectedServiceIds : [];

  try {
    // Fetch a fresh offer (and seat map) right before booking — Duffel offers
    // and their ancillary services expire quickly, and the passenger IDs to
    // book against live here. Prices are taken from this fresh fetch, never
    // trusted from the client, so the charged total can't be tampered with.
    const [offer, seatMaps] = await Promise.all([
      duffelFetch<DuffelOffer>(`/air/offers/${offerId}?return_available_services=true`),
      duffelFetch<DuffelSeatMap[]>(`/air/seat_maps?offer_id=${offerId}`).catch(() => [] as DuffelSeatMap[]),
    ]);
    if (offer.passengers.length !== passengers.length) {
      return res.status(400).json({ error: "Passenger count does not match this offer" });
    }

    const priceById = new Map<string, number>();
    for (const s of offer.available_services ?? []) priceById.set(s.id, Number(s.total_amount));
    for (const map of seatMaps) {
      for (const cabin of map.cabins) {
        for (const row of cabin.rows) {
          for (const section of row.sections) {
            for (const element of section.elements) {
              for (const service of element.available_services ?? []) {
                priceById.set(service.id, Number(service.total_amount));
              }
            }
          }
        }
      }
    }

    let servicesTotal = 0;
    for (const id of serviceIds) {
      const price = priceById.get(id);
      if (price === undefined) {
        return res.status(400).json({ error: "One or more selected seats or bags are no longer available — please try again" });
      }
      servicesTotal += price;
    }

    const totalAmount = (Number(offer.total_amount) + servicesTotal).toFixed(2);

    const order = await duffelFetch<DuffelOrder>("/air/orders", {
      method: "POST",
      body: JSON.stringify({
        data: {
          selected_offers: [offerId],
          services: serviceIds.map((id) => ({ id, quantity: 1 })),
          // Test-mode only: Duffel test accounts have a simulated balance,
          // so this completes instantly with no real payment step.
          payments: [{ type: "balance", currency: offer.total_currency, amount: totalAmount }],
          passengers: offer.passengers.map((offerPassenger, i) => ({
            id: offerPassenger.id,
            title: passengers[i].title,
            gender: passengers[i].gender,
            given_name: passengers[i].givenName,
            family_name: passengers[i].familyName,
            born_on: passengers[i].bornOn,
            email: passengers[i].email,
            phone_number: passengers[i].phoneNumber,
          })),
        },
      }),
    });

    res.status(201).json({ order });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Booking failed" });
  }
});

// Manage-booking lookup: keyed by the human-readable booking reference (the
// code passengers actually have), scoped by email so one passenger can't look
// up another's order by guessing a reference.
duffelRouter.get("/orders/by-reference", async (req, res) => {
  const { reference, email } = req.query;
  if (typeof reference !== "string" || typeof email !== "string") {
    return res.status(400).json({ error: "reference and email are required" });
  }

  try {
    const orders = await duffelFetch<DuffelOrder[]>(
      `/air/orders?booking_reference=${encodeURIComponent(reference.toUpperCase())}`,
    );
    const order = orders.find((o) => o.passengers.some((p) => p.email?.toLowerCase() === email.toLowerCase()));
    if (!order) return res.status(404).json({ error: "Booking not found" });
    res.json({ order });
  } catch {
    res.status(404).json({ error: "Booking not found" });
  }
});

// Admin-only: every order on the Duffel test account, not scoped to one
// passenger's email (mounted behind requireAuth+requireAdmin in index.ts).
duffelAdminRouter.get("/", async (_req, res) => {
  try {
    const orders = await duffelFetch<DuffelOrder[]>("/air/orders?limit=50");
    res.json({ orders });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Could not list orders" });
  }
});

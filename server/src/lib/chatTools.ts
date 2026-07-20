import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";
import { duffelFetch } from "./duffel.js";
import { simplifyOffer } from "../routes/duffel.js";
import type { DuffelOfferRequest, DuffelOrder, DuffelPlace } from "./duffelTypes.js";

// Tools the support chatbot can call. Kept separate from the Duffel/flight-status
// routers (which serve the booking UI) so the tool schemas and the HTTP request
// shapes can evolve independently, even though both call the same upstream APIs.

export const chatTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_airports",
      description:
        "Resolve a free-text city or airport name (e.g. 'Tokyo' or 'JFK') to IATA airport codes. Call this before search_flights whenever the user gives a city/airport name instead of a 3-letter code.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "City, airport, or country name to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_flights",
      description:
        "Search live flight offers between two airports on a given date. Origin and destination must be 3-letter IATA airport codes — use search_airports first to resolve a city name.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin airport IATA code, e.g. JFK" },
          destination: { type: "string", description: "Destination airport IATA code, e.g. LHR" },
          date: { type: "string", description: "Departure date, YYYY-MM-DD" },
          returnDate: { type: "string", description: "Return date for a round trip, YYYY-MM-DD (omit for one-way)" },
          passengers: { type: "integer", description: "Number of adult passengers (default 1)" },
        },
        required: ["origin", "destination", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_flight_status",
      description: "Look up the real-time status of a specific flight by its flight number (e.g. BA249).",
      parameters: {
        type: "object",
        properties: {
          flightNumber: { type: "string", description: "IATA flight number, e.g. BA249" },
        },
        required: ["flightNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_booking",
      description:
        "Look up an existing booking by its booking reference and the passenger's email address. Both must match what the passenger booked with.",
      parameters: {
        type: "object",
        properties: {
          reference: { type: "string", description: "Booking reference code, e.g. ABC123" },
          email: { type: "string", description: "Passenger email address used at booking time" },
        },
        required: ["reference", "email"],
      },
    },
  },
];

async function searchAirports(query: string) {
  if (query.trim().length < 2) return { places: [] };
  const places = await duffelFetch<DuffelPlace[]>(`/places/suggestions?query=${encodeURIComponent(query)}`);
  return {
    places: places
      .filter((p) => p.iata_code)
      .slice(0, 8)
      .map((p) => ({ iataCode: p.iata_code, name: p.name, cityName: p.city_name, countryCode: p.iata_country_code })),
  };
}

async function searchFlights(input: { origin: string; destination: string; date: string; returnDate?: string; passengers?: number }) {
  const numPassengers = Math.min(6, Math.max(1, Number(input.passengers) || 1));
  const slices = [
    { origin: input.origin.toUpperCase(), destination: input.destination.toUpperCase(), departure_date: input.date },
  ];
  if (input.returnDate) {
    slices.push({ origin: input.destination.toUpperCase(), destination: input.origin.toUpperCase(), departure_date: input.returnDate });
  }

  const offerRequest = await duffelFetch<DuffelOfferRequest>("/air/offer_requests?return_offers=true", {
    method: "POST",
    body: JSON.stringify({
      data: { slices, passengers: Array.from({ length: numPassengers }, () => ({ type: "adult" })), cabin_class: "economy" },
    }),
  });

  // Cap to the 5 cheapest so results stay small enough for the model to reason
  // over and quote back without ballooning the conversation's token usage.
  const offers = offerRequest.offers
    .map(simplifyOffer)
    .sort((a, b) => Number(a.totalAmount) - Number(b.totalAmount))
    .slice(0, 5);

  return { offers };
}

async function checkFlightStatus(flightNumber: string) {
  const url = new URL("http://api.aviationstack.com/v1/flights");
  url.searchParams.set("access_key", process.env.AVIATIONSTACK_API_KEY!);
  url.searchParams.set("flight_iata", flightNumber.trim().toUpperCase());

  const upstream = await fetch(url);
  const body = (await upstream.json()) as { error?: { message?: string }; data?: unknown[] };
  if (body.error) throw new Error(body.error.message ?? "Flight status provider error");
  const flights = body.data ?? [];
  if (flights.length === 0) return { found: false };
  return { found: true, flights };
}

async function findBooking(reference: string, email: string) {
  const orders = await duffelFetch<DuffelOrder[]>(`/air/orders?booking_reference=${encodeURIComponent(reference.toUpperCase())}`);
  const order = orders.find((o) => o.passengers.some((p) => p.email?.toLowerCase() === email.toLowerCase()));
  if (!order) return { found: false };
  return {
    found: true,
    bookingReference: order.booking_reference,
    totalAmount: order.total_amount,
    totalCurrency: order.total_currency,
    slices: order.slices.map((s) => ({
      origin: s.origin.iata_code,
      destination: s.destination.iata_code,
      segments: s.segments.map((seg) => ({
        flightNumber: `${seg.marketing_carrier.iata_code ?? ""}${seg.marketing_carrier_flight_number}`,
        departingAt: seg.departing_at,
        arrivingAt: seg.arriving_at,
      })),
    })),
    passengers: order.passengers.map((p) => `${p.given_name} ${p.family_name}`),
  };
}

// Executes a tool call and always returns a JSON string — tool errors are
// serialized into the result (rather than thrown) so the model can see what
// went wrong and explain it to the user instead of the turn just failing.
export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "search_airports":
        return JSON.stringify(await searchAirports(String(input.query ?? "")));
      case "search_flights":
        return JSON.stringify(
          await searchFlights(
            input as { origin: string; destination: string; date: string; returnDate?: string; passengers?: number },
          ),
        );
      case "check_flight_status":
        return JSON.stringify(await checkFlightStatus(String(input.flightNumber ?? "")));
      case "find_booking":
        return JSON.stringify(await findBooking(String(input.reference ?? ""), String(input.email ?? "")));
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "Tool call failed" });
  }
}

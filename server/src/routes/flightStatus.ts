import { Router } from "express";

export const flightStatusRouter = Router();

// aviationstack's free tier only serves current real-time flight data (no
// historical/future date filtering — that's a paid-plan feature), and its
// free tier is HTTP-only, not HTTPS. Both are fine here since this call is
// server-to-server: the API key never reaches the browser, and there's no
// mixed-content concern because the browser never talks to aviationstack directly.
const AVIATIONSTACK_BASE_URL = "http://api.aviationstack.com/v1/flights";

flightStatusRouter.get("/", async (req, res) => {
  const { flightNumber } = req.query;
  if (typeof flightNumber !== "string" || !flightNumber.trim()) {
    return res.status(400).json({ error: "flightNumber is required" });
  }

  const url = new URL(AVIATIONSTACK_BASE_URL);
  url.searchParams.set("access_key", process.env.AVIATIONSTACK_API_KEY!);
  url.searchParams.set("flight_iata", flightNumber.trim().toUpperCase());

  const upstream = await fetch(url);
  const body = (await upstream.json()) as {
    error?: { message?: string };
    data?: unknown[];
  };

  if (body.error) {
    // aviationstack reports errors with 200 OK and an `error` object.
    return res.status(502).json({ error: body.error.message ?? "Flight data provider error" });
  }

  const flights = body.data ?? [];
  if (flights.length === 0) {
    return res.status(404).json({ error: "No current data for that flight number" });
  }

  res.json({ flights });
});

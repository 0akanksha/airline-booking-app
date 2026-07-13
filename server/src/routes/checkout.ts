import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { flights } from "../db/schema.js";
import { stripe } from "../lib/stripe.js";

export const checkoutRouter = Router();

const SEAT_CLASSES = new Set(["economy", "premium", "business"]);

// Creates a Checkout Session only — it does NOT touch the bookings table.
// The booking row is created by the webhook handler on checkout.session.completed
// (see routes/webhooks.ts), which is also where the atomic seat-decrement happens.
checkoutRouter.post("/", async (req, res) => {
  const { flightId, passengerName, passengerEmail, passengerPhone, seatClass, numSeats } = req.body;

  if (!flightId || !passengerName || !passengerEmail || !passengerPhone || !SEAT_CLASSES.has(seatClass)) {
    return res.status(400).json({ error: "Missing or invalid booking details" });
  }
  const seats = Number(numSeats);
  if (!Number.isInteger(seats) || seats < 1) {
    return res.status(400).json({ error: "Invalid seat count" });
  }

  const [flight] = await db.select().from(flights).where(eq(flights.id, flightId));
  if (!flight) return res.status(404).json({ error: "Flight not found" });
  if (flight.seatsAvailable < seats) {
    return res.status(409).json({ error: "Not enough seats available on this flight" });
  }

  const unitPrice = flight[
    seatClass === "economy" ? "priceEconomy" : seatClass === "premium" ? "pricePremium" : "priceBusiness"
  ] as number;

  const origin = req.headers.origin ?? `${req.protocol}://${req.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(unitPrice * 100),
          product_data: {
            name: `${flight.flightNumber}: ${flight.originCode} → ${flight.destinationCode} (${seatClass})`,
            description: `${flight.airline} · ${new Date(flight.departureTime).toDateString()}`,
          },
        },
        quantity: seats,
      },
    ],
    success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/cancelled`,
    metadata: {
      flightId,
      passengerName,
      passengerEmail,
      passengerPhone,
      seatClass,
      numSeats: String(seats),
    },
  });

  res.json({ url: session.url });
});

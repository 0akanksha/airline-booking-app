import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { bookings, flights } from "../db/schema.js";

export const publicBookingsRouter = Router();
export const adminBookingsRouter = Router();

// No direct "create booking" endpoint: payments are in scope, so every
// booking is created by the Stripe webhook on confirmed payment (see
// routes/checkout.ts and routes/webhooks.ts) — never at request time.

publicBookingsRouter.get("/by-session/:sessionId", async (req, res) => {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.stripeSessionId, req.params.sessionId));

  if (!booking) return res.status(404).json({ error: "Not found yet" });

  const [flight] = await db.select().from(flights).where(eq(flights.id, booking.flightId));
  res.json({ booking, flight });
});

publicBookingsRouter.get("/lookup", async (req, res) => {
  const { reference, email } = req.query;
  if (typeof reference !== "string" || typeof email !== "string") {
    return res.status(400).json({ error: "reference and email are required" });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(sql`upper(${bookings.bookingReference}) = ${reference.toUpperCase()} AND lower(${bookings.passengerEmail}) = ${email.toLowerCase()}`);

  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const [flight] = await db.select().from(flights).where(eq(flights.id, booking.flightId));
  res.json({ booking, flight });
});

publicBookingsRouter.post("/cancel", async (req, res) => {
  const { reference, email } = req.body;
  if (!reference || !email) {
    return res.status(400).json({ error: "reference and email are required" });
  }

  const result = await db.execute(sql`
    WITH cancelled AS (
      UPDATE bookings SET status = 'cancelled'
      WHERE upper(booking_reference) = ${String(reference).toUpperCase()}
        AND lower(passenger_email) = ${String(email).toLowerCase()}
        AND status = 'booked'
      RETURNING id, flight_id, num_seats
    )
    UPDATE flights SET seats_available = seats_available + cancelled.num_seats
    FROM cancelled
    WHERE flights.id = cancelled.flight_id
    RETURNING cancelled.id AS booking_id;
  `);

  if ((result.rows as unknown[]).length === 0) {
    return res.status(404).json({ error: "Booking not found or already cancelled" });
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(sql`upper(${bookings.bookingReference}) = ${String(reference).toUpperCase()}`);
  res.json(booking);
});

adminBookingsRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  res.json(rows);
});

import { Router } from "express";
import express from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { stripe } from "../lib/stripe.js";
import { generateBookingReference } from "../lib/bookingReference.js";

export const webhooksRouter = Router();

// Mounted with express.raw() (not express.json()) so the exact byte payload
// is available for Stripe's signature verification.
webhooksRouter.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"] as string, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send("Invalid signature");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { flightId, passengerName, passengerEmail, passengerPhone, seatClass, numSeats } = session.metadata as Record<
      string,
      string
    >;
    const seats = Number(numSeats);
    const bookingReference = generateBookingReference();

    try {
      // Same atomic seat-decrement-then-insert pattern as the free-booking
      // path, plus a unique stripe_session_id for webhook-retry idempotency.
      const result = await db.execute(sql`
        WITH updated_flight AS (
          UPDATE flights
          SET seats_available = seats_available - ${seats}
          WHERE id = ${flightId} AND seats_available >= ${seats} AND status = 'scheduled'
          RETURNING id
        )
        INSERT INTO bookings (booking_reference, flight_id, passenger_name, passenger_email, passenger_phone, seat_class, num_seats, total_price, stripe_session_id)
        SELECT ${bookingReference}, id, ${passengerName}, ${passengerEmail}, ${passengerPhone}, ${seatClass}, ${seats},
          ${(session.amount_total ?? 0) / 100}, ${session.id}
        FROM updated_flight
        RETURNING id;
      `);

      if ((result.rows as unknown[]).length === 0) {
        // Race lost: seats ran out between checkout start and payment completion.
        if (session.payment_intent) {
          await stripe.refunds.create({ payment_intent: session.payment_intent as string });
        }
      }
    } catch (err) {
      // Duplicate webhook delivery for a session already recorded — no-op.
      // Postgres unique_violation (23505); drizzle-orm's neon-http driver
      // nests the real pg error under `.cause`, not on the thrown error itself.
      const pgCode = (err as { cause?: { code?: string } })?.cause?.code;
      if (pgCode === "23505") {
        return res.json({ received: true });
      }
      throw err;
    }
  }

  res.json({ received: true });
});

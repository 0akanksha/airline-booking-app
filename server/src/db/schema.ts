import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const flights = pgTable("flights", {
  id: uuid("id").primaryKey().defaultRandom(),
  flightNumber: text("flight_number").notNull(),
  airline: text("airline").notNull(),
  origin: text("origin").notNull(),
  originCode: text("origin_code").notNull(),
  destination: text("destination").notNull(),
  destinationCode: text("destination_code").notNull(),
  departureTime: timestamp("departure_time", { withTimezone: true }).notNull(),
  arrivalTime: timestamp("arrival_time", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  aircraft: text("aircraft").notNull(),
  seatsTotal: integer("seats_total").notNull(),
  seatsAvailable: integer("seats_available").notNull(),
  priceEconomy: numeric("price_economy", { precision: 10, scale: 2, mode: "number" }).notNull(),
  pricePremium: numeric("price_premium", { precision: 10, scale: 2, mode: "number" }).notNull(),
  priceBusiness: numeric("price_business", { precision: 10, scale: 2, mode: "number" }).notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'cancelled'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // admin-only accounts (passenger booking is guest)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingReference: text("booking_reference").notNull().unique(),
  flightId: uuid("flight_id")
    .notNull()
    .references(() => flights.id),
  passengerName: text("passenger_name").notNull(),
  passengerEmail: text("passenger_email").notNull(),
  passengerPhone: text("passenger_phone").notNull(),
  seatClass: text("seat_class").notNull(), // 'economy' | 'premium' | 'business'
  numSeats: integer("num_seats").notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  status: text("status").notNull().default("booked"), // 'booked' | 'cancelled'
  stripeSessionId: text("stripe_session_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

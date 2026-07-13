import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Flights and bookings are no longer stored locally — Duffel is the system
// of record for both search results and orders (see routes/duffel.ts).
// `users` remains for admin auth only.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"), // admin-only accounts (passenger booking is guest)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

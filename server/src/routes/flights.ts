import { Router } from "express";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { flights } from "../db/schema.js";

export const publicFlightsRouter = Router();
export const adminFlightsRouter = Router();

publicFlightsRouter.get("/search", async (req, res) => {
  const { origin, destination, date, passengers } = req.query;
  const minSeats = Number(passengers) || 1;

  const conditions = [eq(flights.status, "scheduled"), gte(flights.seatsAvailable, minSeats)];
  if (typeof origin === "string" && origin) conditions.push(eq(flights.originCode, origin));
  if (typeof destination === "string" && destination) conditions.push(eq(flights.destinationCode, destination));

  const rows = await db
    .select()
    .from(flights)
    .where(and(...conditions))
    .orderBy(asc(flights.departureTime));

  const filtered =
    typeof date === "string" && date
      ? rows.filter((f) => f.departureTime.toISOString().slice(0, 10) === date)
      : rows;

  res.json(filtered);
});

publicFlightsRouter.get("/:id", async (req, res) => {
  const [flight] = await db.select().from(flights).where(eq(flights.id, req.params.id));
  if (!flight) return res.status(404).json({ error: "Flight not found" });
  res.json(flight);
});

adminFlightsRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(flights).orderBy(asc(flights.departureTime));
  res.json(rows);
});

adminFlightsRouter.post("/", async (req, res) => {
  const b = req.body;
  const [created] = await db
    .insert(flights)
    .values({
      flightNumber: b.flightNumber,
      airline: b.airline,
      origin: b.origin,
      originCode: b.originCode,
      destination: b.destination,
      destinationCode: b.destinationCode,
      departureTime: new Date(b.departureTime),
      arrivalTime: new Date(b.arrivalTime),
      durationMinutes: b.durationMinutes,
      aircraft: b.aircraft,
      seatsTotal: b.seatsTotal,
      seatsAvailable: b.seatsTotal,
      priceEconomy: Number(b.priceEconomy),
      pricePremium: Number(b.pricePremium),
      priceBusiness: Number(b.priceBusiness),
    })
    .returning();
  res.status(201).json(created);
});

adminFlightsRouter.patch("/:id", async (req, res) => {
  const b = req.body;
  const patch: Record<string, unknown> = {};
  for (const key of [
    "flightNumber",
    "airline",
    "origin",
    "originCode",
    "destination",
    "destinationCode",
    "aircraft",
    "seatsTotal",
    "status",
  ]) {
    if (b[key] !== undefined) patch[key] = b[key];
  }
  if (b.departureTime !== undefined) patch.departureTime = new Date(b.departureTime);
  if (b.arrivalTime !== undefined) patch.arrivalTime = new Date(b.arrivalTime);
  if (b.durationMinutes !== undefined) patch.durationMinutes = b.durationMinutes;
  if (b.priceEconomy !== undefined) patch.priceEconomy = Number(b.priceEconomy);
  if (b.pricePremium !== undefined) patch.pricePremium = Number(b.pricePremium);
  if (b.priceBusiness !== undefined) patch.priceBusiness = Number(b.priceBusiness);

  const [updated] = await db.update(flights).set(patch).where(eq(flights.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ error: "Flight not found" });
  res.json(updated);
});

adminFlightsRouter.delete("/:id", async (req, res) => {
  try {
    await db.delete(flights).where(eq(flights.id, req.params.id));
    res.status(204).end();
  } catch (err) {
    if (err instanceof Error && err.message.includes("foreign key")) {
      return res.status(409).json({ error: "Cannot delete a flight that has bookings" });
    }
    throw err;
  }
});

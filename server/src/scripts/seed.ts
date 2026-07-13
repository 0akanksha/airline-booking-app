import "dotenv/config";
import { db } from "../db/client.js";
import { flights } from "../db/schema.js";

const CITIES = [
  { code: "JFK", name: "New York" },
  { code: "LAX", name: "Los Angeles" },
  { code: "ORD", name: "Chicago" },
  { code: "LHR", name: "London" },
  { code: "CDG", name: "Paris" },
  { code: "DXB", name: "Dubai" },
  { code: "SIN", name: "Singapore" },
  { code: "SFO", name: "San Francisco" },
];

const AIRLINES = ["Aerion Airways", "Vantage Air", "NimbusJet", "Skyline Atlantic"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

async function seed() {
  const rand = seededRandom(42);
  const rows: (typeof flights.$inferInsert)[] = [];
  let counter = 1000;

  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    for (const origin of CITIES) {
      for (const destination of CITIES) {
        if (origin.code === destination.code) continue;
        if (rand() > 0.22) continue;

        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        const depHour = 5 + Math.floor(rand() * 17);
        const depMinute = rand() > 0.5 ? 30 : 0;
        date.setHours(depHour, depMinute, 0, 0);

        const durationMinutes = 90 + Math.floor(rand() * 600);
        const arrival = new Date(date.getTime() + durationMinutes * 60000);

        const seatsTotal = 120 + Math.floor(rand() * 100);
        const seatsBooked = Math.floor(rand() * seatsTotal * 0.7);
        const basePrice = 79 + Math.floor(rand() * 600);

        counter += 1;
        rows.push({
          flightNumber: `${AIRLINES[Math.floor(rand() * AIRLINES.length)].slice(0, 2).toUpperCase()}${100 + (counter % 900)}`,
          airline: AIRLINES[Math.floor(rand() * AIRLINES.length)],
          origin: origin.name,
          originCode: origin.code,
          destination: destination.name,
          destinationCode: destination.code,
          departureTime: date,
          arrivalTime: arrival,
          durationMinutes,
          aircraft: rand() > 0.5 ? "Airbus A320" : "Boeing 787",
          seatsTotal,
          seatsAvailable: seatsTotal - seatsBooked,
          priceEconomy: basePrice,
          pricePremium: Math.round(basePrice * 1.6),
          priceBusiness: Math.round(basePrice * 2.8),
          status: "scheduled",
        });
      }
    }
  }

  await db.insert(flights).values(rows);
  console.log(`Seeded ${rows.length} flights.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

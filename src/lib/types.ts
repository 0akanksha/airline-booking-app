export type SeatClass = "economy" | "premium" | "business";

export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string; // ISO
  arrivalTime: string; // ISO
  durationMinutes: number;
  aircraft: string;
  seatsTotal: number;
  seatsAvailable: number;
  priceEconomy: number;
  pricePremium: number;
  priceBusiness: number;
  status: "scheduled" | "cancelled";
}

export interface Booking {
  id: string;
  bookingReference: string;
  flightId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatClass: SeatClass;
  numSeats: number;
  totalPrice: number;
  status: "booked" | "cancelled";
  createdAt: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
}

export interface LiveFlightEndpoint {
  airport: string | null;
  iata: string | null;
  terminal: string | null;
  gate: string | null;
  delay: number | null;
  scheduled: string | null;
  estimated: string | null;
  actual: string | null;
}

export interface LiveFlightStatus {
  flight_date: string;
  flight_status: "scheduled" | "active" | "landed" | "cancelled" | "incident" | "diverted" | string;
  departure: LiveFlightEndpoint;
  arrival: LiveFlightEndpoint;
  airline: { name: string | null; iata: string | null };
  flight: { number: string | null; iata: string | null };
  aircraft: { registration: string | null; iata: string | null } | null;
}

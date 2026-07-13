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

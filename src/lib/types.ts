// Search results use a simplified, camelCase shape (mapped server-side).
// Offer-detail and order responses are passed through from Duffel mostly
// as-is (snake_case) since the booking/confirmation pages need most of
// their nested fields anyway.

export interface DuffelOfferSummary {
  id: string;
  totalAmount: string;
  totalCurrency: string;
  expiresAt: string;
  owner: { name: string | null; iataCode: string | null };
  passengerCount: number;
  slices: {
    origin: string | null;
    originName: string | null;
    destination: string | null;
    destinationName: string | null;
    departingAt: string | null;
    arrivingAt: string | null;
    duration: string | null;
    stops: number;
  }[];
}

export interface DuffelBaggageAllowance {
  quantity: number;
  type: "checked" | "carry_on" | string;
}

export interface DuffelSegmentPassenger {
  passenger_id: string;
  seat: { designator: string | null } | null;
  baggages: DuffelBaggageAllowance[];
  cabin_class: string;
}

export interface DuffelSegment {
  id: string;
  marketing_carrier: { iata_code: string | null; name: string | null };
  marketing_carrier_flight_number: string;
  aircraft: { name: string | null } | null;
  departing_at: string;
  arriving_at: string;
  origin: { iata_code: string | null; name: string | null };
  destination: { iata_code: string | null; name: string | null };
  passengers?: DuffelSegmentPassenger[];
}

export interface DuffelSlice {
  origin: { iata_code: string | null; name: string | null };
  destination: { iata_code: string | null; name: string | null };
  duration: string | null;
  segments: DuffelSegment[];
}

export interface DuffelAvailableService {
  id: string;
  type: string;
  total_amount: string;
  total_currency: string;
  passenger_ids: string[];
  segment_ids: string[];
  metadata: { maximum_weight_kg?: number | null; type?: string } | null;
}

export interface DuffelOfferDetail {
  id: string;
  total_amount: string;
  total_currency: string;
  expires_at: string;
  owner: { name: string | null; iata_code: string | null };
  slices: DuffelSlice[];
  passengers: { id: string; type: string }[];
  available_services?: DuffelAvailableService[] | null;
}

export interface BaggageServiceOption {
  id: string;
  passengerId: string;
  amount: string;
  currency: string;
  maxWeightKg: number | null;
}

export interface SeatOption {
  id: string;
  designator: string | null;
  segmentId: string;
  passengerId: string;
  amount: string;
  currency: string;
}

export interface DuffelOrderService {
  id: string;
  type: string;
  total_amount: string;
  total_currency: string;
  passenger_ids: string[];
  segment_ids: string[];
  metadata: { designator?: string; maximum_weight_kg?: number | null; type?: string } | null;
}

export interface DuffelOrderPassenger {
  id: string;
  given_name: string;
  family_name: string;
  email: string | null;
}

export interface DuffelOrder {
  id: string;
  booking_reference: string;
  total_amount: string;
  total_currency: string;
  created_at: string;
  owner: { name: string | null; iata_code: string | null };
  slices: DuffelSlice[];
  passengers: DuffelOrderPassenger[];
  services?: DuffelOrderService[] | null;
}

export interface DuffelPassengerInput {
  title: string;
  gender: "m" | "f";
  givenName: string;
  familyName: string;
  bornOn: string;
  email: string;
  phoneNumber: string;
  mealPreference: string;
}

export interface DuffelPlace {
  id: string;
  type: "airport" | "city";
  iataCode: string | null;
  name: string | null;
  cityName: string | null;
  countryCode: string | null;
}

// --- Live flight status (aviationstack) — independent of booking data ---

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

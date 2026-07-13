// Minimal shapes for the Duffel fields this app actually reads — not a full
// mirror of Duffel's API. See https://duffel.com/docs/api for the full schema.

export interface DuffelAirport {
  iata_code: string | null;
  name: string | null;
}

export interface DuffelCarrier {
  iata_code: string | null;
  name: string | null;
}

export interface DuffelSegment {
  marketing_carrier: DuffelCarrier;
  marketing_carrier_flight_number: string;
  aircraft: { name: string | null } | null;
  departing_at: string;
  arriving_at: string;
}

export interface DuffelSlice {
  origin: DuffelAirport;
  destination: DuffelAirport;
  duration: string | null;
  segments: DuffelSegment[];
}

export interface DuffelOfferPassenger {
  id: string;
  type: string;
}

export interface DuffelAvailableService {
  id: string;
  type: string; // "baggage" is the one this app surfaces for purchase
  total_amount: string;
  total_currency: string;
  passenger_ids: string[];
  segment_ids: string[];
  metadata: { maximum_weight_kg?: number | null; type?: string } | null;
}

export interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  expires_at: string;
  owner: DuffelCarrier;
  slices: DuffelSlice[];
  passengers: DuffelOfferPassenger[];
  available_services?: DuffelAvailableService[] | null;
}

export interface DuffelSeatElementService {
  id: string;
  passenger_id: string;
  total_amount: string;
  total_currency: string;
}

export interface DuffelSeatElement {
  type: string; // "seat" is the selectable kind; others are empty/bassinet/etc.
  designator: string | null;
  available_services: DuffelSeatElementService[] | null;
}

export interface DuffelSeatMap {
  segment_id: string;
  cabins: {
    rows: {
      sections: {
        elements: DuffelSeatElement[];
      }[];
    }[];
  }[];
}

export interface DuffelOfferRequest {
  id: string;
  offers: DuffelOffer[];
}

export interface DuffelPlace {
  id: string;
  type: "airport" | "city";
  name: string | null;
  iata_code: string | null;
  iata_country_code: string | null;
  city_name: string | null;
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
  owner: DuffelCarrier;
  slices: DuffelSlice[];
  passengers: DuffelOrderPassenger[];
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Globe2, Luggage } from "lucide-react";
import { createOrder, getOfferWithServices, getSeatOptions } from "../lib/api";
import type { BaggageServiceOption, DuffelOfferDetail, DuffelPassengerInput, SeatOption } from "../lib/types";
import { formatDate, formatIsoDuration, formatMoney, formatTime } from "../lib/format";

const TITLES = ["mr", "mrs", "ms", "miss", "dr"];
const MEAL_OPTIONS = ["None", "Standard", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free"];

function emptyPassenger(): DuffelPassengerInput {
  return {
    title: "mr",
    gender: "m",
    givenName: "",
    familyName: "",
    bornOn: "",
    email: "",
    phoneNumber: "",
    mealPreference: "None",
  };
}

export default function BookingPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<DuffelOfferDetail | null>(null);
  const [baggageServices, setBaggageServices] = useState<BaggageServiceOption[]>([]);
  const [seatOptions, setSeatOptions] = useState<SeatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [passengers, setPassengers] = useState<DuffelPassengerInput[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string>>({}); // `${passengerIdx}:${segmentId}` -> seat service id
  const [selectedBaggage, setSelectedBaggage] = useState<Record<string, boolean>>({}); // baggage service id -> checked

  useEffect(() => {
    if (!offerId) return;
    Promise.all([getOfferWithServices(offerId), getSeatOptions(offerId)]).then(([offerResult, seats]) => {
      if (offerResult) {
        setOffer(offerResult.offer);
        setBaggageServices(offerResult.baggageServices);
        setPassengers(offerResult.offer.passengers.map(() => emptyPassenger()));
      } else {
        setOffer(null);
      }
      setSeatOptions(seats);
      setLoading(false);
    });
  }, [offerId]);

  function updatePassenger(index: number, patch: Partial<DuffelPassengerInput>) {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  const segmentGroups =
    offer?.slices.map((slice, i) => ({
      label: (offer?.slices.length ?? 0) > 1 ? (i === 0 ? "Outbound" : "Return") : "Flight",
      segments: slice.segments,
    })) ?? [];

  function baggageByPassenger(passengerId: string) {
    return baggageServices.filter((b) => b.passengerId === passengerId);
  }

  function seatsFor(passengerId: string, segmentId: string) {
    return seatOptions.filter((s) => s.passengerId === passengerId && s.segmentId === segmentId);
  }

  function includedBaggage(passengerId: string) {
    for (const slice of offer?.slices ?? []) {
      for (const segment of slice.segments) {
        const match = segment.passengers?.find((p) => p.passenger_id === passengerId);
        if (match) return match.baggages;
      }
    }
    return [];
  }

  const extrasTotal =
    Object.values(selectedSeats).reduce((sum, id) => sum + Number(seatOptions.find((s) => s.id === id)?.amount ?? 0), 0) +
    Object.entries(selectedBaggage)
      .filter(([, checked]) => checked)
      .reduce((sum, [id]) => sum + Number(baggageServices.find((b) => b.id === id)?.amount ?? 0), 0);

  const total = offer ? Number(offer.total_amount) + extrasTotal : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offerId) return;
    setError("");
    setSubmitting(true);
    const selectedServiceIds = [
      ...Object.values(selectedSeats),
      ...Object.entries(selectedBaggage).filter(([, checked]) => checked).map(([id]) => id),
    ];
    const result = await createOrder(offerId, passengers, selectedServiceIds);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/booking/success", {
      state: { order: result.order, mealPreferences: passengers.map((p) => p.mealPreference) },
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-navy-700/50">
        <Globe2 className="h-8 w-8 animate-pulse" />
        <p>Loading offer&hellip;</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-lg font-semibold text-navy-900">Offer not found or expired</p>
        <p className="mt-1 text-sm text-navy-700/70">Fares expire quickly — try searching again.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-sky-500 underline">
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold text-navy-950">Passenger details</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {passengers.map((p, i) => {
            const offerPassenger = offer.passengers[i];
            const bags = baggageByPassenger(offerPassenger.id);
            const included = includedBaggage(offerPassenger.id);

            return (
              <fieldset key={i} className="flex flex-col gap-4 rounded-xl border border-navy-900/10 bg-white p-6">
                <legend className="px-1 text-sm font-bold text-navy-950">Passenger {i + 1}</legend>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Title</span>
                    <select
                      value={p.title}
                      onChange={(e) => updatePassenger(i, { title: e.target.value })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    >
                      {TITLES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Gender</span>
                    <select
                      value={p.gender}
                      onChange={(e) => updatePassenger(i, { gender: e.target.value as "m" | "f" })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="m">Male</option>
                      <option value="f">Female</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Date of birth</span>
                    <input
                      required
                      type="date"
                      value={p.bornOn}
                      onChange={(e) => updatePassenger(i, { bornOn: e.target.value })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Given name</span>
                    <input
                      required
                      value={p.givenName}
                      onChange={(e) => updatePassenger(i, { givenName: e.target.value })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Family name</span>
                    <input
                      required
                      value={p.familyName}
                      onChange={(e) => updatePassenger(i, { familyName: e.target.value })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Email</span>
                    <input
                      required
                      type="email"
                      value={p.email}
                      onChange={(e) => updatePassenger(i, { email: e.target.value })}
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-700/60">Phone</span>
                    <input
                      required
                      type="tel"
                      value={p.phoneNumber}
                      onChange={(e) => updatePassenger(i, { phoneNumber: e.target.value })}
                      placeholder="+442080160509"
                      className="w-full rounded-lg border border-navy-900/15 px-3 py-2.5 focus:border-sky-500 focus:outline-none"
                    />
                  </label>
                </div>

                <div className="rounded-lg bg-navy-950/[0.03] p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-700/60">
                    <Luggage className="h-3.5 w-3.5" /> Extras
                  </p>

                  {included.length > 0 && (
                    <p className="mb-3 text-xs text-navy-700/60">
                      Included: {included.map((b) => `${b.quantity} ${b.type.replace("_", " ")}`).join(" + ")}
                    </p>
                  )}

                  <div className="flex flex-col gap-3">
                    {segmentGroups.map((group, gi) =>
                      group.segments.map((segment) => {
                        const options = seatsFor(offerPassenger.id, segment.id);
                        if (options.length === 0) return null;
                        const key = `${i}:${segment.id}`;
                        return (
                          <label key={segment.id} className="block">
                            <span className="mb-1 block text-xs font-semibold text-navy-700/60">
                              Seat &middot; {group.label} ({segment.origin.iata_code} &rarr; {segment.destination.iata_code})
                              {segmentGroups.length === 1 && group.segments.length > 1 ? ` — leg ${gi + 1}` : ""}
                            </span>
                            <select
                              value={selectedSeats[key] ?? ""}
                              onChange={(e) =>
                                setSelectedSeats((prev) => {
                                  const next = { ...prev };
                                  if (e.target.value) next[key] = e.target.value;
                                  else delete next[key];
                                  return next;
                                })
                              }
                              className="w-full rounded-lg border border-navy-900/15 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                            >
                              <option value="">No seat selected</option>
                              {options.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.designator ?? "Seat"} &mdash; {formatMoney(opt.amount, opt.currency)}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }),
                    )}

                    {bags.map((bag, bi) => (
                      <label key={bag.id} className="flex items-center gap-2 text-sm text-navy-800">
                        <input
                          type="checkbox"
                          checked={selectedBaggage[bag.id] ?? false}
                          onChange={(e) => setSelectedBaggage((prev) => ({ ...prev, [bag.id]: e.target.checked }))}
                          className="h-4 w-4 rounded border-navy-900/30"
                        />
                        Add extra checked bag{bags.length > 1 ? ` (leg ${bi + 1})` : ""} &mdash;{" "}
                        {formatMoney(bag.amount, bag.currency)}
                        {bag.maxWeightKg ? ` (up to ${bag.maxWeightKg}kg)` : ""}
                      </label>
                    ))}

                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-navy-700/60">
                        Meal preference <span className="font-normal normal-case text-navy-700/40">(demo only — not sent to the airline)</span>
                      </span>
                      <select
                        value={p.mealPreference}
                        onChange={(e) => updatePassenger(i, { mealPreference: e.target.value })}
                        className="w-full rounded-lg border border-navy-900/15 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                      >
                        {MEAL_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </fieldset>
            );
          })}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gradient-to-r from-gold-500 to-gold-400 px-6 py-3 font-bold text-navy-950 shadow-lg shadow-gold-500/30 transition hover:brightness-105 disabled:opacity-60"
          >
            {submitting ? "Booking (test mode)…" : `Book with test balance — ${formatMoney(total, offer.total_currency)}`}
          </button>
        </form>
      </div>

      <aside className="h-fit rounded-xl border border-navy-900/10 bg-white p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-700/60">{offer.owner.name}</p>
        {offer.slices.map((slice, i) => (
          <div key={i} className="mb-4 border-b border-navy-900/10 pb-4 last:mb-0 last:border-0 last:pb-0">
            <h2 className="text-lg font-bold text-navy-950">
              {slice.origin.iata_code} &rarr; {slice.destination.iata_code}
            </h2>
            <p className="text-sm text-navy-700/70">{formatDate(slice.segments[0].departing_at)}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-navy-950">{formatTime(slice.segments[0].departing_at)}</p>
                <p className="text-navy-700/60">{slice.origin.iata_code}</p>
              </div>
              <div className="text-xs text-navy-700/50">{formatIsoDuration(slice.duration)}</div>
              <div className="text-right">
                <p className="font-bold text-navy-950">{formatTime(slice.segments[slice.segments.length - 1].arriving_at)}</p>
                <p className="text-navy-700/60">{slice.destination.iata_code}</p>
              </div>
            </div>
            {slice.segments.map((seg, j) => (
              <p key={j} className="mt-1 text-xs text-navy-700/50">
                {seg.marketing_carrier.iata_code}
                {seg.marketing_carrier_flight_number} &middot; {seg.aircraft?.name ?? "Aircraft TBD"}
              </p>
            ))}
          </div>
        ))}
        <div className="mt-4 flex justify-between text-sm text-navy-700/70">
          <span>Fare</span>
          <span>{formatMoney(offer.total_amount, offer.total_currency)}</span>
        </div>
        {extrasTotal > 0 && (
          <div className="mt-1 flex justify-between text-sm text-navy-700/70">
            <span>Extras</span>
            <span>{formatMoney(extrasTotal, offer.total_currency)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-navy-900/10 pt-2 text-base font-bold text-navy-950">
          <span>Total</span>
          <span>{formatMoney(total, offer.total_currency)}</span>
        </div>
        <p className="mt-2 text-xs text-navy-700/50">Test mode — paid from Duffel's simulated balance, no real charge.</p>
      </aside>
    </div>
  );
}

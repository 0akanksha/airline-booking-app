const DUFFEL_BASE_URL = "https://api.duffel.com";

interface DuffelErrorBody {
  errors?: { message?: string; title?: string }[];
}

// Thin wrapper, not the official @duffel/api SDK — the surface we need
// (offer requests, offers, orders) is small enough that a direct fetch
// keeps this consistent with the aviationstack integration.
export async function duffelFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DUFFEL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as { data?: T } & DuffelErrorBody;

  if (!res.ok) {
    const message = body.errors?.[0]?.message ?? `Duffel request failed (${res.status})`;
    throw new Error(message);
  }

  return body.data as T;
}

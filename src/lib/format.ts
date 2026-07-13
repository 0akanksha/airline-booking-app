export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatIsoDuration(iso: string | null): string {
  if (!iso) return "—";
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
  if (!match) return iso;
  const h = match[1] ?? "0";
  const m = match[2] ?? "0";
  return `${h}h ${m}m`;
}

export function formatMoney(amount: string | number, currency: string): string {
  const value = Number(amount);
  try {
    return value.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    return `${amount} ${currency}`;
  }
}

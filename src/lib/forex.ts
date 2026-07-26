const API_URL = "https://api.frankfurter.dev";

export type ForexRates = Record<string, number>;

export async function fetchLatestRates(base: string = "INR"): Promise<ForexRates | null> {
  try {
    const res = await fetch(`${API_URL}/latest?from=${base}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates as ForexRates;
  } catch {
    return null;
  }
}

export async function fetchHistoricalRate(
  from: string,
  to: string,
  date: string,
): Promise<number | null> {
  try {
    const res = await fetch(`${API_URL}/${date}?from=${from}&to=${to}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.rates as Record<string, number>)[to] ?? null;
  } catch {
    return null;
  }
}

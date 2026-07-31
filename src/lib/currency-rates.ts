const FALLBACK_RATES: Record<string, number> = {
  USD: 83.50, EUR: 91.20, GBP: 105.80, JPY: 0.56, AUD: 54.30,
  CAD: 61.40, SGD: 62.10, AED: 22.70, SAR: 22.30, CNY: 11.50,
  CHF: 93.80, KRW: 0.062, THB: 2.35, MYR: 17.80, PHP: 1.48,
};

let cachedRates: Record<string, number> | null = null;
let lastFetch = 0;
const CACHE_TTL = 3600000; // 1 hour

export async function getExchangeRates(baseCurrency: string = 'INR'): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - lastFetch < CACHE_TTL) return cachedRates;

  try {
    const apis = [
      `https://open.er-api.com/v6/latest/${baseCurrency}`,
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
    ];

    for (const url of apis) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          cachedRates = data.rates || data;
          lastFetch = Date.now();
          return cachedRates!;
        }
      } catch { continue; }
    }
  } catch {}

  cachedRates = FALLBACK_RATES;
  lastFetch = Date.now();
  return FALLBACK_RATES;
}

export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount;
  const inBase = from === 'INR' ? amount : amount / (rates[from] || 1);
  return to === 'INR' ? inBase : inBase * (rates[to] || 1);
}

export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
];

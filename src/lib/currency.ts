import { CURRENCIES } from "@/lib/currency-rates";

const CURRENCY_MAP = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

export function getCurrencySymbol(code: string): string {
  return CURRENCY_MAP[code.toUpperCase()]?.symbol ?? code;
}

export function getCurrencyName(code: string): string {
  return CURRENCY_MAP[code.toUpperCase()]?.name ?? code;
}

export function formatAmount(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCommonCurrencies() {
  return CURRENCIES;
}

/** Tipo de cambio ARS/USD — fuente Excel Project Cash Flow. */
export const DEFAULT_EXCHANGE_RATE = 1420;

export type DisplayCurrency = "ars" | "usd";

export function arsToUsd(valueArs: number, exchangeRate: number): number {
  if (exchangeRate <= 0) return valueArs;
  return valueArs / exchangeRate;
}

export function convertMonetaryValue(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): number {
  return currency === "usd" ? arsToUsd(valueArs, exchangeRate) : valueArs;
}

export function currencyLabel(currency: DisplayCurrency): string {
  return currency === "usd" ? "USD" : "ARS";
}

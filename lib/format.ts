import type { DisplayCurrency } from "@/lib/cashflow/exchange-rate";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

const coversFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCovers(value: number): string {
  return coversFormatter.format(value);
}

/** Ratio 0–1 → "12.3%" */
export function formatPercent(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Monto en millones para KPIs: 2605 M (ARS) o 1.83 M USD */
export function formatMillions(value: number): string {
  return `${Math.round(value / 1_000_000)} M`;
}

export function formatMillionsForCurrency(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): string {
  if (currency === "usd") {
    return `${compactMoney(valueArs, "usd", exchangeRate).replace("$", "")} USD`.trim();
  }
  return formatMillions(valueArs);
}

/** Formato compacto sin decimales: $238k, $1M, $2M */
export function compactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${Math.round(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/** Compacto según moneda de visualización (valores internos en ARS). */
export function compactMoney(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): string {
  const amount = currency === "usd" ? valueArs / exchangeRate : valueArs;
  return compactCurrency(amount);
}

/** USD nativo (inversión/préstamo) → compacto en ARS o USD. */
export function compactFromUsd(
  valueUsd: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): string {
  const valueArs = valueUsd * exchangeRate;
  return compactMoney(valueArs, currency, exchangeRate);
}

export function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function parseCurrency(value: string): number | null {
  const parsed = Number(value.replace(/\D/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

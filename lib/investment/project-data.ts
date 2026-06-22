/** Estructura de capital — valores en USD (modelo Excel Diego). */
export const TOTAL_INVESTMENT_USD = 563_000;
export const EQUITY_INVESTMENT_USD = 431_000;
export const DEFAULT_LOAN_RATE_ANNUAL = 0.08;

export function loanPrincipalFromStructure(
  totalUsd: number,
  equityUsd: number,
): number {
  return Math.max(0, totalUsd - equityUsd);
}

/** Horizonte alineado al EERR (10 años operativos). */
export const INVESTMENT_HORIZON_YEARS = 10;

/**
 * FFL operativo base (USD) antes de servicio de deuda — fuente Excel Project Cash Flow.
 * Índice 0 = Año 1, … índice 10 = Año 11.
 */
export const BASE_OPERATIONAL_FFL_USD: readonly number[] = [
  106_634,
  188_856,
  188_856,
  188_856,
  188_856,
  188_856,
  188_856,
  188_856,
  188_856,
  188_856,
  184_764,
];

/** NOPAT base (USD) — referencia Excel. */
export const BASE_NOPAT_USD: readonly number[] = [
  128_549,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
  256_261,
];

/** Kwacc esperado por año (ratio 0–1). Año 0 = t=0 para descuento. */
export const BASE_KWACC_SCHEDULE: readonly number[] = [
  0.2281, 0.2216, 0.2151, 0.2086, 0.2021, 0.1956, 0.1891, 0.1826, 0.1761, 0.1696, 0.1631,
];

export const DEFAULT_KWACC_INITIAL = BASE_KWACC_SCHEDULE[0];
export const DEFAULT_KWACC_FINAL = BASE_KWACC_SCHEDULE[BASE_KWACC_SCHEDULE.length - 1];

/** Desglose informativo del proyecto (USD). */
export type InvestmentLine = {
  id: string;
  label: string;
  amount: number;
};

export const PROJECT_INVESTMENT_LINES: InvestmentLine[] = [
  { id: "total-inversion", label: "Total inversión proyecto", amount: 338_799 },
  { id: "capital-trabajo", label: "Capital de trabajo Agosto", amount: 25_000 },
  { id: "contingencia", label: "Contingencia", amount: 30_000 },
  { id: "fondo-comercio", label: "Fondo de comercio", amount: 170_000 },
];

export const PROJECT_INVESTMENT_TOTAL: InvestmentLine = {
  id: "consolidado",
  label: "Consolidado proyecto",
  amount: TOTAL_INVESTMENT_USD,
};

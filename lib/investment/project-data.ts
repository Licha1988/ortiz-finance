/** Costo total del proyecto = inversión + capital de trabajo (USD). */
export const PROJECT_COST_USD = 560_000;

/** Inversión proyecto (sin capital de trabajo). */
export const PROJECT_CAPEX_USD = 530_000;

/** Capital de trabajo Septiembre — se destina al stock NOF al arrancar operaciones. */
export const PROJECT_WORKING_CAPITAL_USD = 30_000;

/** Stock NOF inicial (mismo monto que cap. de trabajo de la inversión). */
export const INITIAL_NOF_STOCK_USD = PROJECT_WORKING_CAPITAL_USD;

/** Equity de inversores (desembolso Año 1). */
export const EQUITY_INVESTMENT_USD = 450_000;

/** Al alcanzar payback del equity inversor, se libera este % a operadores. */
export const OPERATOR_EQUITY_SHARE = 0.3;

/** Préstamo de protección — no se abre a equity. */
export const LOAN_INVESTMENT_USD = 110_000;

/** Fuentes de fondos = equity + préstamo (cash flow y servicio de deuda). */
export const FINANCING_TOTAL_USD = EQUITY_INVESTMENT_USD + LOAN_INVESTMENT_USD;

/** @deprecated Alias de PROJECT_COST_USD — desglose izquierdo. */
export const TOTAL_INVESTMENT_USD = PROJECT_COST_USD;

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

/** Kwacc Año 0–10 — calibrado a hoja Cash Flow del Excel Diego. */
export const BASE_KWACC_SCHEDULE: readonly number[] = [
  0.22808944, 0.17855344, 0.16309744, 0.16309744, 0.16309744,
  0.16309744, 0.16309744, 0.16309744, 0.16309744, 0.16309744, 0.16309744,
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
  { id: "total-inversion", label: "Total inversión proyecto", amount: PROJECT_CAPEX_USD },
  {
    id: "capital-trabajo",
    label: "Capital de trabajo Septiembre",
    amount: PROJECT_WORKING_CAPITAL_USD,
  },
];

export const PROJECT_INVESTMENT_TOTAL: InvestmentLine = {
  id: "consolidado",
  label: "Consolidado proyecto",
  amount: PROJECT_COST_USD,
};

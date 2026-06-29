import { DEFAULT_LOAN_RATE_ANNUAL } from "@/lib/investment/project-data";

/** Parámetros de inversión compartidos entre la pestaña Inversión y el asistente. */
export type InvestmentAssumptions = {
  exchangeRateOverride?: number | null;
  loanRateAnnual: number;
  operatorBonusRatesPct: number[];
  volumeChangePct: number;
  ticketChangePct: number;
  /** Años iniciales sin amortizar capital del préstamo (solo interés). */
  debtRollYears: number;
};

export const DEFAULT_OPERATOR_BONUS_RATES_PCT = [40, 45, 50] as const;

export const DEFAULT_INVESTMENT_ASSUMPTIONS: InvestmentAssumptions = {
  exchangeRateOverride: null,
  loanRateAnnual: DEFAULT_LOAN_RATE_ANNUAL,
  operatorBonusRatesPct: [...DEFAULT_OPERATOR_BONUS_RATES_PCT],
  volumeChangePct: 0,
  ticketChangePct: 0,
  debtRollYears: 0,
};

export const INVESTMENT_ASSUMPTIONS_STORAGE_KEY = "ortiz-finance:investment-assumptions";

export function normalizeInvestmentAssumptions(
  partial?: Partial<InvestmentAssumptions> | null,
): InvestmentAssumptions {
  return {
    exchangeRateOverride: partial?.exchangeRateOverride ?? null,
    loanRateAnnual: partial?.loanRateAnnual ?? DEFAULT_INVESTMENT_ASSUMPTIONS.loanRateAnnual,
    operatorBonusRatesPct:
      partial?.operatorBonusRatesPct ?? [...DEFAULT_INVESTMENT_ASSUMPTIONS.operatorBonusRatesPct],
    volumeChangePct: partial?.volumeChangePct ?? 0,
    ticketChangePct: partial?.ticketChangePct ?? 0,
    debtRollYears: partial?.debtRollYears ?? 0,
  };
}

export function readInvestmentAssumptionsFromSession(): InvestmentAssumptions | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(INVESTMENT_ASSUMPTIONS_STORAGE_KEY);
    if (!raw) return null;
    return normalizeInvestmentAssumptions(JSON.parse(raw) as Partial<InvestmentAssumptions>);
  } catch {
    return null;
  }
}

export function writeInvestmentAssumptionsToSession(assumptions: InvestmentAssumptions): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      INVESTMENT_ASSUMPTIONS_STORAGE_KEY,
      JSON.stringify(normalizeInvestmentAssumptions(assumptions)),
    );
  } catch {
    // sessionStorage puede fallar en modo privado estricto.
  }
}

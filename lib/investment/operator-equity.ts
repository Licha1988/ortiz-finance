import { OPERATOR_EQUITY_SHARE } from "@/lib/investment/project-data";
import type { LoanServiceYear } from "@/lib/investment/loan-service";
import { buildEquityInvestorFlowsYearZero } from "@/lib/investment/loan-service";

export type OperatorEquitySplit = {
  paybackYearIndex: number | null;
  equityReleaseYear: number | null;
  investorDividendsUsd: number[];
  operatorDividendsUsd: number[];
};

/** Primer índice donde el flujo acumulado al inversor (100% repartija) ≥ 0. */
export function findPaybackYearIndex(cashFlows: number[]): number | null {
  let cumulative = 0;
  for (let index = 0; index < cashFlows.length; index += 1) {
    cumulative += cashFlows[index];
    if (cumulative >= 0) return index;
  }
  return null;
}

/** Índice operativo (0 = Año 1) a partir del índice del flujo con Año 0 incluido. */
export function operationalIndexFromPaybackFlowIndex(
  paybackFlowIndex: number | null,
): number | null {
  if (paybackFlowIndex === null || paybackFlowIndex < 1) return null;
  return paybackFlowIndex - 1;
}

/**
 * Hasta payback: 100% de dividendos al inversor.
 * Desde el año de payback: bullet 30% equity operadores; inversor recibe 70%.
 */
export function applyOperatorEquitySplit(
  equityInvestmentUsd: number,
  loanSchedule: LoanServiceYear[],
  operatorShare: number = OPERATOR_EQUITY_SHARE,
): OperatorEquitySplit {
  const prePaybackCashFlows = buildEquityInvestorFlowsYearZero(
    equityInvestmentUsd,
    loanSchedule,
  );
  const paybackFlowIndex = findPaybackYearIndex(prePaybackCashFlows);
  const paybackYearIndex = operationalIndexFromPaybackFlowIndex(paybackFlowIndex);
  const investorShareAfterPayback = 1 - operatorShare;

  const investorDividendsUsd: number[] = [];
  const operatorDividendsUsd: number[] = [];

  loanSchedule.forEach((row, index) => {
    const gross = row.equityFfl;
    const postPayback =
      paybackYearIndex !== null && index >= paybackYearIndex;

    if (postPayback) {
      operatorDividendsUsd.push(gross * operatorShare);
      investorDividendsUsd.push(gross * investorShareAfterPayback);
    } else {
      operatorDividendsUsd.push(0);
      investorDividendsUsd.push(gross);
    }
  });

  return {
    paybackYearIndex,
    equityReleaseYear:
      paybackYearIndex !== null ? loanSchedule[paybackYearIndex]?.year ?? null : null,
    investorDividendsUsd,
    operatorDividendsUsd,
  };
}

/** Año 0: −equity · Años 1…10: dividendos netos al inversor (base TIR/VAN). */
export function buildEquityMetricsFlows(
  equityInvestmentUsd: number,
  investorDividendsUsd: number[],
): number[] {
  return [-equityInvestmentUsd, ...investorDividendsUsd];
}

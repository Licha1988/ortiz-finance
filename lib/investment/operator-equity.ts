import { OPERATOR_EQUITY_SHARE } from "@/lib/investment/project-data";
import type { LoanServiceYear } from "@/lib/investment/loan-service";

export type OperatorEquitySplit = {
  paybackYearIndex: number | null;
  equityReleaseYear: number | null;
  investorDividendsUsd: number[];
  operatorDividendsUsd: number[];
  /** Bono por margen (USD), antes del split equity. */
  operatorBonusUsd: number[];
  /** Parte del split 30% post-payback (sin bono). */
  operatorEquityReleaseUsd: number[];
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
  operatorBonusUsdByYear: number[] = [],
): OperatorEquitySplit {
  const bonusByYear = loanSchedule.map((row, index) => {
    const rawBonus = Math.max(0, operatorBonusUsdByYear[index] ?? 0);
    return Math.min(rawBonus, Math.max(0, row.equityFfl));
  });

  const prePaybackCashFlows = [
    -equityInvestmentUsd,
    ...loanSchedule.map((row, index) => Math.max(0, row.equityFfl - bonusByYear[index]!)),
  ];
  const paybackFlowIndex = findPaybackYearIndex(prePaybackCashFlows);
  const paybackYearIndex = operationalIndexFromPaybackFlowIndex(paybackFlowIndex);
  const investorShareAfterPayback = 1 - operatorShare;

  const investorDividendsUsd: number[] = [];
  const operatorDividendsUsd: number[] = [];
  const operatorBonusUsd: number[] = [];
  const operatorEquityReleaseUsd: number[] = [];

  loanSchedule.forEach((row, index) => {
    const bonus = bonusByYear[index]!;
    const distributable = Math.max(0, row.equityFfl - bonus);
    const postPayback =
      paybackYearIndex !== null && index >= paybackYearIndex;

    const equityReleaseShare = postPayback ? distributable * operatorShare : 0;

    operatorBonusUsd.push(bonus);
    operatorEquityReleaseUsd.push(equityReleaseShare);

    if (postPayback) {
      operatorDividendsUsd.push(bonus + equityReleaseShare);
      investorDividendsUsd.push(distributable * investorShareAfterPayback);
    } else {
      operatorDividendsUsd.push(bonus);
      investorDividendsUsd.push(distributable);
    }
  });

  return {
    paybackYearIndex,
    equityReleaseYear:
      paybackYearIndex !== null ? loanSchedule[paybackYearIndex]?.year ?? null : null,
    investorDividendsUsd,
    operatorDividendsUsd,
    operatorBonusUsd,
    operatorEquityReleaseUsd,
  };
}

/** Año 0: −equity · Años 1…10: dividendos netos al inversor (base TIR/VAN). */
export function buildEquityMetricsFlows(
  equityInvestmentUsd: number,
  investorDividendsUsd: number[],
): number[] {
  return [-equityInvestmentUsd, ...investorDividendsUsd];
}

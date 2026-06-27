import {
  BASE_KWACC_SCHEDULE,
  INVESTMENT_HORIZON_YEARS,
} from "@/lib/investment/project-data";
import type { BusinessYearFlow } from "@/lib/investment/eerr-operational-flows";
import {
  applyOperatorEquitySplit,
  buildEquityMetricsFlows,
} from "@/lib/investment/operator-equity";
import {
  buildEquityInvestorFlowsYearZero,
  computeLoanServiceSchedule,
  type LoanServiceYear,
} from "@/lib/investment/loan-service";
import {
  buildKwaccSchedule,
  computeIrr,
  computePaybackYears,
} from "@/lib/investment/returns";

export type InvestmentModelParams = {
  equityUsd: number;
  totalInvestmentUsd: number;
  loanRateAnnual: number;
  kwaccInitial: number;
  kwaccFinal: number;
  /** Kwacc Años 1–10 (fallback si no hay schedule completo). */
  kwaccSchedule?: number[];
  /** Kwacc Año 0–10 desde Excel. */
  kwaccScheduleFull?: number[];
};

export type InvestorCashflowYear = LoanServiceYear &
  BusinessYearFlow & {
    presentValueUsd: number;
    kwacc: number;
    investorDividendUsd: number;
    operatorDividendUsd: number;
    equityReleaseMilestone: boolean;
  };

export type InvestorCashflowResult = {
  loanPrincipal: number;
  years: InvestorCashflowYear[];
  /** Año 0: −equity · Años 1–10: dividendos netos (TIR). */
  equityMetricsFlows: number[];
  /** Año 0 + Años 1–10: flujos descontados (VAN por columna). */
  vanPresentValues: number[];
  investorDividendsUsd: number[];
  operatorDividendsUsd: number[];
  equityReleaseYear: number | null;
  discountRates: number[];
  npv: number;
  irr: number | null;
  paybackYears: number | null;
};

function resolveKwaccFullSchedule(
  params: InvestmentModelParams,
  horizon: number,
): number[] {
  if (params.kwaccScheduleFull && params.kwaccScheduleFull.length >= horizon + 1) {
    return params.kwaccScheduleFull.slice(0, horizon + 1);
  }
  if (params.kwaccSchedule && params.kwaccSchedule.length > 0) {
    return [params.kwaccInitial, ...params.kwaccSchedule.slice(0, horizon)];
  }
  return buildKwaccSchedule(horizon, params.kwaccInitial, params.kwaccFinal).slice(
    0,
    horizon + 1,
  );
}

function presentValueAtPeriod(cashFlow: number, rate: number, period: number): number {
  if (period <= 0) return cashFlow;
  return cashFlow / Math.pow(1 + rate, period);
}

export function buildInvestorCashflow(
  params: InvestmentModelParams,
  businessFlows: BusinessYearFlow[],
): InvestorCashflowResult {
  const loanPrincipal = Math.max(0, params.totalInvestmentUsd - params.equityUsd);
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, businessFlows.length);

  const operationalFfl = businessFlows
    .slice(0, horizon)
    .map((flow) => flow.operationalFflUsd);

  const loanSchedule = computeLoanServiceSchedule(
    loanPrincipal,
    params.loanRateAnnual,
    operationalFfl,
  );

  const prePaybackCashFlows = buildEquityInvestorFlowsYearZero(
    params.equityUsd,
    loanSchedule,
  );
  const split = applyOperatorEquitySplit(params.equityUsd, loanSchedule);
  const equityMetricsFlows = buildEquityMetricsFlows(
    params.equityUsd,
    split.investorDividendsUsd,
  );

  const kwaccFull = resolveKwaccFullSchedule(params, horizon);
  const kwaccByYear = kwaccFull.slice(1, horizon + 1);

  const vanPresentValues = equityMetricsFlows.map((cashFlow, index) =>
    presentValueAtPeriod(
      cashFlow,
      kwaccFull[index] ?? kwaccFull[kwaccFull.length - 1] ?? 0,
      index,
    ),
  );
  const vanTotalUsd = vanPresentValues.reduce((sum, value) => sum + value, 0);

  const years: InvestorCashflowYear[] = loanSchedule.map((row, index) => {
    const business = businessFlows[index];
    const kwacc = kwaccByYear[index] ?? params.kwaccFinal;
    const investorDividend = split.investorDividendsUsd[index] ?? 0;
    return {
      ...business,
      ...row,
      repartijaUsd: row.equityFfl,
      investorDividendUsd: investorDividend,
      operatorDividendUsd: split.operatorDividendsUsd[index] ?? 0,
      equityReleaseMilestone: split.paybackYearIndex === index,
      kwacc,
      presentValueUsd: vanPresentValues[index + 1] ?? 0,
    };
  });

  return {
    loanPrincipal,
    years,
    equityMetricsFlows,
    vanPresentValues,
    investorDividendsUsd: split.investorDividendsUsd,
    operatorDividendsUsd: split.operatorDividendsUsd,
    equityReleaseYear: split.equityReleaseYear,
    discountRates: kwaccByYear,
    npv: vanTotalUsd,
    irr: computeIrr(equityMetricsFlows, 0.15, 0),
    paybackYears: computePaybackYears(prePaybackCashFlows, 0),
  };
}

export { BASE_KWACC_SCHEDULE };

import {
  BASE_KWACC_SCHEDULE,
  INVESTMENT_HORIZON_YEARS,
} from "@/lib/investment/project-data";
import type { BusinessYearFlow } from "@/lib/investment/eerr-operational-flows";
import {
  computeOperatorBonusSchedule,
  type OperatorBonusTier,
  type OperatorBonusYearResult,
} from "@/lib/investment/operator-margin-bonus";
import {
  applyOperatorEquitySplit,
  buildEquityMetricsFlows,
} from "@/lib/investment/operator-equity";
import {
  computeLoanServiceSchedule,
  type LoanServiceYear,
} from "@/lib/investment/loan-service";
import { OPERATOR_EQUITY_SHARE } from "@/lib/investment/project-data";
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

export type InvestorCashflowOptions = {
  operatorBonusTiers?: OperatorBonusTier[];
  exchangeRatesByYear?: number[];
};

export type InvestorCashflowYear = LoanServiceYear &
  BusinessYearFlow & {
    presentValueUsd: number;
    kwacc: number;
    investorDividendUsd: number;
    operatorDividendUsd: number;
    operatorBonusUsd: number;
    operatorEquityReleaseUsd: number;
    operationalMarginPct: number;
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
  operatorBonusUsd: number[];
  operatorEquityReleaseUsd: number[];
  operatorBonusSchedule: OperatorBonusYearResult[];
  totalOperatorBonusUsd: number;
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
  options: InvestorCashflowOptions = {},
): InvestorCashflowResult {
  const loanPrincipal = Math.max(0, params.totalInvestmentUsd - params.equityUsd);
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, businessFlows.length);
  const flowsSlice = businessFlows.slice(0, horizon);

  const operationalFfl = flowsSlice.map((flow) => flow.operationalFflUsd);

  const loanSchedule = computeLoanServiceSchedule(
    loanPrincipal,
    params.loanRateAnnual,
    operationalFfl,
  );

  const exchangeRatesByYear =
    options.exchangeRatesByYear ??
    flowsSlice.map(() => 1);

  const operatorBonusSchedule =
    options.operatorBonusTiers != null
      ? computeOperatorBonusSchedule(
          flowsSlice,
          options.operatorBonusTiers,
          exchangeRatesByYear,
        )
      : flowsSlice.map((flow) => ({
          yearSalesArs: flow.ventasArs,
          ebitdaArs: flow.ebitdaArs,
          operationalMarginPct: flow.ventasArs > 0 ? (flow.ebitdaArs / flow.ventasArs) * 100 : 0,
          bonusArs: 0,
          bonusUsd: 0,
          bands: [],
        }));

  const operatorBonusUsdByYear = operatorBonusSchedule.map((row) => row.bonusUsd);

  const split = applyOperatorEquitySplit(
    params.equityUsd,
    loanSchedule,
    OPERATOR_EQUITY_SHARE,
    operatorBonusUsdByYear,
  );

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
    const business = businessFlows[index]!;
    const bonusRow = operatorBonusSchedule[index];
    const kwacc = kwaccByYear[index] ?? params.kwaccFinal;
    const investorDividend = split.investorDividendsUsd[index] ?? 0;
    return {
      ...business,
      ...row,
      repartijaUsd: row.equityFfl,
      investorDividendUsd: investorDividend,
      operatorDividendUsd: split.operatorDividendsUsd[index] ?? 0,
      operatorBonusUsd: split.operatorBonusUsd[index] ?? 0,
      operatorEquityReleaseUsd: split.operatorEquityReleaseUsd[index] ?? 0,
      operationalMarginPct: bonusRow?.operationalMarginPct ?? 0,
      equityReleaseMilestone: split.paybackYearIndex === index,
      kwacc,
      presentValueUsd: vanPresentValues[index + 1] ?? 0,
    };
  });

  const totalOperatorBonusUsd = split.operatorBonusUsd.reduce((sum, value) => sum + value, 0);

  return {
    loanPrincipal,
    years,
    equityMetricsFlows,
    vanPresentValues,
    investorDividendsUsd: split.investorDividendsUsd,
    operatorDividendsUsd: split.operatorDividendsUsd,
    operatorBonusUsd: split.operatorBonusUsd,
    operatorEquityReleaseUsd: split.operatorEquityReleaseUsd,
    operatorBonusSchedule,
    totalOperatorBonusUsd,
    equityReleaseYear: split.equityReleaseYear,
    discountRates: kwaccByYear,
    npv: vanTotalUsd,
    irr: computeIrr(equityMetricsFlows, 0.15, 0),
    paybackYears: computePaybackYears(equityMetricsFlows, 0),
  };
}

export { BASE_KWACC_SCHEDULE };

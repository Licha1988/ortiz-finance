import {
  BASE_KWACC_SCHEDULE,
  INVESTMENT_HORIZON_YEARS,
} from "@/lib/investment/project-data";
import type { BusinessYearFlow } from "@/lib/investment/eerr-operational-flows";
import {
  computeLoanServiceSchedule,
  equityCashFlows,
  type LoanServiceYear,
} from "@/lib/investment/loan-service";
import {
  buildKwaccSchedule,
  computeIrr,
  computeNpv,
  computePaybackYears,
} from "@/lib/investment/returns";

export type InvestmentModelParams = {
  equityUsd: number;
  totalInvestmentUsd: number;
  loanRateAnnual: number;
  kwaccInitial: number;
  kwaccFinal: number;
};

export type InvestorCashflowYear = LoanServiceYear &
  BusinessYearFlow & {
    presentValue: number;
    kwacc: number;
  };

export type InvestorCashflowResult = {
  loanPrincipal: number;
  years: InvestorCashflowYear[];
  equityCashFlows: number[];
  discountRates: number[];
  npv: number;
  irr: number | null;
  paybackYears: number | null;
};

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

  const equityFlows = equityCashFlows(params.equityUsd, loanSchedule);

  const kwaccByYear = buildKwaccSchedule(horizon, params.kwaccInitial, params.kwaccFinal);
  const discountRates = [0, ...kwaccByYear.slice(0, horizon)];

  const years: InvestorCashflowYear[] = loanSchedule.map((row, index) => {
    const business = businessFlows[index];
    const period = index + 1;
    const kwacc = kwaccByYear[index] ?? params.kwaccFinal;
    const discountFactor = Math.pow(1 + kwacc, period);
    return {
      ...business,
      ...row,
      repartijaUsd: row.equityFfl,
      kwacc,
      presentValue: row.equityFfl / discountFactor,
    };
  });

  return {
    loanPrincipal,
    years,
    equityCashFlows: equityFlows,
    discountRates,
    npv: computeNpv(equityFlows, discountRates),
    irr: computeIrr(equityFlows),
    paybackYears: computePaybackYears(equityFlows),
  };
}

export { BASE_KWACC_SCHEDULE };

import { DEFAULT_EXCHANGE_RATE } from "@/lib/cashflow/exchange-rate";
import { kwaccForInvestorYears } from "@/lib/cashflow/parse-cashflow-excel";
import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";
import {
  normalizeInvestmentAssumptions,
  type InvestmentAssumptions,
} from "@/lib/investment/investment-assumptions";
import {
  buildBusinessFlowsFromEerr,
  type BusinessYearFlow,
} from "@/lib/investment/eerr-operational-flows";
import {
  buildInvestorCashflow,
  type InvestmentModelParams,
  type InvestorCashflowOptions,
  type InvestorCashflowResult,
} from "@/lib/investment/investor-cashflow";
import {
  buildScenarioBusinessFlowsFromEerr,
  isOperationalScenarioActive,
  resolveTicketFromParams,
  type OperationalScenarioAdjustments,
} from "@/lib/investment/operational-scenario";
import {
  withEditableTierRates,
  type OperatorBonusTier,
} from "@/lib/investment/operator-margin-bonus";
import {
  BASE_KWACC_SCHEDULE,
  EQUITY_INVESTMENT_USD,
  FINANCING_TOTAL_USD,
  loanPrincipalFromStructure,
} from "@/lib/investment/project-data";

export type { InvestmentAssumptions };

export function resolveExcelExchangeRate(parsed: ParsedEerrExcel): number {
  return parsed.cashFlowSchedule?.exchangeRates[1] ?? DEFAULT_EXCHANGE_RATE;
}

export function buildKwaccScheduleFromParsed(parsed: ParsedEerrExcel): number[] {
  if (parsed.kwaccSchedule && parsed.kwaccSchedule.length > 0) {
    return parsed.kwaccSchedule;
  }
  return [...BASE_KWACC_SCHEDULE];
}

export function resolveOperatorBonusTiers(
  assumptions: InvestmentAssumptions,
): OperatorBonusTier[] {
  return withEditableTierRates(assumptions.operatorBonusRatesPct);
}

export function resolveExchangeRatesByYear(
  parsed: ParsedEerrExcel,
  businessFlows: BusinessYearFlow[],
  exchangeRate: number,
): number[] {
  const excelSchedule = parsed.cashFlowSchedule;
  return businessFlows.map((_, index) => {
    const fromSchedule = excelSchedule?.exchangeRates[index + 1];
    return fromSchedule && fromSchedule > 0 ? fromSchedule : exchangeRate;
  });
}

export function buildInvestmentParams(
  parsed: ParsedEerrExcel,
  assumptions: InvestmentAssumptions,
): InvestmentModelParams {
  const kwaccScheduleFull = buildKwaccScheduleFromParsed(parsed);
  const kwaccForInvestorDiscount = kwaccForInvestorYears(kwaccScheduleFull);

  return {
    equityUsd: EQUITY_INVESTMENT_USD,
    totalInvestmentUsd: FINANCING_TOTAL_USD,
    loanRateAnnual: assumptions.loanRateAnnual,
    kwaccInitial: kwaccForInvestorDiscount[0] ?? kwaccScheduleFull[0] ?? 0,
    kwaccFinal:
      kwaccForInvestorDiscount[kwaccForInvestorDiscount.length - 1] ??
      kwaccScheduleFull[kwaccScheduleFull.length - 1] ??
      0,
    kwaccSchedule: kwaccForInvestorDiscount,
    kwaccScheduleFull,
  };
}

export function buildInvestorCashflowOptions(
  parsed: ParsedEerrExcel,
  businessFlows: BusinessYearFlow[],
  exchangeRate: number,
  assumptions: InvestmentAssumptions,
): InvestorCashflowOptions {
  return {
    operatorBonusTiers: resolveOperatorBonusTiers(assumptions),
    exchangeRatesByYear: resolveExchangeRatesByYear(parsed, businessFlows, exchangeRate),
    debtRollYears: assumptions.debtRollYears,
  };
}

export function buildBusinessFlowsForInvestment(
  parsed: ParsedEerrExcel,
  exchangeRate: number,
  operationalScenario: OperationalScenarioAdjustments,
): BusinessYearFlow[] {
  const excelSchedule = parsed.cashFlowSchedule;
  const baseTicket = resolveTicketFromParams(parsed.params);

  if (isOperationalScenarioActive(operationalScenario)) {
    return buildScenarioBusinessFlowsFromEerr(
      parsed.years,
      { exchangeRate, cashFlowSchedule: excelSchedule },
      operationalScenario,
      baseTicket,
    );
  }

  return buildBusinessFlowsFromEerr(parsed.years, {
    exchangeRate,
    cashFlowSchedule: excelSchedule,
  });
}

export type InvestmentModelResult = {
  exchangeRate: number;
  loanPrincipalUsd: number;
  investmentParams: InvestmentModelParams;
  businessFlows: BusinessYearFlow[];
  cashflow: InvestorCashflowResult;
  operatorBonusTiers: OperatorBonusTier[];
  operationalScenario: OperationalScenarioAdjustments;
};

export function buildInvestmentModelFromEerr(
  parsed: ParsedEerrExcel,
  partialAssumptions: Partial<InvestmentAssumptions> = {},
): InvestmentModelResult {
  const assumptions = normalizeInvestmentAssumptions(partialAssumptions);
  const exchangeRate = assumptions.exchangeRateOverride ?? resolveExcelExchangeRate(parsed);
  const operationalScenario: OperationalScenarioAdjustments = {
    volumeChangePct: assumptions.volumeChangePct,
    ticketChangePct: assumptions.ticketChangePct,
  };

  const businessFlows = buildBusinessFlowsForInvestment(
    parsed,
    exchangeRate,
    operationalScenario,
  );
  const investmentParams = buildInvestmentParams(parsed, assumptions);
  const cashflow = buildInvestorCashflow(
    investmentParams,
    businessFlows,
    buildInvestorCashflowOptions(parsed, businessFlows, exchangeRate, assumptions),
  );

  return {
    exchangeRate,
    loanPrincipalUsd: loanPrincipalFromStructure(FINANCING_TOTAL_USD, EQUITY_INVESTMENT_USD),
    investmentParams,
    businessFlows,
    cashflow,
    operatorBonusTiers: resolveOperatorBonusTiers(assumptions),
    operationalScenario,
  };
}

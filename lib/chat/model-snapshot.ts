import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import type { ParsedCashFlowSchedule } from "@/lib/cashflow/parse-cashflow-excel";
import type { ParsedEerrExcel, EerrParam } from "@/lib/cashflow/parse-eerr-excel";
import type { ActiveEerrModelSource } from "@/lib/cashflow/load-active-eerr-model-server";
import { CASHFLOW_BRIDGE_LINES } from "@/lib/investment/cashflow-bridge";
import {
  normalizeInvestmentAssumptions,
  type InvestmentAssumptions,
} from "@/lib/investment/investment-assumptions";
import {
  buildInvestmentModelFromEerr,
  buildKwaccScheduleFromParsed,
} from "@/lib/investment/investment-model";
import {
  EQUITY_INVESTMENT_USD,
  FINANCING_TOTAL_USD,
  OPERATOR_EQUITY_SHARE,
} from "@/lib/investment/project-data";
import { totalHorizonCovers } from "@/lib/investment/scenario-volume";

export type EerrRowSnapshot = {
  label: string;
  values: (number | null)[];
  yearTotal: number | null;
};

export type EerrYearDetailSnapshot = {
  year: number;
  label: string;
  months: string[];
  rows: EerrRowSnapshot[];
};

export type ModelYearSnapshot = {
  year: number;
  salesArs: number;
  ebitdaArs: number;
  netArs: number;
  covers: number;
  nopatUsd: number;
  operationalFflUsd: number;
  investorDividendUsd: number;
};

export type ModelChatSnapshot = {
  sourceFileName: string;
  modelSource: ActiveEerrModelSource;
  hasCashFlowSheet: boolean;
  exchangeRate: number;
  loanRateAnnual: number;
  equityUsd: number;
  loanPrincipalUsd: number;
  financingTotalUsd: number;
  operatorEquityShare: number;
  investmentAssumptions: InvestmentAssumptions;
  totalOperatorBonusUsd: number;
  year1SalesArs: number;
  year1EbitdaArs: number;
  year1NetArs: number;
  year1Covers: number;
  totalCovers10y: number;
  npvUsd: number;
  irr: number | null;
  paybackYears: number | null;
  equityReleaseYear: number | null;
  years: ModelYearSnapshot[];
  eerrYears: EerrYearDetailSnapshot[];
  eerrConcepts: string[];
  bridgeLineLabels: string[];
  excelParams: EerrParam[];
  kwaccScheduleFull: number[];
  cashFlowSchedule?: ParsedCashFlowSchedule;
};

export function buildModelSnapshot(
  parsed: ParsedEerrExcel,
  options: {
    assumptions?: Partial<InvestmentAssumptions>;
    modelSource?: ActiveEerrModelSource;
  } = {},
): ModelChatSnapshot {
  const assumptions = normalizeInvestmentAssumptions(options.assumptions);
  const investmentModel = buildInvestmentModelFromEerr(parsed, assumptions);
  const { businessFlows, cashflow, exchangeRate, loanPrincipalUsd } = investmentModel;
  const kwaccScheduleFull = buildKwaccScheduleFromParsed(parsed);
  const year1Kpis = extractYearKpisFromRows(parsed.years[0]?.rows ?? []);

  const years: ModelYearSnapshot[] = businessFlows.map((flow, index) => {
    const rows = parsed.years[index]?.rows ?? [];
    const kpis = extractYearKpisFromRows(rows);
    return {
      year: index + 1,
      salesArs: kpis.yearSales,
      ebitdaArs: kpis.ebitda,
      netArs: kpis.netResult,
      covers: kpis.annualCovers,
      nopatUsd: flow.nopatUsd,
      operationalFflUsd: flow.operationalFflUsd,
      investorDividendUsd: cashflow.investorDividendsUsd[index] ?? 0,
    };
  });

  return {
    sourceFileName: parsed.sourceFileName,
    modelSource: options.modelSource ?? "bundled",
    hasCashFlowSheet: parsed.cashFlowSchedule != null,
    exchangeRate,
    loanRateAnnual: assumptions.loanRateAnnual,
    equityUsd: EQUITY_INVESTMENT_USD,
    loanPrincipalUsd,
    financingTotalUsd: FINANCING_TOTAL_USD,
    operatorEquityShare: OPERATOR_EQUITY_SHARE,
    investmentAssumptions: assumptions,
    totalOperatorBonusUsd: cashflow.totalOperatorBonusUsd,
    year1SalesArs: year1Kpis.yearSales,
    year1EbitdaArs: year1Kpis.ebitda,
    year1NetArs: year1Kpis.netResult,
    year1Covers: year1Kpis.annualCovers,
    totalCovers10y: totalHorizonCovers(parsed.years),
    npvUsd: cashflow.npv,
    irr: cashflow.irr,
    paybackYears: cashflow.paybackYears,
    equityReleaseYear: cashflow.equityReleaseYear,
    years,
    eerrYears: parsed.years.map((year, index) => ({
      year: index + 1,
      label: year.label,
      months: year.months,
      rows: year.rows.map((row) => ({
        label: row.label,
        values: row.values,
        yearTotal: row.yearTotal,
      })),
    })),
    eerrConcepts: (parsed.years[0]?.rows ?? []).map((row) => row.label),
    bridgeLineLabels: CASHFLOW_BRIDGE_LINES.map((line) => line.label),
    excelParams: parsed.params,
    kwaccScheduleFull,
    cashFlowSchedule: parsed.cashFlowSchedule ?? undefined,
  };
}

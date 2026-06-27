import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/cashflow/exchange-rate";
import { kwaccForInvestorYears } from "@/lib/cashflow/parse-cashflow-excel";
import type { ParsedCashFlowSchedule } from "@/lib/cashflow/parse-cashflow-excel";
import type { ParsedEerrExcel, EerrParam } from "@/lib/cashflow/parse-eerr-excel";
import { CASHFLOW_BRIDGE_LINES } from "@/lib/investment/cashflow-bridge";
import { buildBusinessFlowsFromEerr } from "@/lib/investment/eerr-operational-flows";
import { buildInvestorCashflow } from "@/lib/investment/investor-cashflow";
import {
  BASE_KWACC_SCHEDULE,
  DEFAULT_LOAN_RATE_ANNUAL,
  EQUITY_INVESTMENT_USD,
  FINANCING_TOTAL_USD,
  OPERATOR_EQUITY_SHARE,
  loanPrincipalFromStructure,
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
  hasCashFlowSheet: boolean;
  exchangeRate: number;
  loanRateAnnual: number;
  equityUsd: number;
  loanPrincipalUsd: number;
  financingTotalUsd: number;
  operatorEquityShare: number;
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

export function buildModelSnapshot(parsed: ParsedEerrExcel): ModelChatSnapshot {
  const excelSchedule = parsed.cashFlowSchedule;
  const exchangeRate = excelSchedule?.exchangeRates[1] ?? DEFAULT_EXCHANGE_RATE;

  const kwaccScheduleFull =
    parsed.kwaccSchedule && parsed.kwaccSchedule.length > 0
      ? parsed.kwaccSchedule
      : [...BASE_KWACC_SCHEDULE];

  const kwaccForInvestorDiscount = kwaccForInvestorYears(kwaccScheduleFull);
  const equityUsd = EQUITY_INVESTMENT_USD;
  const financingTotalUsd = FINANCING_TOTAL_USD;
  const loanPrincipalUsd = loanPrincipalFromStructure(financingTotalUsd, equityUsd);

  const businessFlows = buildBusinessFlowsFromEerr(parsed.years, {
    exchangeRate,
    cashFlowSchedule: excelSchedule,
  });

  const cashflow = buildInvestorCashflow(
    {
      equityUsd,
      totalInvestmentUsd: financingTotalUsd,
      loanRateAnnual: DEFAULT_LOAN_RATE_ANNUAL,
      kwaccInitial: kwaccForInvestorDiscount[0] ?? kwaccScheduleFull[0] ?? 0,
      kwaccFinal:
        kwaccForInvestorDiscount[kwaccForInvestorDiscount.length - 1] ??
        kwaccScheduleFull[kwaccScheduleFull.length - 1] ??
        0,
      kwaccSchedule: kwaccForInvestorDiscount,
      kwaccScheduleFull: kwaccScheduleFull,
    },
    businessFlows,
  );

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
    hasCashFlowSheet: excelSchedule != null,
    exchangeRate,
    loanRateAnnual: DEFAULT_LOAN_RATE_ANNUAL,
    equityUsd,
    loanPrincipalUsd,
    financingTotalUsd,
    operatorEquityShare: OPERATOR_EQUITY_SHARE,
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
    kwaccScheduleFull: kwaccScheduleFull,
    cashFlowSchedule: excelSchedule ?? undefined,
  };
}

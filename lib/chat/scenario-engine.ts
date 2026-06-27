import {
  computeBaseKpis,
  computeScenarioKpis,
  extractBaseCubiertos,
  type ScenarioKpis,
} from "@/lib/cashflow/scenario-simulator";
import { TICKET_PROMEDIO } from "@/lib/cashflow/eerr-model-params";
import type { EerrYearDetailSnapshot, ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import { rowsForSimulator } from "@/lib/chat/rows-for-simulator";
import { buildBusinessFlowsFromEerr } from "@/lib/investment/eerr-operational-flows";
import { buildInvestorCashflow } from "@/lib/investment/investor-cashflow";
import { kwaccForInvestorYears } from "@/lib/cashflow/parse-cashflow-excel";
import {
  BASE_KWACC_SCHEDULE,
  DEFAULT_LOAN_RATE_ANNUAL,
  EQUITY_INVESTMENT_USD,
  FINANCING_TOTAL_USD,
} from "@/lib/investment/project-data";
import type { EerrYearId } from "@/lib/cashflow/eerr-years";
import {
  compactCurrency,
  formatCovers,
  formatNumber,
  formatPercent,
  formatUsd,
} from "@/lib/format";

export type ScenarioResult = {
  year: number;
  volumeChangePct: number;
  ticket: number;
  base: ScenarioKpis;
  scenario: ScenarioKpis;
  investor?: {
    baseIrr: number | null;
    scenarioIrr: number | null;
    baseNpv: number;
    scenarioNpv: number;
    basePayback: number | null;
    scenarioPayback: number | null;
  };
};

export type BreakEvenResult = {
  year: number;
  metric: "ebitda" | "net";
  ticket: number;
  baseCovers: number;
  breakEvenCovers: number;
  breakEvenScale: number;
  baseSales: number;
  breakEvenSales: number;
  baseMetricValue: number;
};

function yearDetail(snapshot: ModelChatSnapshot, year: number): EerrYearDetailSnapshot {
  return snapshot.eerrYears.find((item) => item.year === year) ?? snapshot.eerrYears[0]!;
}

export function resolveTicket(snapshot: ModelChatSnapshot): number {
  const ticketParam = snapshot.excelParams.find((param) =>
    param.label.toLowerCase().includes("ticket"),
  );
  if (!ticketParam) return TICKET_PROMEDIO;

  const digits = ticketParam.displayValue.replace(/[^\d]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TICKET_PROMEDIO;
}

function runAtVolumeScale(
  yearDetailSlice: EerrYearDetailSnapshot,
  ticket: number,
  volumeScale: number,
): ScenarioKpis {
  const rows = rowsForSimulator(yearDetailSlice.rows);
  const baseCubiertos = extractBaseCubiertos(rows);
  const scaledCubiertos = baseCubiertos.map((value) => value * volumeScale);
  return computeScenarioKpis(rows, { ticket, cubiertosByMonth: scaledCubiertos });
}

function buildInvestmentParams(snapshot: ModelChatSnapshot, loanRateAnnual = DEFAULT_LOAN_RATE_ANNUAL) {
  const kwaccScheduleFull =
    snapshot.kwaccScheduleFull.length > 0
      ? snapshot.kwaccScheduleFull
      : [...BASE_KWACC_SCHEDULE];
  const kwaccForInvestorDiscount = kwaccForInvestorYears(kwaccScheduleFull);

  return {
    equityUsd: EQUITY_INVESTMENT_USD,
    totalInvestmentUsd: FINANCING_TOTAL_USD,
    loanRateAnnual,
    kwaccInitial: kwaccForInvestorDiscount[0] ?? kwaccScheduleFull[0] ?? 0,
    kwaccFinal:
      kwaccForInvestorDiscount[kwaccForInvestorDiscount.length - 1] ??
      kwaccScheduleFull[kwaccScheduleFull.length - 1] ??
      0,
    kwaccSchedule: kwaccForInvestorDiscount,
    kwaccScheduleFull,
  };
}

function buildBusinessFlows(snapshot: ModelChatSnapshot) {
  const yearSlices = snapshot.eerrYears.map((year) => ({
    id: `year${year.year}` as EerrYearId,
    label: year.label,
    months: year.months,
    rows: rowsForSimulator(year.rows),
  }));

  return buildBusinessFlowsFromEerr(yearSlices, {
    exchangeRate: snapshot.exchangeRate,
    cashFlowSchedule: snapshot.cashFlowSchedule,
  });
}

function investorMetricsForYear1Scale(
  snapshot: ModelChatSnapshot,
  volumeScale: number,
): { irr: number | null; npv: number; paybackYears: number | null } {
  const yearSlices = snapshot.eerrYears.map((year) => ({
    id: `year${year.year}` as EerrYearId,
    label: year.label,
    months: year.months,
    rows: rowsForSimulator(year.rows),
  }));

  const baseRows = yearSlices[0]?.rows ?? [];
  const baseKpis = computeBaseKpis(baseRows);
  const scenarioKpis = runAtVolumeScale(snapshot.eerrYears[0]!, resolveTicket(snapshot), volumeScale);
  const ebitdaRatio =
    baseKpis.ebitda > 0 ? scenarioKpis.ebitda / baseKpis.ebitda : volumeScale;

  const businessFlows = buildBusinessFlows(snapshot);

  const scaledFlows = businessFlows.map((flow, index) => {
    if (index !== 0) return flow;
    return {
      ...flow,
      nopatUsd: flow.nopatUsd * ebitdaRatio,
      operationalFflUsd: flow.operationalFflUsd * ebitdaRatio,
    };
  });

  const params = buildInvestmentParams(snapshot);
  const cashflow = buildInvestorCashflow(params, scaledFlows);
  return {
    irr: cashflow.irr,
    npv: cashflow.npv,
    paybackYears: cashflow.paybackYears,
  };
}

export function runVolumeScenario(
  snapshot: ModelChatSnapshot,
  year: number,
  volumeChangePct: number,
  includeInvestor = true,
): ScenarioResult {
  const detail = yearDetail(snapshot, year);
  const ticket = resolveTicket(snapshot);
  const rows = rowsForSimulator(detail.rows);
  const base = computeBaseKpis(rows);
  const volumeScale = 1 + volumeChangePct / 100;
  const scenario = runAtVolumeScale(detail, ticket, volumeScale);

  const result: ScenarioResult = {
    year,
    volumeChangePct,
    ticket,
    base,
    scenario,
  };

  if (includeInvestor && year === 1) {
    const baseInvestor = {
      irr: snapshot.irr,
      npv: snapshot.npvUsd,
      paybackYears: snapshot.paybackYears,
    };
    const scenarioInvestor = investorMetricsForYear1Scale(snapshot, volumeScale);
    result.investor = {
      baseIrr: baseInvestor.irr,
      scenarioIrr: scenarioInvestor.irr,
      baseNpv: baseInvestor.npv,
      scenarioNpv: scenarioInvestor.npv,
      basePayback: baseInvestor.paybackYears,
      scenarioPayback: scenarioInvestor.paybackYears,
    };
  }

  return result;
}

export type LoanRateScenarioResult = {
  baseRatePct: number;
  scenarioRatePct: number;
  loanPrincipalUsd: number;
  baseIrr: number | null;
  scenarioIrr: number | null;
  baseNpv: number;
  scenarioNpv: number;
  basePayback: number | null;
  scenarioPayback: number | null;
  baseInterest10yUsd: number;
  scenarioInterest10yUsd: number;
};

export function runLoanRateScenario(
  snapshot: ModelChatSnapshot,
  scenarioRatePct: number,
): LoanRateScenarioResult {
  const businessFlows = buildBusinessFlows(snapshot);
  const baseRate = snapshot.loanRateAnnual;
  const baseParams = buildInvestmentParams(snapshot, baseRate);
  const scenarioParams = buildInvestmentParams(snapshot, scenarioRatePct / 100);

  const baseCashflow = buildInvestorCashflow(baseParams, businessFlows);
  const scenarioCashflow = buildInvestorCashflow(scenarioParams, businessFlows);

  const sumInterest = (years: typeof baseCashflow.years) =>
    years.reduce((sum, row) => sum + row.interestPaid, 0);

  return {
    baseRatePct: baseRate * 100,
    scenarioRatePct,
    loanPrincipalUsd: baseCashflow.loanPrincipal,
    baseIrr: baseCashflow.irr,
    scenarioIrr: scenarioCashflow.irr,
    baseNpv: baseCashflow.npv,
    scenarioNpv: scenarioCashflow.npv,
    basePayback: baseCashflow.paybackYears,
    scenarioPayback: scenarioCashflow.paybackYears,
    baseInterest10yUsd: sumInterest(baseCashflow.years),
    scenarioInterest10yUsd: sumInterest(scenarioCashflow.years),
  };
}

export function formatLoanRateScenarioResult(result: LoanRateScenarioResult): string {
  return [
    `Escenario · tasa del préstamo ${formatPercent(result.scenarioRatePct / 100)} (base ${formatPercent(result.baseRatePct / 100)})`,
    `Principal préstamo: ${formatUsd(result.loanPrincipalUsd)} · operación (ventas/FFL) sin cambios`,
    "",
    "Retorno equity inversor:",
    `· TIR: ${result.baseIrr != null ? formatPercent(result.baseIrr) : "—"} → ${result.scenarioIrr != null ? formatPercent(result.scenarioIrr) : "—"}`,
    `· VAN: ${formatUsd(result.baseNpv)} → ${formatUsd(result.scenarioNpv)}`,
    `· Payback: ${result.basePayback != null ? `${formatNumber(result.basePayback)} años` : "—"} → ${result.scenarioPayback != null ? `${formatNumber(result.scenarioPayback)} años` : "—"}`,
    "",
    "Servicio de deuda (10 años, intereses pagados acum.):",
    `· Base: ${formatUsd(result.baseInterest10yUsd)} → Escenario: ${formatUsd(result.scenarioInterest10yUsd)}`,
    "",
    "Metodología: mismos FFL operativos del Excel; solo cambia el servicio del préstamo de protección.",
  ].join("\n");
}

export function computeBreakEven(
  snapshot: ModelChatSnapshot,
  year: number,
  metric: "ebitda" | "net" = "ebitda",
): BreakEvenResult {
  const detail = yearDetail(snapshot, year);
  const ticket = resolveTicket(snapshot);
  const rows = rowsForSimulator(detail.rows);
  const base = computeBaseKpis(rows);
  const baseCovers = extractBaseCubiertos(rows).reduce((sum, value) => sum + value, 0);

  const metricValue = (kpis: ScenarioKpis) => (metric === "ebitda" ? kpis.ebitda : kpis.netResult);

  let lo = 0;
  let hi = 1.2;
  if (metricValue(base) <= 0) {
    hi = 1;
  }

  for (let step = 0; step < 48; step += 1) {
    const mid = (lo + hi) / 2;
    const kpis = runAtVolumeScale(detail, ticket, mid);
    if (metricValue(kpis) >= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  const breakEvenScale = hi;
  const breakEvenKpis = runAtVolumeScale(detail, ticket, breakEvenScale);

  return {
    year,
    metric,
    ticket,
    baseCovers,
    breakEvenCovers: baseCovers * breakEvenScale,
    breakEvenScale,
    baseSales: base.yearSales,
    breakEvenSales: breakEvenKpis.yearSales,
    baseMetricValue: metricValue(base),
  };
}

export function formatScenarioResult(result: ScenarioResult): string {
  const sign = result.volumeChangePct >= 0 ? "+" : "";
  const lines = [
    `Escenario · Año ${result.year} · volumen ${sign}${result.volumeChangePct}% (cubiertos/ventas)`,
    `Ticket usado: ${compactCurrency(result.ticket)} ARS`,
    "",
    formatScenarioLine("Base (Excel)", result.base),
    formatScenarioLine(`Escenario (${sign}${result.volumeChangePct}%)`, result.scenario),
    "",
    `Δ Ventas: ${compactCurrency(result.scenario.yearSales - result.base.yearSales)} ARS`,
    `Δ EBITDA: ${compactCurrency(result.scenario.ebitda - result.base.ebitda)} ARS`,
    `Δ Resultado neto: ${compactCurrency(result.scenario.netResult - result.base.netResult)} ARS`,
  ];

  if (result.investor) {
    lines.push(
      "",
      "Impacto equity inversor (aprox. escalando FFL/NOPAT Año 1):",
      `· TIR: ${result.investor.baseIrr != null ? formatPercent(result.investor.baseIrr) : "—"} → ${result.investor.scenarioIrr != null ? formatPercent(result.investor.scenarioIrr) : "—"}`,
      `· VAN: ${formatUsd(result.investor.baseNpv)} → ${formatUsd(result.investor.scenarioNpv)}`,
      `· Payback: ${result.investor.basePayback != null ? `${formatNumber(result.investor.basePayback)} años` : "—"} → ${result.investor.scenarioPayback != null ? `${formatNumber(result.investor.scenarioPayback)} años` : "—"}`,
    );
  }

  return lines.join("\n");
}

function formatScenarioLine(title: string, kpis: ScenarioKpis): string {
  return [
    title,
    `· Ventas: ${compactCurrency(kpis.yearSales)} ARS`,
    `· EBITDA: ${compactCurrency(kpis.ebitda)} ARS (${formatPercent(kpis.ebitdaMargin)} s/ ventas)`,
    `· Resultado neto: ${compactCurrency(kpis.netResult)} ARS`,
  ].join("\n");
}

export function formatBreakEvenResult(result: BreakEvenResult): string {
  const metricLabel = result.metric === "ebitda" ? "EBITDA" : "Resultado neto";
  return [
    `Punto de equilibrio · Año ${result.year} · ${metricLabel} ≈ 0`,
    `Ticket: ${compactCurrency(result.ticket)} ARS`,
    "",
    "Base (Excel):",
    `· Cubiertos anuales: ${formatCovers(result.baseCovers)}`,
    `· Ventas: ${compactCurrency(result.baseSales)} ARS`,
    `· ${metricLabel}: ${compactCurrency(result.baseMetricValue)} ARS`,
    "",
    "Equilibrio estimado (misma mezcla mensual, escalando cubiertos):",
    `· Cubiertos anuales: ${formatCovers(result.breakEvenCovers)} (${formatPercent(result.breakEvenScale)} del plan base)`,
    `· Ventas: ${compactCurrency(result.breakEvenSales)} ARS`,
    "",
    "Metodología: simulador EERR — costos variables escalan con ventas, estructura fija, impuestos 5% sobre EBIT positivo.",
  ].join("\n");
}

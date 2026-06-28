import { DEFAULT_EXCHANGE_RATE } from "@/lib/cashflow/exchange-rate";
import type { EerrParam } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { TICKET_PROMEDIO } from "@/lib/cashflow/eerr-model-params";
import {
  computeAnnualScenarioKpis,
} from "@/lib/cashflow/scenario-simulator";
import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";
import {
  buildBusinessFlowsFromEerr,
  FONDO_DESPidos_RATE,
  type BusinessFlowInput,
  type BusinessYearFlow,
} from "@/lib/investment/eerr-operational-flows";
import { buildCashflowBridge } from "@/lib/investment/cashflow-bridge";

export type OperationalScenarioAdjustments = {
  volumeChangePct: number;
  ticketChangePct: number;
};

export function resolveTicketFromParams(params: EerrParam[]): number {
  const ticketParam = params.find((param) =>
    param.label.toLowerCase().includes("ticket"),
  );
  if (!ticketParam) return TICKET_PROMEDIO;

  const digits = ticketParam.displayValue.replace(/[^\d]/g, "");
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TICKET_PROMEDIO;
}

export function isOperationalScenarioActive(
  adjustments: OperationalScenarioAdjustments,
): boolean {
  return adjustments.volumeChangePct !== 0 || adjustments.ticketChangePct !== 0;
}

function exchangeRateForYear(
  yearIndex: number,
  input: BusinessFlowInput,
): number {
  const fromSchedule = input.cashFlowSchedule?.exchangeRates[yearIndex + 1];
  if (fromSchedule && fromSchedule > 0) return fromSchedule;
  if (input.exchangeRate > 0) return input.exchangeRate;
  return DEFAULT_EXCHANGE_RATE;
}

function scenarioScaleRatio(
  baseEbitda: number,
  scenarioEbitda: number,
  baseNetResult: number,
  scenarioNetResult: number,
): number {
  if (baseEbitda > 0) return scenarioEbitda / baseEbitda;
  if (baseNetResult > 0) return scenarioNetResult / baseNetResult;
  return 1;
}

/** Recalcula flujos operativos 10a con ticket y cubiertos escalados (simulador EERR). */
export function buildScenarioBusinessFlowsFromEerr(
  years: EerrYearSlice[],
  flowInput: BusinessFlowInput,
  adjustments: OperationalScenarioAdjustments,
  baseTicket: number,
): BusinessYearFlow[] {
  if (!isOperationalScenarioActive(adjustments)) {
    return buildBusinessFlowsFromEerr(years, flowInput);
  }

  const volumeScale = 1 + adjustments.volumeChangePct / 100;
  const scenarioTicket = baseTicket * (1 + adjustments.ticketChangePct / 100);
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, years.length);
  const flows: BusinessYearFlow[] = [];

  for (let index = 0; index < horizon; index += 1) {
    const yearSlice = years[index]!;
    const baseKpis = extractYearKpisFromRows(yearSlice.rows);
    const exchangeRate = exchangeRateForYear(index, flowInput);

    const scenarioKpis = computeAnnualScenarioKpis(yearSlice.rows, {
      ticket: scenarioTicket,
      annualCovers: baseKpis.annualCovers * volumeScale,
    });

    const scaleRatio = scenarioScaleRatio(
      baseKpis.ebitda,
      scenarioKpis.ebitda,
      baseKpis.netResult,
      scenarioKpis.netResult,
    );

    const excelNopat = flowInput.cashFlowSchedule?.nopatUsd[index];
    const nopatUsd =
      excelNopat != null
        ? excelNopat * scaleRatio
        : scenarioKpis.netResult / exchangeRate;

    const reservaDespidosUsd =
      (scenarioKpis.rrhh * FONDO_DESPidos_RATE) / exchangeRate;

    const bridge = buildCashflowBridge({
      nopatUsd,
      reservaDespidosUsd,
    });

    const excelFfl = flowInput.cashFlowSchedule?.operationalFflUsd[index];
    const fflFromExcel = excelFfl != null;
    const operationalFflUsd = fflFromExcel
      ? excelFfl * scaleRatio
      : bridge.operationalFflUsd;

    flows.push({
      year: index + 1,
      ventasArs: scenarioKpis.yearSales,
      comprasArs: scenarioKpis.variableCosts,
      ebitdaArs: scenarioKpis.ebitda,
      netResultArs: scenarioKpis.netResult,
      nopatUsd,
      netResultUsd: nopatUsd,
      bridgeLines: bridge.lines,
      bridgeTotalUsd: bridge.bridgeTotalUsd,
      operationalFflUsd,
      repartijaUsd: 0,
      fflFromExcel,
      reservaDespidosUsd,
    });
  }

  return flows;
}

export function scenarioAnnualCovers(
  years: EerrYearSlice[],
  volumeChangePct: number,
): number[] {
  const volumeScale = 1 + volumeChangePct / 100;
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, years.length);
  return years.slice(0, horizon).map((year) => {
    const base = extractYearKpisFromRows(year.rows).annualCovers;
    return base * volumeScale;
  });
}

export function scenarioYear1Kpis(
  years: EerrYearSlice[],
  adjustments: OperationalScenarioAdjustments,
  baseTicket: number,
) {
  const rows = years[0]?.rows ?? [];
  if (rows.length === 0) {
    return extractYearKpisFromRows([]);
  }

  if (!isOperationalScenarioActive(adjustments)) {
    return extractYearKpisFromRows(rows);
  }

  const baseKpis = extractYearKpisFromRows(rows);
  const volumeScale = 1 + adjustments.volumeChangePct / 100;
  const scenarioTicket = baseTicket * (1 + adjustments.ticketChangePct / 100);
  const scenario = computeAnnualScenarioKpis(rows, {
    ticket: scenarioTicket,
    annualCovers: baseKpis.annualCovers * volumeScale,
  });

  return {
    yearSales: scenario.yearSales,
    variableCosts: scenario.variableCosts,
    grossMargin: scenario.grossMargin,
    ebitda: scenario.ebitda,
    netResult: scenario.netResult,
    rrhh: scenario.rrhh,
    annualCovers: baseKpis.annualCovers * volumeScale,
  };
}

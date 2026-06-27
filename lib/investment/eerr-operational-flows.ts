import { EERR_HORIZON_YEARS, type EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/cashflow/exchange-rate";
import type { ParsedCashFlowSchedule } from "@/lib/cashflow/parse-cashflow-excel";
import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";
import {
  buildCashflowBridge,
  type CashflowBridgeLine,
} from "@/lib/investment/cashflow-bridge";

/** Tasa anual Fondo Despidos — param EERR «Fondo Despidos 1,0%». */
export const FONDO_DESPidos_RATE = 0.01;

export type BusinessFlowInput = {
  exchangeRate: number;
  cashFlowSchedule?: ParsedCashFlowSchedule;
};

export type BusinessYearFlow = {
  year: number;
  ventasArs: number;
  comprasArs: number;
  ebitdaArs: number;
  netResultArs: number;
  nopatUsd: number;
  netResultUsd: number;
  bridgeLines: CashflowBridgeLine[];
  /** Reserva despidos (USD). */
  bridgeTotalUsd: number;
  operationalFflUsd: number;
  repartijaUsd: number;
  fflFromExcel: boolean;
  reservaDespidosUsd: number;
};

function exchangeRateForYear(
  yearIndex: number,
  input: BusinessFlowInput,
): number {
  const fromSchedule = input.cashFlowSchedule?.exchangeRates[yearIndex + 1];
  if (fromSchedule && fromSchedule > 0) return fromSchedule;
  if (input.exchangeRate > 0) return input.exchangeRate;
  return DEFAULT_EXCHANGE_RATE;
}

export function buildBusinessFlowsFromEerr(
  years: EerrYearSlice[],
  input: BusinessFlowInput,
): BusinessYearFlow[] {
  const horizon = Math.min(
    INVESTMENT_HORIZON_YEARS,
    EERR_HORIZON_YEARS,
    years.length,
  );

  const flows: BusinessYearFlow[] = [];

  for (let index = 0; index < horizon; index += 1) {
    const yearSlice = years[index];
    const kpis = extractYearKpisFromRows(yearSlice.rows);
    const exchangeRate = exchangeRateForYear(index, input);

    const ventasArs = kpis.yearSales;
    const comprasArs = kpis.variableCosts;
    const netResultArs = kpis.netResult;
    const excelNopat = input.cashFlowSchedule?.nopatUsd[index];
    const nopatUsd =
      excelNopat != null ? excelNopat : netResultArs / exchangeRate;

    const reservaDespidosUsd = (kpis.rrhh * FONDO_DESPidos_RATE) / exchangeRate;

    const bridge = buildCashflowBridge({
      nopatUsd,
      reservaDespidosUsd,
    });

    const excelFfl = input.cashFlowSchedule?.operationalFflUsd[index];
    const fflFromExcel = excelFfl != null;
    const operationalFflUsd = fflFromExcel ? excelFfl : bridge.operationalFflUsd;

    flows.push({
      year: index + 1,
      ventasArs,
      comprasArs,
      ebitdaArs: kpis.ebitda,
      netResultArs,
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

import { EERR_HORIZON_YEARS, type EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { DEFAULT_EXCHANGE_RATE } from "@/lib/cashflow/exchange-rate";
import {
  computeAnnualScenarioKpis,
  extractBaseAnnualCovers,
} from "@/lib/cashflow/scenario-simulator";
import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";
import {
  buildCashflowBridge,
  type CashflowBridgeLine,
} from "@/lib/investment/cashflow-bridge";

/** Tasa anual Fondo Despidos (supuesto EERR). */
export const FONDO_DESPidos_RATE = 0.01;

export type ScenarioDrivers = {
  ticket: number;
  coversScale: number;
  exchangeRate: number;
};

export type BusinessYearFlow = {
  year: number;
  ventasArs: number;
  comprasArs: number;
  ebitdaArs: number;
  netResultArs: number;
  /** NOPAT = Resultado neto (USD). */
  nopatUsd: number;
  netResultUsd: number;
  bridgeLines: CashflowBridgeLine[];
  bridgeTotalUsd: number;
  operationalFflUsd: number;
  nofStockUsd: number;
  /** Dividendo repartible post deuda (= FFL to Equity / REPARTIJA). */
  repartijaUsd: number;
};

export function simulateEerrYearKpis(
  rows: EerrYearSlice["rows"],
  drivers: Pick<ScenarioDrivers, "ticket" | "coversScale">,
) {
  const baseAnnualCovers = extractBaseAnnualCovers(rows);
  return computeAnnualScenarioKpis(rows, {
    ticket: drivers.ticket,
    annualCovers: baseAnnualCovers * drivers.coversScale,
  });
}

export function buildBusinessFlowsFromEerr(
  years: EerrYearSlice[],
  drivers: ScenarioDrivers,
): BusinessYearFlow[] {
  const horizon = Math.min(
    INVESTMENT_HORIZON_YEARS,
    EERR_HORIZON_YEARS,
    years.length,
  );
  const exchangeRate = drivers.exchangeRate > 0 ? drivers.exchangeRate : DEFAULT_EXCHANGE_RATE;

  let priorNofStockUsd = 0;
  const flows: BusinessYearFlow[] = [];

  for (let index = 0; index < horizon; index++) {
    const yearSlice = years[index];
    const kpis = simulateEerrYearKpis(yearSlice.rows, drivers);
    const ventasArs = kpis.yearSales;
    const comprasArs = kpis.variableCosts;
    const netResultArs = kpis.netResult;
    const nopatUsd = netResultArs / exchangeRate;
    const ventasUsd = ventasArs / exchangeRate;
    const comprasUsd = comprasArs / exchangeRate;

    const bridge = buildCashflowBridge({
      nopatUsd,
      ventasUsd,
      comprasUsd,
      priorNofStockUsd,
      reservaDespidosUsd: (kpis.rrhh * FONDO_DESPidos_RATE) / exchangeRate,
    });

    priorNofStockUsd = bridge.endNofStockUsd;

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
      operationalFflUsd: bridge.operationalFflUsd,
      nofStockUsd: bridge.endNofStockUsd,
      repartijaUsd: 0,
    });
  }

  return flows;
}

export function coversScaleFromAnnualCovers(
  year1Rows: EerrYearSlice["rows"],
  targetAnnualCovers: number,
): number {
  const base = extractBaseAnnualCovers(year1Rows);
  return base > 0 ? targetAnnualCovers / base : 1;
}

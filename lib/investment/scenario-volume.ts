import type { EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";

/** Cubiertos anuales por año del horizonte (desde fila EERR). */
export function horizonAnnualCovers(years: EerrYearSlice[]): number[] {
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, years.length);
  return years
    .slice(0, horizon)
    .map((year) => extractYearKpisFromRows(year.rows).annualCovers);
}

export function totalHorizonCovers(years: EerrYearSlice[]): number {
  return horizonAnnualCovers(years).reduce((sum, value) => sum + value, 0);
}

export type ScenarioChartYear = {
  year: number;
  covers: number;
  nopatUsd: number;
  dividendsUsd: number;
};

export function buildScenarioChartSeries(
  years: EerrYearSlice[],
  businessFlows: {
    year: number;
    nopatUsd: number;
  }[],
  equityByYear: number[],
): ScenarioChartYear[] {
  const covers = horizonAnnualCovers(years);
  return businessFlows.map((flow, index) => ({
    year: flow.year,
    covers: covers[index] ?? 0,
    nopatUsd: flow.nopatUsd,
    dividendsUsd: equityByYear[index] ?? 0,
  }));
}

import type { EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { extractBaseAnnualCovers } from "@/lib/cashflow/scenario-simulator";
import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";

export const VOLUME_INDEX_MIN = 50;
export const VOLUME_INDEX_MAX = 180;
export const VOLUME_INDEX_STEP = 5;
export const VOLUME_INDEX_DEFAULT = 100;

export function coversScaleFromVolumeIndex(volumeIndex: number): number {
  return volumeIndex / 100;
}

export function volumeIndexFromCoversScale(coversScale: number): number {
  return Math.round(coversScale * 100);
}

export function scaledCoversForYearRows(
  rows: EerrYearSlice["rows"],
  coversScale: number,
): number {
  return extractBaseAnnualCovers(rows) * coversScale;
}

/** Cubiertos anuales escalados, uno por año del horizonte. */
export function horizonScaledCovers(
  years: EerrYearSlice[],
  coversScale: number,
): number[] {
  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, years.length);
  return years
    .slice(0, horizon)
    .map((year) => scaledCoversForYearRows(year.rows, coversScale));
}

export function totalHorizonCovers(
  years: EerrYearSlice[],
  coversScale: number,
): number {
  return horizonScaledCovers(years, coversScale).reduce((sum, value) => sum + value, 0);
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
  coversScale: number,
): ScenarioChartYear[] {
  const covers = horizonScaledCovers(years, coversScale);
  return businessFlows.map((flow, index) => ({
    year: flow.year,
    covers: covers[index] ?? 0,
    nopatUsd: flow.nopatUsd,
    dividendsUsd: equityByYear[index + 1] ?? 0,
  }));
}

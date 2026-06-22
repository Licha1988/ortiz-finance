import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";

export const FULL_RAMP_SCHEDULE = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] as const;

export const EERR_HORIZON_YEARS = 10;

export type EerrYearId =
  | "year1"
  | "year2"
  | "year3"
  | "year4"
  | "year5"
  | "year6"
  | "year7"
  | "year8"
  | "year9"
  | "year10";

export type EerrYearSlice = {
  id: EerrYearId;
  label: string;
  months: string[];
  rows: EerrRow[];
};

export type EerrYearColumnRange = {
  id: EerrYearId;
  label: string;
  colStart: number;
  colEnd: number;
  fullRamp: boolean;
};

/** Solo Año 1 y 2 vienen del Excel; años 3–10 se extienden desde Año 2. */
export const EERR_YEAR_RANGES: EerrYearColumnRange[] = [
  { id: "year1", label: "Año 1", colStart: 9, colEnd: 20, fullRamp: false },
  { id: "year2", label: "Año 2", colStart: 23, colEnd: 34, fullRamp: true },
];

export function yearIdFromNumber(yearNumber: number): EerrYearId {
  return `year${yearNumber}` as EerrYearId;
}

export function allEerrYearIds(): EerrYearId[] {
  return Array.from({ length: EERR_HORIZON_YEARS }, (_, index) =>
    yearIdFromNumber(index + 1),
  );
}

export function isFullOperationYear(id: EerrYearId): boolean {
  return id !== "year1";
}

export function getEerrYearSlice(
  years: EerrYearSlice[],
  id: EerrYearId,
): EerrYearSlice | undefined {
  return years.find((year) => year.id === id);
}

export function primaryEerrYear(years: EerrYearSlice[]): EerrYearSlice {
  return years[0] ?? { id: "year1", label: "Año 1", months: [], rows: [] };
}

import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";

export const CASH_FLOW_SHEET_NAME = "Cash Flow";

const YEAR_COL_START = 4;
const YEAR_COL_END = 14;
const CASH_FLOW_SECTION_MAX_ROW = 20;

type XlsxModule = typeof import("xlsx");

function cellValue(
  sheet: Record<string, { v?: unknown }>,
  XLSX: XlsxModule,
  row: number,
  col: number,
): unknown {
  const address = XLSX.utils.encode_cell({ r: row, c: col });
  return sheet[address]?.v ?? null;
}

function normalizeLabel(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readYearValues(
  sheet: Record<string, { v?: unknown }>,
  XLSX: XlsxModule,
  row: number,
): (number | null)[] {
  const values: (number | null)[] = [];
  for (let col = YEAR_COL_START; col <= YEAR_COL_END; col += 1) {
    values.push(toNumber(cellValue(sheet, XLSX, row, col)));
  }
  return values;
}

function findCashFlowRow(
  sheet: Record<string, { v?: unknown }>,
  XLSX: XlsxModule,
  matcher: (label: string) => boolean,
): number | null {
  for (let row = 0; row <= CASH_FLOW_SECTION_MAX_ROW; row += 1) {
    const label = normalizeLabel(cellValue(sheet, XLSX, row, 1));
    if (label && matcher(label)) return row;
  }
  return null;
}

export type ParsedCashFlowSchedule = {
  /** TC por columna Año 0…10. */
  exchangeRates: number[];
  /** Evolución riesgo país Año 0…10 (ratio). */
  countryRiskEvolution: number[];
  /** Kwacc Año 0…10 (ratio). */
  kwaccSchedule: number[];
  /** NOPAT USD — índice 0 = Año 1. */
  nopatUsd: number[];
  /** FFL operativo USD — índice 0 = Año 1 (sin Año 0). */
  operationalFflUsd: number[];
  /** Inversión equity Año 0 (FFL fila, columna Año 0). */
  equityInvestmentUsd: number | null;
};

function investorYearValues(values: (number | null)[]): number[] {
  const slice = values.slice(1, INVESTMENT_HORIZON_YEARS + 1);
  return slice.map((value) => value ?? 0);
}

/** Lee hoja «Cash Flow»: TC, Kwacc, NOPAT, FFL, riesgo país. */
export function parseCashFlowScheduleFromWorkbook(
  workbook: { SheetNames: string[]; Sheets: Record<string, Record<string, { v?: unknown }>> },
  XLSX: XlsxModule,
): ParsedCashFlowSchedule | null {
  const sheetName = workbook.SheetNames.includes(CASH_FLOW_SHEET_NAME)
    ? CASH_FLOW_SHEET_NAME
    : null;
  if (!sheetName) return null;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const tcRow = findCashFlowRow(sheet, XLSX, (label) => label === "tc");
  const riskRow = findCashFlowRow(sheet, XLSX, (label) =>
    label.includes("evolucion esperada del riesgo pais"),
  );
  const kwaccRow = findCashFlowRow(sheet, XLSX, (label) => label === "kwacc");
  const nopatRow = findCashFlowRow(sheet, XLSX, (label) => label === "nopat");
  const fflRow = findCashFlowRow(sheet, XLSX, (label) => label === "ffl");

  if (kwaccRow === null) return null;

  const kwaccRaw = readYearValues(sheet, XLSX, kwaccRow);
  const kwaccSchedule = kwaccRaw.map((value) => value ?? 0);
  if (kwaccSchedule.length < INVESTMENT_HORIZON_YEARS + 1) return null;

  const exchangeRates =
    tcRow !== null
      ? readYearValues(sheet, XLSX, tcRow).map((value) => value ?? 0)
      : [];

  const countryRiskEvolution =
    riskRow !== null
      ? readYearValues(sheet, XLSX, riskRow).map((value) => value ?? 0)
      : [];

  const nopatUsd =
    nopatRow !== null ? investorYearValues(readYearValues(sheet, XLSX, nopatRow)) : [];

  const fflAll =
    fflRow !== null ? readYearValues(sheet, XLSX, fflRow) : [];
  const operationalFflUsd = investorYearValues(fflAll);
  const equityInvestmentUsd = fflAll[0] ?? null;

  return {
    exchangeRates,
    countryRiskEvolution,
    kwaccSchedule: kwaccSchedule.slice(0, INVESTMENT_HORIZON_YEARS + 1),
    nopatUsd,
    operationalFflUsd,
    equityInvestmentUsd,
  };
}

/** @deprecated Usar parseCashFlowScheduleFromWorkbook. */
export function parseKwaccScheduleFromWorkbook(
  workbook: { SheetNames: string[]; Sheets: Record<string, Record<string, { v?: unknown }>> },
  XLSX: XlsxModule,
): number[] | null {
  return parseCashFlowScheduleFromWorkbook(workbook, XLSX)?.kwaccSchedule ?? null;
}

/** Años 1–10 para descuento de flujos al equity. */
export function kwaccForInvestorYears(fullSchedule: number[]): number[] {
  if (fullSchedule.length >= INVESTMENT_HORIZON_YEARS + 1) {
    return fullSchedule.slice(1, INVESTMENT_HORIZON_YEARS + 1);
  }
  return fullSchedule.slice(0, INVESTMENT_HORIZON_YEARS);
}

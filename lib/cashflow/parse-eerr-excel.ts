import { CASHFLOW_MONTHS } from "@/lib/cashflow/months";
import {
  type DisplayCurrency,
} from "@/lib/cashflow/exchange-rate";
import { convertMonetaryValue } from "@/lib/cashflow/exchange-rate";
import { compactCurrency, formatCovers, formatCurrency, formatPercent } from "@/lib/format";
import { extendEerrHorizon } from "@/lib/cashflow/extend-eerr-horizon";
import { parseCashFlowScheduleFromWorkbook, type ParsedCashFlowSchedule } from "@/lib/cashflow/parse-cashflow-excel";
import {
  EERR_HORIZON_YEARS,
  EERR_YEAR_RANGES,
  type EerrYearId,
  type EerrYearSlice,
} from "@/lib/cashflow/eerr-years";

export const EERR_SHEET_NAME = "EERR Mensual";

const MONTH_HEADER_ROW = 2;
const EERR_ROW_START = 3;
const EERR_ROW_END = 43;
const PARAM_COL_LABEL = 1;
const PARAM_COL_VALUE = 2;
const PARAM_ROW_START = 3;
const PARAM_ROW_END = 32;

export type EerrValueKind = "currency" | "percent" | "covers";

export type EerrRow = {
  id: string;
  label: string;
  isSubRow: boolean;
  isSection: boolean;
  valueKind: EerrValueKind;
  emphasis?: "result" | "subtle" | "negative" | "section";
  values: (number | null)[];
  yearTotal: number | null;
};

export type EerrParam = {
  label: string;
  displayValue: string;
};

export type ParsedEerrExcel = {
  sourceFileName: string;
  sheetName: string;
  years: EerrYearSlice[];
  params: EerrParam[];
  /** Kwacc Año 0–10 desde hoja «Cash Flow» del Excel (ratio 0–1). */
  kwaccSchedule?: number[];
  /** Filas clave de la hoja «Cash Flow» (NOPAT, FFL, TC, Kwacc). */
  cashFlowSchedule?: ParsedCashFlowSchedule;
  /** Compat: alias de `years[0].months`. */
  months: string[];
  /** Compat: alias de `years[0].rows`. */
  rows: EerrRow[];
};

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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildLabel(colF: unknown, colG: unknown): { label: string; isSubRow: boolean; isSection: boolean } | null {
  const f = String(colF ?? "").trim();
  const g = String(colG ?? "").trim();
  if (!f && !g) return null;

  if (g) {
    return { label: g, isSubRow: f === "Proveedores", isSection: false };
  }

  return { label: f, isSubRow: false, isSection: true };
}

function inferValueKind(label: string, values: (number | null)[]): EerrValueKind {
  const lower = label.toLowerCase();
  if (lower.includes("ramp")) return "percent";
  if (lower.includes("cubierto") || lower.includes("proyeccion")) return "covers";

  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length > 0 && numeric.every((value) => Math.abs(value) <= 1)) {
    return "percent";
  }

  return "currency";
}

function inferEmphasis(
  label: string,
  isSection: boolean,
): EerrRow["emphasis"] | undefined {
  const lower = label.toLowerCase();
  if (isSection) return "section";
  if (
    lower.includes("resultado neto") ||
    lower === "ebitda" ||
    lower === "ebit" ||
    lower === "ventas" ||
    lower.includes("margen bruto")
  ) {
    return "result";
  }
  if (lower.includes("costos variables") || lower.includes("costos estructura")) {
    return "negative";
  }
  return undefined;
}

function yearTotalForRow(
  valueKind: EerrValueKind,
  values: (number | null)[],
): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length === 0) return null;
  if (valueKind === "percent") {
    return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  }
  return numeric.reduce((sum, value) => sum + value, 0);
}

function formatParamValue(value: unknown): string {
  const numeric = toNumber(value);
  if (numeric === null) return String(value ?? "—");

  if (Math.abs(numeric) > 0 && Math.abs(numeric) < 1) {
    return formatPercent(numeric);
  }
  if (numeric >= 1000) {
    return formatCurrency(numeric);
  }
  return String(numeric);
}

function parseRowsForYear(
  sheet: Record<string, { v?: unknown }>,
  XLSX: XlsxModule,
  colStart: number,
  colEnd: number,
  yearId: EerrYearId,
): EerrRow[] {
  const monthCount = colEnd - colStart + 1;
  const rows: EerrRow[] = [];

  for (let row = EERR_ROW_START; row <= EERR_ROW_END; row++) {
    const labelInfo = buildLabel(
      cellValue(sheet, XLSX, row, 5),
      cellValue(sheet, XLSX, row, 6),
    );
    if (!labelInfo) continue;

    const values = Array.from({ length: monthCount }, (_, index) =>
      toNumber(cellValue(sheet, XLSX, row, colStart + index)),
    );

    if (values.every((value) => value === null)) continue;

    const valueKind = inferValueKind(labelInfo.label, values);
    const emphasis = inferEmphasis(labelInfo.label, labelInfo.isSection);

    rows.push({
      id: `${yearId}-row-${row}`,
      label: labelInfo.label,
      isSubRow: labelInfo.isSubRow,
      isSection: labelInfo.isSection,
      valueKind,
      emphasis,
      values,
      yearTotal: yearTotalForRow(valueKind, values),
    });
  }

  return rows;
}

function monthHeadersForYear(
  sheet: Record<string, { v?: unknown }>,
  XLSX: XlsxModule,
  colStart: number,
  colEnd: number,
): string[] {
  return Array.from({ length: colEnd - colStart + 1 }, (_, index) => {
    const header = String(cellValue(sheet, XLSX, MONTH_HEADER_ROW, colStart + index) ?? "").trim();
    return header || CASHFLOW_MONTHS[index] || `M${index + 1}`;
  });
}

export function formatEerrCellValue(
  value: number | null,
  kind: EerrValueKind,
  options?: { currency?: DisplayCurrency; exchangeRate?: number },
): string {
  if (value === null) return "—";
  if (kind === "percent") return formatPercent(value);
  if (kind === "covers") return formatCovers(value);

  const displayValue =
    options?.currency === "usd" && options.exchangeRate
      ? convertMonetaryValue(value, "usd", options.exchangeRate)
      : value;

  return compactCurrency(displayValue);
}

export function formatEerrCellTitle(
  value: number | null,
  kind: EerrValueKind,
  options?: { currency?: DisplayCurrency; exchangeRate?: number },
): string {
  if (value === null) return "";
  if (kind === "percent") return formatPercent(value);
  if (kind === "covers") return formatCovers(value);

  if (options?.currency === "usd" && options.exchangeRate) {
    const usd = convertMonetaryValue(value, "usd", options.exchangeRate);
    return formatUsdTitle(usd);
  }
  return formatCurrency(value);
}

function formatUsdTitle(valueUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueUsd);
}

export async function parseEerrExcelFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedEerrExcel> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames.includes(EERR_SHEET_NAME)
    ? EERR_SHEET_NAME
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("El archivo no contiene hojas.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`No se encontró la hoja "${sheetName}".`);
  }

  const years: EerrYearSlice[] = EERR_YEAR_RANGES.map((range) => ({
    id: range.id,
    label: range.label,
    months: monthHeadersForYear(sheet, XLSX, range.colStart, range.colEnd),
    rows: parseRowsForYear(sheet, XLSX, range.colStart, range.colEnd, range.id),
  }));

  const params: EerrParam[] = [];
  for (let row = PARAM_ROW_START; row <= PARAM_ROW_END; row++) {
    const label = String(cellValue(sheet, XLSX, row, PARAM_COL_LABEL) ?? "").trim();
    const rawValue = cellValue(sheet, XLSX, row, PARAM_COL_VALUE);
    if (!label || rawValue === null || rawValue === undefined || rawValue === "") continue;
    params.push({
      label,
      displayValue: formatParamValue(rawValue),
    });
  }

  const primary = years[0];
  const cashFlowSchedule = parseCashFlowScheduleFromWorkbook(workbook, XLSX) ?? undefined;
  const kwaccSchedule = cashFlowSchedule?.kwaccSchedule;

  const parsed: ParsedEerrExcel = {
    sourceFileName: fileName,
    sheetName,
    years,
    params: params,
    kwaccSchedule,
    cashFlowSchedule,
    months: primary?.months ?? [...CASHFLOW_MONTHS],
    rows: primary?.rows ?? [],
  };

  return extendEerrHorizon(parsed, EERR_HORIZON_YEARS);
}

export function findEerrRow(
  rows: EerrRow[],
  matcher: (label: string) => boolean,
): EerrRow | undefined {
  return rows.find((row) => matcher(row.label.toLowerCase()));
}

export function getEerrYearRows(parsed: ParsedEerrExcel, yearId: EerrYearId): EerrRow[] {
  return parsed.years.find((year) => year.id === yearId)?.rows ?? parsed.rows;
}

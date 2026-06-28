import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearSlice } from "@/lib/cashflow/eerr-years";

/** Año operativo: apertura en septiembre, cierre en agosto (12 meses). */
export const CASHFLOW_MONTHS = [
  "Sep",
  "Oct",
  "Nov",
  "Dic",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
] as const;

export type CashflowMonth = (typeof CASHFLOW_MONTHS)[number];

function normalizeMonthLabel(month: string): string {
  return month
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function isAugustMonth(month: string): boolean {
  const normalized = normalizeMonthLabel(month);
  return normalized === "ago" || normalized === "agosto";
}

/** Excel con columna Ago al inicio (pre-apertura o cierre del año siguiente). */
export function isExcelLeadingAugustLayout(months: string[]): boolean {
  return months.length >= 12 && isAugustMonth(months[0]!);
}

export function isOperationalMonthOrder(months: string[]): boolean {
  return (
    months.length === CASHFLOW_MONTHS.length &&
    normalizeMonthLabel(months[0]!) === "sep" &&
    isAugustMonth(months[months.length - 1]!)
  );
}

function recomputeYearTotal(row: EerrRow, values: (number | null)[]): number | null {
  const numbers = values.filter((value): value is number => value != null);
  if (numbers.length === 0) return null;
  if (row.valueKind === "percent") {
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  }
  return numbers.reduce((sum, value) => sum + value, 0);
}

function findRowByLabel(rows: EerrRow[], label: string): EerrRow | undefined {
  return rows.find((row) => row.label === label);
}

/** Ago de cierre: columna Ago del año siguiente en el Excel, o la propia si es el último. */
export function closingAugustValue(
  row: EerrRow,
  year: EerrYearSlice,
  nextYear: EerrYearSlice | undefined,
): number | null {
  if (nextYear && isExcelLeadingAugustLayout(nextYear.months)) {
    const nextRow = findRowByLabel(nextYear.rows, row.label);
    if (nextRow) return nextRow.values[0] ?? null;
  }
  return row.values[0] ?? null;
}

/**
 * Excel: Ago, Sep…Jul → operativo: Sep…Jul, Ago.
 * El Ago inicial del Excel no se muestra al inicio; el de cierre viene del año siguiente.
 */
export function reorderYearToOperationalMonths(
  year: EerrYearSlice,
  resolveClosingAugust: (row: EerrRow) => number | null,
): EerrYearSlice {
  if (isOperationalMonthOrder(year.months) || !isExcelLeadingAugustLayout(year.months)) {
    return year;
  }

  return {
    ...year,
    months: [...CASHFLOW_MONTHS],
    rows: year.rows.map((row) => {
      const sepThroughJul = row.values.slice(1, 12);
      const values = [...sepThroughJul, resolveClosingAugust(row)];
      return {
        ...row,
        values,
        yearTotal: recomputeYearTotal(row, values),
      };
    }),
  };
}

export function normalizeOperationalMonths(years: EerrYearSlice[]): EerrYearSlice[] {
  return years.map((year, index) =>
    reorderYearToOperationalMonths(year, (row) =>
      closingAugustValue(row, year, years[index + 1]),
    ),
  );
}

/** @deprecated Use normalizeOperationalMonths */
export function trimPreOpeningAugustFromYear(year: EerrYearSlice): EerrYearSlice {
  return reorderYearToOperationalMonths(year, (row) => row.values[0] ?? null);
}

/** @deprecated Use normalizeOperationalMonths */
export function trimPreOpeningAugustFromYears(years: EerrYearSlice[]): EerrYearSlice[] {
  return normalizeOperationalMonths(years);
}

export function isPreOpeningAugustMonth(month: string): boolean {
  return isAugustMonth(month);
}

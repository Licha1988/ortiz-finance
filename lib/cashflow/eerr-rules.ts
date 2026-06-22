import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";

export const MANAGEMENT_LABEL = "Costo de gestión operativo";
export const MANAGEMENT_MONTHLY = 7_000_000;

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function isBrunoRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return label.includes("bruno");
}

function isDireccionOperativaRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return label.includes("direccion operativa") || label.includes("dirección operativa");
}

function isMargenBrutoRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return label.includes("margen bruto") || label.includes("márgen bruto");
}

function isCostosEstructuraRow(row: EerrRow): boolean {
  return normalizeLabel(row.label).includes("costos estructura");
}

function isEbitdaRow(row: EerrRow): boolean {
  return normalizeLabel(row.label) === "ebitda";
}

function isEbitRow(row: EerrRow): boolean {
  return normalizeLabel(row.label) === "ebit";
}

function isResultadoNetoRow(row: EerrRow): boolean {
  return normalizeLabel(row.label).includes("resultado neto");
}

function fixedMonthlyValues(monthCount: number, amount: number): number[] {
  return Array.from({ length: monthCount }, () => amount);
}

function sumValues(values: (number | null)[]): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length === 0) return null;
  return numeric.reduce((sum, value) => sum + value, 0);
}

function isManagementCostRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return (
    isDireccionOperativaRow(row) ||
    label.includes("gestion operativ") ||
    label.includes("gestión operativ")
  );
}

function managementMonthlyBeforeRules(rows: EerrRow[]): number {
  const direccionRow = rows.find(isDireccionOperativaRow);
  const brunoRow = rows.find(isBrunoRow);
  if (direccionRow || brunoRow) {
    return (
      (direccionRow?.values.find((value): value is number => value !== null) ?? 0) +
      (brunoRow?.values.find((value): value is number => value !== null) ?? 0)
    );
  }
  const gestionRow = rows.find(isManagementCostRow);
  return gestionRow?.values.find((value): value is number => value !== null) ?? MANAGEMENT_MONTHLY;
}

/** Aplica reglas de negocio Casa Ortiz sobre filas EERR (Excel o modelo base). */
export function applyEerrBusinessRules(rows: EerrRow[]): EerrRow[] {
  const monthCount = rows[0]?.values.length ?? 12;
  const monthlySavings = managementMonthlyBeforeRules(rows) - MANAGEMENT_MONTHLY;

  let next = rows.filter((row) => !isBrunoRow(row));

  next = next.map((row) => {
    if (isManagementCostRow(row)) {
      const values = fixedMonthlyValues(monthCount, MANAGEMENT_MONTHLY);
      return {
        ...row,
        label: MANAGEMENT_LABEL,
        isSubRow: true,
        values,
        yearTotal: MANAGEMENT_MONTHLY * monthCount,
      };
    }

    if (isMargenBrutoRow(row)) {
      return { ...row, label: "Margen bruto" };
    }

    return row;
  });

  if (monthlySavings === 0) return next;

  return next.map((row) => {
    if (isCostosEstructuraRow(row)) {
      const values = row.values.map((value) =>
        value === null ? null : value - monthlySavings,
      );
      return { ...row, values, yearTotal: sumValues(values) };
    }

    if (isEbitdaRow(row) || isEbitRow(row) || isResultadoNetoRow(row)) {
      const values = row.values.map((value) =>
        value === null ? null : value + monthlySavings,
      );
      return { ...row, values, yearTotal: sumValues(values) };
    }

    return row;
  });
}

export function yearSalesTotal(rows: EerrRow[]): number | null {
  const ventas = rows.find((row) => normalizeLabel(row.label) === "ventas");
  return ventas?.yearTotal ?? null;
}

export function salesSharePercent(value: number | null, sales: number | null): number | null {
  if (value === null || sales === null || sales === 0) return null;
  return value / sales;
}

import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import { recalculateAguinaldoFromRrhh } from "@/lib/cashflow/eerr-row-layout";

/** Nómina mensual al 100% de ramp-up. */
export const NOMINA_FULL = 60_000_000;

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function sumValues(values: (number | null)[]): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length === 0) return null;
  return numeric.reduce((sum, value) => sum + value, 0);
}

export function isRampUpNominaRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return label.includes("ramp") && label.includes("nomina");
}

function findRow(rows: EerrRow[], matcher: (label: string) => boolean): EerrRow | undefined {
  return rows.find((row) => matcher(normalizeLabel(row.label)));
}

function mapRow(
  rows: EerrRow[],
  labelMatch: (label: string) => boolean,
  mapper: (row: EerrRow) => EerrRow,
): EerrRow[] {
  return rows.map((row) => (labelMatch(normalizeLabel(row.label)) ? mapper(row) : row));
}

function structureDetailRows(rows: EerrRow[]): EerrRow[] {
  const start = rows.findIndex((row) => normalizeLabel(row.label) === "costos estructura");
  const end = rows.findIndex((row) => normalizeLabel(row.label) === "ebitda");
  if (start < 0 || end < 0 || end <= start) return [];
  return rows.slice(start + 1, end).filter((row) => row.valueKind === "currency");
}

function recalculateRrhh(rows: EerrRow[]): EerrRow[] {
  const rampNomina = rows.find(isRampUpNominaRow);
  const rrhh = findRow(rows, (label) => label === "rrhh");
  if (!rampNomina || !rrhh) return rows;

  const values = rampNomina.values.map((factor) =>
    factor === null ? null : NOMINA_FULL * factor,
  );

  return mapRow(rows, (label) => label === "rrhh", () => ({
    ...rrhh,
    values,
    yearTotal: sumValues(values),
  }));
}

function recalculateCostosEstructura(rows: EerrRow[]): EerrRow[] {
  const estructura = findRow(rows, (label) => label === "costos estructura");
  const details = structureDetailRows(rows);
  if (!estructura || details.length === 0) return rows;

  const monthCount = estructura.values.length;
  const values = Array.from({ length: monthCount }, (_, index) => {
    let total = 0;
    for (const row of details) {
      const value = row.values[index];
      if (value === null) return null;
      total += value;
    }
    return total;
  });

  return mapRow(rows, (label) => label === "costos estructura", () => ({
    ...estructura,
    values,
    yearTotal: sumValues(values),
  }));
}

function recalculateEbitda(rows: EerrRow[]): EerrRow[] {
  const margen = findRow(rows, (label) => label.includes("margen bruto"));
  const estructura = findRow(rows, (label) => label === "costos estructura");
  const ebitda = findRow(rows, (label) => label === "ebitda");
  if (!margen || !estructura || !ebitda) return rows;

  const values = margen.values.map((margin, index) => {
    const fixed = estructura.values[index];
    if (margin === null || fixed === null) return null;
    return margin - fixed;
  });

  return mapRow(rows, (label) => label === "ebitda", () => ({
    ...ebitda,
    values,
    yearTotal: sumValues(values),
  }));
}

function recalculateEbit(rows: EerrRow[]): EerrRow[] {
  const ebitda = findRow(rows, (label) => label === "ebitda");
  const ebit = findRow(rows, (label) => label === "ebit");
  if (!ebitda || !ebit) return rows;

  return mapRow(rows, (label) => label === "ebit", () => ({
    ...ebit,
    values: [...ebitda.values],
    yearTotal: ebitda.yearTotal,
  }));
}

function recalculateImpuestos(rows: EerrRow[]): EerrRow[] {
  const ebit = findRow(rows, (label) => label === "ebit");
  const impuestos = findRow(rows, (label) => label === "impuestos");
  if (!ebit || !impuestos) return rows;

  const values = ebit.values.map((profit) =>
    profit === null || profit <= 0 ? 0 : profit * 0.05,
  );

  return mapRow(rows, (label) => label === "impuestos", () => ({
    ...impuestos,
    values,
    yearTotal: sumValues(values),
  }));
}

function recalculateResultadoNeto(rows: EerrRow[]): EerrRow[] {
  const ebit = findRow(rows, (label) => label === "ebit");
  const impuestos = findRow(rows, (label) => label === "impuestos");
  const neto = findRow(rows, (label) => label.includes("resultado neto"));
  if (!ebit || !impuestos || !neto) return rows;

  const values = ebit.values.map((profit, index) => {
    const tax = impuestos.values[index];
    if (profit === null || tax === null) return null;
    return profit - tax;
  });

  return mapRow(rows, (label) => label.includes("resultado neto"), () => ({
    ...neto,
    values,
    yearTotal: sumValues(values),
  }));
}

/** Recalcula RRHH, estructura y resultados según ramp-up nómina. */
export function recalculateNominaChain(rows: EerrRow[]): EerrRow[] {
  let next = recalculateRrhh(rows);
  next = recalculateAguinaldoFromRrhh(next);
  next = recalculateCostosEstructura(next);
  next = recalculateEbitda(next);
  next = recalculateEbit(next);
  next = recalculateImpuestos(next);
  return recalculateResultadoNeto(next);
}

/** Actualiza un mes del ramp nómina (ratio 0–1). */
export function setNominaRampMonth(
  rows: EerrRow[],
  monthIndex: number,
  ratio: number,
): EerrRow[] {
  const clamped = Math.min(1, Math.max(0, ratio));
  return rows.map((row) => {
    if (!isRampUpNominaRow(row)) return row;
    const values = row.values.map((value, index) =>
      index === monthIndex ? clamped : value,
    );
    const numeric = values.filter((value): value is number => value !== null);
    const yearAverage =
      numeric.length > 0 ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
    return { ...row, values, yearTotal: yearAverage };
  });
}

/** Parsea entrada editable: "55", "55%", "0.55" → 0.55 */
export function parseRampPercentInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const hasPercent = trimmed.includes("%");
  const numeric = Number(trimmed.replace("%", ""));
  if (!Number.isFinite(numeric)) return null;
  if (hasPercent || numeric > 1) return numeric / 100;
  return numeric;
}

export function formatRampPercentInput(ratio: number | null): string {
  if (ratio === null) return "";
  return `${Math.round(ratio * 1000) / 10}%`.replace(".0%", "%");
}

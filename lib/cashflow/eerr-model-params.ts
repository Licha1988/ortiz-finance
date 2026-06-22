import { NOMINA_FULL, recalculateNominaChain } from "@/lib/cashflow/eerr-nomina";
import {
  applyEerrRowLayout,
  recalculateCostosVariablesTotal,
} from "@/lib/cashflow/eerr-row-layout";
import type { EerrParam, EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import { formatCurrency } from "@/lib/format";

/** Supuestos operativos del modelo (fuente única de verdad). */
export const TICKET_PROMEDIO = 31_500;

/** Ramp-up ventas año 1: de 55% a 100% (meses 10–12 al 100%). */
export const RAMP_UP_SCHEDULE = [
  0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1, 1, 1,
] as const;

export const IIGG_RATE = 0.05;

export type ApplyEerrModelOptions = {
  /** Ramp ventas; por defecto RAMP_UP_SCHEDULE. Año 2 usa 100% en todos los meses. */
  salesRampSchedule?: readonly number[];
  /** Fuerza ramp nómina al 100% (año 2 operativo pleno). */
  fullNominaRamp?: boolean;
};

const VARIABLE_COST_LABELS = new Set([
  "costo de mercaderia",
  "costo de mercadería",
  "costo delivery",
  "com. / impuestos (incluye iva)",
]);

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function findRow(rows: EerrRow[], matcher: (label: string) => boolean): EerrRow | undefined {
  return rows.find((row) => matcher(normalizeLabel(row.label)));
}

function sumValues(values: (number | null)[]): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length === 0) return null;
  return numeric.reduce((sum, value) => sum + value, 0);
}

function mapRow(
  rows: EerrRow[],
  labelMatch: (label: string) => boolean,
  mapper: (row: EerrRow) => EerrRow,
): EerrRow[] {
  return rows.map((row) => (labelMatch(normalizeLabel(row.label)) ? mapper(row) : row));
}

function isVariableCostRow(row: EerrRow): boolean {
  return VARIABLE_COST_LABELS.has(normalizeLabel(row.label));
}

function isRampUpSalesRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return label === "ramp - up" || label === "ramp-up";
}

function monthlyRatios(previous: number[], next: number[]): number[] {
  return previous.map((oldValue, index) => {
    const newValue = next[index] ?? oldValue;
    if (oldValue === 0) return newValue === 0 ? 1 : 1;
    return newValue / oldValue;
  });
}

function recalculateCubiertosFromProyeccionAndRamp(rows: EerrRow[]): EerrRow[] {
  const proyeccion = findRow(rows, (label) => label.includes("proyeccion ventas"));
  const ramp = rows.find(isRampUpSalesRow);
  const cubiertos = findRow(rows, (label) => label === "cubiertos");
  if (!proyeccion || !ramp || !cubiertos) return rows;

  const values = proyeccion.values.map((projected, index) => {
    const factor = ramp.values[index];
    if (projected === null || factor === null) return null;
    return projected * factor;
  });

  return mapRow(rows, (label) => label === "cubiertos", () => ({
    ...cubiertos,
    values,
    yearTotal: sumValues(values),
  }));
}

function recalculateVentasFromCubiertos(rows: EerrRow[]): EerrRow[] {
  const cubiertos = findRow(rows, (label) => label === "cubiertos");
  const ventas = findRow(rows, (label) => label === "ventas");
  if (!cubiertos || !ventas) return rows;

  const values = cubiertos.values.map((covers) =>
    covers === null ? null : covers * TICKET_PROMEDIO,
  );

  return mapRow(rows, (label) => label === "ventas", () => ({
    ...ventas,
    values,
    yearTotal: sumValues(values),
  }));
}

function scaleVariableCosts(rows: EerrRow[], ratios: number[]): EerrRow[] {
  return rows.map((row) => {
    if (!isVariableCostRow(row)) {
      return row;
    }

    const values = row.values.map((value, index) => {
      if (value === null) return null;
      return value * (ratios[index] ?? 1);
    });

    return { ...row, values, yearTotal: sumValues(values) };
  });
}

function recalculateMargenBruto(rows: EerrRow[]): EerrRow[] {
  const ventas = findRow(rows, (label) => label === "ventas");
  const variables = findRow(rows, (label) => label === "costos variables");
  const margen = findRow(rows, (label) => label.includes("margen bruto"));
  if (!ventas || !variables || !margen) return rows;

  const values = ventas.values.map((sale, index) => {
    const cost = variables.values[index];
    if (sale === null || cost === null) return null;
    return sale - cost;
  });

  return mapRow(rows, (label) => label.includes("margen bruto"), () => ({
    ...margen,
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
    profit === null || profit <= 0 ? 0 : profit * IIGG_RATE,
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

function applySalesRampSchedule(
  rows: EerrRow[],
  schedule: readonly number[] = RAMP_UP_SCHEDULE,
): EerrRow[] {
  const yearAverage = schedule.reduce((sum, value) => sum + value, 0) / schedule.length;

  return rows.map((row) => {
    if (!isRampUpSalesRow(row)) return row;

    const values = schedule.slice(0, row.values.length);
    while (values.length < row.values.length) {
      values.push(1);
    }

    return {
      ...row,
      values,
      yearTotal: row.valueKind === "percent" ? yearAverage : sumValues(values),
    };
  });
}

function applyFullNominaRamp(rows: EerrRow[]): EerrRow[] {
  return rows.map((row) => {
    const label = normalizeLabel(row.label);
    if (!label.includes("ramp") || !label.includes("nomina")) return row;
    const values = row.values.map(() => 1);
    return { ...row, values, yearTotal: 1 };
  });
}

/** Recalcula filas derivadas del ticket, ventas y nómina. */
export function applyEerrModelParams(
  rows: EerrRow[],
  options: ApplyEerrModelOptions = {},
): EerrRow[] {
  const ventasBefore = findRow(rows, (label) => label === "ventas")?.values ?? [];
  const salesSchedule = options.salesRampSchedule ?? RAMP_UP_SCHEDULE;
  let next = applySalesRampSchedule(rows, salesSchedule);
  if (options.fullNominaRamp) {
    next = applyFullNominaRamp(next);
  }
  next = applyEerrRowLayout(next);
  next = recalculateCubiertosFromProyeccionAndRamp(next);
  next = recalculateVentasFromCubiertos(next);
  const ventasAfter = findRow(next, (label) => label === "ventas")?.values ?? [];
  const ratios = monthlyRatios(
    ventasBefore.map((value) => value ?? 0),
    ventasAfter.map((value) => value ?? 0),
  );
  next = scaleVariableCosts(next, ratios);
  next = recalculateCostosVariablesTotal(next);
  next = recalculateMargenBruto(next);
  next = recalculateNominaChain(next);
  next = recalculateEbitda(next);
  next = recalculateEbit(next);
  next = recalculateImpuestos(next);
  return recalculateResultadoNeto(next);
}

/** Sincroniza supuestos visibles con el modelo. */
export function applyEerrParamDisplay(params: EerrParam[]): EerrParam[] {
  return params.map((param) => {
    const label = normalizeLabel(param.label);
    if (label === "ticket promedio") {
      return { ...param, displayValue: formatCurrency(TICKET_PROMEDIO) };
    }
    if (label === "nomina full") {
      return { ...param, displayValue: formatCurrency(NOMINA_FULL) };
    }
    return param;
  });
}

/** Recalcula todo el EERR tras editar ramp nómina (sin tocar ramp ventas). */
export function applyEerrAfterNominaRampEdit(rows: EerrRow[]): EerrRow[] {
  let next = recalculateNominaChain(rows);
  next = recalculateEbitda(next);
  next = recalculateEbit(next);
  next = recalculateImpuestos(next);
  return recalculateResultadoNeto(next);
}

import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import { IIGG_RATE, TICKET_PROMEDIO } from "@/lib/cashflow/eerr-model-params";

export type ScenarioInput = {
  ticket: number;
  cubiertosByMonth: number[];
};

export type ScenarioAnnualInput = {
  ticket: number;
  annualCovers: number;
};

export type ScenarioKpis = {
  yearSales: number;
  /** Costos variables anuales (= compras para NOF). */
  variableCosts: number;
  grossMargin: number;
  ebitda: number;
  netResult: number;
  rrhh: number;
  previsionAguinaldo: number;
  impuestos: number;
  grossMarginShare: number;
  ebitdaMargin: number;
  netMargin: number;
};

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

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function rowMonthlyValues(row: EerrRow | undefined): number[] {
  if (!row) return [];
  return row.values.map((value) => value ?? 0);
}

/** KPIs anuales simulados sin modificar el modelo base. */
export function computeScenarioKpis(
  baseRows: EerrRow[],
  input: ScenarioInput,
): ScenarioKpis {
  const baseVentas = rowMonthlyValues(findRow(baseRows, (l) => l === "ventas"));
  const baseVariables = rowMonthlyValues(findRow(baseRows, (l) => l === "costos variables"));
  const baseEstructura = rowMonthlyValues(findRow(baseRows, (l) => l === "costos estructura"));
  const baseRrhh = rowMonthlyValues(findRow(baseRows, (l) => l === "rrhh"));
  const baseAguinaldo = rowMonthlyValues(findRow(baseRows, (l) => l.includes("aguinaldo")));

  const monthCount = Math.max(
    baseVentas.length,
    input.cubiertosByMonth.length,
    baseVariables.length,
    baseEstructura.length,
  );

  const newVentas = Array.from({ length: monthCount }, (_, index) => {
    const covers = input.cubiertosByMonth[index] ?? 0;
    return covers * input.ticket;
  });

  const newVariables = Array.from({ length: monthCount }, (_, index) => {
    const baseSale = baseVentas[index] ?? 0;
    const baseVar = baseVariables[index] ?? 0;
    const sale = newVentas[index] ?? 0;
    if (baseSale === 0) return baseVar;
    return baseVar * (sale / baseSale);
  });

  const newMargen = newVentas.map((sale, index) => sale - (newVariables[index] ?? 0));
  const newEbitda = newMargen.map((margin, index) => margin - (baseEstructura[index] ?? 0));
  const newImpuestos = newEbitda.map((profit) => (profit > 0 ? profit * IIGG_RATE : 0));
  const newNeto = newEbitda.map((profit, index) => profit - (newImpuestos[index] ?? 0));

  const scaleMonthly = (baseMonthly: number[], index: number): number => {
    const baseSale = baseVentas[index] ?? 0;
    const sale = newVentas[index] ?? 0;
    const baseValue = baseMonthly[index] ?? 0;
    if (baseSale === 0) return baseValue;
    return baseValue * (sale / baseSale);
  };

  const scaledRrhh = Array.from({ length: monthCount }, (_, index) =>
    scaleMonthly(baseRrhh, index),
  );
  const scaledAguinaldo = Array.from({ length: monthCount }, (_, index) =>
    scaleMonthly(baseAguinaldo, index),
  );

  const yearSales = sum(newVentas);
  const variableCosts = sum(newVariables);
  const grossMargin = sum(newMargen);
  const ebitda = sum(newEbitda);
  const netResult = sum(newNeto);
  const rrhh = sum(scaledRrhh);
  const previsionAguinaldo = sum(scaledAguinaldo);
  const impuestos = sum(newImpuestos);

  return {
    yearSales,
    variableCosts,
    grossMargin,
    ebitda,
    netResult,
    rrhh,
    previsionAguinaldo,
    impuestos,
    grossMarginShare: yearSales > 0 ? grossMargin / yearSales : 0,
    ebitdaMargin: yearSales > 0 ? ebitda / yearSales : 0,
    netMargin: yearSales > 0 ? netResult / yearSales : 0,
  };
}

export function extractBaseCubiertos(baseRows: EerrRow[]): number[] {
  const cubiertos = findRow(baseRows, (l) => l === "cubiertos");
  return cubiertos?.values.map((value) => value ?? 0) ?? [];
}

export function extractBaseAnnualCovers(baseRows: EerrRow[]): number {
  return sum(extractBaseCubiertos(baseRows));
}

/** Escala el ramp-up mensual al total anual objetivo, conservando la forma relativa. */
export function scaleCubiertosToAnnualTotal(
  baseMonthly: number[],
  annualTotal: number,
): number[] {
  const baseTotal = sum(baseMonthly);
  if (baseMonthly.length === 0) return [];
  if (baseTotal === 0) {
    const even = annualTotal / baseMonthly.length;
    return baseMonthly.map(() => even);
  }
  const factor = annualTotal / baseTotal;
  return baseMonthly.map((value) => value * factor);
}

export function computeAnnualScenarioKpis(
  baseRows: EerrRow[],
  input: ScenarioAnnualInput,
): ScenarioKpis {
  const baseMonthly = extractBaseCubiertos(baseRows);
  const cubiertosByMonth = scaleCubiertosToAnnualTotal(baseMonthly, input.annualCovers);
  return computeScenarioKpis(baseRows, {
    ticket: input.ticket,
    cubiertosByMonth,
  });
}

export function computeBaseKpis(baseRows: EerrRow[]): ScenarioKpis {
  const cubiertos = extractBaseCubiertos(baseRows);
  return computeScenarioKpis(baseRows, {
    ticket: TICKET_PROMEDIO,
    cubiertosByMonth: cubiertos,
  });
}

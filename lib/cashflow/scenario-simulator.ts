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

export type ScenarioMonthPoint = {
  cubiertos: number;
  ventas: number;
  variableCosts: number;
  fixedCosts: number;
  ebitda: number;
  netResult: number;
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

/** Serie mensual simulada (ventas, costos, neto) sin modificar el Excel base. */
export function computeScenarioMonthlySeries(
  baseRows: EerrRow[],
  input: ScenarioInput,
): ScenarioMonthPoint[] {
  const baseVentas = rowMonthlyValues(findRow(baseRows, (l) => l === "ventas"));
  const baseVariables = rowMonthlyValues(findRow(baseRows, (l) => l === "costos variables"));
  const baseEstructura = rowMonthlyValues(findRow(baseRows, (l) => l === "costos estructura"));

  const monthCount = Math.max(
    baseVentas.length,
    input.cubiertosByMonth.length,
    baseVariables.length,
    baseEstructura.length,
  );

  return Array.from({ length: monthCount }, (_, index) => {
    const cubiertos = input.cubiertosByMonth[index] ?? 0;
    const ventas = cubiertos * input.ticket;
    const baseSale = baseVentas[index] ?? 0;
    const baseVar = baseVariables[index] ?? 0;
    const variableCosts =
      baseSale === 0 ? baseVar : baseVar * (ventas / baseSale);
    const fixedCosts = baseEstructura[index] ?? 0;
    const ebitda = ventas - variableCosts - fixedCosts;
    const impuestos = ebitda > 0 ? ebitda * IIGG_RATE : 0;
    const netResult = ebitda - impuestos;

    return {
      cubiertos,
      ventas,
      variableCosts,
      fixedCosts,
      ebitda,
      netResult,
    };
  });
}

function aggregateScenarioKpis(monthly: ScenarioMonthPoint[]): ScenarioKpis {
  const yearSales = sum(monthly.map((row) => row.ventas));
  const variableCosts = sum(monthly.map((row) => row.variableCosts));
  const grossMargin = sum(monthly.map((row) => row.ventas - row.variableCosts));
  const ebitda = sum(monthly.map((row) => row.ventas - row.variableCosts - row.fixedCosts));
  const netResult = sum(monthly.map((row) => row.netResult));
  const impuestos = ebitda - netResult;

  return {
    yearSales,
    variableCosts,
    grossMargin,
    ebitda,
    netResult,
    rrhh: 0,
    previsionAguinaldo: 0,
    impuestos,
    grossMarginShare: yearSales > 0 ? grossMargin / yearSales : 0,
    ebitdaMargin: yearSales > 0 ? ebitda / yearSales : 0,
    netMargin: yearSales > 0 ? netResult / yearSales : 0,
  };
}

/** KPIs anuales simulados sin modificar el modelo base. */
export function computeScenarioKpis(
  baseRows: EerrRow[],
  input: ScenarioInput,
): ScenarioKpis {
  const monthly = computeScenarioMonthlySeries(baseRows, input);
  const kpis = aggregateScenarioKpis(monthly);

  const baseRrhh = rowMonthlyValues(findRow(baseRows, (l) => l === "rrhh"));
  const baseAguinaldo = rowMonthlyValues(findRow(baseRows, (l) => l.includes("aguinaldo")));
  const baseVentas = rowMonthlyValues(findRow(baseRows, (l) => l === "ventas"));

  const scaleMonthly = (baseMonthly: number[], index: number): number => {
    const baseSale = baseVentas[index] ?? 0;
    const sale = monthly[index]?.ventas ?? 0;
    const baseValue = baseMonthly[index] ?? 0;
    if (baseSale === 0) return baseValue;
    return baseValue * (sale / baseSale);
  };

  const monthCount = monthly.length;
  kpis.rrhh = sum(
    Array.from({ length: monthCount }, (_, index) => scaleMonthly(baseRrhh, index)),
  );
  kpis.previsionAguinaldo = sum(
    Array.from({ length: monthCount }, (_, index) => scaleMonthly(baseAguinaldo, index)),
  );

  return kpis;
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

export type ScenarioBreakEven = {
  metric: "net" | "ebitda";
  ticket: number;
  baseCovers: number;
  scenarioCovers: number;
  breakEvenCovers: number;
  breakEvenScale: number;
  breakEvenSales: number;
  gapCovers: number;
  marginPct: number;
  isAboveBreakEven: boolean;
  reachable: boolean;
  baseMetricValue: number;
  scenarioMetricValue: number;
  firstProfitableMonth: number | null;
};

function scenarioMetricValue(kpis: ScenarioKpis, metric: "net" | "ebitda"): number {
  return metric === "ebitda" ? kpis.ebitda : kpis.netResult;
}

function findBreakEvenVolumeScale(
  baseRows: EerrRow[],
  ticket: number,
  metric: "net" | "ebitda",
): { scale: number; reachable: boolean } {
  const baseCubiertos = extractBaseCubiertos(baseRows);

  const metricAtScale = (scale: number): number => {
    const kpis = computeScenarioKpis(baseRows, {
      ticket,
      cubiertosByMonth: baseCubiertos.map((value) => value * scale),
    });
    return scenarioMetricValue(kpis, metric);
  };

  if (metricAtScale(0) >= 0) return { scale: 0, reachable: true };

  let hi = 1;
  while (hi <= 8 && metricAtScale(hi) < 0) hi *= 2;
  if (metricAtScale(hi) < 0) return { scale: hi, reachable: false };

  let lo = 0;
  for (let step = 0; step < 48; step += 1) {
    const mid = (lo + hi) / 2;
    if (metricAtScale(mid) >= 0) hi = mid;
    else lo = mid;
  }

  return { scale: hi, reachable: true };
}

/** Cubiertos mínimos (misma forma mensual) para EBITDA o resultado neto ≥ 0 al ticket dado. */
export function computeScenarioBreakEven(
  baseRows: EerrRow[],
  input: ScenarioInput,
  metric: "net" | "ebitda" = "net",
): ScenarioBreakEven {
  const baseCovers = extractBaseAnnualCovers(baseRows);
  const scenarioCovers = sum(input.cubiertosByMonth);
  const baseKpis = computeScenarioKpis(baseRows, {
    ticket: input.ticket,
    cubiertosByMonth: extractBaseCubiertos(baseRows),
  });
  const scenarioKpis = computeScenarioKpis(baseRows, input);
  const { scale, reachable } = findBreakEvenVolumeScale(baseRows, input.ticket, metric);
  const breakEvenCovers = baseCovers * scale;
  const breakEvenKpis = computeScenarioKpis(baseRows, {
    ticket: input.ticket,
    cubiertosByMonth: scaleCubiertosToAnnualTotal(extractBaseCubiertos(baseRows), breakEvenCovers),
  });

  const monthly = computeScenarioMonthlySeries(baseRows, input);
  const firstProfitableMonth =
    monthly.findIndex((point) =>
      metric === "ebitda"
        ? point.ventas - point.variableCosts - point.fixedCosts >= 0
        : point.netResult >= 0,
    );
  const firstMonth = firstProfitableMonth >= 0 ? firstProfitableMonth : null;

  const gapCovers = scenarioCovers - breakEvenCovers;
  const marginPct = breakEvenCovers > 0 ? gapCovers / breakEvenCovers : 0;

  return {
    metric,
    ticket: input.ticket,
    baseCovers,
    scenarioCovers,
    breakEvenCovers,
    breakEvenScale: baseCovers > 0 ? breakEvenCovers / baseCovers : 0,
    breakEvenSales: breakEvenKpis.yearSales,
    gapCovers,
    marginPct,
    isAboveBreakEven: scenarioMetricValue(scenarioKpis, metric) >= 0,
    reachable,
    baseMetricValue: scenarioMetricValue(baseKpis, metric),
    scenarioMetricValue: scenarioMetricValue(scenarioKpis, metric),
    firstProfitableMonth: firstMonth,
  };
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

"use client";

import { useMemo, useState } from "react";
import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import { currencyLabel, type DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import {
  computeScenarioBreakEven,
  computeScenarioMonthlySeries,
  extractBaseAnnualCovers,
  extractBaseCubiertos,
  scaleCubiertosToAnnualTotal,
  type ScenarioMonthPoint,
} from "@/lib/cashflow/scenario-simulator";
import ScenarioAdjustField from "@/components/ui/ScenarioAdjustField";
import KpiCard from "@/components/ui/KpiCard";
import {
  compactMoney,
  formatCovers,
  formatCurrency,
  formatMillionsForCurrency,
  formatPercent,
  formatUsd,
} from "@/lib/format";

type EerrScenarioPanelProps = {
  rows: EerrRow[];
  months: string[];
  displayCurrency: DisplayCurrency;
  exchangeRate: number;
  baseTicket: number;
  yearLabel: string;
};

const MONEY_SERIES: {
  id: string;
  label: string;
  color: string;
  dash?: string;
  pick: (point: ScenarioMonthPoint) => number;
}[] = [
  { id: "ventas", label: "Ventas", color: "#7c3aed", pick: (p) => p.ventas },
  { id: "variables", label: "Costos variables", color: "#f97316", pick: (p) => p.variableCosts },
  { id: "fijos", label: "Costos fijos", color: "#ca8a04", pick: (p) => p.fixedCosts },
  { id: "ebitda", label: "EBITDA", color: "#059669", pick: (p) => p.ebitda },
];

const VIEW_WIDTH = 880;
const CHART_HEIGHT = 240;
const PAD = { top: 20, right: 48, bottom: 8, left: 56 };

function toDisplayMoney(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): number {
  return currency === "usd" ? valueArs / exchangeRate : valueArs;
}

function scaleBounds(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Math.min(...values, 0);
  let max = Math.max(...values, 1);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

function linePath(
  values: number[],
  width: number,
  height: number,
  minY: number,
  maxY: number,
): string {
  if (values.length === 0) return "";
  const range = maxY - minY || 1;
  return values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
      const y = height - ((value - minY) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaPath(
  values: number[],
  width: number,
  height: number,
  minY: number,
  maxY: number,
  baseline: number,
): string {
  if (values.length === 0) return "";
  const range = maxY - minY || 1;
  const baselineY = height - ((baseline - minY) / range) * height;
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - ((value - minY) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const firstX = values.length <= 1 ? 0 : 0;
  const lastX = width;
  return `M ${firstX} ${baselineY} L ${points.join(" L ")} L ${lastX} ${baselineY} Z`;
}

function formatDeltaPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function formatNominalMoney(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): string {
  return currency === "usd"
    ? formatUsd(valueArs / exchangeRate)
    : formatCurrency(valueArs);
}

export default function EerrScenarioPanel({
  rows,
  months,
  displayCurrency,
  exchangeRate,
  baseTicket,
  yearLabel,
}: EerrScenarioPanelProps) {
  const [volumeChangePct, setVolumeChangePct] = useState(0);
  const [ticketChangePct, setTicketChangePct] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const scenarioActive = volumeChangePct !== 0 || ticketChangePct !== 0;

  const baseAnnualCovers = useMemo(() => extractBaseAnnualCovers(rows), [rows]);

  const model = useMemo(() => {
    const ticket = baseTicket * (1 + ticketChangePct / 100);
    const annualCovers = baseAnnualCovers * (1 + volumeChangePct / 100);
    const cubiertosByMonth = scaleCubiertosToAnnualTotal(
      extractBaseCubiertos(rows),
      annualCovers,
    );
    const input = { ticket, cubiertosByMonth };
    const monthly = computeScenarioMonthlySeries(rows, input);
    const totals = monthly.reduce(
      (acc, row) => ({
        cubiertos: acc.cubiertos + row.cubiertos,
        ventas: acc.ventas + row.ventas,
        variableCosts: acc.variableCosts + row.variableCosts,
        fixedCosts: acc.fixedCosts + row.fixedCosts,
        ebitda: acc.ebitda + row.ebitda,
      }),
      { cubiertos: 0, ventas: 0, variableCosts: 0, fixedCosts: 0, ebitda: 0 },
    );

    const baseMonthly = computeScenarioMonthlySeries(rows, {
      ticket: baseTicket,
      cubiertosByMonth: extractBaseCubiertos(rows),
    });
    const baseTotals = baseMonthly.reduce(
      (acc, row) => ({
        ebitda: acc.ebitda + row.ebitda,
        ventas: acc.ventas + row.ventas,
      }),
      { ebitda: 0, ventas: 0 },
    );

    const breakEven = computeScenarioBreakEven(rows, input, "ebitda");

    return { ticket, annualCovers, monthly, totals, baseTotals, breakEven };
  }, [rows, baseTicket, baseAnnualCovers, volumeChangePct, ticketChangePct]);

  const plotWidth = VIEW_WIDTH - PAD.left - PAD.right;
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom;

  const moneyBounds = useMemo(() => {
    const values = model.monthly.flatMap((point) =>
      MONEY_SERIES.map((series) =>
        toDisplayMoney(series.pick(point), displayCurrency, exchangeRate),
      ),
    );
    return scaleBounds(values);
  }, [model.monthly, displayCurrency, exchangeRate]);

  const coversBounds = useMemo(() => {
    const values = [
      ...model.monthly.map((point) => point.cubiertos),
      model.breakEven.reachable ? model.breakEven.breakEvenCovers / 12 : 0,
    ];
    return scaleBounds(values.filter((v) => v > 0));
  }, [model.monthly, model.breakEven]);

  const formatMoneyAxis = (value: number) =>
    compactMoney(value, displayCurrency, exchangeRate);

  const monthLabels = months.length > 0 ? months : model.monthly.map((_, i) => `M${i + 1}`);

  const ebitdaDelta = model.totals.ebitda - model.baseTotals.ebitda;
  const ebitdaDeltaPct =
    model.baseTotals.ebitda !== 0
      ? ebitdaDelta / Math.abs(model.baseTotals.ebitda)
      : model.totals.ebitda !== 0
        ? 1
        : 0;

  const breakEvenSalesLabel = formatNominalMoney(
    model.breakEven.breakEvenSales,
    displayCurrency,
    exchangeRate,
  );

  const coverProgress = model.breakEven.reachable
    ? Math.min(1.5, model.breakEven.breakEvenCovers > 0
        ? model.totals.cubiertos / model.breakEven.breakEvenCovers
        : 1)
    : 0;

  const handleReset = () => {
    setVolumeChangePct(0);
    setTicketChangePct(0);
  };

  const breakEvenMonthLabel =
    model.breakEven.firstProfitableMonth != null
      ? monthLabels[model.breakEven.firstProfitableMonth] ?? `Mes ${model.breakEven.firstProfitableMonth + 1}`
      : null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/40 via-white to-stone-50/80 shadow-sm ring-1 ring-stone-200/40">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200/60 bg-white/70 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700/80">
            Simulador · {yearLabel}
          </p>
          <p className="mt-1 max-w-xl text-sm text-stone-600">
            Mové cubiertos y ticket para ver el impacto en ventas, costos y EBITDA (
            {currencyLabel(displayCurrency)}).
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={!scenarioActive}
          className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Restablecer escenario
        </button>
      </div>

      <div
        className={`mx-5 mt-5 rounded-xl border px-4 py-3.5 ${
          !model.breakEven.reachable
            ? "border-amber-300/80 bg-amber-50/90"
            : model.breakEven.isAboveBreakEven
              ? "border-emerald-300/80 bg-emerald-50/90"
              : "border-rose-300/80 bg-rose-50/90"
        }`}
        role="status"
      >
        <div className="flex flex-wrap items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              !model.breakEven.reachable
                ? "bg-amber-200 text-amber-900"
                : model.breakEven.isAboveBreakEven
                  ? "bg-emerald-200 text-emerald-900"
                  : "bg-rose-200 text-rose-900"
            }`}
            aria-hidden
          >
            {!model.breakEven.reachable ? "!" : model.breakEven.isAboveBreakEven ? "✓" : "↓"}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p
              className={`text-sm font-semibold ${
                !model.breakEven.reachable
                  ? "text-amber-900"
                  : model.breakEven.isAboveBreakEven
                    ? "text-emerald-900"
                    : "text-rose-900"
              }`}
            >
              {!model.breakEven.reachable
                ? "Equilibrio fuera de rango con este ticket"
                : model.breakEven.isAboveBreakEven
                  ? "Por encima del punto de equilibrio"
                  : "Por debajo del punto de equilibrio"}
            </p>
            <p className="text-xs leading-relaxed text-stone-700">
              {!model.breakEven.reachable ? (
                <>
                  Con ticket{" "}
                  <span className="font-semibold tabular-nums">
                    {compactMoney(model.ticket, "ars", exchangeRate)} ARS
                  </span>
                  , no se alcanza EBITDA ≥ 0 escalando cubiertos. Probá subir el ticket o
                  revisar costos fijos.
                </>
              ) : model.breakEven.isAboveBreakEven ? (
                <>
                  Mínimo estimado:{" "}
                  <span className="font-semibold tabular-nums">
                    {formatCovers(model.breakEven.breakEvenCovers)} cubiertos/año
                  </span>{" "}
                  · ventas{" "}
                  <span className="font-semibold tabular-nums">{breakEvenSalesLabel}</span>{" "}
                  ({formatPercent(model.breakEven.breakEvenScale)} del plan Excel). Tenés un margen
                  de{" "}
                  <span className="font-semibold tabular-nums text-emerald-800">
                    +{formatCovers(Math.abs(model.breakEven.gapCovers))} (
                    {formatPercent(Math.abs(model.breakEven.marginPct))})
                  </span>
                  {breakEvenMonthLabel ? (
                    <> · primer mes con EBITDA ≥ 0: <strong>{breakEvenMonthLabel}</strong></>
                  ) : null}
                </>
              ) : (
                <>
                  Para EBITDA ≥ 0 necesitás al menos{" "}
                  <span className="font-semibold tabular-nums">
                    {formatCovers(model.breakEven.breakEvenCovers)} cubiertos/año
                  </span>{" "}
                  · ventas{" "}
                  <span className="font-semibold tabular-nums">{breakEvenSalesLabel}</span>
                  . Faltan{" "}
                  <span className="font-semibold tabular-nums text-rose-800">
                    {formatCovers(Math.abs(model.breakEven.gapCovers))} (
                    {formatPercent(Math.abs(model.breakEven.marginPct))})
                  </span>
                  {breakEvenMonthLabel ? (
                    <> · aún no hay mes con EBITDA ≥ 0 en este escenario</>
                  ) : null}
                </>
              )}
            </p>

            {model.breakEven.reachable && (
              <div className="space-y-1.5 pt-1">
                <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-200/80">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      model.breakEven.isAboveBreakEven ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, coverProgress * 100)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 w-0.5 bg-stone-800/70"
                    style={{ left: "100%", transform: "translateX(-1px)" }}
                    title="Punto de equilibrio"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>0</span>
                  <span className="font-medium text-stone-700">
                    Equilibrio · {formatCovers(model.breakEven.breakEvenCovers)} ·{" "}
                    {breakEvenSalesLabel}
                  </span>
                  <span className="font-semibold tabular-nums text-violet-800">
                    {formatCovers(model.totals.cubiertos)} actuales
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Parámetros
          </p>
          <ScenarioAdjustField
            label="Cubiertos"
            helper="Volumen anual · conserva el ramp-up mensual del Excel."
            baseDisplay={`${formatCovers(baseAnnualCovers)} / año`}
            valuePct={volumeChangePct}
            onChange={setVolumeChangePct}
            min={-50}
            max={50}
          />
          <p className="-mt-2 rounded-lg bg-violet-50/80 px-3 py-2 text-xs text-violet-900">
            Escenario:{" "}
            <span className="font-bold tabular-nums">{formatCovers(model.totals.cubiertos)}</span>
            {scenarioActive && volumeChangePct !== 0 ? (
              <span className="ml-1.5 text-violet-600">({formatDeltaPct(volumeChangePct)})</span>
            ) : null}
          </p>

          <ScenarioAdjustField
            label="Ticket promedio"
            helper="Precio por cubierto → ventas = cubiertos × ticket."
            baseDisplay={`${compactMoney(baseTicket, "ars", exchangeRate)} ARS`}
            valuePct={ticketChangePct}
            onChange={setTicketChangePct}
            min={-50}
            max={50}
          />
          <p className="-mt-2 rounded-lg bg-violet-50/80 px-3 py-2 text-xs text-violet-900">
            Escenario:{" "}
            <span className="font-bold tabular-nums">
              {compactMoney(model.ticket, "ars", exchangeRate)} ARS
            </span>
            {scenarioActive && ticketChangePct !== 0 ? (
              <span className="ml-1.5 text-violet-600">({formatDeltaPct(ticketChangePct)})</span>
            ) : null}
          </p>
        </div>

        <div className="space-y-3">
          <KpiCard
            label={`EBITDA · ${yearLabel}`}
            value={formatMillionsForCurrency(
              model.totals.ebitda,
              displayCurrency,
              exchangeRate,
            )}
            hint="Ventas − costos variables − costos fijos · variables escalan con ventas"
            tone={model.totals.ebitda >= 0 ? "emerald" : "amber"}
            detail={
              scenarioActive
                ? {
                    label: "vs Excel",
                    value: `${ebitdaDelta >= 0 ? "+" : ""}${formatMillionsForCurrency(ebitdaDelta, displayCurrency, exchangeRate)} (${formatDeltaPct(ebitdaDeltaPct * 100)})`,
                  }
                : {
                    label: "Equilibrio",
                    value: model.breakEven.reachable
                      ? `${formatCovers(model.breakEven.breakEvenCovers)} · ${breakEvenSalesLabel}`
                      : "—",
                  }
            }
          />

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Ventas",
                value: formatMillionsForCurrency(
                  model.totals.ventas,
                  displayCurrency,
                  exchangeRate,
                ),
                tone: "text-violet-800",
              },
              {
                label: "Cubiertos",
                value: formatCovers(model.totals.cubiertos),
                tone: "text-stone-800",
              },
              {
                label: "Costos var.",
                value: formatMillionsForCurrency(
                  model.totals.variableCosts,
                  displayCurrency,
                  exchangeRate,
                ),
                tone: "text-orange-700",
              },
              {
                label: "Costos fijos",
                value: formatMillionsForCurrency(
                  model.totals.fixedCosts,
                  displayCurrency,
                  exchangeRate,
                ),
                tone: "text-amber-800",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-stone-200/80 bg-white px-3 py-2.5 shadow-sm"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                  {item.label}
                </p>
                <p className={`mt-0.5 text-sm font-bold tabular-nums ${item.tone}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200/60 px-5 pb-5 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Evolución mensual
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {MONEY_SERIES.map((series) => (
              <span
                key={series.id}
                className="inline-flex items-center gap-1.5 text-[11px] text-stone-600"
              >
                <span
                  className="inline-block h-2 w-3 rounded-sm"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-600">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-slate-500" />
              Cubiertos
            </span>
          </div>
        </div>

        <div className="relative overflow-x-auto rounded-xl border border-stone-200/80 bg-white shadow-inner">
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${CHART_HEIGHT + 32}`}
            className="min-w-[720px] w-full"
            role="img"
            aria-label={`Escenario EERR ${yearLabel}`}
          >
            {model.monthly.map((point, index) => {
              if (model.monthly.length <= 1) return null;
              const x0 =
                PAD.left + ((index - 0.5) / (model.monthly.length - 1)) * plotWidth;
              const x1 =
                PAD.left + ((index + 0.5) / (model.monthly.length - 1)) * plotWidth;
              const ebitdaNegative = point.ebitda < 0;
              return (
                <rect
                  key={`shade-${index}`}
                  x={Math.max(PAD.left, x0)}
                  y={PAD.top}
                  width={Math.max(0, x1 - Math.max(PAD.left, x0))}
                  height={plotHeight}
                  fill={ebitdaNegative ? "#fff1f2" : "#ecfdf5"}
                  fillOpacity={0.35}
                />
              );
            })}

            {[moneyBounds.min, 0, moneyBounds.max].map((tick) => {
              const y =
                PAD.top +
                plotHeight -
                ((tick - moneyBounds.min) / (moneyBounds.max - moneyBounds.min || 1)) * plotHeight;
              return (
                <g key={`money-${tick}`}>
                  <line
                    x1={PAD.left}
                    x2={VIEW_WIDTH - PAD.right}
                    y1={y}
                    y2={y}
                    stroke={tick === 0 ? "#78716c" : "#e7e5e4"}
                    strokeWidth={tick === 0 ? 1.5 : 1}
                    strokeDasharray={tick === 0 ? undefined : "4 4"}
                  />
                  <text
                    x={PAD.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className={`text-[9px] ${tick === 0 ? "fill-stone-600 font-semibold" : "fill-stone-400"}`}
                  >
                    {formatMoneyAxis(tick)}
                  </text>
                </g>
              );
            })}

            <path
              d={areaPath(
                model.monthly.map((point) =>
                  toDisplayMoney(point.ebitda, displayCurrency, exchangeRate),
                ),
                plotWidth,
                plotHeight,
                moneyBounds.min,
                moneyBounds.max,
                0,
              )}
              transform={`translate(${PAD.left}, ${PAD.top})`}
              fill="#059669"
              fillOpacity={0.08}
            />

            {MONEY_SERIES.map((series) => {
              const values = model.monthly.map((point) =>
                toDisplayMoney(series.pick(point), displayCurrency, exchangeRate),
              );
              return (
                <path
                  key={series.id}
                  d={linePath(values, plotWidth, plotHeight, moneyBounds.min, moneyBounds.max)}
                  transform={`translate(${PAD.left}, ${PAD.top})`}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.id === "ebitda" ? 2.5 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={series.id === "ebitda" ? 1 : 0.85}
                />
              );
            })}

            <path
              d={linePath(
                model.monthly.map((point) => point.cubiertos),
                plotWidth,
                plotHeight,
                coversBounds.min,
                coversBounds.max,
              )}
              transform={`translate(${PAD.left}, ${PAD.top})`}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />

            {model.breakEven.reachable && model.breakEven.firstProfitableMonth != null && (
              <g>
                <line
                  x1={
                    PAD.left +
                    (model.breakEven.firstProfitableMonth / (model.monthly.length - 1 || 1)) *
                      plotWidth
                  }
                  x2={
                    PAD.left +
                    (model.breakEven.firstProfitableMonth / (model.monthly.length - 1 || 1)) *
                      plotWidth
                  }
                  y1={PAD.top}
                  y2={PAD.top + plotHeight}
                  stroke="#059669"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.7}
                />
                <text
                  x={
                    PAD.left +
                    (model.breakEven.firstProfitableMonth / (model.monthly.length - 1 || 1)) *
                      plotWidth +
                    4
                  }
                  y={PAD.top + 12}
                  className="fill-emerald-700 text-[9px] font-semibold"
                >
                  1er mes +
                </text>
              </g>
            )}

            {hoverIndex != null && model.monthly.length > 1 && (
              <line
                x1={PAD.left + (hoverIndex / (model.monthly.length - 1)) * plotWidth}
                x2={PAD.left + (hoverIndex / (model.monthly.length - 1)) * plotWidth}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke="#a8a29e"
                strokeDasharray="3 3"
              />
            )}

            {monthLabels.map((label, index) => {
              const x =
                PAD.left +
                (model.monthly.length <= 1
                  ? 0
                  : (index / (model.monthly.length - 1)) * plotWidth);
              return (
                <text
                  key={`${label}-${index}`}
                  x={x}
                  y={CHART_HEIGHT + 24}
                  textAnchor="middle"
                  className="fill-stone-500 text-[10px] font-medium"
                >
                  {label}
                </text>
              );
            })}

            {model.monthly.map((_, index) => {
              const x =
                PAD.left +
                (model.monthly.length <= 1
                  ? plotWidth / 2
                  : (index / (model.monthly.length - 1)) * plotWidth);
              const band = plotWidth / Math.max(model.monthly.length - 1, 1);
              return (
                <rect
                  key={`hover-${index}`}
                  x={x - band / 2}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              );
            })}
          </svg>

          {hoverIndex != null && model.monthly[hoverIndex] && (
            <div className="pointer-events-none absolute left-6 top-4 max-w-[min(280px,calc(100%-2rem))] rounded-xl border border-stone-200 bg-white/95 px-3.5 py-2.5 text-[11px] shadow-lg backdrop-blur-sm">
              <p className="mb-1.5 font-semibold text-stone-800">
                {monthLabels[hoverIndex] ?? `Mes ${hoverIndex + 1}`}
                {model.monthly[hoverIndex].ebitda >= 0 ? (
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                    +
                  </span>
                ) : (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                    −
                  </span>
                )}
              </p>
              <ul className="space-y-1">
                <li className="flex justify-between gap-4 tabular-nums">
                  <span className="text-stone-500">Cubiertos</span>
                  <span className="font-medium">{formatCovers(model.monthly[hoverIndex].cubiertos)}</span>
                </li>
                {MONEY_SERIES.map((series) => (
                  <li key={series.id} className="flex justify-between gap-4 tabular-nums">
                    <span className="text-stone-500">{series.label}</span>
                    <span className="font-medium">
                      {formatMoneyAxis(
                        toDisplayMoney(
                          series.pick(model.monthly[hoverIndex]),
                          displayCurrency,
                          exchangeRate,
                        ),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-stone-400">
          Fondo verde/rojo por mes según EBITDA · línea punteada verde = primer mes con EBITDA ≥ 0 ·
          equilibrio = {breakEvenSalesLabel} en ventas anuales (ticket del escenario).
        </p>
      </div>
    </div>
  );
}

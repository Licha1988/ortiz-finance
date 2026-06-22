"use client";

import { compactFromUsd } from "@/lib/format";
import type { DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import type { ScenarioChartYear } from "@/lib/investment/scenario-volume";

type ScenarioHorizonChartProps = {
  series: ScenarioChartYear[];
  currency: DisplayCurrency;
  exchangeRate: number;
};

const CHART_HEIGHT = 160;

export default function ScenarioHorizonChart({
  series,
  currency,
  exchangeRate,
}: ScenarioHorizonChartProps) {
  if (series.length === 0) {
    return (
      <p className="text-center text-xs text-stone-400">Sin datos para el horizonte.</p>
    );
  }

  const maxValue = Math.max(
    ...series.flatMap((row) => [row.nopatUsd, Math.max(0, row.dividendsUsd)]),
    1,
  );

  const formatUsd = (value: number) =>
    compactFromUsd(value, currency, exchangeRate);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-400" />
          NOPAT
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-600" />
          Dividendos
        </span>
      </div>

      <div
        className="relative rounded-xl border border-stone-200/80 bg-white px-2 pt-3"
        style={{ height: CHART_HEIGHT + 48 }}
      >
        <div
          className="flex items-end justify-between gap-1 px-1"
          style={{ height: CHART_HEIGHT }}
        >
          {series.map((row) => {
            const nopatHeight = (row.nopatUsd / maxValue) * CHART_HEIGHT;
            const dividendHeight =
              (Math.max(0, row.dividendsUsd) / maxValue) * CHART_HEIGHT;

            return (
              <div
                key={`bar-${row.year}`}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                title={`Año ${row.year}: NOPAT ${formatUsd(row.nopatUsd)} · Dividendos ${formatUsd(row.dividendsUsd)}`}
              >
                <div className="relative flex w-full max-w-[52px] items-end justify-center gap-0.5">
                  <div
                    className="w-[42%] rounded-t bg-orange-400/85 transition-all group-hover:bg-orange-500"
                    style={{ height: Math.max(nopatHeight, row.nopatUsd > 0 ? 4 : 0) }}
                  />
                  <div
                    className="w-[42%] rounded-t bg-violet-600 transition-all group-hover:bg-violet-700"
                    style={{
                      height: Math.max(dividendHeight, row.dividendsUsd > 0 ? 4 : 0),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between gap-1 px-1">
          {series.map((row) => (
            <div
              key={`label-${row.year}`}
              className="min-w-0 flex-1 text-center text-[10px] font-medium tabular-nums text-stone-500"
            >
              A{row.year}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

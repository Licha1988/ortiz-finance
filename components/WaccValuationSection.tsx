"use client";

import { useMemo } from "react";
import KpiCard from "@/components/ui/KpiCard";
import ParamField from "@/components/ui/ParamField";
import SectionCard from "@/components/ui/SectionCard";
import type { DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import {
  compactFromUsd,
  formatPercent,
  formatUsd,
} from "@/lib/format";
import type { WaccValuationInputs } from "@/lib/investment/wacc-valuation";
import {
  computeWaccRatesSummary,
  type ProjectValuationResult,
} from "@/lib/investment/wacc-valuation";
import { editableInput } from "@/lib/ui/tokens";

type WaccValuationSectionProps = {
  waccInputs: WaccValuationInputs;
  onWaccInputsChange: (patch: Partial<WaccValuationInputs>) => void;
  countryRiskEvolution: number[];
  onCountryRiskEvolutionChange: (yearIndex: number, value: number) => void;
  onResetCountryRiskEvolution: () => void;
  onReset: () => void;
  valuation: ProjectValuationResult;
  displayCurrency: DisplayCurrency;
  exchangeRate: number;
};

const resetButtonClass =
  "rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50";

function parsePercent(raw: string): number | null {
  const n = Number(raw.replace(",", ".").replace("%", "").trim());
  return Number.isFinite(n) && n >= 0 ? n / 100 : null;
}

function parseRatio(raw: string): number | null {
  const n = Number(raw.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function RateRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
        emphasis ? "bg-violet-50 font-semibold text-violet-950" : "bg-stone-50/80 text-stone-700"
      }`}
    >
      <span className="text-xs">{label}</span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  );
}

export default function WaccValuationSection({
  waccInputs,
  onWaccInputsChange,
  countryRiskEvolution,
  onCountryRiskEvolutionChange,
  onResetCountryRiskEvolution,
  onReset,
  valuation,
  displayCurrency,
  exchangeRate,
}: WaccValuationSectionProps) {
  const rates = useMemo(() => computeWaccRatesSummary(waccInputs), [waccInputs]);

  const set = (key: keyof WaccValuationInputs) => (value: number) =>
    onWaccInputsChange({ [key]: value });

  const formatCell = (valueUsd: number) =>
    compactFromUsd(valueUsd, displayCurrency, exchangeRate);

  return (
    <SectionCard
      title="Valuación por WACC"
      subtitle="Tasa de descuento · flujo libre al equity · VAN y TIR del proyecto (como Excel)"
      tone="investment"
    >
      <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-stone-500">
            Editá los inputs de tasa de descuento; VAN, TIR y Kwacc se recalculan al instante.
          </p>
          <button type="button" onClick={onReset} className={resetButtonClass}>
            Restablecer valores originales
          </button>
        </div>
      </div>

      <div className="grid gap-6 border-b border-stone-100 p-5 xl:grid-cols-[minmax(280px,340px)_minmax(240px,280px)_1fr]">
        <div className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Inputs para tasa de descuento
          </p>
          <ParamField
            label="Bonos Tesoro USA — 10Y"
            source="Tasa libre de riesgo"
            value={waccInputs.riskFreeRate}
            onChange={set("riskFreeRate")}
            format={(v) => formatPercent(v, 2)}
            parse={parsePercent}
          />
          <ParamField
            label="Beta apalancada industria"
            source="Damodaran — Restaurant Dining"
            value={waccInputs.industryLeveredBeta}
            onChange={set("industryLeveredBeta")}
            format={(v) => v.toFixed(2)}
            parse={parseRatio}
          />
          <ParamField
            label="D/V industria"
            value={waccInputs.industryDebtToValue}
            onChange={set("industryDebtToValue")}
            format={(v) => formatPercent(v, 1)}
            parse={parsePercent}
          />
          <ParamField
            label="Prima de riesgo mercado (ERP)"
            source="Damodaran"
            value={waccInputs.equityRiskPremium}
            onChange={set("equityRiskPremium")}
            format={(v) => formatPercent(v, 2)}
            parse={parsePercent}
          />
          <ParamField
            label="Prima no pago de la deuda"
            value={waccInputs.defaultSpread}
            onChange={set("defaultSpread")}
            format={(v) => formatPercent(v, 2)}
            parse={parsePercent}
          />
          <ParamField
            label="Prima de riesgo país"
            source="JPMorgan EMBI+"
            value={waccInputs.countryRiskPremium}
            onChange={set("countryRiskPremium")}
            format={(v) => formatPercent(v, 1)}
            parse={parsePercent}
          />
          <ParamField
            label="Prima por liquidez"
            value={waccInputs.liquidityPremium}
            onChange={set("liquidityPremium")}
            format={(v) => formatPercent(v, 1)}
            parse={parsePercent}
          />
          <ParamField
            label="Prima empresa chica"
            value={waccInputs.smallCapPremium}
            onChange={set("smallCapPremium")}
            format={(v) => formatPercent(v, 1)}
            parse={parsePercent}
          />
          <ParamField
            label="Tasa impositiva (t)"
            value={waccInputs.taxRate}
            onChange={set("taxRate")}
            format={(v) => formatPercent(v, 1)}
            parse={parsePercent}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Tasas de descuento
            </p>
            <div className="space-y-2">
              <RateRow label="Kd (pre-tax)" value={formatPercent(rates.costOfDebtPretax, 2)} />
              <RateRow label="Kd (post-tax)" value={formatPercent(rates.costOfDebtAfterTax, 2)} />
              <RateRow label="Ku" value={formatPercent(rates.unleveredCostOfEquity, 2)} />
              <RateRow label="Ke" value={formatPercent(rates.costOfEquityFull, 2)} emphasis />
              <RateRow label="Kwacc" value={formatPercent(rates.wacc, 2)} emphasis />
              <RateRow label="Beta desapalancado (Bu)" value={rates.unleveredBeta.toFixed(2)} />
              <RateRow label="Beta reapalancado (Bl)" value={rates.releveredBeta.toFixed(2)} />
              <RateRow label="D/V proyecto" value={formatPercent(rates.projectDebtToValue, 1)} />
              <RateRow label="t" value={formatPercent(rates.taxRate, 1)} />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200/80 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Terminal value
            </p>
            <ParamField
              label="g (crecimiento perpetuo)"
              value={waccInputs.terminalGrowthRate}
              onChange={set("terminalGrowthRate")}
              format={(v) => formatPercent(v, 1)}
              parse={parsePercent}
            />
            <ParamField
              label="Ronic"
              helper="Retorno sobre capital invertido — referencia Excel"
              value={waccInputs.returnOnNewInvestedCapital}
              onChange={set("returnOnNewInvestedCapital")}
              format={(v) => formatPercent(v, 1)}
              parse={parsePercent}
            />
            <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-stone-600">
              <p>
                Valor residual en Año {valuation.years.length - 1}:{" "}
                <span className="font-semibold tabular-nums text-stone-900">
                  {formatUsd(valuation.years[valuation.years.length - 1]?.terminalValueUsd ?? 0)}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                Criterio Excel: último FFL operativo como VR en el horizonte.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Resultado valuación (FFL + VR)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label="VAN proyecto"
              value={compactFromUsd(valuation.npv, displayCurrency, exchangeRate)}
              hint="Inversión equity + FFL descontados + valor residual"
              tone="violet"
            />
            <KpiCard
              label="TIR proyecto"
              value={valuation.irr !== null ? formatPercent(valuation.irr) : "—"}
              hint="Sobre flujo FFL + VR (como Excel)"
              tone="emerald"
            />
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-4 py-3 text-xs text-stone-600">
            <p>
              Ke base:{" "}
              <span className="font-semibold tabular-nums">{formatPercent(rates.costOfEquityFull, 2)}</span>
              {" · "}
              Kwacc Año 1:{" "}
              <span className="font-semibold tabular-nums">
                {formatPercent(valuation.kwaccSchedule[0] ?? rates.wacc, 2)}
              </span>
              {" · "}
              Kwacc maduro:{" "}
              <span className="font-semibold tabular-nums">
                {formatPercent(
                  valuation.kwaccSchedule[valuation.kwaccSchedule.length - 1] ?? rates.wacc,
                  2,
                )}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Proyección de flujos y valor presente (Años 0–10)
        </p>
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              <th className="pb-3 pr-3">Concepto</th>
              {valuation.years.map((row) => (
                <th key={`val-head-${row.year}`} className="pb-3 px-2 text-right">
                  Año {row.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <ValuationRow
              label="TC (ARS / USD)"
              values={valuation.years.map((row) => row.exchangeRate)}
              format={(v) => v.toLocaleString("es-AR")}
              muted
            />
            <CountryRiskEvolutionRow
              years={valuation.years.map((row) => row.year)}
              values={countryRiskEvolution}
              onChange={onCountryRiskEvolutionChange}
              onReset={onResetCountryRiskEvolution}
            />
            <ValuationRow
              label="Kwacc"
              values={valuation.years.map((row) => row.kwacc)}
              format={(v) => formatPercent(v, 2)}
              highlight
            />
            <ValuationRow
              label="NOPAT"
              values={valuation.years.map((row) => row.nopatUsd)}
              format={formatCell}
            />
            <ValuationRow
              label="FFL"
              values={valuation.years.map((row) => row.fflUsd)}
              format={formatCell}
              emphasis
            />
            <ValuationRow
              label="Valor residual FFL"
              values={valuation.years.map((row) => row.terminalValueUsd)}
              format={formatCell}
              muted
            />
            <ValuationRow
              label="FFL + valor residual"
              values={valuation.years.map((row) => row.fflPlusTerminalUsd)}
              format={formatCell}
              highlight
            />
            <ValuationRow
              label="Factor de descuento"
              values={valuation.years.map((row) => row.discountFactor)}
              format={(v) => (v === 1 ? "1,00" : (1 / v).toFixed(2))}
              muted
            />
            <ValuationRow
              label="Valor presente FFL + VR"
              values={valuation.years.map((row) => row.presentValueUsd)}
              format={formatCell}
              total
            />
          </tbody>
        </table>
        <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
          <strong className="font-medium text-stone-600">FFL</strong> = flujo libre operativo (NOPAT −
          ajustes de capital de trabajo y reservas). Año 0 = desembolso equity.{" "}
          <strong className="font-medium text-stone-600">Kwacc</strong> = Rf + Bl×ERP + evolución
          riesgo país(t) + primas − madurez (desde Año 2). La fila amarilla es editable; base
          Excel: 5% en Año 0, luego 0%.
        </p>
      </div>
    </SectionCard>
  );
}

type ValuationRowProps = {
  label: string;
  values: number[];
  format: (value: number) => string;
  emphasis?: boolean;
  highlight?: boolean;
  muted?: boolean;
  total?: boolean;
};

type CountryRiskEvolutionRowProps = {
  years: number[];
  values: number[];
  onChange: (yearIndex: number, value: number) => void;
  onReset: () => void;
};

function CountryRiskEvolutionRow({ years, values, onChange, onReset }: CountryRiskEvolutionRowProps) {
  return (
    <tr className="bg-amber-50/70 text-[11px] text-stone-700 ring-1 ring-inset ring-amber-200/80">
      <td className="py-2.5 pr-3 align-top">
        <div className="space-y-1.5">
          <div>
            <span className="font-semibold text-stone-800">Evolución riesgo país</span>
            <span className="mt-0.5 block text-[10px] text-amber-900/70">Editable · % por año</span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-medium text-amber-950 shadow-sm transition hover:bg-amber-50"
          >
            Restablecer fila
          </button>
        </div>
      </td>
      {years.map((year, yearIndex) => {
        const value = values[yearIndex] ?? 0;
        return (
          <td key={`country-risk-${year}`} className="px-1 py-1.5 align-top">
            <input
              type="text"
              inputMode="decimal"
              defaultValue={formatPercent(value, 1)}
              key={`country-risk-${year}-${value}`}
              title={`Editar evolución riesgo país — Año ${year}`}
              onFocus={(event) => event.target.select()}
              onBlur={(event) => {
                const parsed = parsePercent(event.target.value);
                if (parsed !== null) onChange(yearIndex, parsed);
                else event.target.value = formatPercent(value, 1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className={`w-full min-w-[3.5rem] cursor-text rounded-md px-1.5 py-1.5 text-right text-xs font-semibold tabular-nums ${editableInput}`}
              aria-label={`Evolución riesgo país año ${year}`}
            />
          </td>
        );
      })}
    </tr>
  );
}

function ValuationRow({ label, values, format, emphasis, highlight, muted, total }: ValuationRowProps) {
  const rowClass = total
    ? "bg-slate-800 font-bold text-white"
    : highlight
      ? "bg-violet-50/80 font-semibold text-violet-950"
      : emphasis
        ? "bg-stone-100 font-semibold"
        : muted
          ? "text-[11px] text-stone-500"
          : "border-b border-stone-100";

  return (
    <tr className={rowClass}>
      <td className="py-2.5 pr-3">{label}</td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="px-2 py-2.5 text-right tabular-nums">
          {format(value)}
        </td>
      ))}
    </tr>
  );
}

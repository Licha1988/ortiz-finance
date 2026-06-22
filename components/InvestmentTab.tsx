"use client";

import { useMemo, useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import SectionCard from "@/components/ui/SectionCard";
import { DEFAULT_EERR_DATA } from "@/lib/cashflow/default-eerr";
import { TICKET_PROMEDIO } from "@/lib/cashflow/eerr-model-params";
import {
  extractBaseAnnualCovers,
} from "@/lib/cashflow/scenario-simulator";
import { DEFAULT_EXCHANGE_RATE, currencyLabel, type DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import {
  DEFAULT_KWACC_FINAL,
  DEFAULT_KWACC_INITIAL,
  DEFAULT_LOAN_RATE_ANNUAL,
  EQUITY_INVESTMENT_USD,
  TOTAL_INVESTMENT_USD,
  loanPrincipalFromStructure,
} from "@/lib/investment/project-data";
import {
  CASHFLOW_BRIDGE_LINES,
  type CashflowBridgeLineId,
} from "@/lib/investment/cashflow-bridge";
import { WORKING_CAPITAL_DAYS } from "@/lib/investment/working-capital";
import {
  buildBusinessFlowsFromEerr,
} from "@/lib/investment/eerr-operational-flows";
import {
  buildScenarioChartSeries,
  coversScaleFromVolumeIndex,
  totalHorizonCovers,
  VOLUME_INDEX_DEFAULT,
  VOLUME_INDEX_MAX,
  VOLUME_INDEX_MIN,
  VOLUME_INDEX_STEP,
} from "@/lib/investment/scenario-volume";
import {
  buildInvestorCashflow,
  type InvestmentModelParams,
} from "@/lib/investment/investor-cashflow";
import InvestmentSection from "@/components/InvestmentSection";
import ScenarioHorizonChart from "@/components/ScenarioHorizonChart";
import {
  formatCovers,
  formatCurrency,
  formatPercent,
  compactFromUsd,
  compactMoney,
} from "@/lib/format";
import { editableInput } from "@/lib/ui/tokens";

const TICKET_MIN = 20_000;
const TICKET_MAX = 50_000;
const TICKET_STEP = 500;

function bridgeValuesForLine(
  flows: { bridgeLines: { id: CashflowBridgeLineId; amountUsd: number }[] }[],
  lineId: CashflowBridgeLineId,
): number[] {
  return flows.map((flow) => {
    const line = flow.bridgeLines.find((item) => item.id === lineId);
    return line ? -line.amountUsd : 0;
  });
}

type SliderRowProps = {
  label: string;
  helper?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
};

function SliderRow({ label, helper, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-stone-600">{label}</span>
          {helper ? <p className="mt-0.5 text-[11px] text-stone-400">{helper}</p> : null}
        </div>
        <span className="text-sm font-semibold tabular-nums text-violet-900">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-violet-100 accent-violet-700"
      />
    </div>
  );
}

type ParamFieldProps = {
  label: string;
  helper?: string;
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
};

function ParamField({ label, helper, value, onChange, format, parse }: ParamFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {helper ? <span className="block text-[11px] text-stone-400">{helper}</span> : null}
      <input
        type="text"
        defaultValue={format(value)}
        key={`${label}-${value}`}
        onBlur={(event) => {
          const parsed = parse(event.target.value);
          if (parsed !== null) onChange(parsed);
        }}
        className={`w-full rounded-lg border border-stone-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-stone-900 ${editableInput}`}
      />
    </label>
  );
}

export default function InvestmentTab() {
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("usd");
  const [equityUsd, setEquityUsd] = useState(EQUITY_INVESTMENT_USD);
  const [totalUsd, setTotalUsd] = useState(TOTAL_INVESTMENT_USD);
  const [loanRatePct, setLoanRatePct] = useState(DEFAULT_LOAN_RATE_ANNUAL * 100);
  const [kwaccInitialPct, setKwaccInitialPct] = useState(DEFAULT_KWACC_INITIAL * 100);
  const [kwaccFinalPct, setKwaccFinalPct] = useState(DEFAULT_KWACC_FINAL * 100);

  const [ticket, setTicket] = useState(TICKET_PROMEDIO);
  const [volumeIndex, setVolumeIndex] = useState(VOLUME_INDEX_DEFAULT);

  const loanPrincipal = loanPrincipalFromStructure(totalUsd, equityUsd);
  const loanRate = loanRatePct / 100;
  const kwaccInitial = kwaccInitialPct / 100;
  const kwaccFinal = kwaccFinalPct / 100;

  const baseYear1Rows = useMemo(
    () => DEFAULT_EERR_DATA.years[0]?.rows ?? [],
    [],
  );
  const baseAnnualCovers = useMemo(
    () => extractBaseAnnualCovers(baseYear1Rows),
    [baseYear1Rows],
  );

  const coversScale = useMemo(
    () => coversScaleFromVolumeIndex(volumeIndex),
    [volumeIndex],
  );

  const totalCovers10y = useMemo(
    () => totalHorizonCovers(DEFAULT_EERR_DATA.years, coversScale),
    [coversScale],
  );

  const annualCoversYear1 = useMemo(
    () => Math.round(baseAnnualCovers * coversScale),
    [baseAnnualCovers, coversScale],
  );

  const businessFlows = useMemo(
    () =>
      buildBusinessFlowsFromEerr(DEFAULT_EERR_DATA.years, {
        ticket,
        coversScale,
        exchangeRate,
      }),
    [ticket, coversScale, exchangeRate],
  );

  const simY1 = useMemo(
    () => businessFlows[0],
    [businessFlows],
  );

  const investmentParams: InvestmentModelParams = useMemo(
    () => ({
      equityUsd,
      totalInvestmentUsd: totalUsd,
      loanRateAnnual: loanRate,
      kwaccInitial,
      kwaccFinal,
    }),
    [equityUsd, totalUsd, loanRate, kwaccInitial, kwaccFinal],
  );

  const cashflow = useMemo(
    () => buildInvestorCashflow(investmentParams, businessFlows),
    [investmentParams, businessFlows],
  );

  const chartSeries = useMemo(
    () =>
      buildScenarioChartSeries(
        DEFAULT_EERR_DATA.years,
        businessFlows,
        cashflow.equityCashFlows,
        coversScale,
      ),
    [businessFlows, cashflow.equityCashFlows, coversScale],
  );

  const totals10y = useMemo(() => {
    const nopat = businessFlows.reduce((sum, row) => sum + row.nopatUsd, 0);
    const dividends = cashflow.years.reduce((sum, row) => sum + row.equityFfl, 0);
    return { nopat, dividends };
  }, [businessFlows, cashflow.years]);

  const handleReset = () => {
    setExchangeRate(DEFAULT_EXCHANGE_RATE);
    setDisplayCurrency("usd");
    setEquityUsd(EQUITY_INVESTMENT_USD);
    setTotalUsd(TOTAL_INVESTMENT_USD);
    setLoanRatePct(DEFAULT_LOAN_RATE_ANNUAL * 100);
    setKwaccInitialPct(DEFAULT_KWACC_INITIAL * 100);
    setKwaccFinalPct(DEFAULT_KWACC_FINAL * 100);
    setTicket(TICKET_PROMEDIO);
    setVolumeIndex(VOLUME_INDEX_DEFAULT);
  };

  return (
    <div className="space-y-6">
      <InvestmentSection
        equityUsd={equityUsd}
        totalUsd={totalUsd}
        loanPrincipal={loanPrincipal}
        loanRatePct={loanRatePct}
      />

      <SectionCard
        title="Simulador de escenarios"
        subtitle="Horizonte 10 años · mismo factor de volumen en cada año EERR"
        tone="cashflow"
        className="rounded-2xl ring-1 ring-stone-200/60"
      >
        <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              El volumen escala cubiertos, ventas, NOPAT y dividendos en Años 1–10 (EERR base intacto)
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
            >
              Restaurar valores base
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(280px,320px)_minmax(280px,320px)_1fr]">
          <div className="space-y-4 rounded-xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Operación · 10 años
            </p>
            <SliderRow
              label="Índice de volumen"
              helper={`×${coversScale.toFixed(2)} sobre cubiertos base de cada año · total 10a: ${formatCovers(totalCovers10y)} (A1 ref.: ${formatCovers(annualCoversYear1)})`}
              value={volumeIndex}
              min={VOLUME_INDEX_MIN}
              max={VOLUME_INDEX_MAX}
              step={VOLUME_INDEX_STEP}
              display={`${volumeIndex}%`}
              onChange={setVolumeIndex}
            />
            <SliderRow
              label="Ticket promedio"
              helper="Aplica a todos los años del horizonte"
              value={ticket}
              min={TICKET_MIN}
              max={TICKET_MAX}
              step={TICKET_STEP}
              display={formatCurrency(ticket)}
              onChange={setTicket}
            />
            <div className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <KpiCard
                label="NOPAT acum. 10a"
                value={compactFromUsd(totals10y.nopat, displayCurrency, exchangeRate)}
                hint={`Año 1: ${compactFromUsd(simY1?.nopatUsd ?? 0, displayCurrency, exchangeRate)}`}
                tone="emerald"
              />
              <KpiCard
                label="Dividendos acum. 10a"
                value={compactFromUsd(totals10y.dividends, displayCurrency, exchangeRate)}
                hint={`Año 1: ${compactFromUsd(cashflow.years[0]?.equityFfl ?? 0, displayCurrency, exchangeRate)}`}
                tone="violet"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-stone-200/80 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Capital e inversión (USD)
            </p>
            <ParamField
              label="TC (ARS / USD)"
              helper="Convierte resultados EERR a USD en cash flow"
              value={exchangeRate}
              onChange={setExchangeRate}
              format={(v) => String(v)}
              parse={(raw) => {
                const n = Number(raw.replace(/\./g, "").replace(",", "."));
                return Number.isFinite(n) && n > 0 ? n : null;
              }}
            />
            <ParamField
              label="Equity inversores (Año 0)"
              helper="Desembolso equity — como Excel (-431.000)"
              value={equityUsd}
              onChange={setEquityUsd}
              format={(v) => String(v)}
              parse={(raw) => {
                const n = Number(raw.replace(/\D/g, ""));
                return Number.isFinite(n) && n > 0 ? n : null;
              }}
            />
            <ParamField
              label="Inversión total proyecto"
              helper="Equity + préstamo de protección"
              value={totalUsd}
              onChange={setTotalUsd}
              format={(v) => String(v)}
              parse={(raw) => {
                const n = Number(raw.replace(/\D/g, ""));
                return Number.isFinite(n) && n > 0 ? n : null;
              }}
            />
            <ParamField
              label="Tasa préstamo (USD/año)"
              value={loanRatePct}
              onChange={setLoanRatePct}
              format={(v) => `${v.toFixed(2)}%`}
              parse={(raw) => {
                const n = Number(raw.replace(",", ".").replace("%", ""));
                return Number.isFinite(n) && n >= 0 ? n : null;
              }}
            />
            <ParamField
              label="Kwacc inicial"
              value={kwaccInitialPct}
              onChange={setKwaccInitialPct}
              format={(v) => `${v.toFixed(2)}%`}
              parse={(raw) => {
                const n = Number(raw.replace(",", ".").replace("%", ""));
                return Number.isFinite(n) && n >= 0 ? n : null;
              }}
            />
            <ParamField
              label="Kwacc final (año 11)"
              value={kwaccFinalPct}
              onChange={setKwaccFinalPct}
              format={(v) => `${v.toFixed(2)}%`}
              parse={(raw) => {
                const n = Number(raw.replace(",", ".").replace("%", ""));
                return Number.isFinite(n) && n >= 0 ? n : null;
              }}
            />
            <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-stone-600">
              <p>
                Préstamo:{" "}
                <span className="font-semibold tabular-nums text-stone-900">
                  {compactFromUsd(loanPrincipal, displayCurrency, exchangeRate)}
                </span>{" "}
                ({formatPercent(loanPrincipal / totalUsd)} del proyecto)
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                Protege el equity: la diferencia entre inversión total y aporte de inversores.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Retorno al equity (10 años)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="VAN"
                value={compactFromUsd(cashflow.npv, displayCurrency, exchangeRate)}
                hint="Flujo neto al equity descontado"
                tone="violet"
              />
              <KpiCard
                label="TIR"
                value={cashflow.irr !== null ? formatPercent(cashflow.irr) : "—"}
                hint="Sobre flujo neto al equity"
                tone="emerald"
              />
              <KpiCard
                label="Payback"
                value={
                  cashflow.paybackYears !== null
                    ? `${cashflow.paybackYears.toFixed(1)} años`
                    : "—"
                }
                hint="Recuperación del equity"
                tone="stone"
              />
            </div>
            <div className="rounded-xl border border-stone-200/80 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                NOPAT vs dividendos por año
              </p>
              <ScenarioHorizonChart
                series={chartSeries}
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Cash flow al inversor"
        subtitle="Resultado del negocio (EERR) → servicio de deuda → flujo neto al equity"
        tone="investment"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/50 px-5 py-4">
          <p className="text-xs text-stone-500">
            TC {exchangeRate.toLocaleString("es-AR")} ARS/USD · mismo criterio que pestaña EERR
          </p>
          <div className="flex rounded-full border border-stone-200 bg-white p-0.5 shadow-sm">
            {(["ars", "usd"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDisplayCurrency(option)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase transition ${
                  displayCurrency === option
                    ? "bg-violet-800 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {currencyLabel(option)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="pb-3 pr-3">Concepto</th>
                <th className="pb-3 pr-2 text-right">Año 0</th>
                {cashflow.years.map((row) => (
                  <th key={`head-${row.year}`} className="pb-3 px-2 text-right">
                    Año {row.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CashflowRow
                label="Inversión equity"
                values={[-equityUsd, ...cashflow.years.map(() => 0)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                emphasis
              />
              <CashflowRow
                label="Ventas"
                values={[0, ...cashflow.years.map((row) => row.ventasArs)]}
                valueKind="ars"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
              <CashflowRow
                label="EBITDA"
                values={[0, ...cashflow.years.map((row) => row.ebitdaArs)]}
                valueKind="ars"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
              <CashflowRow
                label="NOPAT (= Resultado neto EERR)"
                values={[0, ...cashflow.years.map((row) => row.netResultArs)]}
                valueKind="ars"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                netResult
              />
              {CASHFLOW_BRIDGE_LINES.map((line) => (
                <CashflowRow
                  key={line.id}
                  label={line.label}
                  values={[0, ...bridgeValuesForLine(cashflow.years, line.id)]}
                  valueKind="usd"
                  currency={displayCurrency}
                  exchangeRate={exchangeRate}
                  bridge
                />
              ))}
              <CashflowRow
                label="Retención en el negocio (subtotal)"
                values={[0, ...cashflow.years.map((row) => -row.bridgeTotalUsd)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                bridgeSubtotal
              />
              <CashflowRow
                label="FFL operativo"
                values={[0, ...cashflow.years.map((row) => row.operationalFflUsd)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                highlight
              />
              <CashflowRow
                label="Saldo préstamo (inicio)"
                values={[loanPrincipal, ...cashflow.years.map((row) => row.balanceStart)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                muted
              />
              <CashflowRow
                label={`Interés préstamo (${Math.round(loanRatePct)}%)`}
                values={[0, ...cashflow.years.map((row) => -row.interestPaid)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                debt
              />
              <CashflowRow
                label="Amortización capital"
                values={[0, ...cashflow.years.map((row) => -row.principalPaid)]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                debt
              />
              <CashflowRow
                label="Dividendos (FFL to Equity)"
                values={cashflow.equityCashFlows}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                total
              />
              <CashflowRow
                label="Valor presente (equity)"
                values={[
                  cashflow.equityCashFlows[0],
                  ...cashflow.years.map((row) => row.presentValue),
                ]}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                muted
              />
            </tbody>
          </table>
          <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
            <strong className="font-medium text-stone-600">NOPAT</strong> = Resultado neto del EERR
            (aguinaldo e impuestos ya están en el estado de resultados).
            <strong className="font-medium text-stone-600"> Δ NOF</strong> = variación anual del stock
            (Caja {WORKING_CAPITAL_DAYS.caja}d + Clientes {WORKING_CAPITAL_DAYS.clientes}d − Proveedores{" "}
            {WORKING_CAPITAL_DAYS.proveedores}d) sobre ventas y costos variables anuales del EERR.
            <strong className="font-medium text-stone-600"> Dividendos</strong> = FFL operativo neto de
            servicio de deuda (interés primero, luego capital).
            <span className="mt-1 block text-stone-500">*no contempla IIGG</span>
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

type CashflowRowProps = {
  label: string;
  values: number[];
  valueKind: "ars" | "usd";
  currency: DisplayCurrency;
  exchangeRate: number;
  emphasis?: boolean;
  highlight?: boolean;
  debt?: boolean;
  total?: boolean;
  muted?: boolean;
  netResult?: boolean;
  bridge?: boolean;
  bridgeSubtotal?: boolean;
};

function CashflowRow({
  label,
  values,
  valueKind,
  currency,
  exchangeRate,
  emphasis,
  highlight,
  debt,
  total,
  muted,
  netResult,
  bridge,
  bridgeSubtotal,
}: CashflowRowProps) {
  const rowClass = total
    ? "bg-slate-800 font-bold text-white"
    : netResult
      ? "bg-orange-500 font-bold text-white"
      : highlight
        ? "bg-violet-50/80 font-semibold text-violet-950"
        : debt
          ? "bg-amber-50/50 text-amber-950"
          : bridgeSubtotal
            ? "border-y border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-600"
            : bridge
              ? "text-[11px] text-stone-500"
              : emphasis
                ? "bg-stone-100 font-semibold"
                : muted
                  ? "text-stone-500"
                  : "border-b border-stone-100";

  const formatCell = (value: number) =>
    valueKind === "ars"
      ? compactMoney(value, currency, exchangeRate)
      : compactFromUsd(value, currency, exchangeRate);

  return (
    <tr className={rowClass}>
      <td className="py-2.5 pr-3">{label}</td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="px-2 py-2.5 text-right tabular-nums">
          {formatCell(value)}
        </td>
      ))}
    </tr>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useEerrModel } from "@/components/EerrModelProvider";
import KpiCard from "@/components/ui/KpiCard";
import SectionCard from "@/components/ui/SectionCard";
import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { DEFAULT_EXCHANGE_RATE, currencyLabel, type DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import { kwaccForInvestorYears } from "@/lib/cashflow/parse-cashflow-excel";
import {
  DEFAULT_LOAN_RATE_ANNUAL,
  BASE_KWACC_SCHEDULE,
  EQUITY_INVESTMENT_USD,
  FINANCING_TOTAL_USD,
  OPERATOR_EQUITY_SHARE,
  loanPrincipalFromStructure,
} from "@/lib/investment/project-data";
import {
  CASHFLOW_BRIDGE_LINES,
  type CashflowBridgeLineId,
} from "@/lib/investment/cashflow-bridge";
import {
  buildScenarioChartSeries,
  totalHorizonCovers,
} from "@/lib/investment/scenario-volume";
import {
  buildScenarioBusinessFlowsFromEerr,
  isOperationalScenarioActive,
  resolveTicketFromParams,
  scenarioAnnualCovers,
  scenarioYear1Kpis,
} from "@/lib/investment/operational-scenario";
import {
  buildInvestorCashflow,
  type InvestmentModelParams,
} from "@/lib/investment/investor-cashflow";
import { withEditableTierRates } from "@/lib/investment/operator-margin-bonus";
import OperatorBonusPanel from "@/components/OperatorBonusPanel";
import EbitdaMarginHorizon from "@/components/EbitdaMarginHorizon";
import InvestmentSection from "@/components/InvestmentSection";
import EerrExcelActions from "@/components/EerrExcelActions";
import ScenarioHorizonChart from "@/components/ScenarioHorizonChart";
import ParamField from "@/components/ui/ParamField";
import ScenarioAdjustField from "@/components/ui/ScenarioAdjustField";
import {
  formatCovers,
  formatPercent,
  compactCurrency,
  compactFromUsd,
  compactMoney,
} from "@/lib/format";

function withYearZero(yearZero: number, values: number[]): number[] {
  return [yearZero, ...values];
}

function bridgeValuesForLine(
  flows: { bridgeLines: { id: CashflowBridgeLineId; amountUsd: number }[] }[],
  lineId: CashflowBridgeLineId,
): number[] {
  const values = flows.map((flow) => {
    const line = flow.bridgeLines.find((item) => item.id === lineId);
    return line ? -line.amountUsd : 0;
  });
  return withYearZero(0, values);
}

export default function InvestmentTab() {
  const { parsed: eerrModel, source } = useEerrModel();

  const excelSchedule = eerrModel.cashFlowSchedule;
  const excelTcDefault =
    excelSchedule?.exchangeRates[1] ?? DEFAULT_EXCHANGE_RATE;

  const [exchangeRateOverride, setExchangeRateOverride] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("usd");
  const [loanRatePct, setLoanRatePct] = useState(DEFAULT_LOAN_RATE_ANNUAL * 100);
  const [volumeChangePct, setVolumeChangePct] = useState(0);
  const [ticketChangePct, setTicketChangePct] = useState(0);
  const [operatorBonusRatesPct, setOperatorBonusRatesPct] = useState([10, 25, 40, 50]);

  const operatorBonusTiers = useMemo(
    () => withEditableTierRates(operatorBonusRatesPct),
    [operatorBonusRatesPct],
  );

  const handleBonusRateChange = (index: number, ratePct: number) => {
    setOperatorBonusRatesPct((prev) =>
      prev.map((value, i) => (i === index ? ratePct : value)),
    );
  };

  const operationalScenario = useMemo(
    () => ({ volumeChangePct, ticketChangePct }),
    [volumeChangePct, ticketChangePct],
  );
  const scenarioActive = isOperationalScenarioActive(operationalScenario);

  const baseTicket = useMemo(
    () => resolveTicketFromParams(eerrModel.params),
    [eerrModel.params],
  );
  const scenarioTicket = baseTicket * (1 + ticketChangePct / 100);

  const equityUsd = EQUITY_INVESTMENT_USD;
  const totalUsd = FINANCING_TOTAL_USD;
  const exchangeRate = exchangeRateOverride ?? excelTcDefault;

  const loanPrincipal = loanPrincipalFromStructure(totalUsd, equityUsd);
  const loanRate = loanRatePct / 100;

  const kwaccScheduleFull = useMemo((): number[] => {
    if (eerrModel.kwaccSchedule && eerrModel.kwaccSchedule.length > 0) {
      return eerrModel.kwaccSchedule;
    }
    return [...BASE_KWACC_SCHEDULE];
  }, [eerrModel.kwaccSchedule]);

  const excelDrivesInvestment = excelSchedule != null;

  const kwaccForInvestorDiscount = useMemo(
    () => kwaccForInvestorYears(kwaccScheduleFull),
    [kwaccScheduleFull],
  );

  const year1Kpis = useMemo(
    () => scenarioYear1Kpis(eerrModel.years, operationalScenario, baseTicket),
    [eerrModel.years, operationalScenario, baseTicket],
  );

  const baseYear1Covers = useMemo(
    () => extractYearKpisFromRows(eerrModel.years[0]?.rows ?? []).annualCovers,
    [eerrModel.years],
  );

  const totalCovers10y = useMemo(() => {
    if (!scenarioActive) return totalHorizonCovers(eerrModel.years);
    return scenarioAnnualCovers(eerrModel.years, volumeChangePct).reduce(
      (sum, value) => sum + value,
      0,
    );
  }, [eerrModel.years, scenarioActive, volumeChangePct]);

  const businessFlows = useMemo(
    () =>
      buildScenarioBusinessFlowsFromEerr(
        eerrModel.years,
        {
          exchangeRate,
          cashFlowSchedule: excelSchedule,
        },
        operationalScenario,
        baseTicket,
      ),
    [eerrModel.years, exchangeRate, excelSchedule, operationalScenario, baseTicket],
  );

  const flowY1 = useMemo(() => businessFlows[0], [businessFlows]);

  const investmentParams: InvestmentModelParams = useMemo(
    () => ({
      equityUsd,
      totalInvestmentUsd: totalUsd,
      loanRateAnnual: loanRate,
      kwaccInitial: kwaccForInvestorDiscount[0] ?? kwaccScheduleFull[0] ?? 0,
      kwaccFinal:
        kwaccForInvestorDiscount[kwaccForInvestorDiscount.length - 1] ??
        kwaccScheduleFull[kwaccScheduleFull.length - 1] ??
        0,
      kwaccSchedule: kwaccForInvestorDiscount,
      kwaccScheduleFull: kwaccScheduleFull,
    }),
    [equityUsd, totalUsd, loanRate, kwaccForInvestorDiscount, kwaccScheduleFull],
  );

  const exchangeRatesByYear = useMemo(
    () =>
      businessFlows.map((_, index) => {
        const fromSchedule = excelSchedule?.exchangeRates[index + 1];
        return fromSchedule && fromSchedule > 0 ? fromSchedule : exchangeRate;
      }),
    [businessFlows, excelSchedule, exchangeRate],
  );

  const cashflow = useMemo(
    () =>
      buildInvestorCashflow(investmentParams, businessFlows, {
        operatorBonusTiers,
        exchangeRatesByYear,
      }),
    [investmentParams, businessFlows, operatorBonusTiers, exchangeRatesByYear],
  );

  const chartSeries = useMemo(() => {
    if (!scenarioActive) {
      return buildScenarioChartSeries(
        eerrModel.years,
        businessFlows,
        cashflow.investorDividendsUsd,
      );
    }
    const covers = scenarioAnnualCovers(eerrModel.years, volumeChangePct);
    return businessFlows.map((flow, index) => ({
      year: flow.year,
      covers: covers[index] ?? 0,
      nopatUsd: flow.nopatUsd,
      dividendsUsd: cashflow.investorDividendsUsd[index] ?? 0,
    }));
  }, [
    eerrModel.years,
    businessFlows,
    cashflow.investorDividendsUsd,
    scenarioActive,
    volumeChangePct,
  ]);

  const totals10y = useMemo(() => {
    const nopat = businessFlows.reduce((sum, row) => sum + row.nopatUsd, 0);
    const dividends = cashflow.investorDividendsUsd.reduce((sum, value) => sum + value, 0);
    return { nopat, dividends };
  }, [businessFlows, cashflow.investorDividendsUsd]);

  const fflFromExcel = businessFlows.some((flow) => flow.fflFromExcel);

  const handleReset = () => {
    setExchangeRateOverride(null);
    setDisplayCurrency("usd");
    setLoanRatePct(DEFAULT_LOAN_RATE_ANNUAL * 100);
    setVolumeChangePct(0);
    setTicketChangePct(0);
    setOperatorBonusRatesPct([10, 25, 40, 50]);
  };

  const modelSourceLabel =
    source === "import"
      ? eerrModel.sourceFileName
      : source === "bundled"
        ? "ortiz-cashflow.xlsx (repo)"
        : "modelo embebido (fallback)";

  return (
    <div className="space-y-6">
      <InvestmentSection
        equityUsd={equityUsd}
        loanPrincipal={loanPrincipal}
        loanRatePct={loanRatePct}
      />

      <SectionCard
        title="Inversión · datos del Excel"
        subtitle={`${modelSourceLabel} · EERR (P&L) + hoja Cash Flow (NOPAT, FFL, Kwacc)`}
        tone="cashflow"
        className="rounded-2xl ring-1 ring-stone-200/60"
      >
        <div className="border-b border-stone-100 bg-stone-50/50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              Ventas, EBITDA y resultado neto desde filas EERR · NOPAT y FFL operativo desde Cash
              Flow cuando el archivo los incluye
              {scenarioActive ? (
                <span className="mt-1 block font-medium text-violet-800">
                  Escenario activo: cubiertos {volumeChangePct >= 0 ? "+" : ""}
                  {volumeChangePct}% · ticket {ticketChangePct >= 0 ? "+" : ""}
                  {ticketChangePct}% — recálculo automático en toda la pestaña
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <EerrExcelActions />
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
              >
                Restablecer parámetros de inversión
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(280px,320px)_minmax(280px,320px)_1fr]">
          <div className="space-y-4 rounded-xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              {scenarioActive ? "Operación · escenario" : "Operación · 10 años (Excel)"}
            </p>
            <div className="space-y-3 text-sm text-stone-700">
              <p>
                Ticket promedio:{" "}
                <span className="font-semibold tabular-nums text-violet-900">
                  {compactCurrency(scenarioTicket)} ARS
                </span>
                {scenarioActive && ticketChangePct !== 0 ? (
                  <span className="ml-1 text-[11px] text-stone-400">
                    (base {compactCurrency(baseTicket)})
                  </span>
                ) : null}
              </p>
              <p>
                Cubiertos Año 1:{" "}
                <span className="font-semibold tabular-nums text-violet-900">
                  {formatCovers(year1Kpis.annualCovers)}
                </span>
                {scenarioActive && volumeChangePct !== 0 ? (
                  <span className="ml-1 text-[11px] text-stone-400">
                    (base {formatCovers(baseYear1Covers)})
                  </span>
                ) : null}
              </p>
              <p>
                Cubiertos acum. 10a:{" "}
                <span className="font-semibold tabular-nums text-violet-900">
                  {formatCovers(totalCovers10y)}
                </span>
              </p>
              <p className="text-[11px] leading-relaxed text-stone-500">
                EBITDA Año 1:{" "}
                <span className="font-medium tabular-nums text-stone-700">
                  {compactMoney(year1Kpis.ebitda, displayCurrency, exchangeRate)}
                </span>
                {excelDrivesInvestment ? (
                  <span className="mt-1 block">NOPAT y FFL: hoja Cash Flow del Excel</span>
                ) : (
                  <span className="mt-1 block">
                    Sin hoja Cash Flow: NOPAT = resultado neto EERR ÷ TC
                  </span>
                )}
              </p>
            </div>
            <div className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <KpiCard
                label="NOPAT acum. 10a"
                value={compactFromUsd(totals10y.nopat, displayCurrency, exchangeRate)}
                hint={`Año 1: ${compactFromUsd(flowY1?.nopatUsd ?? 0, displayCurrency, exchangeRate)}`}
                tone="emerald"
              />
              <KpiCard
                label="Dividendos acum. 10a"
                value={compactFromUsd(totals10y.dividends, displayCurrency, exchangeRate)}
                hint={`Año 1: ${compactFromUsd(cashflow.investorDividendsUsd[0] ?? 0, displayCurrency, exchangeRate)}`}
                tone="violet"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-stone-200/80 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Parámetros
            </p>
            <ParamField
              label="TC (ARS / USD)"
              helper={
                excelDrivesInvestment
                  ? `Default Excel: ${excelTcDefault.toLocaleString("es-AR")}`
                  : "Convierte resultados EERR a USD en cash flow"
              }
              value={exchangeRate}
              onChange={setExchangeRateOverride}
              format={(v) => String(v)}
              parse={(raw) => {
                const n = Number(raw.replace(/\./g, "").replace(",", "."));
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
            <div className="space-y-4 border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                Escenario operativo
              </p>
              <ScenarioAdjustField
                label="Cubiertos (volumen)"
                helper="Escala cubiertos en los 10 años conservando el ramp-up mensual de cada año."
                baseDisplay={formatCovers(baseYear1Covers) + " Año 1"}
                valuePct={volumeChangePct}
                onChange={setVolumeChangePct}
                min={-50}
                max={50}
              />
              <ScenarioAdjustField
                label="Ticket promedio"
                helper="Precio por cubierto. Costos variables escalan con ventas; estructura fija."
                baseDisplay={`${compactCurrency(baseTicket)} ARS`}
                valuePct={ticketChangePct}
                onChange={setTicketChangePct}
                min={-50}
                max={50}
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Retorno al equity (10 años)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="TIR equity"
                value={cashflow.irr !== null ? formatPercent(cashflow.irr) : "—"}
                hint="Flujo nominal Año 0 + dividendos netos"
                tone="violet"
              />
              <KpiCard
                label="VAN equity"
                value={compactFromUsd(cashflow.npv, displayCurrency, exchangeRate)}
                hint="Descontado con Kwacc del Excel"
                tone="emerald"
              />
              <KpiCard
                label="Payback"
                value={
                  cashflow.paybackYears !== null
                    ? `${cashflow.paybackYears.toFixed(1)} años`
                    : "—"
                }
                hint={
                  cashflow.paybackYears !== null
                    ? cashflow.equityReleaseYear !== null
                      ? `Liberación operadores Año ${cashflow.equityReleaseYear}`
                      : `${cashflow.paybackYears.toFixed(1)} años`
                    : "Recuperación del equity"
                }
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
            TC {exchangeRate.toLocaleString("es-AR")} ARS/USD · Ventas y EBITDA en ARS (EERR)
            {scenarioActive ? (
              <>
                {" "}
                · Escenario: cubiertos {volumeChangePct >= 0 ? "+" : ""}
                {volumeChangePct}% · ticket {ticketChangePct >= 0 ? "+" : ""}
                {ticketChangePct}%
              </>
            ) : null}
            {fflFromExcel ? (
              <> · NOPAT y FFL operativo desde hoja Cash Flow (Excel)</>
            ) : (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-amber-800">
                  FFL estimado — reimportá el Excel para alinear al Cash Flow
                </span>
              </>
            )}
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
                <th className="pb-3 px-2 text-right">Año 0</th>
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
                values={withYearZero(
                  -equityUsd,
                  cashflow.years.map(() => 0),
                )}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                emphasis
              />
              <CashflowRow
                label="Ventas"
                values={withYearZero(0, cashflow.years.map((row) => row.ventasArs))}
                valueKind="ars"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
              <CashflowRow
                label="EBITDA"
                values={withYearZero(0, cashflow.years.map((row) => row.ebitdaArs))}
                valueKind="ars"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
              <CashflowRow
                label="NOPAT (USD · Cash Flow / EERR÷TC)"
                values={withYearZero(0, cashflow.years.map((row) => row.nopatUsd))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                netResult
              />
              {CASHFLOW_BRIDGE_LINES.map((line) => (
                <CashflowRow
                  key={line.id}
                  label={line.label}
                  values={bridgeValuesForLine(cashflow.years, line.id)}
                  valueKind="usd"
                  currency={displayCurrency}
                  exchangeRate={exchangeRate}
                  bridge
                />
              ))}
              <CashflowRow
                label="FFL operativo"
                values={withYearZero(0, cashflow.years.map((row) => row.operationalFflUsd))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                highlight
              />
              <CashflowRow
                label="Saldo préstamo (inicio)"
                values={withYearZero(0, cashflow.years.map((row) => row.balanceStart))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                muted
              />
              <CashflowRow
                label={`Interés préstamo (${Math.round(loanRatePct)}%)`}
                values={withYearZero(0, cashflow.years.map((row) => -row.interestPaid))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                debt
              />
              <CashflowRow
                label="Amortización capital"
                values={withYearZero(0, cashflow.years.map((row) => -row.principalPaid))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                debt
              />
              <CashflowRow
                label="Dividendos disponibles (FFL to equity)"
                values={withYearZero(0, cashflow.years.map((row) => row.equityFfl))}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
              />
              <CashflowRow
                label="Bono operadores (margen EBITDA · tramos)"
                values={withYearZero(0, cashflow.operatorBonusUsd)}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                operatorBonus
              />
              <CashflowRow
                label={`Liberación equity operadores (${Math.round(OPERATOR_EQUITY_SHARE * 100)}% · post payback)`}
                values={withYearZero(0, cashflow.operatorEquityReleaseUsd)}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                emphasis
              />
              <CashflowRow
                label="Dividendos inversores (neto)"
                values={withYearZero(0, cashflow.investorDividendsUsd)}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                total
              />
              <CashflowRow
                label={`TIR equity · flujo nominal (−${Math.round(equityUsd / 1000)}k Año 0 + dividendos netos)`}
                resultValue={
                  cashflow.irr !== null ? formatPercent(cashflow.irr) : "—"
                }
                values={cashflow.equityMetricsFlows}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                muted
              />
              <CashflowRow
                label="VAN equity · flujos descontados (Kwacc)"
                resultValue={compactFromUsd(cashflow.npv, displayCurrency, exchangeRate)}
                values={cashflow.vanPresentValues}
                valueKind="usd"
                currency={displayCurrency}
                exchangeRate={exchangeRate}
                highlight
              />
            </tbody>
          </table>
          <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
            <strong className="font-medium text-stone-600">Reserva despidos</strong> = 1% de
            RRHH del EERR (param «Fondo Despidos») · aplica desde{" "}
            <strong className="font-medium text-stone-600">Año 1</strong> en el modelo.{" "}
            <strong className="font-medium text-stone-600">FFL operativo</strong>
            {fflFromExcel
              ? " = fila FFL del Excel (coincide con el archivo; el resto del puente NOPAT→FFL está implícito en el Excel)."
              : " = NOPAT − reserva despidos (estimado si no hay Excel)."}
            <strong className="font-medium text-stone-600"> Dividendos disponibles</strong> = FFL operativo neto
            de servicio de deuda (interés primero, luego capital).{" "}
            <strong className="font-medium text-stone-600">Bono operadores</strong> = % marginal del EBITDA
            según tramos de margen (5–10%, 10–15%, 15–20%, 20% o +); se descuenta del FFL to equity antes
            del reparto.{" "}
            <strong className="font-medium text-stone-600">Liberación operadores</strong> ={" "}
            {Math.round(OPERATOR_EQUITY_SHARE * 100)}% del FFL remanente post-bono desde payback; desde
            ese año el reparto es 70% inversor / 30% operadores sobre el excedente.{" "}
            <strong className="font-medium text-stone-600">VAN/TIR</strong> solo sobre{" "}
            <strong className="font-medium text-stone-600">equity inversores</strong>: aporte{" "}
            <strong className="font-medium text-stone-600">−{Math.round(equityUsd / 1000)}k</strong>{" "}
            en <strong className="font-medium text-stone-600">Año 0</strong> + dividendos netos
            (Años 1–10). Año 1 VAN = solo VP del dividendo; Año 0 VAN = −equity sin descontar.
            <span className="mt-1 block text-stone-500">*no contempla IIGG</span>
          </p>
        </div>

        <EbitdaMarginHorizon schedule={cashflow.operatorBonusSchedule} />

        <OperatorBonusPanel
          tierRatesPct={operatorBonusRatesPct}
          onTierRateChange={handleBonusRateChange}
          totalBonusUsd={cashflow.totalOperatorBonusUsd}
          displayCurrency={displayCurrency}
          exchangeRate={exchangeRate}
          year1MarginPct={cashflow.operatorBonusSchedule[0]?.operationalMarginPct ?? 0}
          year1BonusUsd={cashflow.operatorBonusUsd[0] ?? 0}
        />
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
  /** TIR / VAN u otro total mostrado junto al concepto. */
  resultValue?: string;
  emphasis?: boolean;
  highlight?: boolean;
  debt?: boolean;
  total?: boolean;
  muted?: boolean;
  netResult?: boolean;
  bridge?: boolean;
  operatorBonus?: boolean;
};

function CashflowRow({
  label,
  values,
  valueKind,
  currency,
  exchangeRate,
  resultValue,
  emphasis,
  highlight,
  debt,
  total,
  muted,
  netResult,
  bridge,
  operatorBonus,
}: CashflowRowProps) {
  const rowClass = total
    ? "bg-slate-800 font-bold text-white"
    : netResult
      ? "bg-orange-500 font-bold text-white"
      : highlight
        ? "bg-violet-50/80 font-semibold text-violet-950"
        : operatorBonus
          ? "bg-teal-50/80 font-semibold text-teal-950"
          : debt
            ? "bg-amber-50/50 text-amber-950"
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
      <td className="py-2.5 pr-3">
        <span>{label}</span>
        {resultValue ? (
          <span className="ml-2 inline-block rounded-md bg-white/80 px-2 py-0.5 text-sm font-bold tabular-nums ring-1 ring-stone-200/80">
            {resultValue}
          </span>
        ) : null}
      </td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className="px-2 py-2.5 text-right tabular-nums">
          {formatCell(value)}
        </td>
      ))}
    </tr>
  );
}

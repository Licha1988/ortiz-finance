"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import EerrScenarioPanel from "@/components/EerrScenarioPanel";
import EerrStatementTable from "@/components/EerrStatementTable";
import EerrExcelActions from "@/components/EerrExcelActions";
import { isBundledEerrModel, useEerrModel } from "@/components/EerrModelProvider";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import SectionCard from "@/components/ui/SectionCard";
import { extractYearKpisFromRows } from "@/lib/cashflow/eerr-kpis";
import { type EerrYearId } from "@/lib/cashflow/eerr-years";
import { formatMillionsForCurrency, formatPercent } from "@/lib/format";
import {
  DEFAULT_EXCHANGE_RATE,
  type DisplayCurrency,
} from "@/lib/cashflow/exchange-rate";
import { isFullOperationYear } from "@/lib/cashflow/eerr-years";
import EerrCurrencyBar from "@/components/EerrCurrencyBar";
import { BUNDLED_EERR_SOURCE_NAME } from "@/lib/cashflow/load-eerr-model";
import { isEerrImportAllowed } from "@/lib/cashflow/eerr-model-admin";
import { resolveTicketFromParams } from "@/lib/investment/operational-scenario";

export default function CashflowExcelView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    parsed,
    source,
    loading,
    loadError,
    replaceFromFile,
    restoreBundled,
  } = useEerrModel();
  const [activeYearId, setActiveYearId] = useState<EerrYearId>("year1");
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("ars");
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const activeYear =
    parsed.years.find((year) => year.id === activeYearId) ?? parsed.years[0];

  const processFile = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        await replaceFromFile(file);
      } catch (caught) {
        setImportError(
          caught instanceof Error ? caught.message : "No se pudo leer el archivo.",
        );
      }
    },
    [replaceFromFile],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void processFile(file);
      event.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const kpis = useMemo(() => {
    const rows = activeYear?.rows ?? [];
    const extracted = extractYearKpisFromRows(rows);
    const yearSales = extracted.yearSales;
    const yearEbitda = extracted.ebitda;
    const yearNet = extracted.netResult;
    const grossMargin = extracted.grossMargin;

    return {
      yearSales,
      yearEbitda,
      yearNet,
      ebitdaMargin: yearSales > 0 ? yearEbitda / yearSales : 0,
      netMargin: yearSales > 0 ? yearNet / yearSales : 0,
      grossMarginShare: yearSales > 0 ? grossMargin / yearSales : 0,
      grossMargin,
    };
  }, [activeYear]);

  const ticketLabel = useMemo(() => {
    const param = parsed.params.find((item) =>
      item.label.toLowerCase().includes("ticket"),
    );
    return param?.displayValue ?? "—";
  }, [parsed.params]);

  const baseTicket = useMemo(
    () => resolveTicketFromParams(parsed.params),
    [parsed.params],
  );

  const allowImport = isEerrImportAllowed();
  const isBundledModel = isBundledEerrModel(source, parsed);
  const yearLabel = activeYear?.label ?? "Año 1";
  const error = importError ?? (source === "fallback" ? loadError : null);

  const subtitle = useMemo(() => {
    if (source === "import") {
      return `${parsed.sourceFileName} · espejo del Excel (valores del archivo)`;
    }
    if (isBundledModel) {
      return `${BUNDLED_EERR_SOURCE_NAME} · espejo del Excel del repo · Años 1–2 del archivo; 3–10 clonados de Año 2`;
    }
    return "Modelo embebido (fallback) · no se pudo cargar el Excel del repo";
  }, [isBundledModel, parsed.sourceFileName, source]);

  return (
    <div className="space-y-4">
      <EerrCurrencyBar
        exchangeRate={exchangeRate}
        onExchangeRateChange={setExchangeRate}
        currency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
      />

      <SectionCard
        title={`Modelo Excel — EERR ${yearLabel}`}
        subtitle={subtitle}
        tone="cashflow"
        className="rounded-2xl ring-1 ring-stone-200/60"
      >
        {allowImport ? (
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
        ) : null}

        {loading && (
          <div className="mx-5 mb-5 mt-4">
            <EmptyState
              title="Leyendo archivo…"
              description="Actualizando el EERR desde el Excel seleccionado."
            />
          </div>
        )}

        {error && (
          <p className="mx-5 mt-4 text-center text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        {!loading && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 bg-stone-50/50 px-5 py-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="flex max-w-full overflow-x-auto rounded-full border border-stone-200 bg-white p-0.5">
                  {parsed.years.map((year) => (
                    <button
                      key={year.id}
                      type="button"
                      onClick={() => setActiveYearId(year.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        activeYearId === year.id
                          ? "bg-violet-800 text-white shadow-sm"
                          : "text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {year.label}
                      {isFullOperationYear(year.id) ? " · 100%" : ""}
                    </button>
                  ))}
                </div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900">
                  {activeYear?.rows.length ?? 0} conceptos
                </span>
                <span className="rounded-full bg-stone-200/70 px-3 py-1 text-xs font-medium text-stone-700">
                  {activeYear?.months.length ?? 0} meses
                </span>
                {source === "import" ? (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900">
                    Excel activo
                  </span>
                ) : null}
                {isBundledModel ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    Repo
                  </span>
                ) : null}
                {source === "fallback" ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    Fallback
                  </span>
                ) : null}
              </div>
              <EerrExcelActions
                onImportClick={allowImport ? () => inputRef.current?.click() : undefined}
                onRestoreBundled={
                  allowImport
                    ? () => {
                        void restoreBundled();
                        setActiveYearId("year1");
                        setImportError(null);
                      }
                    : undefined
                }
              />
            </div>

            <div
              onDragEnter={allowImport ? () => setDragActive(true) : undefined}
              onDragLeave={allowImport ? () => setDragActive(false) : undefined}
              onDragOver={allowImport ? (event) => event.preventDefault() : undefined}
              onDrop={allowImport ? handleDrop : undefined}
              className={`${allowImport && dragActive ? "ring-2 ring-violet-400 ring-offset-2" : ""}`}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label={`Ventas ${yearLabel}`}
                  value={formatMillionsForCurrency(kpis.yearSales, displayCurrency, exchangeRate)}
                  detail={{
                    label: "Ticket promedio",
                    value: ticketLabel,
                  }}
                  tone="violet"
                />
                <KpiCard
                  label={`EBITDA ${yearLabel}`}
                  value={formatMillionsForCurrency(kpis.yearEbitda, displayCurrency, exchangeRate)}
                  hint={`${formatPercent(kpis.ebitdaMargin)} sobre ventas`}
                  tone={kpis.yearEbitda >= 0 ? "emerald" : "amber"}
                />
                <KpiCard
                  label={`Margen bruto ${yearLabel}`}
                  value={formatMillionsForCurrency(kpis.grossMargin, displayCurrency, exchangeRate)}
                  hint={`${formatPercent(kpis.grossMarginShare)} sobre ventas`}
                  tone="stone"
                />
                <KpiCard
                  label={`Resultado neto ${yearLabel}`}
                  value={formatMillionsForCurrency(kpis.yearNet, displayCurrency, exchangeRate)}
                  hint={`${formatPercent(kpis.netMargin)} sobre ventas`}
                  tone={kpis.yearNet >= 0 ? "emerald" : "amber"}
                />
              </div>

              <div className="px-2 pb-2 pt-1">
                <EerrStatementTable
                  rows={activeYear?.rows ?? []}
                  months={activeYear?.months ?? []}
                  displayCurrency={displayCurrency}
                  exchangeRate={exchangeRate}
                  meta={{
                    yearLabel,
                  }}
                />
                <EerrScenarioPanel
                  key={activeYearId}
                  rows={activeYear?.rows ?? []}
                  months={activeYear?.months ?? []}
                  displayCurrency={displayCurrency}
                  exchangeRate={exchangeRate}
                  baseTicket={baseTicket}
                  yearLabel={yearLabel}
                />
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

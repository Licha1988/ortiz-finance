"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import EerrStatementTable from "@/components/EerrStatementTable";
import { isBundledEerrModel, useEerrModel } from "@/components/EerrModelProvider";
import EmptyState from "@/components/ui/EmptyState";
import KpiCard from "@/components/ui/KpiCard";
import SectionCard from "@/components/ui/SectionCard";
import { findEerrRow } from "@/lib/cashflow/parse-eerr-excel";
import {
  applyEerrAfterNominaRampEdit,
  TICKET_PROMEDIO,
} from "@/lib/cashflow/eerr-model-params";
import { setNominaRampMonth } from "@/lib/cashflow/eerr-nomina";
import { type EerrYearId } from "@/lib/cashflow/eerr-years";
import { formatCurrency, formatMillionsForCurrency, formatPercent } from "@/lib/format";
import {
  DEFAULT_EXCHANGE_RATE,
  type DisplayCurrency,
} from "@/lib/cashflow/exchange-rate";
import { isFullOperationYear } from "@/lib/cashflow/eerr-years";
import EerrCurrencyBar from "@/components/EerrCurrencyBar";
import { BUNDLED_EERR_SOURCE_NAME } from "@/lib/cashflow/load-eerr-model";

export default function CashflowExcelView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    parsed,
    source,
    loading,
    loadError,
    replaceFromFile,
    restoreBundled,
    updateYearRows,
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
    const salesRow = findEerrRow(rows, (label) => label === "ventas");
    const ebitdaRow = findEerrRow(rows, (label) => label === "ebitda");
    const netRow = findEerrRow(rows, (label) => label.includes("resultado neto"));
    const marginRow = findEerrRow(rows, (label) => label.includes("margen bruto"));

    const yearSales = salesRow?.yearTotal ?? 0;
    const yearEbitda = ebitdaRow?.yearTotal ?? 0;
    const yearNet = netRow?.yearTotal ?? 0;
    const ebitdaMargin = yearSales > 0 ? yearEbitda / yearSales : 0;
    const netMargin = yearSales > 0 ? yearNet / yearSales : 0;
    const grossMarginShare =
      marginRow?.yearTotal != null && yearSales > 0 ? marginRow.yearTotal / yearSales : 0;

    return {
      yearSales,
      yearEbitda,
      yearNet,
      ebitdaMargin,
      netMargin,
      grossMarginShare,
      grossMargin: marginRow?.yearTotal ?? null,
    };
  }, [activeYear]);

  const handleNominaRampChange = useCallback(
    (monthIndex: number, ratio: number) => {
      if (activeYearId !== "year1") return;
      const year1 = parsed.years.find((year) => year.id === "year1");
      if (!year1) return;
      const nextRows = applyEerrAfterNominaRampEdit(
        setNominaRampMonth(year1.rows, monthIndex, ratio),
      );
      updateYearRows("year1", nextRows);
    },
    [activeYearId, parsed.years, updateYearRows],
  );

  const isBundledModel = isBundledEerrModel(source, parsed);
  const yearLabel = activeYear?.label ?? "Año 1";
  const error = importError ?? (source === "fallback" ? loadError : null);

  const subtitle = useMemo(() => {
    if (source === "import") {
      return `${parsed.sourceFileName} · modelo activo (Excel importado)`;
    }
    if (isBundledModel) {
      return `${BUNDLED_EERR_SOURCE_NAME} · desde el repo · Años 1–10 (Años 2–10 al 100%)`;
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
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={handleFileChange}
        />

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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void restoreBundled();
                    setActiveYearId("year1");
                    setImportError(null);
                  }}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                >
                  Restaurar repo
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full bg-violet-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-900"
                >
                  Importar Excel
                </button>
              </div>
            </div>

            <div
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={`${dragActive ? "ring-2 ring-violet-400 ring-offset-2" : ""}`}
            >
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label={`Ventas ${yearLabel}`}
                  value={formatMillionsForCurrency(kpis.yearSales, displayCurrency, exchangeRate)}
                  detail={{
                    label: "Ticket promedio",
                    value:
                      displayCurrency === "usd"
                        ? formatMillionsForCurrency(TICKET_PROMEDIO, displayCurrency, exchangeRate)
                        : formatCurrency(TICKET_PROMEDIO),
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
                  value={formatMillionsForCurrency(kpis.grossMargin ?? 0, displayCurrency, exchangeRate)}
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
                  onNominaRampChange={
                    activeYearId === "year1" ? handleNominaRampChange : undefined
                  }
                  meta={{
                    yearLabel,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

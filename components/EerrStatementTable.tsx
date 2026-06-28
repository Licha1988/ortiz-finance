"use client";

import { useState } from "react";
import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import {
  salesSharePercent,
  yearSalesTotal,
} from "@/lib/cashflow/eerr-rules";
import {
  formatEerrCellTitle,
  formatEerrCellValue,
} from "@/lib/cashflow/parse-eerr-excel";
import {
  formatRampPercentInput,
  isRampUpNominaRow,
  NOMINA_FULL,
  parseRampPercentInput,
} from "@/lib/cashflow/eerr-nomina";
import { isHiddenEerrDisplayRow } from "@/lib/cashflow/eerr-row-layout";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  currencyLabel,
  type DisplayCurrency,
} from "@/lib/cashflow/exchange-rate";

export type EerrRowVisual =
  | "income"
  | "metric"
  | "ramp"
  | "ramp-nomina"
  | "section-total"
  | "detail"
  | "gross-margin"
  | "subtotal"
  | "result"
  | "final";

export function classifyEerrRow(row: EerrRow): EerrRowVisual {
  const label = row.label.toLowerCase();

  if (label.includes("resultado neto")) return "final";
  if (label === "ebitda" || label === "ebit") return "result";
  if (label.includes("margen bruto") || label.includes("márgen bruto")) return "gross-margin";
  if (label === "ventas") return "income";
  if (label.includes("ramp") && label.includes("nomina")) return "ramp-nomina";
  if (label.includes("ramp")) return "ramp";
  if (row.isSection && label.includes("costos")) return "section-total";
  if (
    row.isSubRow ||
    label.includes("costo de") ||
    label.includes("com. /") ||
    label.includes("mantenimiento") ||
    label.includes("bazar") ||
    label.includes("inversión") ||
    label.includes("rrhh") ||
    label.includes("locativo") ||
    label.includes("servicios") ||
    label.includes("marketing") ||
    label.includes("honorarios") ||
    label.includes("aguinaldo") ||
    label.includes("gestión operativ") ||
    label.includes("gestion operativ") ||
    label.includes("depreciacion") ||
    label.includes("impuestos")
  ) {
    return "detail";
  }
  return "metric";
}

function showsYearSalesShare(valueKind: EerrRow["valueKind"]): boolean {
  return valueKind === "currency";
}

/** Índice de franja dentro de bloques de detalle (zebra). */
export function detailStripeIndex(rows: EerrRow[], rowIndex: number): number {
  let stripe = 0;
  for (let i = 0; i <= rowIndex; i++) {
    if (classifyEerrRow(rows[i]) === "detail") {
      if (i === rowIndex) return stripe;
      stripe += 1;
    }
  }
  return stripe;
}

const yearCol =
  "border-b border-[#002244] bg-[#003366] px-2 py-2.5 text-right text-sm font-bold tabular-nums text-white";

export function yearCellClass(): string {
  return yearCol;
}

export function labelCellClass(visual: EerrRowVisual, stripe: number): string {
  const base =
    "sticky left-0 z-10 border-b border-slate-300/40 px-3 py-2.5 text-left text-sm";

  switch (visual) {
    case "income":
      return `${base} border-r border-emerald-700/30 bg-emerald-600 font-bold text-white`;
    case "section-total":
      return `${base} border-r border-blue-700/30 bg-[#3366CC] font-bold text-white`;
    case "gross-margin":
      return `${base} border-y-2 border-teal-800/50 border-r border-teal-700/40 bg-teal-600 py-3 text-[13px] font-extrabold uppercase tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]`;
    case "subtotal":
      return `${base} border-r border-stone-500/40 bg-stone-600 font-bold text-white`;
    case "result":
      return `${base} border-r border-stone-500/40 bg-stone-500 font-semibold text-white`;
    case "final":
      return `${base} border-r border-orange-600/40 bg-orange-500 font-bold text-white`;
    case "detail":
      return `${base} border-r border-blue-200/80 pl-6 ${
        stripe % 2 === 0 ? "bg-[#EBF3FB] text-stone-800" : "bg-[#DCEAF8] text-stone-800"
      }`;
    case "ramp":
      return `${base} border-r border-orange-200/80 bg-orange-50 font-semibold text-blue-700`;
    case "ramp-nomina":
      return `${base} border-r border-violet-300/80 bg-amber-50 font-semibold text-violet-900`;
    case "metric":
    default:
      return `${base} border-r border-slate-200 ${
        stripe % 2 === 0 ? "bg-slate-50 text-stone-800" : "bg-slate-100 text-stone-800"
      }`;
  }
}

export function dataCellClass(visual: EerrRowVisual, stripe: number): string {
  const base = "border-b border-slate-300/40 px-2 py-2.5 text-right text-sm tabular-nums";

  switch (visual) {
    case "income":
      return `${base} bg-emerald-600 font-bold text-white`;
    case "section-total":
      return `${base} bg-[#3366CC] font-bold text-white`;
    case "gross-margin":
      return `${base} border-y-2 border-teal-800/50 bg-teal-500 py-3 text-[13px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`;
    case "subtotal":
      return `${base} bg-stone-600 font-bold text-white`;
    case "result":
      return `${base} bg-stone-500 font-semibold text-white`;
    case "final":
      return `${base} bg-orange-100 font-bold text-stone-900`;
    case "detail":
      return `${base} ${
        stripe % 2 === 0 ? "bg-[#EBF3FB] text-stone-900" : "bg-[#DCEAF8] text-stone-900"
      }`;
    case "ramp":
      return `${base} bg-orange-50 font-semibold text-blue-700`;
    case "ramp-nomina":
      return `${base} bg-amber-50 font-semibold text-violet-900`;
    case "metric":
    default:
      return `${base} ${
        stripe % 2 === 0 ? "bg-slate-50 text-stone-900" : "bg-slate-100 text-stone-900"
      }`;
  }
}

type EerrStatementTableProps = {
  rows: EerrRow[];
  months: string[];
  displayCurrency?: DisplayCurrency;
  exchangeRate?: number;
  meta?: {
    yearLabel?: string;
  };
  onNominaRampChange?: (monthIndex: number, ratio: number) => void;
};

function NominaRampCell({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (ratio: number) => void;
}) {
  const [draft, setDraft] = useState(() => formatRampPercentInput(value));

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label="Ramp-up nómina"
      className="w-full min-w-[3.25rem] rounded border border-violet-200 bg-amber-50 px-1.5 py-1 text-right text-sm font-semibold tabular-nums text-violet-900 focus:border-violet-400 focus:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = parseRampPercentInput(draft);
        if (parsed === null) {
          setDraft(formatRampPercentInput(value));
          return;
        }
        onCommit(parsed);
        setDraft(formatRampPercentInput(parsed));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export default function EerrStatementTable({
  rows,
  months,
  displayCurrency = "ars",
  exchangeRate = 1420,
  meta,
  onNominaRampChange,
}: EerrStatementTableProps) {
  const visibleRows = rows.filter((row) => !isHiddenEerrDisplayRow(row));
  const yearSales = yearSalesTotal(rows);
  const formatOptions = { currency: displayCurrency, exchangeRate };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-md">
      {meta && (
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <tbody>
            <tr className="bg-slate-50">
              <td className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-stone-600">
                Período
              </td>
              <td className="border-b border-r border-slate-300 px-3 py-2 text-stone-900">
                {meta.yearLabel ?? "Año 1"} · {months[0]} – {months[months.length - 1]}
              </td>
              <td className="border-b border-r border-slate-300 px-3 py-2 font-semibold text-stone-600">
                Moneda
              </td>
              <td className="border-b border-slate-300 px-3 py-2 text-stone-900">
                {currencyLabel(displayCurrency)}
                {displayCurrency === "usd" ? ` · TC ${exchangeRate.toLocaleString("es-AR")}` : ""}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[220px]" />
            {months.map((month) => (
              <col key={month} />
            ))}
            <col className="w-[118px]" />
          </colgroup>
          <thead>
            <tr className="bg-stone-700 text-white">
              <th className="sticky left-0 z-20 border-b border-stone-600 bg-stone-700 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">
                Concepto
              </th>
              {months.map((month) => (
                <th
                  key={month}
                  className="border-b border-stone-600 px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider"
                >
                  {month}
                </th>
              ))}
              <th className="border-b border-stone-600 bg-[#003366] px-2 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider">
                Año
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const visual = classifyEerrRow(row);
              const stripe =
                visual === "detail"
                  ? detailStripeIndex(visibleRows, index)
                  : index;

              return (
                <tr key={row.id} className="group">
                  <th className={labelCellClass(visual, stripe)} scope="row">
                    {visual === "income"
                      ? `(+) ${row.label}`
                      : visual === "section-total"
                        ? `(−) ${row.label}`
                        : visual === "gross-margin"
                          ? `= ${row.label} =`
                          : visual === "ramp-nomina"
                            ? `${row.label} · editable`
                            : row.label}
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td
                      key={`${row.id}-${months[valueIndex]}`}
                      className={dataCellClass(visual, stripe)}
                      title={
                        isRampUpNominaRow(row)
                          ? `Nómina full ${formatCurrency(NOMINA_FULL)} · ${formatEerrCellTitle(value, row.valueKind, formatOptions)}`
                          : formatEerrCellTitle(value, row.valueKind, formatOptions)
                      }
                    >
                      {isRampUpNominaRow(row) && onNominaRampChange ? (
                        <NominaRampCell
                          key={`${row.id}-${valueIndex}-${value ?? "null"}`}
                          value={value}
                          onCommit={(ratio) => onNominaRampChange(valueIndex, ratio)}
                        />
                      ) : (
                        formatEerrCellValue(value, row.valueKind, formatOptions)
                      )}
                    </td>
                  ))}
                  <td
                    className={`${yearCellClass()} align-middle`}
                    title={formatEerrCellTitle(row.yearTotal, row.valueKind, formatOptions)}
                  >
                    <div className="flex flex-col items-end gap-0.5 leading-tight">
                      <span>{formatEerrCellValue(row.yearTotal, row.valueKind, formatOptions)}</span>
                      {showsYearSalesShare(row.valueKind) && yearSales !== null && row.yearTotal !== null ? (
                        <span className="text-xs font-semibold text-sky-100">
                          {formatPercent(salesSharePercent(row.yearTotal, yearSales) ?? 0)} s/V
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-stone-500">
        Ramp nómina editable (nómina full {formatCurrency(NOMINA_FULL)} al 100%). Valores en{" "}
        {currencyLabel(displayCurrency)}
        {displayCurrency === "usd" ? ` (TC ${exchangeRate.toLocaleString("es-AR")})` : ""}. Columna
        Año: monto + % s/V en conceptos en moneda.
      </p>
    </div>
  );
}

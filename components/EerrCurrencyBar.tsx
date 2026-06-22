"use client";

import {
  currencyLabel,
  DEFAULT_EXCHANGE_RATE,
  type DisplayCurrency,
} from "@/lib/cashflow/exchange-rate";
import { editableInput } from "@/lib/ui/tokens";

type EerrCurrencyBarProps = {
  exchangeRate: number;
  onExchangeRateChange: (value: number) => void;
  currency: DisplayCurrency;
  onCurrencyChange: (currency: DisplayCurrency) => void;
};

export default function EerrCurrencyBar({
  exchangeRate,
  onExchangeRateChange,
  currency,
  onCurrencyChange,
}: EerrCurrencyBarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-white px-5 py-4">
      <div className="min-w-[200px]">
        <label htmlFor="eerr-tc" className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-800">
          TC — Tipo de cambio
        </label>
        <p className="mt-0.5 text-[11px] text-stone-500">ARS por 1 USD · convierte EERR y KPIs</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-medium text-stone-500">$</span>
          <input
            id="eerr-tc"
            type="text"
            inputMode="decimal"
            defaultValue={String(exchangeRate)}
            key={`tc-${exchangeRate}`}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(parsed) && parsed > 0) {
                onExchangeRateChange(parsed);
              }
            }}
            className={`w-full max-w-[140px] rounded-lg border border-violet-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-violet-950 ${editableInput}`}
          />
          <span className="text-xs text-stone-500">/ USD</span>
          {exchangeRate !== DEFAULT_EXCHANGE_RATE ? (
            <button
              type="button"
              onClick={() => onExchangeRateChange(DEFAULT_EXCHANGE_RATE)}
              className="text-[11px] font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              Restaurar {DEFAULT_EXCHANGE_RATE}
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Moneda de visualización
        </p>
        <div className="flex rounded-full border border-stone-200 bg-white p-0.5 shadow-sm">
          {(["ars", "usd"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onCurrencyChange(option)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase transition ${
                currency === option
                  ? "bg-violet-800 text-white shadow-sm"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {currencyLabel(option)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

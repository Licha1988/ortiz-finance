import type { DisplayCurrency } from "@/lib/cashflow/exchange-rate";
import { formatMillionsForCurrency, formatPercent } from "@/lib/format";
import {
  OPERATOR_BONUS_HURDLE_PCT,
  bonusShareOfEbitdaPct,
  type OperatorBonusYearResult,
} from "@/lib/investment/operator-margin-bonus";

type EbitdaMarginHorizonProps = {
  schedule: OperatorBonusYearResult[];
  displayCurrency: DisplayCurrency;
  exchangeRate: number;
  /** Payback equity (años), post-préstamo y post-bono — para contexto del success fee. */
  paybackYears?: number | null;
};

const SUCCESS_FEE_PAYBACK_WINDOW_YEARS = 2;

function marginTone(marginPct: number): string {
  if (marginPct < OPERATOR_BONUS_HURDLE_PCT) {
    return "border-stone-200 bg-stone-50 text-stone-700";
  }
  if (marginPct < 15) return "border-teal-200/80 bg-teal-50/60 text-teal-950";
  if (marginPct < 20) return "border-teal-300/80 bg-teal-100/70 text-teal-950";
  return "border-violet-300/80 bg-violet-100/80 text-violet-950";
}

function bonusLegend(marginPct: number): { label: string; className: string } {
  const active = marginPct >= OPERATOR_BONUS_HURDLE_PCT;
  return active
    ? { label: "activa bono", className: "font-semibold text-teal-800" }
    : { label: "bono desactivado", className: "font-medium text-stone-500" };
}

function formatMoney(
  valueArs: number,
  currency: DisplayCurrency,
  exchangeRate: number,
): string {
  if (valueArs === 0) return "0 M";
  return formatMillionsForCurrency(valueArs, currency, exchangeRate);
}

export default function EbitdaMarginHorizon({
  schedule,
  displayCurrency,
  exchangeRate,
  paybackYears = null,
}: EbitdaMarginHorizonProps) {
  if (schedule.length === 0) return null;

  const successFeeEligible =
    paybackYears != null && paybackYears <= SUCCESS_FEE_PAYBACK_WINDOW_YEARS;

  return (
    <div className="border-t border-stone-200/80 bg-white px-5 py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Impacto de bonos sobre EBITDA
          </p>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-stone-400">
            Por año: EBITDA del EERR, bono a operadores (tramos marginales) e incidencia del bono
            sobre ese EBITDA. Margen operativo = EBITDA ÷ ventas.
          </p>
        </div>
        <p className="text-[10px] text-stone-400">
          Hurdle {OPERATOR_BONUS_HURDLE_PCT}% · tramos: 10–15% → 40% · 15–20% → 45% · 20% o + →
          50%
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2.5">
          {schedule.map((row, index) => {
            const legend = bonusLegend(row.operationalMarginPct);
            const bonusOfEbitdaPct = bonusShareOfEbitdaPct(row.ebitdaArs, row.bonusArs);
            const marginHint = formatPercent(row.operationalMarginPct / 100);

            return (
              <div
                key={`bonus-impact-y${index + 1}`}
                className="flex min-w-[6.75rem] flex-col items-center gap-1"
              >
                <p
                  className={`text-[10px] tracking-wide ${legend.className}`}
                  title={`Margen ${marginHint} · hurdle ${OPERATOR_BONUS_HURDLE_PCT}%`}
                >
                  {legend.label}
                </p>
                <div
                  className={`w-full rounded-xl border px-2.5 py-2.5 text-center shadow-sm ${marginTone(row.operationalMarginPct)}`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                    Año {index + 1}
                  </p>

                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-[9px] font-medium uppercase tracking-wide opacity-60">
                        EBITDA
                      </p>
                      <p
                        className="text-sm font-bold tabular-nums leading-tight"
                        title={`Margen ${marginHint} s/ ventas`}
                      >
                        {formatMoney(row.ebitdaArs, displayCurrency, exchangeRate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-medium uppercase tracking-wide opacity-60">
                        Bono
                      </p>
                      <p className="text-sm font-bold tabular-nums leading-tight">
                        {row.bonusArs > 0
                          ? formatMoney(row.bonusArs, displayCurrency, exchangeRate)
                          : "—"}
                      </p>
                    </div>

                    <div className="border-t border-current/10 pt-2">
                      <p className="text-[9px] font-medium uppercase tracking-wide opacity-60">
                        Incidencia
                      </p>
                      <p
                        className="text-sm font-bold tabular-nums leading-tight"
                        title="Bono ÷ EBITDA del año"
                      >
                        {bonusOfEbitdaPct > 0
                          ? formatPercent(bonusOfEbitdaPct / 100, 1)
                          : "0%"}
                      </p>
                      <p className="mt-0.5 text-[9px] font-medium normal-case opacity-75">
                        del EBITDA
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-teal-200/80 bg-teal-50/50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-900">
          Success fee operadores
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-700">
          Si el <strong className="font-medium text-stone-800">payback equity</strong> se logra antes
          de los <strong className="font-medium text-stone-800">24 meses</strong> (2 años) desde la
          apertura, hay un pago único adicional al bono anual:{" "}
          <strong className="font-medium text-stone-800">
            50% del EBITDA de un trimestre
          </strong>
          . El hito usa el mismo payback que arriba: dividendos netos al inversor que ya
          descontaron <strong className="font-medium text-stone-800">servicio del préstamo</strong>{" "}
          (interés + amortización) y <strong className="font-medium text-stone-800">bono por
          margen</strong>; el préstamo no se suma al equity a recuperar, pero sí reduce el flujo
          disponible.
        </p>
        {paybackYears != null ? (
          <p
            className={`mt-2 text-[11px] font-medium ${
              successFeeEligible ? "text-emerald-800" : "text-stone-500"
            }`}
          >
            Escenario actual: payback {paybackYears.toFixed(1)} años
            {successFeeEligible
              ? " · dentro de la ventana de 24 meses (success fee aplicaría)"
              : " · fuera de la ventana de 24 meses (sin success fee)"}
          </p>
        ) : null}
      </div>
    </div>
  );
}

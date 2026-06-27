import { formatPercent } from "@/lib/format";
import type { OperatorBonusYearResult } from "@/lib/investment/operator-margin-bonus";

type EbitdaMarginHorizonProps = {
  schedule: OperatorBonusYearResult[];
};

function marginTone(marginPct: number): string {
  if (marginPct < 5) return "border-stone-200 bg-stone-50 text-stone-600";
  if (marginPct < 10) return "border-teal-200/80 bg-teal-50/60 text-teal-900";
  if (marginPct < 15) return "border-teal-300/80 bg-teal-100/70 text-teal-950";
  if (marginPct < 20) return "border-violet-200/80 bg-violet-50/70 text-violet-950";
  return "border-violet-300/80 bg-violet-100/80 text-violet-950";
}

export default function EbitdaMarginHorizon({ schedule }: EbitdaMarginHorizonProps) {
  if (schedule.length === 0) return null;

  return (
    <div className="border-t border-stone-200/80 bg-white px-5 py-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Margen EBITDA · horizonte 10 años
          </p>
          <p className="mt-1 text-[11px] text-stone-400">
            EBITDA ÷ ventas (EERR). Referencia para los tramos del bono operadores — no es flujo de
            caja.
          </p>
        </div>
        <p className="text-[10px] text-stone-400">
          Tramos bono: 5–10% · 10–15% · 15–20% · 20% o +
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {schedule.map((row, index) => (
            <div
              key={`margin-y${index + 1}`}
              className={`min-w-[4.5rem] rounded-lg border px-3 py-2.5 text-center shadow-sm ${marginTone(row.operationalMarginPct)}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                Año {index + 1}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">
                {formatPercent(row.operationalMarginPct / 100)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

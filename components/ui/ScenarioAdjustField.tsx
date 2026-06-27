import { editableInput } from "@/lib/ui/tokens";

type ScenarioAdjustFieldProps = {
  label: string;
  helper?: string;
  baseDisplay?: string;
  valuePct: number;
  onChange: (valuePct: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ScenarioAdjustField({
  label,
  helper,
  baseDisplay,
  valuePct,
  onChange,
  min = -50,
  max = 50,
  step = 1,
}: ScenarioAdjustFieldProps) {
  const sign = valuePct > 0 ? "+" : "";
  const display = valuePct === 0 ? "0%" : `${sign}${valuePct.toFixed(0)}%`;

  const nudge = (delta: number) => {
    onChange(clamp(Math.round((valuePct + delta) / step) * step, min, max));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-stone-600">{label}</p>
          {helper ? (
            <p className="text-[11px] leading-relaxed text-stone-400">{helper}</p>
          ) : null}
          {baseDisplay ? (
            <p className="text-[10px] text-stone-400">
              Base Excel: <span className="font-medium text-stone-600">{baseDisplay}</span>
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums ${
            valuePct === 0
              ? "bg-stone-100 text-stone-600"
              : valuePct > 0
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80"
          }`}
        >
          {display}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => nudge(-5)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-50"
          aria-label={`${label} −5%`}
        >
          −5
        </button>
        <button
          type="button"
          onClick={() => nudge(-step)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          aria-label={`${label} −${step}%`}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valuePct}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mx-1 h-2 min-w-0 flex-1 cursor-pointer accent-violet-700"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => nudge(step)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
          aria-label={`${label} +${step}%`}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => nudge(5)}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-stone-600 transition hover:bg-stone-50"
          aria-label={`${label} +5%`}
        >
          +5
        </button>
      </div>

      <input
        type="text"
        defaultValue={String(valuePct)}
        key={`${label}-${valuePct}`}
        onBlur={(event) => {
          const raw = event.target.value.replace(",", ".").replace("%", "").trim();
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            onChange(clamp(Math.round(parsed), min, max));
          }
        }}
        className={`w-full rounded-lg border border-stone-200 px-3 py-1.5 text-right text-xs font-semibold tabular-nums text-stone-900 ${editableInput}`}
        aria-label={`${label} (valor exacto %)`}
      />
    </div>
  );
}

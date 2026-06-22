type KpiTone = "stone" | "emerald" | "amber" | "violet";

const toneClasses: Record<
  KpiTone,
  { shell: string; accent: string; label: string }
> = {
  stone: {
    shell: "border-stone-200/80 bg-white/90",
    accent: "bg-stone-400",
    label: "text-stone-500",
  },
  emerald: {
    shell: "border-emerald-200/80 bg-emerald-50/90",
    accent: "bg-emerald-500",
    label: "text-emerald-700/70",
  },
  amber: {
    shell: "border-amber-200/80 bg-amber-50/90",
    accent: "bg-amber-500",
    label: "text-amber-800/70",
  },
  violet: {
    shell: "border-violet-200/80 bg-violet-50/90",
    accent: "bg-violet-600",
    label: "text-violet-700/70",
  },
};

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  detail?: {
    label: string;
    value: string;
  };
  tone?: KpiTone;
};

export default function KpiCard({ label, value, hint, detail, tone = "stone" }: KpiCardProps) {
  const styles = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md ${styles.shell}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} aria-hidden />
      <p className={`pl-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.label}`}>
        {label}
      </p>
      <p className="mt-3 pl-2 text-2xl font-bold tracking-tight tabular-nums text-stone-900">
        {value}
      </p>
      {detail && (
        <p className="mt-2 pl-2 text-xs text-stone-600">
          <span className="font-medium text-stone-500">{detail.label}</span>
          <span className="ml-1.5 font-semibold tabular-nums text-stone-800">{detail.value}</span>
        </p>
      )}
      {hint && (
        <p className="mt-2 pl-2 text-xs leading-relaxed text-stone-500">{hint}</p>
      )}
    </div>
  );
}

export type { KpiTone };

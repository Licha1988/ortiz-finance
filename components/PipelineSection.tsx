import SectionCard from "@/components/ui/SectionCard";
import {
  PIPELINE_GALLERY_SLOTS,
  PIPELINE_MILESTONES,
  type PipelineStatus,
} from "@/lib/investment/pipeline-data";

const statusStyles: Record<
  PipelineStatus,
  { dot: string; ring: string; label: string }
> = {
  done: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    label: "Completado",
  },
  in_progress: {
    dot: "bg-amber-400",
    ring: "ring-amber-200",
    label: "En curso",
  },
  pending: {
    dot: "bg-stone-300",
    ring: "ring-stone-200",
    label: "Pendiente",
  },
};

export default function PipelineSection() {
  return (
    <SectionCard
      title="Pipeline pre-apertura"
      subtitle="Hitos hasta la apertura · fechas se cargarán próximamente"
      tone="finance"
    >
      <div className="grid gap-8 p-5 lg:grid-cols-[1fr_280px]">
        <ol className="relative space-y-0 border-l-2 border-violet-200 pl-6">
          {PIPELINE_MILESTONES.map((milestone, index) => {
            const styles = statusStyles[milestone.status];
            const isLast = index === PIPELINE_MILESTONES.length - 1;

            return (
              <li key={milestone.id} className={`relative ${isLast ? "" : "pb-8"}`}>
                <span
                  className={`absolute -left-[1.65rem] top-1 h-4 w-4 rounded-full ring-4 ${styles.dot} ${styles.ring}`}
                  aria-hidden
                />
                <div className="rounded-xl border border-stone-200/80 bg-white px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-stone-900">{milestone.label}</p>
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                      {styles.label}
                    </span>
                  </div>
                  {milestone.progress != null ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-stone-500">
                        <span>Avance</span>
                        <span className="font-semibold tabular-nums text-stone-800">
                          {milestone.progress}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all"
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-stone-500">
                    {milestone.dateLabel ?? "Fecha por confirmar"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Galería de obra
          </h3>
          <p className="mt-1 text-xs text-stone-400">Fotos se subirán próximamente</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Array.from({ length: PIPELINE_GALLERY_SLOTS }, (_, index) => (
              <div
                key={`gallery-slot-${index}`}
                className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-center"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-300">
                  Sin imagen
                </span>
                <span className="mt-1 px-2 text-[10px] font-medium text-stone-400">
                  Foto {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

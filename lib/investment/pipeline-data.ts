export type PipelineStatus = "done" | "in_progress" | "pending";

export type PipelineMilestone = {
  id: string;
  label: string;
  status: PipelineStatus;
  /** Fecha ISO o texto descriptivo; null = pendiente de carga */
  dateLabel: string | null;
  /** Avance 0–100 solo para hitos con progreso parcial */
  progress?: number;
};

export const PIPELINE_MILESTONES: PipelineMilestone[] = [
  {
    id: "avance-obra",
    label: "Avance de obra",
    status: "in_progress",
    dateLabel: null,
    progress: 60,
  },
  {
    id: "fin-obra",
    label: "Fin de obra",
    status: "pending",
    dateLabel: null,
  },
  {
    id: "pruebas-cocina",
    label: "Pruebas de cocina",
    status: "pending",
    dateLabel: null,
  },
  {
    id: "pruebas-bebidas",
    label: "Pruebas de bebidas",
    status: "pending",
    dateLabel: null,
  },
  {
    id: "pruebas-servicio",
    label: "Pruebas de servicio",
    status: "pending",
    dateLabel: null,
  },
  {
    id: "marcha-blanca",
    label: "Marcha blanca",
    status: "pending",
    dateLabel: null,
  },
  {
    id: "apertura",
    label: "Apertura oficial",
    status: "pending",
    dateLabel: "Primera semana de agosto 2026",
  },
];

/** Placeholders de galería de obra (fotos se cargan después). */
export const PIPELINE_GALLERY_SLOTS = 6;

export type FinanceTabId = "eerr" | "pipeline" | "investment";

export type FinanceTab = {
  id: FinanceTabId;
  label: string;
  description: string;
};

export const FINANCE_TABS: FinanceTab[] = [
  {
    id: "investment",
    label: "Inversión",
    description: "Estructura de capital y simulador de escenarios · horizonte 10 años",
  },
  {
    id: "eerr",
    label: "EERR",
    description: "Estado de resultados · horizonte 10 años · ARS o USD vía TC",
  },
  {
    id: "pipeline",
    label: "Pipeline apertura",
    description: "Hitos y avance de obra hasta la apertura",
  },
];

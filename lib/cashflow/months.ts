export const CASHFLOW_MONTHS = [
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
] as const;

export type CashflowMonth = (typeof CASHFLOW_MONTHS)[number];

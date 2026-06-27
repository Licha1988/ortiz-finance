import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";

export type EerrYearKpis = {
  yearSales: number;
  variableCosts: number;
  ebitda: number;
  netResult: number;
  rrhh: number;
  annualCovers: number;
};

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function findRow(rows: EerrRow[], matcher: (label: string) => boolean): EerrRow | undefined {
  return rows.find((row) => matcher(normalizeLabel(row.label)));
}

function rowTotal(row: EerrRow | undefined): number {
  return row?.yearTotal ?? 0;
}

/** KPIs anuales leídos del EERR importado (espejo del Excel, sin recalcular). */
export function extractYearKpisFromRows(rows: EerrRow[]): EerrYearKpis {
  const cubiertos = findRow(rows, (label) => label === "cubiertos");
  const annualCovers =
    cubiertos?.values.reduce<number>((sum, value) => sum + (value ?? 0), 0) ?? 0;

  return {
    yearSales: rowTotal(findRow(rows, (label) => label === "ventas")),
    variableCosts: rowTotal(findRow(rows, (label) => label === "costos variables")),
    ebitda: rowTotal(findRow(rows, (label) => label === "ebitda")),
    netResult: rowTotal(findRow(rows, (label) => label.includes("resultado neto"))),
    rrhh: rowTotal(findRow(rows, (label) => label === "rrhh")),
    annualCovers,
  };
}

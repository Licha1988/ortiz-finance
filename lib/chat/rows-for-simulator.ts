import type { EerrRowSnapshot } from "@/lib/chat/model-snapshot";
import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";

/** Adapta filas del snapshot al simulador de escenarios. */
export function rowsForSimulator(rows: EerrRowSnapshot[]): EerrRow[] {
  return rows.map((row) => ({
    id: row.label,
    label: row.label,
    isSubRow: false,
    isSection: false,
    valueKind: "currency" as const,
    values: row.values,
    yearTotal: row.yearTotal,
  }));
}

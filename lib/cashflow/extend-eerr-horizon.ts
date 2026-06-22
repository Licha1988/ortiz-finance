import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearId, EerrYearSlice } from "@/lib/cashflow/eerr-years";

/** Clona filas de un año plantilla (Año 2 al 100%) para años extendidos. */
function cloneRow(row: EerrRow, yearId: EerrYearId): EerrRow {
  const suffix = row.id.replace(/^year\d+-/, "");
  return {
    ...row,
    id: `${yearId}-${suffix}`,
    values: [...row.values],
  };
}

function cloneYearFromTemplate(template: EerrYearSlice, yearNumber: number): EerrYearSlice {
  const id = `year${yearNumber}` as EerrYearId;
  return {
    id,
    label: `Año ${yearNumber}`,
    months: [...template.months],
    rows: template.rows.map((row) => cloneRow(row, id)),
  };
}

/** Completa el horizonte hasta `horizonYears` clonando el Año 2 (operación al 100%). */
export function extendEerrHorizon<T extends { years: EerrYearSlice[] }>(
  parsed: T,
  horizonYears: number,
): T {
  if (parsed.years.length >= horizonYears) return parsed;

  const template =
    parsed.years.find((year) => year.id === "year2") ??
    parsed.years[parsed.years.length - 1];

  if (!template) return parsed;

  const existing = new Set(parsed.years.map((year) => year.id));
  const extra: EerrYearSlice[] = [];

  for (let yearNumber = parsed.years.length + 1; yearNumber <= horizonYears; yearNumber += 1) {
    const id = `year${yearNumber}` as EerrYearId;
    if (existing.has(id)) continue;
    extra.push(cloneYearFromTemplate(template, yearNumber));
  }

  return { ...parsed, years: [...parsed.years, ...extra] };
}

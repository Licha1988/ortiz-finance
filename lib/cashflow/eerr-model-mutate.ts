import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearId } from "@/lib/cashflow/eerr-years";

export function syncPrimaryYear(parsed: ParsedEerrExcel): ParsedEerrExcel {
  const primary = parsed.years[0];
  if (!primary) return parsed;
  return {
    ...parsed,
    months: primary.months,
    rows: primary.rows,
  };
}

export function updateYearRows(
  parsed: ParsedEerrExcel,
  yearId: EerrYearId,
  rows: ParsedEerrExcel["rows"],
): ParsedEerrExcel {
  const years = parsed.years.map((year) =>
    year.id === yearId ? { ...year, rows } : year,
  );
  const next = { ...parsed, years };
  return yearId === "year1" ? syncPrimaryYear(next) : next;
}

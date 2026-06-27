import { CASHFLOW_MONTHS } from "@/lib/cashflow/months";
import type { EerrYearDetailSnapshot } from "@/lib/chat/model-snapshot";
import { compactCurrency, formatCovers, formatPercent } from "@/lib/format";

const MONTH_ALIASES: Record<string, string> = {
  ago: "Ago",
  agosto: "Ago",
  sep: "Sep",
  sept: "Sep",
  septiembre: "Sep",
  oct: "Oct",
  octubre: "Oct",
  nov: "Nov",
  noviembre: "Nov",
  dic: "Dic",
  diciembre: "Dic",
  ene: "Ene",
  enero: "Ene",
  feb: "Feb",
  febrero: "Feb",
  mar: "Mar",
  marzo: "Mar",
  abr: "Abr",
  abril: "Abr",
  may: "May",
  mayo: "May",
  jun: "Jun",
  junio: "Jun",
  jul: "Jul",
  julio: "Jul",
};

export type EerrConceptId =
  | "ventas"
  | "ebitda"
  | "cubiertos"
  | "rrhh"
  | "resultado-neto"
  | "costos-variables";

type ParsedQuery = {
  concept: EerrConceptId;
  conceptLabel: string;
  year: number;
  fromIndex: number;
  toIndex: number;
  listAllMonths: boolean;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function monthIndex(monthLabel: string): number {
  return CASHFLOW_MONTHS.indexOf(monthLabel as (typeof CASHFLOW_MONTHS)[number]);
}

function parseMonthToken(token: string): string | null {
  const key = token.trim().toLowerCase();
  return MONTH_ALIASES[key] ?? null;
}

function findMonthIndices(text: string): number[] {
  const tokens = text.split(/\s+/);
  const indices: number[] = [];

  for (const token of tokens) {
    const month = parseMonthToken(token);
    if (month) {
      const index = monthIndex(month);
      if (index >= 0) indices.push(index);
    }
  }

  for (const [alias, label] of Object.entries(MONTH_ALIASES)) {
    if (alias.length < 4) continue;
    if (text.includes(alias)) {
      const index = monthIndex(label);
      if (index >= 0 && !indices.includes(index)) indices.push(index);
    }
  }

  return [...new Set(indices)].sort((a, b) => a - b);
}

export function hasMonthContext(text: string): boolean {
  const q = normalize(text);
  return (
    findMonthIndices(q).length > 0 ||
    q.includes("mes a mes") ||
    q.includes("por mes") ||
    q.includes("mensual") ||
    q.includes("trimestre")
  );
}

function parseYear(text: string): number {
  const match = text.match(/(?:ano|año|year)\s*(\d{1,2})/i);
  if (match?.[1]) {
    const year = Number(match[1]);
    if (year >= 1 && year <= 10) return year;
  }
  return 1;
}

function parseConcept(text: string): { id: EerrConceptId; label: string } | null {
  if (text.includes("venta")) return { id: "ventas", label: "Ventas" };
  if (text.includes("ebitda")) return { id: "ebitda", label: "EBITDA" };
  if (text.includes("cubierto") || text.includes("cover")) {
    return { id: "cubiertos", label: "Cubiertos" };
  }
  if (text.includes("rrhh") || text.includes("nomina") || text.includes("nómina")) {
    return { id: "rrhh", label: "RRHH" };
  }
  if (text.includes("resultado neto") || text.includes("neto")) {
    return { id: "resultado-neto", label: "Resultado neto" };
  }
  if (text.includes("costo variable") || text.includes("costos variable")) {
    return { id: "costos-variables", label: "Costos variables" };
  }
  return null;
}

function findRow(
  yearDetail: EerrYearDetailSnapshot,
  concept: EerrConceptId,
): EerrYearDetailSnapshot["rows"][number] | undefined {
  const normalizeLabel = (label: string) =>
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim();

  return yearDetail.rows.find((row) => {
    const label = normalizeLabel(row.label);
    switch (concept) {
      case "ventas":
        return label === "ventas";
      case "ebitda":
        return label === "ebitda";
      case "cubiertos":
        return label === "cubiertos";
      case "rrhh":
        return label === "rrhh";
      case "resultado-neto":
        return label.includes("resultado neto");
      case "costos-variables":
        return label === "costos variables";
      default:
        return false;
    }
  });
}

function parseRange(text: string, monthCount: number): { from: number; to: number; listAll: boolean } {
  const indices = findMonthIndices(text);

  if (text.includes("mes a mes") || text.includes("por mes") || text.includes("mensual")) {
    return { from: 0, to: monthCount - 1, listAll: true };
  }

  if (indices.length >= 2) {
    return { from: indices[0]!, to: indices[indices.length - 1]!, listAll: false };
  }

  if (indices.length === 1) {
    const index = indices[0]!;
    return { from: index, to: index, listAll: false };
  }

  return { from: 0, to: monthCount - 1, listAll: false };
}

function parseQuery(question: string, monthCount: number): ParsedQuery | null {
  const q = normalize(question);
  const concept = parseConcept(q);
  if (!concept) return null;

  const needsPeriod =
    hasMonthContext(question) ||
    q.includes("mes") ||
    findMonthIndices(q).length > 0;

  if (!needsPeriod) return null;

  const { from, to, listAll } = parseRange(q, monthCount);

  return {
    concept: concept.id,
    conceptLabel: concept.label,
    year: parseYear(q),
    fromIndex: from,
    toIndex: to,
    listAllMonths: listAll,
  };
}

function formatValue(concept: EerrConceptId, value: number): string {
  if (concept === "cubiertos") return formatCovers(value);
  return compactCurrency(value);
}

function sumRange(
  row: EerrYearDetailSnapshot["rows"][number],
  fromIndex: number,
  toIndex: number,
): number {
  let total = 0;
  for (let index = fromIndex; index <= toIndex; index += 1) {
    total += row.values[index] ?? 0;
  }
  return total;
}

export function tryStructuredEerrAnswer(
  question: string,
  eerrYears: EerrYearDetailSnapshot[],
): string | null {
  const yearDetail = eerrYears[0];
  if (!yearDetail) return null;

  const parsed = parseQuery(question, yearDetail.months.length);
  if (!parsed) return null;

  const targetYear =
    eerrYears.find((year) => year.year === parsed.year) ?? yearDetail;
  const row = findRow(targetYear, parsed.concept);
  if (!row) {
    return `No encontré «${parsed.conceptLabel}» en ${targetYear.label} del EERR.`;
  }

  const fromLabel = targetYear.months[parsed.fromIndex] ?? "?";
  const toLabel = targetYear.months[parsed.toIndex] ?? "?";
  const periodLabel =
    parsed.listAllMonths || (parsed.fromIndex === 0 && parsed.toIndex === targetYear.months.length - 1)
      ? `${targetYear.label} · todos los meses`
      : parsed.fromIndex === parsed.toIndex
        ? `${targetYear.label} · ${fromLabel}`
        : `${targetYear.label} · ${fromLabel}–${toLabel}`;

  if (parsed.listAllMonths) {
    const lines = targetYear.months.map((month, index) => {
      const value = row.values[index] ?? 0;
      return `· ${month}: ${formatValue(parsed.concept, value)}`;
    });
    const total = row.yearTotal ?? sumRange(row, 0, targetYear.months.length - 1);
    return [
      `${parsed.conceptLabel} · ${periodLabel}`,
      ...lines,
      `Total ${targetYear.label}: ${formatValue(parsed.concept, total)}`,
    ].join("\n");
  }

  const total = sumRange(row, parsed.fromIndex, parsed.toIndex);
  const monthLines =
    parsed.toIndex - parsed.fromIndex <= 11
      ? Array.from({ length: parsed.toIndex - parsed.fromIndex + 1 }, (_, offset) => {
          const index = parsed.fromIndex + offset;
          const month = targetYear.months[index] ?? "?";
          const value = row.values[index] ?? 0;
          return `· ${month}: ${formatValue(parsed.concept, value)}`;
        })
      : [];

  const yearTotal = row.yearTotal ?? 0;
  const share = yearTotal > 0 ? total / yearTotal : 0;
  const shareLine =
    parsed.fromIndex !== 0 || parsed.toIndex !== targetYear.months.length - 1
      ? `Representa ${formatPercent(share)} del total anual (${formatValue(parsed.concept, yearTotal)}).`
      : "";

  return [
    `${parsed.conceptLabel} · ${periodLabel}`,
    ...monthLines,
    `Total período: ${formatValue(parsed.concept, total)} ARS`,
    shareLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatYear1MonthlyBrief(eerrYears: EerrYearDetailSnapshot[]): string {
  const year1 = eerrYears[0];
  if (!year1) return "";

  const ventas = findRow(year1, "ventas");
  if (!ventas) return "";

  const lines = year1.months.map((month, index) => {
    const value = ventas.values[index] ?? 0;
    return `${month} ${compactCurrency(value)}`;
  });

  return `Ventas ${year1.label} por mes (ARS): ${lines.join(" · ")}`;
}

import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import { hasMonthContext } from "@/lib/chat/eerr-query";
import {
  compactCurrency,
  formatCovers,
  formatNumber,
  formatPercent,
  formatUsd,
} from "@/lib/format";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function tryLocalAnswer(
  question: string,
  snapshot: ModelChatSnapshot,
): string | null {
  const q = normalize(question);

  if (matches(q, ["hola", "ayuda", "que podes", "qué podes", "que sabes"])) {
    return [
      "Puedo responder sobre el modelo Excel vigente (`ortiz-cashflow.xlsx`):",
      "· Ventas, EBITDA y cubiertos por año",
      "· Estructura de capital (equity, préstamo)",
      "· NOPAT, FFL y dividendos al inversor",
      "· TIR, VAN y payback del equity",
      "",
      "Ejemplos: «Ventas de enero a junio», «¿Payback y TIR?», «EBITDA mes a mes Año 1»",
    ].join("\n");
  }

  if (matches(q, ["excel", "modelo", "fuente", "archivo", "repo"])) {
    return `El deploy usa ${snapshot.sourceFileName} en public/models/. ${snapshot.hasCashFlowSheet ? "Incluye hoja Cash Flow (NOPAT, FFL, Kwacc)." : "Sin hoja Cash Flow parseada: NOPAT se aproxima desde resultado neto EERR ÷ TC."} Podés descargarlo con el botón «Descargar Excel».`;
  }

  if (matches(q, ["estructura", "capital", "equity", "prestamo", "préstamo", "450", "110", "560"])) {
    return [
      "Estructura de capital (USD)",
      `· Equity inversores: ${formatUsd(snapshot.equityUsd)} (Año 0, flujo −equity para TIR/VAN)`,
      `· Préstamo protección: ${formatUsd(snapshot.loanPrincipalUsd)} · tasa ${formatPercent(snapshot.loanRateAnnual)}`,
      `· Fuentes de fondos: ${formatUsd(snapshot.financingTotalUsd)}`,
      `· Tras payback del equity, ${formatPercent(snapshot.operatorEquityShare)} del flujo neto va a operadores.`,
    ].join("\n");
  }

  if (
    !hasMonthContext(question) &&
    matches(q, ["venta", "ebitda", "resultado neto", "ano 1", "año 1", "operacion"])
  ) {
    const margin =
      snapshot.year1SalesArs > 0
        ? snapshot.year1EbitdaArs / snapshot.year1SalesArs
        : 0;
    return [
      "Operación Año 1 (EERR del Excel)",
      `· Ventas: ${compactCurrency(snapshot.year1SalesArs)} ARS`,
      `· EBITDA: ${compactCurrency(snapshot.year1EbitdaArs)} ARS (${formatPercent(margin)} s/ ventas)`,
      `· Resultado neto: ${compactCurrency(snapshot.year1NetArs)} ARS`,
      `· Cubiertos: ${formatCovers(snapshot.year1Covers)}`,
      `· TC usado: ${snapshot.exchangeRate} ARS/USD`,
    ].join("\n");
  }

  if (!hasMonthContext(question) && matches(q, ["cubierto", "ticket", "covers"])) {
    return [
      "Cubiertos",
      `· Año 1: ${formatCovers(snapshot.year1Covers)}`,
      `· Acumulado 10 años: ${formatCovers(snapshot.totalCovers10y)}`,
    ].join("\n");
  }

  if (matches(q, ["tir", "van", "npv", "retorno", "payback", "recuper"])) {
    return [
      "Retorno equity inversor (USD)",
      `· VAN: ${formatUsd(snapshot.npvUsd)}`,
      `· TIR: ${snapshot.irr != null ? formatPercent(snapshot.irr) : "no converge con flujos actuales"}`,
      `· Payback equity: ${snapshot.paybackYears != null ? `año ${formatNumber(snapshot.paybackYears)}` : "—"}`,
      snapshot.equityReleaseYear != null
        ? `· Liberación ${formatPercent(snapshot.operatorEquityShare)} operadores: Año ${snapshot.equityReleaseYear}`
        : "",
      "",
      "Metodología: Año 0 = −equity; Años 1–10 = dividendos netos al inversor (post split operadores cuando aplica).",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (matches(q, ["ffl", "nopat", "cash flow", "flujo"])) {
    const lines = snapshot.years
      .slice(0, 5)
      .map(
        (year) =>
          `Año ${year.year}: NOPAT ${formatUsd(year.nopatUsd)} → FFL ${formatUsd(year.operationalFflUsd)}`,
      )
      .join("\n");
    return [
      "NOPAT y FFL operativo (desde Excel cuando hay hoja Cash Flow):",
      lines,
      snapshot.years.length > 5 ? "… (horizonte completo: 10 años en el modelo)" : "",
      "",
      "Puente en la app: " + snapshot.bridgeLineLabels.join("; "),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (matches(q, ["dividendo", "inversor", "operador", "30"])) {
    const lines = snapshot.years
      .filter((year) => year.investorDividendUsd > 0)
      .slice(0, 6)
      .map(
        (year) =>
          `Año ${year.year}: dividendo inversor ${formatUsd(year.investorDividendUsd)}`,
      )
      .join("\n");
    return [
      "Flujo al inversor",
      lines || "Sin dividendos positivos en el horizonte.",
      "",
      `Post-payback, ${formatPercent(snapshot.operatorEquityShare)} del flujo neto equity se asigna a operadores.`,
    ].join("\n");
  }

  if (matches(q, ["concepto", "filas", "eerr", "lineas", "líneas"])) {
    const sample = snapshot.eerrConcepts.slice(0, 12).join("\n· ");
    return [
      "Conceptos EERR Año 1 (muestra):",
      `· ${sample}`,
      snapshot.eerrConcepts.length > 12
        ? `… y ${snapshot.eerrConcepts.length - 12} más.`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

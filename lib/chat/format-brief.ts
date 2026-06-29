import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import { formatYear1MonthlyBrief } from "@/lib/chat/eerr-query";
import { compactCurrency, formatCovers, formatNumber, formatPercent, formatUsd } from "@/lib/format";

export function formatModelBrief(snapshot: ModelChatSnapshot): string {
  const y1Margin =
    snapshot.year1SalesArs > 0 ? snapshot.year1EbitdaArs / snapshot.year1SalesArs : 0;

  const yearLines = snapshot.years
    .map(
      (year) =>
        `Año ${year.year}: ventas ${compactCurrency(year.salesArs)} ARS · EBITDA ${compactCurrency(year.ebitdaArs)} · NOPAT ${formatUsd(year.nopatUsd)} · FFL ${formatUsd(year.operationalFflUsd)} · dividendo inversor ${formatUsd(year.investorDividendUsd)}`,
    )
    .join("\n");

  return [
    `Archivo: ${snapshot.sourceFileName} (${snapshot.modelSource === "import" ? "importado" : "bundled"})`,
    `Hoja Cash Flow parseada: ${snapshot.hasCashFlowSheet ? "sí" : "no"}`,
    `TC Año 1 (ARS/USD): ${snapshot.exchangeRate}`,
    "",
    "Supuestos inversión (misma lógica que pestaña Inversión):",
    `- Bono operadores: tramos ${snapshot.investmentAssumptions.operatorBonusRatesPct.join(" / ")}% (marginal EBITDA)`,
    `- Tasa préstamo: ${formatPercent(snapshot.loanRateAnnual)}`,
    `- Escenario operación: volumen ${snapshot.investmentAssumptions.volumeChangePct >= 0 ? "+" : ""}${snapshot.investmentAssumptions.volumeChangePct}% · ticket ${snapshot.investmentAssumptions.ticketChangePct >= 0 ? "+" : ""}${snapshot.investmentAssumptions.ticketChangePct}%`,
    `- Roll de deuda: ${snapshot.investmentAssumptions.debtRollYears} año(s) sin amortizar capital (solo interés)`,
    `- Bono operadores acum. 10a: ${formatUsd(snapshot.totalOperatorBonusUsd)}`,
    "",
    "Estructura de capital (USD):",
    `- Equity inversores: ${formatUsd(snapshot.equityUsd)} (desembolso Año 0 para TIR/VAN)`,
    `- Préstamo: ${formatUsd(snapshot.loanPrincipalUsd)} · tasa ${formatPercent(snapshot.loanRateAnnual)}`,
    `- Fuentes totales: ${formatUsd(snapshot.financingTotalUsd)}`,
    `- Post-payback: ${formatPercent(snapshot.operatorEquityShare)} equity a operadores`,
    "",
    "Operación Año 1:",
    `- Ventas: ${compactCurrency(snapshot.year1SalesArs)} ARS`,
    `- EBITDA: ${compactCurrency(snapshot.year1EbitdaArs)} ARS (${formatPercent(y1Margin)} sobre ventas)`,
    `- Resultado neto: ${compactCurrency(snapshot.year1NetArs)} ARS`,
    `- Cubiertos: ${formatCovers(snapshot.year1Covers)} · acum. 10a: ${formatCovers(snapshot.totalCovers10y)}`,
    "",
    formatYear1MonthlyBrief(snapshot.eerrYears),
    "",
    "Parámetros Excel:",
    snapshot.excelParams
      .slice(0, 12)
      .map((param) => `- ${param.label}: ${param.displayValue}`)
      .join("\n"),
    "",
    "Retorno equity inversor (USD, modelo actual):",
    `- VAN: ${formatUsd(snapshot.npvUsd)}`,
    `- TIR: ${snapshot.irr != null ? formatPercent(snapshot.irr) : "no converge"}`,
    `- Payback equity: ${snapshot.paybackYears != null ? `${formatNumber(snapshot.paybackYears)} años` : "—"}`,
    `- Liberación ${formatPercent(snapshot.operatorEquityShare)} operadores: ${snapshot.equityReleaseYear != null ? `Año ${snapshot.equityReleaseYear}` : "—"}`,
    "",
    "Horizonte 10 años:",
    yearLines,
    "",
    "Puente NOPAT→FFL (app):",
    snapshot.bridgeLineLabels.map((label) => `- ${label}`).join("\n"),
    "",
    "Conceptos EERR Año 1:",
    snapshot.eerrConcepts.slice(0, 20).join(" · "),
  ].join("\n");
}

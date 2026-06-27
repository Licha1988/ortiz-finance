import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import type { ChatTurn } from "@/lib/chat/llm-answer";
import {
  computeBreakEven,
  formatBreakEvenResult,
  formatLoanRateScenarioResult,
  formatScenarioResult,
  runLoanRateScenario,
  runVolumeScenario,
} from "@/lib/chat/scenario-engine";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function parseYear(text: string): number {
  const match = text.match(/(?:ano|año|year)\s*(\d{1,2})/i);
  if (match?.[1]) {
    const year = Number(match[1]);
    if (year >= 1 && year <= 10) return year;
  }
  return 1;
}

export function isLoanRateQuestion(text: string): boolean {
  const q = normalize(text);
  return (
    q.includes("tasa de interes") ||
    q.includes("tasa del prestamo") ||
    q.includes("tasa de prestamo") ||
    q.includes("interes del prestamo") ||
    (q.includes("tasa") && q.includes("prestamo")) ||
    (q.includes("tasa") && q.includes("interes")) ||
    (q.includes("prestamo") && q.includes("interes")) ||
    q.includes("loan rate")
  );
}

export function parseLoanRatePct(text: string): number | null {
  if (!isLoanRateQuestion(text)) return null;

  const normalized = normalize(text);
  const percentages = [...normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:%|por ciento)/g)].map(
    (match) => Number(match[1]!.replace(",", ".")),
  );

  if (percentages.length === 0) return null;

  if (
    percentages.length >= 2 &&
    (normalized.includes("en vez") ||
      normalized.includes("no de") ||
      normalized.includes("en lugar") ||
      normalized.includes("instead"))
  ) {
    return Math.max(...percentages);
  }

  const aMatch = normalized.match(/(?:a|de|es|en)\s*(\d+(?:[.,]\d+)?)\s*(?:%|por ciento)/);
  if (aMatch?.[1]) {
    return Number(aMatch[1].replace(",", "."));
  }

  return percentages[0] ?? null;
}

function parseVolumeChangePct(text: string): number | null {
  if (isLoanRateQuestion(text)) return null;

  const normalized = normalize(text);
  const volumeKeywords = [
    "venta",
    "vendi",
    "cubierto",
    "cover",
    "volumen",
    "factur",
    "ticket",
    "cliente",
    "comensal",
  ];
  const hasVolumeContext = volumeKeywords.some((keyword) => normalized.includes(keyword));

  const explicit = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por ciento|pct)/);
  if (!explicit?.[1]) return null;

  if (!hasVolumeContext) return null;

  const magnitude = Number(explicit[1].replace(",", "."));
  if (!Number.isFinite(magnitude)) return null;

  const negative =
    normalized.includes("menos") ||
    normalized.includes("baja") ||
    normalized.includes("caida") ||
    normalized.includes("reduc");
  const positive =
    normalized.includes("mas") ||
    normalized.includes("más") ||
    normalized.includes("sube") ||
    normalized.includes("aument");

  if (negative && !positive) return -magnitude;
  if (positive && !negative) return magnitude;
  return negative ? -magnitude : magnitude;
}

function isBreakEvenQuestion(text: string): boolean {
  const q = normalize(text);
  return (
    q.includes("punto de equilibrio") ||
    q.includes("break even") ||
    q.includes("breakeven") ||
    (q.includes("equilibrio") &&
      (q.includes("local") || q.includes("venta") || q.includes("cubierto")))
  );
}

function isVolumeScenarioQuestion(text: string): boolean {
  if (isLoanRateQuestion(text)) return false;

  const q = normalize(text);
  const volumeKeywords = ["venta", "vendi", "cubierto", "cover", "volumen", "factur"];
  const hasVolume = volumeKeywords.some((keyword) => q.includes(keyword));

  return (
    (q.includes("que pasa si") ||
      q.includes("qué pasa si") ||
      q.includes("simula") ||
      q.includes("escenario")) &&
    hasVolume &&
    parseVolumeChangePct(text) != null
  );
}

function buildScenarioQuestion(question: string, history: ChatTurn[] = []): string {
  const q = normalize(question);
  const hasPct = /\d+(?:[.,]\d+)?\s*(?:%|por ciento)/.test(q);
  const isClarification =
    q.includes("me refiero") ||
    q.includes("quise decir") ||
    q.includes("no, ") ||
    q.startsWith("no ") ||
    q.includes("en realidad");

  const needsHistoryContext =
    isClarification ||
    (hasPct &&
      !isLoanRateQuestion(question) &&
      parseVolumeChangePct(question) == null &&
      !isBreakEvenQuestion(question));

  if (!needsHistoryContext || history.length === 0) return question;

  const recentText = history
    .slice(-4)
    .map((turn) => turn.content)
    .join(" ");

  return `${recentText} ${question}`;
}

export function tryScenarioAnswer(
  question: string,
  snapshot: ModelChatSnapshot,
  history: ChatTurn[] = [],
): string | null {
  const contextualQuestion = buildScenarioQuestion(question, history);
  const q = normalize(contextualQuestion);
  const year = parseYear(q);

  if (isBreakEvenQuestion(contextualQuestion)) {
    const metric = q.includes("resultado neto") || q.includes("neto") ? "net" : "ebitda";
    const result = computeBreakEven(snapshot, year, metric);
    return formatBreakEvenResult(result);
  }

  const loanRatePct = parseLoanRatePct(contextualQuestion);
  if (loanRatePct != null) {
    const result = runLoanRateScenario(snapshot, loanRatePct);
    return formatLoanRateScenarioResult(result);
  }

  if (!isVolumeScenarioQuestion(contextualQuestion)) return null;

  const volumeChangePct = parseVolumeChangePct(contextualQuestion);
  if (volumeChangePct == null) return null;

  const result = runVolumeScenario(snapshot, year, volumeChangePct, year === 1);
  return formatScenarioResult(result);
}

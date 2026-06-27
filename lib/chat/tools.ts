import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import {
  computeBreakEven,
  formatBreakEvenResult,
  formatLoanRateScenarioResult,
  formatScenarioResult,
  resolveTicket,
  runLoanRateScenario,
  runVolumeScenario,
} from "@/lib/chat/scenario-engine";

export type ToolName =
  | "get_year_kpis"
  | "get_eerr_row"
  | "list_eerr_concepts"
  | "get_excel_params"
  | "get_investor_metrics"
  | "get_cashflow_year"
  | "run_volume_scenario"
  | "run_loan_rate_scenario"
  | "compute_break_even";

type JsonObject = Record<string, unknown>;

function findRow(snapshot: ModelChatSnapshot, year: number, concept: string) {
  const yearDetail = snapshot.eerrYears.find((item) => item.year === year);
  if (!yearDetail) return null;

  const normalized = concept
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();

  return yearDetail.rows.find((row) => {
    const label = row.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim();
    if (normalized === "ventas") return label === "ventas";
    if (normalized === "ebitda") return label === "ebitda";
    if (normalized === "cubiertos") return label === "cubiertos";
    if (normalized === "rrhh") return label === "rrhh";
    if (normalized === "resultado neto") return label.includes("resultado neto");
    return label.includes(normalized);
  });
}

export function executeChatTool(
  name: ToolName,
  args: JsonObject,
  snapshot: ModelChatSnapshot,
): string {
  switch (name) {
    case "get_year_kpis": {
      const year = Number(args.year ?? 1);
      const data = snapshot.years.find((item) => item.year === year);
      if (!data) return JSON.stringify({ error: `Año ${year} no encontrado.` });
      return JSON.stringify({
        year,
        salesArs: data.salesArs,
        ebitdaArs: data.ebitdaArs,
        netArs: data.netArs,
        covers: data.covers,
        nopatUsd: data.nopatUsd,
        operationalFflUsd: data.operationalFflUsd,
        investorDividendUsd: data.investorDividendUsd,
      });
    }
    case "get_eerr_row": {
      const year = Number(args.year ?? 1);
      const concept = String(args.concept ?? "ventas");
      const row = findRow(snapshot, year, concept);
      if (!row) {
        return JSON.stringify({ error: `Concepto «${concept}» no encontrado en Año ${year}.` });
      }
      const yearDetail = snapshot.eerrYears.find((item) => item.year === year);
      const months = yearDetail?.months ?? [];
      const monthly = months.map((month, index) => ({
        month,
        value: row.values[index] ?? 0,
      }));
      return JSON.stringify({
        year,
        concept: row.label,
        yearTotal: row.yearTotal,
        monthly,
      });
    }
    case "list_eerr_concepts": {
      const year = Number(args.year ?? 1);
      const yearDetail = snapshot.eerrYears.find((item) => item.year === year);
      return JSON.stringify({
        year,
        concepts: yearDetail?.rows.map((row) => row.label) ?? [],
      });
    }
    case "get_excel_params":
      return JSON.stringify({
        ticketArs: resolveTicket(snapshot),
        params: snapshot.excelParams,
      });
    case "get_investor_metrics":
      return JSON.stringify({
        equityUsd: snapshot.equityUsd,
        loanPrincipalUsd: snapshot.loanPrincipalUsd,
        npvUsd: snapshot.npvUsd,
        irr: snapshot.irr,
        paybackYears: snapshot.paybackYears,
        equityReleaseYear: snapshot.equityReleaseYear,
        operatorEquityShare: snapshot.operatorEquityShare,
      });
    case "get_cashflow_year": {
      const year = Number(args.year ?? 1);
      const data = snapshot.years.find((item) => item.year === year);
      if (!data) return JSON.stringify({ error: `Año ${year} no encontrado.` });
      const kwacc = snapshot.kwaccScheduleFull[year] ?? null;
      return JSON.stringify({
        year,
        exchangeRate: snapshot.exchangeRate,
        kwacc,
        nopatUsd: data.nopatUsd,
        operationalFflUsd: data.operationalFflUsd,
        investorDividendUsd: data.investorDividendUsd,
      });
    }
    case "run_volume_scenario": {
      const year = Number(args.year ?? 1);
      const volumeChangePct = Number(args.volumeChangePct);
      if (!Number.isFinite(volumeChangePct)) {
        return JSON.stringify({ error: "volumeChangePct inválido." });
      }
      const result = runVolumeScenario(snapshot, year, volumeChangePct, year === 1);
      return formatScenarioResult(result);
    }
    case "run_loan_rate_scenario": {
      const loanRatePct = Number(args.loanRatePct);
      if (!Number.isFinite(loanRatePct)) {
        return JSON.stringify({ error: "loanRatePct inválido." });
      }
      const result = runLoanRateScenario(snapshot, loanRatePct);
      return formatLoanRateScenarioResult(result);
    }
    case "compute_break_even": {
      const year = Number(args.year ?? 1);
      const metric = args.metric === "net" ? "net" : "ebitda";
      const result = computeBreakEven(snapshot, year, metric);
      return formatBreakEvenResult(result);
    }
    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` });
  }
}

export const CHAT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_year_kpis",
      description: "KPIs anuales del EERR: ventas, EBITDA, neto, cubiertos, NOPAT, FFL, dividendo.",
      parameters: {
        type: "object",
        properties: { year: { type: "number", description: "Año 1–10" } },
        required: ["year"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_eerr_row",
      description: "Fila EERR con desglose mensual (ventas, ebitda, cubiertos, rrhh, etc.).",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number" },
          concept: { type: "string", description: "Ej: ventas, ebitda, cubiertos, rrhh" },
        },
        required: ["year", "concept"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_eerr_concepts",
      description: "Lista conceptos/filas disponibles en el EERR de un año.",
      parameters: {
        type: "object",
        properties: { year: { type: "number" } },
        required: ["year"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_excel_params",
      description: "Parámetros del Excel (ticket y supuestos visibles).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_investor_metrics",
      description: "TIR, VAN, payback, equity, préstamo, split operadores.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_cashflow_year",
      description: "NOPAT, FFL, dividendo inversor y Kwacc de un año.",
      parameters: {
        type: "object",
        properties: { year: { type: "number" } },
        required: ["year"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_volume_scenario",
      description:
        "Simula cambio de volumen (cubiertos/ventas) en un año. Ej: -10 = 10% menos. Devuelve base vs escenario e impacto inversor si Año 1.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number" },
          volumeChangePct: { type: "number", description: "Ej: -10 para 10% menos" },
        },
        required: ["year", "volumeChangePct"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_loan_rate_scenario",
      description:
        "Simula cambio en la tasa anual del préstamo de protección (ej. 20 = 20%). FFL operativo sin cambios; impacto en servicio de deuda, TIR, VAN y payback.",
      parameters: {
        type: "object",
        properties: {
          loanRatePct: { type: "number", description: "Tasa anual en %, ej. 20 para 20%" },
        },
        required: ["loanRatePct"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compute_break_even",
      description: "Estima cubiertos/ventas de equilibrio (EBITDA o resultado neto ≈ 0).",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number" },
          metric: { type: "string", enum: ["ebitda", "net"] },
        },
        required: ["year"],
      },
    },
  },
];

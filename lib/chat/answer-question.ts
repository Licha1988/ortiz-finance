import { isLlmChatConfigured } from "@/lib/chat/config";
import { tryStructuredEerrAnswer } from "@/lib/chat/eerr-query";
import type { ChatTurn } from "@/lib/chat/llm-answer";
import { tryLocalAnswer } from "@/lib/chat/local-answer";
import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import { answerWithAgent } from "@/lib/chat/run-agent";
import { tryScenarioAnswer } from "@/lib/chat/scenario-query";

export type ChatAnswerMode = "local" | "structured" | "simulation" | "agent";

export type ChatAnswerResult = {
  answer: string;
  mode: ChatAnswerMode;
  toolsUsed?: string[];
};

export async function answerModelQuestion(
  question: string,
  snapshot: ModelChatSnapshot,
  history: ChatTurn[] = [],
): Promise<ChatAnswerResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      answer: "Escribí una pregunta sobre el modelo (ventas, TIR, payback, escenarios, etc.).",
      mode: "local",
    };
  }

  const structured = tryStructuredEerrAnswer(trimmed, snapshot.eerrYears);
  if (structured) {
    return { answer: structured, mode: "structured" };
  }

  const scenario = tryScenarioAnswer(trimmed, snapshot, history);
  if (scenario) {
    return { answer: scenario, mode: "simulation" };
  }

  const local = tryLocalAnswer(trimmed, snapshot);
  if (local) {
    return { answer: local, mode: "local" };
  }

  if (isLlmChatConfigured()) {
    const agent = await answerWithAgent(trimmed, snapshot, history);
    return {
      answer: agent.answer,
      mode: "agent",
      toolsUsed: agent.toolsUsed,
    };
  }

  return {
    answer: [
      "No encontré una respuesta preparada para esa pregunta.",
      "",
      "Probá con:",
      "· «Ventas de enero a junio»",
      "· «¿Qué pasa si vendemos 10% menos el Año 1?»",
      "· «¿Cuál es el punto de equilibrio?»",
      "· «¿TIR, VAN y payback?»",
      "",
      "Para preguntas abiertas, configurá `OPENAI_API_KEY` en `.env.local` o Vercel.",
    ].join("\n"),
    mode: "local",
  };
}

export type { ChatTurn } from "@/lib/chat/llm-answer";

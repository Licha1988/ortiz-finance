import { getOpenAiApiKey, getOpenAiModel } from "@/lib/chat/config";
import { formatModelBrief } from "@/lib/chat/format-brief";
import type { ChatTurn } from "@/lib/chat/llm-answer";
import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import {
  CHAT_TOOL_DEFINITIONS,
  executeChatTool,
  type ToolName,
} from "@/lib/chat/tools";

type OpenAiMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

const SYSTEM_PROMPT = `Sos un asistente de Casa Ortiz Finance. Respondés en español, claro y conciso.

Reglas:
- Usá las tools para obtener números del Excel. No inventes cifras.
- Para simulaciones: run_volume_scenario (ventas/cubiertos), run_loan_rate_scenario (tasa préstamo), compute_break_even.
- Montos ARS vs USD: aclarar moneda.
- No es asesoramiento financiero legal.
- Respuestas cortas con bullets cuando haya números.`;

const MAX_TOOL_ROUNDS = 5;

export type AgentAnswerResult = {
  answer: string;
  toolsUsed: string[];
};

export async function answerWithAgent(
  question: string,
  snapshot: ModelChatSnapshot,
  history: ChatTurn[],
): Promise<AgentAnswerResult> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const brief = formatModelBrief(snapshot);
  const toolsUsed: string[] = [];

  const messages: OpenAiMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\n--- RESUMEN MODELO ---\n${brief}`,
    },
    ...history.slice(-6).map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user", content: question },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenAiModel(),
        temperature: 0.2,
        tools: CHAT_TOOL_DEFINITIONS,
        tool_choice: "auto",
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `OpenAI respondió ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }[];
        };
      }[];
    };

    const message = payload.choices?.[0]?.message;
    if (!message) {
      throw new Error("La IA no devolvió una respuesta.");
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const content = message.content?.trim();
      if (!content) throw new Error("La IA no devolvió una respuesta.");
      return { answer: content, toolsUsed };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call.function.name as ToolName;
      toolsUsed.push(name);

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }

      const result = executeChatTool(name, args, snapshot);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  throw new Error("Se alcanzó el límite de consultas al modelo.");
}

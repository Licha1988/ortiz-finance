import { getOpenAiApiKey, getOpenAiModel } from "@/lib/chat/config";
import { formatModelBrief } from "@/lib/chat/format-brief";
import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT = `Sos un asistente de Casa Ortiz Finance. Respondés en español, claro y conciso.

Reglas estrictas:
- Usá SOLO los datos del bloque «MODELO ACTUAL». No inventes cifras.
- Si falta un dato, decilo explícitamente.
- Montos ARS vs USD: no mezclar sin aclarar moneda y TC.
- No es asesoramiento financiero legal; es interpretación del modelo Excel vigente.
- Preferí respuestas cortas con bullets cuando haya números.
- Para períodos (ej. enero–junio), usá el desglose mensual del EERR cuando esté en el brief.`;

export async function answerWithLlm(
  question: string,
  snapshot: ModelChatSnapshot,
  history: ChatTurn[],
): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada.");
  }

  const brief = formatModelBrief(snapshot);
  const recentHistory = history.slice(-6);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\n--- MODELO ACTUAL ---\n${brief}`,
        },
        ...recentHistory.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
        { role: "user", content: question },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail || `OpenAI respondió ${response.status}. Revisá OPENAI_API_KEY.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("La IA no devolvió una respuesta.");
  }

  return content;
}

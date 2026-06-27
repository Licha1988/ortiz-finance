"use client";

import { useCallback, useRef, useState } from "react";
import EerrExcelActions from "@/components/EerrExcelActions";
import SectionCard from "@/components/ui/SectionCard";
import type { ChatAnswerMode, ChatTurn } from "@/lib/chat/answer-question";

type ChatMessage = ChatTurn & {
  mode?: ChatAnswerMode;
  toolsUsed?: string[];
};

const SUGGESTED_QUESTIONS = [
  "Ventas de enero a junio",
  "¿Qué pasa si vendemos 10% menos el Año 1?",
  "¿Cuál es el punto de equilibrio?",
  "¿TIR, VAN y payback?",
  "EBITDA mes a mes Año 1",
];

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  mode: "local",
  content: [
    "Hola. Respondo sobre el modelo Excel vigente (EERR, cash flow e inversión).",
    "",
    "Consultas por mes, simulaciones de volumen, tasa del préstamo y punto de equilibrio.",
    "Con OPENAI_API_KEY uso tools sobre el Excel para preguntas abiertas.",
  ].join("\n"),
};

export default function ModelChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const sendQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const history = [...messages, userMessage].filter((message) => message !== WELCOME_MESSAGE);
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            history: history.map(({ role, content }) => ({ role, content })),
          }),
        });

        const payload = (await response.json()) as {
          answer?: string;
          mode?: ChatAnswerMode;
          toolsUsed?: string[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || `Error ${response.status}`);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: payload.answer ?? "Sin respuesta.",
            mode: payload.mode,
            toolsUsed: payload.toolsUsed,
          },
        ]);
        scrollToBottom();
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "No se pudo enviar la pregunta.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, scrollToBottom],
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Asistente del modelo"
        subtitle="Preguntas sobre ortiz-cashflow.xlsx · mismos datos que Inversión y EERR"
        tone="finance"
        className="rounded-2xl ring-1 ring-stone-200/60"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/50 px-5 py-4">
          <p className="text-xs text-stone-500">
            v1 · respuestas locales + IA opcional · no reemplaza asesoramiento profesional
          </p>
          <EerrExcelActions />
        </div>

        <div
          ref={listRef}
          className="max-h-[min(52vh,520px)] space-y-4 overflow-y-auto px-5 py-5"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[min(100%,640px)] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === "user"
                    ? "bg-violet-800 text-white"
                    : "border border-stone-200 bg-white text-stone-800 shadow-sm"
                }`}
              >
                {message.content}
                {message.role === "assistant" && message.mode ? (
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                    {message.mode === "agent"
                      ? `IA · tools${message.toolsUsed?.length ? `: ${message.toolsUsed.join(", ")}` : ""}`
                      : message.mode === "simulation"
                        ? "Modelo · simulación EERR"
                        : message.mode === "structured"
                          ? "Modelo · EERR por período"
                          : "Modelo · respuesta directa"}
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          {loading ? (
            <p className="text-center text-xs text-stone-500">Analizando el modelo…</p>
          ) : null}
        </div>

        {error ? (
          <p className="px-5 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="border-t border-stone-100 px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                disabled={loading}
                onClick={() => void sendQuestion(question)}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-700 transition hover:border-violet-200 hover:bg-violet-50 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void sendQuestion(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Preguntá sobre ventas, TIR, payback, FFL…"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 shadow-sm outline-none ring-violet-300 transition focus:ring-2 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-violet-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-900 disabled:opacity-50"
            >
              Preguntar
            </button>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}

import { NextResponse } from "next/server";
import {
  answerModelQuestion,
  type ChatTurn,
} from "@/lib/chat/answer-question";
import { loadModelSnapshot } from "@/lib/chat/load-model-snapshot";
import {
  normalizeInvestmentAssumptions,
  type InvestmentAssumptions,
} from "@/lib/investment/investment-assumptions";

type ChatRequestBody = {
  question?: string;
  history?: ChatTurn[];
  investmentAssumptions?: Partial<InvestmentAssumptions>;
};

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history.filter(
        (turn): turn is ChatTurn =>
          turn != null &&
          (turn.role === "user" || turn.role === "assistant") &&
          typeof turn.content === "string",
      )
    : [];

  const investmentAssumptions = normalizeInvestmentAssumptions(body.investmentAssumptions);

  try {
    const snapshot = await loadModelSnapshot(investmentAssumptions);
    const result = await answerModelQuestion(question, snapshot, history);
    return NextResponse.json(result);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "No se pudo procesar la pregunta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

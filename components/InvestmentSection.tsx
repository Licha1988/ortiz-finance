import SectionCard from "@/components/ui/SectionCard";
import {
  PROJECT_CAPEX_USD,
  PROJECT_COST_USD,
  PROJECT_INVESTMENT_LINES,
  PROJECT_INVESTMENT_TOTAL,
  PROJECT_WORKING_CAPITAL_USD,
} from "@/lib/investment/project-data";
import { formatUsd } from "@/lib/format";

type InvestmentSectionProps = {
  equityUsd: number;
  loanPrincipal: number;
  loanRatePct: number;
};

export default function InvestmentSection({
  equityUsd,
  loanPrincipal,
  loanRatePct,
}: InvestmentSectionProps) {
  const financingTotal = equityUsd + loanPrincipal;

  return (
    <SectionCard
      title="Inversión — Proyecto Ortiz"
      subtitle="Costo del proyecto vs financiamiento · el préstamo protege el equity"
      tone="investment"
    >
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Costo del proyecto
          </p>
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <th className="pb-3 pr-4">Concepto</th>
                <th className="pb-3 text-right">USD</th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_INVESTMENT_LINES.map((line, index) => (
                <tr
                  key={line.id}
                  className={`border-b border-stone-100 ${
                    index % 2 === 0 ? "bg-stone-50/60" : "bg-white"
                  }`}
                >
                  <td className="py-3 pr-4 font-medium text-stone-800">{line.label}</td>
                  <td className="py-3 text-right tabular-nums font-semibold text-stone-900">
                    {formatUsd(line.amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-800 text-white">
                <td className="py-3.5 pr-4 font-bold">{PROJECT_INVESTMENT_TOTAL.label}</td>
                <td className="py-3.5 text-right font-bold tabular-nums">
                  {formatUsd(PROJECT_COST_USD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Financiamiento
          </p>
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <tbody>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <td className="py-3 pr-4 font-medium text-stone-800">Equity</td>
                <td className="py-3 text-right tabular-nums font-semibold text-stone-900">
                  {formatUsd(equityUsd)}
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-3 pr-4 font-medium text-stone-800">Préstamo</td>
                <td className="py-3 text-right tabular-nums font-semibold text-stone-900">
                  {formatUsd(loanPrincipal)}
                </td>
              </tr>
              <tr className="border-b border-stone-100 bg-amber-50/60">
                <td className="py-3 pr-4 text-stone-700">Tasa interés préstamo</td>
                <td className="py-3 text-right tabular-nums font-semibold text-amber-900">
                  {loanRatePct.toFixed(2)}% USD/año
                </td>
              </tr>
              <tr className="bg-violet-900 text-white">
                <td className="py-3.5 pr-4 font-bold">Financiamiento total</td>
                <td className="py-3.5 text-right font-bold tabular-nums">
                  {formatUsd(financingTotal)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            El proyecto cuesta{" "}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatUsd(PROJECT_COST_USD)}
            </span>{" "}
            ({formatUsd(PROJECT_CAPEX_USD)} inversión +{" "}
            {formatUsd(PROJECT_WORKING_CAPITAL_USD)} capital de trabajo → NOF al arranque). Los
            inversores aportan{" "}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatUsd(equityUsd)}
            </span>{" "}
            de equity (Año 1:{" "}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatUsd(-equityUsd)}
            </span>
            ). El préstamo de{" "}
            <span className="font-semibold">{formatUsd(loanPrincipal)}</span> financia parte del
            proyecto sin abrir capital adicional: protege el equity y se repaga desde el FFL
            operativo (interés primero, luego capital).
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

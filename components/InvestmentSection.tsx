import SectionCard from "@/components/ui/SectionCard";
import {
  PROJECT_INVESTMENT_LINES,
  PROJECT_INVESTMENT_TOTAL,
  TOTAL_INVESTMENT_USD,
} from "@/lib/investment/project-data";
import { formatPercent, formatUsd } from "@/lib/format";

type InvestmentSectionProps = {
  equityUsd: number;
  totalUsd: number;
  loanPrincipal: number;
  loanRatePct: number;
};

export default function InvestmentSection({
  equityUsd,
  totalUsd,
  loanPrincipal,
  loanRatePct,
}: InvestmentSectionProps) {
  return (
    <SectionCard
      title="Inversión — Proyecto Ortiz"
      subtitle="Estructura de capital · equity vs préstamo de protección (USD)"
      tone="investment"
    >
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Desglose proyecto
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
                  {formatUsd(TOTAL_INVESTMENT_USD)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Fuentes de fondos (como Excel)
          </p>
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <tbody>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <td className="py-3 pr-4 font-medium text-stone-800">Equity inversores (Año 0)</td>
                <td className="py-3 text-right tabular-nums font-semibold text-stone-900">
                  {formatUsd(equityUsd)}
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-3 pr-4 font-medium text-stone-800">
                  Préstamo (protección equity)
                </td>
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
                <td className="py-3.5 pr-4 font-bold">Inversión total</td>
                <td className="py-3.5 text-right font-bold tabular-nums">{formatUsd(totalUsd)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            El cash flow del inversor arranca en{" "}
            <span className="font-semibold tabular-nums text-stone-800">
              {formatUsd(-equityUsd)}
            </span>{" "}
            (solo equity). El préstamo de{" "}
            <span className="font-semibold">{formatUsd(loanPrincipal)}</span> (
            {formatPercent(loanPrincipal / totalUsd)} del proyecto) se devuelve con interés desde
            el FFL operativo: primero intereses, luego capital.
          </p>
          <p className="mt-2 text-[11px] text-stone-400">
            Desglose complementario en miles USD (obra, contingencia, fondo de comercio).
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

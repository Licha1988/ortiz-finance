import ParamField from "@/components/ui/ParamField";
import {
  DEFAULT_OPERATOR_BONUS_TIERS,
  type OperatorBonusTier,
} from "@/lib/investment/operator-margin-bonus";
import { compactFromUsd, formatPercent } from "@/lib/format";
import type { DisplayCurrency } from "@/lib/cashflow/exchange-rate";

type OperatorBonusPanelProps = {
  tierRatesPct: number[];
  onTierRateChange: (index: number, ratePct: number) => void;
  totalBonusUsd: number;
  displayCurrency: DisplayCurrency;
  exchangeRate: number;
  year1MarginPct: number;
  year1BonusUsd: number;
};

function tierLabel(tier: OperatorBonusTier): string {
  if (tier.marginCeilingPct == null) {
    return `${tier.marginFloorPct}% o +`;
  }
  return `${tier.marginFloorPct}% – ${tier.marginCeilingPct}%`;
}

export default function OperatorBonusPanel({
  tierRatesPct,
  onTierRateChange,
  totalBonusUsd,
  displayCurrency,
  exchangeRate,
  year1MarginPct,
  year1BonusUsd,
}: OperatorBonusPanelProps) {
  return (
    <div className="border-t border-stone-200/80 bg-stone-50/40 px-5 py-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Bono operadores · margen EBITDA
        </p>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-stone-400">
          Tramos marginales: cada tramo paga solo sobre el margen dentro del rango (ej. 25%
          aplica entre 10% y 15%, no desde 0%). Debajo de 5% no hay bono.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEFAULT_OPERATOR_BONUS_TIERS.map((tier, index) => (
          <div
            key={`bonus-tier-${tier.marginFloorPct}`}
            className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
              Margen {tierLabel(tier)}
            </p>
            <ParamField
              label="Operadores se llevan"
              helper="% del EBITDA marginal del tramo"
              value={tierRatesPct[index] ?? tier.operatorSharePct}
              onChange={(value) => onTierRateChange(index, value)}
              format={(v) => `${v.toFixed(0)}%`}
              parse={(raw) => {
                const n = Number(raw.replace(",", ".").replace("%", ""));
                return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 text-xs sm:grid-cols-2">
        <p className="font-medium text-violet-950">
          Impacto Año 1 · margen {formatPercent(year1MarginPct / 100)} → bono{" "}
          {compactFromUsd(year1BonusUsd, displayCurrency, exchangeRate)}
        </p>
        <p className="text-violet-800/80 sm:text-right">
          Acumulado 10 años:{" "}
          <span className="font-semibold tabular-nums">
            {compactFromUsd(totalBonusUsd, displayCurrency, exchangeRate)}
          </span>{" "}
          · descontado del flujo al inversor
        </p>
      </div>
    </div>
  );
}

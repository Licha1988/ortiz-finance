import ParamField from "@/components/ui/ParamField";
import {
  DEFAULT_OPERATOR_BONUS_TIERS,
  OPERATOR_BONUS_HURDLE_PCT,
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
  totalBonusShareOfEbitdaPct: number;
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
  totalBonusShareOfEbitdaPct,
}: OperatorBonusPanelProps) {
  return (
    <div className="border-t border-stone-200/80 bg-stone-50/40 px-5 py-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
          Bono operadores · margen EBITDA
        </p>
        <p className="mt-2 text-[13px] font-semibold leading-snug text-stone-700">
          Hurdle rate: {OPERATOR_BONUS_HURDLE_PCT}% — piso de rentabilidad para proteger el equity
          de socios inversores; por debajo no hay bono.
        </p>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-stone-500">
          Incluye todos los impuestos corrientes del negocio excepto impuesto a las ganancias
          (IIGG).
        </p>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-stone-500">
          Tramos marginales: cada tramo paga solo sobre el margen dentro de su rango — 10–15% al
          40%, 15–20% al 45%, 20% o + al 50% (ej. a 17%, el tramo 10–15% toma base del 5%
          intermedio al 40% y el tramo 15–20% del 2% restante al 45%; no se aplica un solo % sobre
          todo el EBITDA).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DEFAULT_OPERATOR_BONUS_TIERS.map((tier, index) => (
          <div
            key={`bonus-tier-${tier.marginFloorPct}`}
            className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-800">
              Margen {tierLabel(tier)}
            </p>
            <ParamField
              label="Participación operadores"
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

      <div className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-4 text-xs">
        <p className="font-medium text-violet-950">
          Impacto acum. 10 años · bono{" "}
          <span className="font-semibold tabular-nums">
            {compactFromUsd(totalBonusUsd, displayCurrency, exchangeRate)}
          </span>
          {totalBonusShareOfEbitdaPct > 0 ? (
            <>
              {" "}
              · {formatPercent(totalBonusShareOfEbitdaPct / 100, 1)} del EBITDA acum.
            </>
          ) : null}
          {" "}
          · descontado del flujo al inversor (post-préstamo)
        </p>
      </div>
    </div>
  );
}

/** Tramo de bono por margen operativo (EBITDA / ventas). */
export type OperatorBonusTier = {
  /** Margen mínimo del tramo (%). Por debajo del primer tramo no hay bono. */
  marginFloorPct: number;
  /** Margen máximo del tramo (%); null = sin tope. */
  marginCeilingPct: number | null;
  /** % del EBITDA marginal del tramo que va a operadores. */
  operatorSharePct: number;
};

export const DEFAULT_OPERATOR_BONUS_TIERS: OperatorBonusTier[] = [
  { marginFloorPct: 5, marginCeilingPct: 10, operatorSharePct: 10 },
  { marginFloorPct: 10, marginCeilingPct: 15, operatorSharePct: 25 },
  { marginFloorPct: 15, marginCeilingPct: 20, operatorSharePct: 40 },
  { marginFloorPct: 20, marginCeilingPct: null, operatorSharePct: 50 },
];

export type OperatorBonusBandBreakdown = {
  tierIndex: number;
  marginFloorPct: number;
  marginCeilingPct: number | null;
  operatorSharePct: number;
  /** Ancho del tramo efectivamente alcanzado (puntos porcentuales de margen). */
  bandWidthPct: number;
  /** EBITDA ARS atribuido al tramo. */
  bandEbitdaArs: number;
  /** Bono ARS del tramo. */
  bonusArs: number;
};

export type OperatorBonusYearResult = {
  yearSalesArs: number;
  ebitdaArs: number;
  operationalMarginPct: number;
  bonusArs: number;
  bonusUsd: number;
  bands: OperatorBonusBandBreakdown[];
};

export function computeMarginalOperatorBonusArs(
  yearSalesArs: number,
  ebitdaArs: number,
  tiers: OperatorBonusTier[],
): { bonusArs: number; operationalMarginPct: number; bands: OperatorBonusBandBreakdown[] } {
  if (yearSalesArs <= 0 || ebitdaArs <= 0) {
    return { bonusArs: 0, operationalMarginPct: 0, bands: [] };
  }

  const margin = ebitdaArs / yearSalesArs;
  const operationalMarginPct = margin * 100;
  let bonusArs = 0;
  const bands: OperatorBonusBandBreakdown[] = [];

  tiers.forEach((tier, tierIndex) => {
    const floor = tier.marginFloorPct / 100;
    const ceiling =
      tier.marginCeilingPct != null ? tier.marginCeilingPct / 100 : Number.POSITIVE_INFINITY;

    if (margin <= floor) return;

    const bandWidth = Math.min(margin, ceiling) - floor;
    if (bandWidth <= 0) return;

    const bandEbitdaArs = yearSalesArs * bandWidth;
    const bandBonusArs = bandEbitdaArs * (tier.operatorSharePct / 100);
    bonusArs += bandBonusArs;

    bands.push({
      tierIndex,
      marginFloorPct: tier.marginFloorPct,
      marginCeilingPct: tier.marginCeilingPct,
      operatorSharePct: tier.operatorSharePct,
      bandWidthPct: bandWidth * 100,
      bandEbitdaArs,
      bonusArs: bandBonusArs,
    });
  });

  return { bonusArs, operationalMarginPct, bands };
}

export function computeOperatorBonusSchedule(
  businessFlows: { year: number; ventasArs: number; ebitdaArs: number }[],
  tiers: OperatorBonusTier[],
  exchangeRateByYear: number[],
): OperatorBonusYearResult[] {
  return businessFlows.map((flow, index) => {
    const { bonusArs, operationalMarginPct, bands } = computeMarginalOperatorBonusArs(
      flow.ventasArs,
      flow.ebitdaArs,
      tiers,
    );
    const exchangeRate = exchangeRateByYear[index] ?? exchangeRateByYear[0] ?? 1;
    const bonusUsd = exchangeRate > 0 ? bonusArs / exchangeRate : 0;

    return {
      yearSalesArs: flow.ventasArs,
      ebitdaArs: flow.ebitdaArs,
      operationalMarginPct,
      bonusArs,
      bonusUsd,
      bands,
    };
  });
}

export function withEditableTierRates(
  ratesPct: number[],
  baseTiers: OperatorBonusTier[] = DEFAULT_OPERATOR_BONUS_TIERS,
): OperatorBonusTier[] {
  return baseTiers.map((tier, index) => ({
    ...tier,
    operatorSharePct: ratesPct[index] ?? tier.operatorSharePct,
  }));
}

export function isOperatorBonusActive(tiers: OperatorBonusTier[]): boolean {
  return tiers.some((tier) => tier.operatorSharePct > 0);
}

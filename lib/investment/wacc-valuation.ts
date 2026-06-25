import { INVESTMENT_HORIZON_YEARS } from "@/lib/investment/project-data";
import type { BusinessYearFlow } from "@/lib/investment/eerr-operational-flows";
import { computeIrr, computeNpv } from "@/lib/investment/returns";

/** Inputs editables — Valuación por WACC (modelo Excel Diego). */
export type WaccValuationInputs = {
  /** Bonos Tesoro USA 10Y (ratio 0–1). */
  riskFreeRate: number;
  /** Beta apalancada industria (Damodaran). */
  industryLeveredBeta: number;
  /** D/V industria (ratio 0–1). */
  industryDebtToValue: number;
  /** Prima de riesgo de mercado (ERP). */
  equityRiskPremium: number;
  /** Prima de riesgo no pago de la deuda. */
  defaultSpread: number;
  /** Prima de riesgo país (JPM EMBI+). */
  countryRiskPremium: number;
  /** Prima por liquidez. */
  liquidityPremium: number;
  /** Prima por empresa chica. */
  smallCapPremium: number;
  /** Tasa impositiva (ratio 0–1). */
  taxRate: number;
  /** D/V del proyecto para reapalancar beta (0 = equity puro en WACC). */
  projectDebtToValue: number;
  /** Tasa de crecimiento perpetuo g (ratio 0–1). */
  terminalGrowthRate: number;
  /** Ronic — referencia Excel (ratio 0–1). */
  returnOnNewInvestedCapital: number;
};

export const DEFAULT_WACC_INPUTS: WaccValuationInputs = {
  riskFreeRate: 0.0454,
  industryLeveredBeta: 0.92,
  industryDebtToValue: 0.16,
  equityRiskPremium: 0.0423,
  defaultSpread: 0.0025,
  countryRiskPremium: 0.05,
  liquidityPremium: 0.05,
  smallCapPremium: 0.05,
  taxRate: 0.35,
  projectDebtToValue: 0,
  terminalGrowthRate: 0.03,
  returnOnNewInvestedCapital: 0.1,
};

/**
 * Evolución esperada del riesgo país (ratio absoluto sobre Ke).
 * Índice 0 = Año 0, … índice 10 = Año 10.
 */
export const DEFAULT_COUNTRY_RISK_EVOLUTION: readonly number[] = [
  0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

export function cloneDefaultCountryRiskEvolution(): number[] {
  return [...DEFAULT_COUNTRY_RISK_EVOLUTION];
}

/** Ajuste de madurez sobre Kwacc desde Año 2 (calibrado al Excel: 16,31%). */
export const DEFAULT_MATURITY_KWACC_ADJUSTMENT = 0.014871;

/**
 * Kwacc por año — misma lógica que Excel (fila Kwacc / celda H25):
 * Rf + Bl×ERP + evolución riesgo país(t) + prima liquidez + prima empresa chica
 * − ajuste madurez (desde Año 2).
 */
export function computeKwaccForYear(
  inputs: WaccValuationInputs,
  releveredBeta: number,
  countryRiskEvolutionRate: number,
  yearIndex: number,
  maturityAdjustment: number = DEFAULT_MATURITY_KWACC_ADJUSTMENT,
): number {
  const base =
    inputs.riskFreeRate +
    releveredBeta * inputs.equityRiskPremium +
    inputs.liquidityPremium +
    inputs.smallCapPremium;
  let kwacc = base + countryRiskEvolutionRate;
  if (yearIndex >= 2) {
    kwacc -= maturityAdjustment;
  }
  return kwacc;
}

export type WaccRatesSummary = {
  unleveredBeta: number;
  releveredBeta: number;
  costOfDebtPretax: number;
  costOfDebtAfterTax: number;
  unleveredCostOfEquity: number;
  costOfEquityFull: number;
  wacc: number;
  projectDebtToValue: number;
  taxRate: number;
};

export type ProjectValuationYear = {
  year: number;
  exchangeRate: number;
  countryRiskEvolution: number;
  kwacc: number;
  nopatUsd: number;
  fflUsd: number;
  terminalValueUsd: number;
  fflPlusTerminalUsd: number;
  discountFactor: number;
  presentValueUsd: number;
};

export type ProjectValuationResult = {
  rates: WaccRatesSummary;
  kwaccSchedule: number[];
  years: ProjectValuationYear[];
  /** Flujo completo Año 0…10 para VAN/TIR (inversión + FFL + VR en último año). */
  valuationCashFlows: number[];
  discountRates: number[];
  npv: number;
  irr: number | null;
  terminalGrowthRate: number;
  returnOnNewInvestedCapital: number;
};

/** Beta desapalancado — Excel: Bl_ind × (1 − D/V_ind). */
export function computeUnleveredBeta(
  leveredBeta: number,
  debtToValue: number,
): number {
  return leveredBeta * (1 - debtToValue);
}

/** Beta reapalancado — Excel: Bu × (1 + D/V / (1 − D/V)). */
export function computeReleveredBeta(
  unleveredBeta: number,
  projectDebtToValue: number,
): number {
  if (projectDebtToValue <= 0) return unleveredBeta;
  if (projectDebtToValue >= 1) return Infinity;
  return unleveredBeta * (1 + projectDebtToValue / (1 - projectDebtToValue));
}

export function computeWaccRatesSummary(inputs: WaccValuationInputs): WaccRatesSummary {
  const unleveredBeta = computeUnleveredBeta(
    inputs.industryLeveredBeta,
    inputs.industryDebtToValue,
  );
  const releveredBeta = computeReleveredBeta(
    unleveredBeta,
    inputs.projectDebtToValue,
  );

  const costOfDebtPretax = inputs.riskFreeRate + inputs.defaultSpread;
  const costOfDebtAfterTax = costOfDebtPretax * (1 - inputs.taxRate);
  const unleveredCostOfEquity =
    inputs.riskFreeRate + unleveredBeta * inputs.equityRiskPremium;
  const costOfEquityFull =
    inputs.riskFreeRate +
    releveredBeta * inputs.equityRiskPremium +
    inputs.countryRiskPremium +
    inputs.liquidityPremium +
    inputs.smallCapPremium;

  const equityWeight = 1 - inputs.projectDebtToValue;
  const wacc =
    costOfEquityFull * equityWeight + costOfDebtAfterTax * inputs.projectDebtToValue;

  return {
    unleveredBeta,
    releveredBeta,
    costOfDebtPretax,
    costOfDebtAfterTax,
    unleveredCostOfEquity,
    costOfEquityFull,
    wacc,
    projectDebtToValue: inputs.projectDebtToValue,
    taxRate: inputs.taxRate,
  };
}

/** Ke por año según evolución del riesgo país + ajuste de madurez (Año 2+). */
export function buildKwaccScheduleFromWaccInputs(
  inputs: WaccValuationInputs,
  horizonYears: number = INVESTMENT_HORIZON_YEARS,
  countryRiskEvolution: readonly number[] = DEFAULT_COUNTRY_RISK_EVOLUTION,
  maturityAdjustment: number = DEFAULT_MATURITY_KWACC_ADJUSTMENT,
): number[] {
  const rates = computeWaccRatesSummary(inputs);
  const scheduleLength = horizonYears + 1;
  return Array.from({ length: scheduleLength }, (_, index) => {
    const country =
      countryRiskEvolution[index] ??
      countryRiskEvolution[countryRiskEvolution.length - 1] ??
      0;
    return computeKwaccForYear(
      inputs,
      rates.releveredBeta,
      country,
      index,
      maturityAdjustment,
    );
  });
}

function terminalValueGordon(
  lastFflUsd: number,
  terminalKwacc: number,
  growthRate: number,
): number {
  if (terminalKwacc <= growthRate) return 0;
  return (lastFflUsd * (1 + growthRate)) / (terminalKwacc - growthRate);
}

function cumulativeDiscountFactor(kwaccByPeriod: number[], throughYear: number): number {
  let factor = 1;
  for (let period = 1; period <= throughYear; period += 1) {
    const rate = kwaccByPeriod[period] ?? kwaccByPeriod[kwaccByPeriod.length - 1] ?? 0;
    factor *= 1 + rate;
  }
  return factor;
}

export function buildProjectValuation(params: {
  equityInvestmentUsd: number;
  exchangeRate: number;
  waccInputs: WaccValuationInputs;
  businessFlows: BusinessYearFlow[];
  countryRiskEvolution?: readonly number[];
  maturityAdjustment?: number;
  /** Si true, usa el último FFL como VR (criterio Excel visible). Si false, Gordon. */
  useLastFflAsTerminalValue?: boolean;
}): ProjectValuationResult {
  const {
    equityInvestmentUsd,
    exchangeRate,
    waccInputs,
    businessFlows,
    countryRiskEvolution = DEFAULT_COUNTRY_RISK_EVOLUTION,
    maturityAdjustment = DEFAULT_MATURITY_KWACC_ADJUSTMENT,
    useLastFflAsTerminalValue = true,
  } = params;

  const horizon = Math.min(INVESTMENT_HORIZON_YEARS, businessFlows.length);
  const rates = computeWaccRatesSummary(waccInputs);
  const kwaccByColumn = buildKwaccScheduleFromWaccInputs(
    waccInputs,
    horizon,
    countryRiskEvolution,
    maturityAdjustment,
  );

  const lastIndex = horizon - 1;
  const lastFfl = businessFlows[lastIndex]?.operationalFflUsd ?? 0;
  const terminalKwacc =
    kwaccByColumn[horizon] ?? kwaccByColumn[kwaccByColumn.length - 1] ?? rates.wacc;
  const terminalValue = useLastFflAsTerminalValue
    ? lastFfl
    : terminalValueGordon(lastFfl, terminalKwacc, waccInputs.terminalGrowthRate);

  const operationalYears: ProjectValuationYear[] = [];
  const valuationCashFlows: number[] = [-equityInvestmentUsd];
  const discountRates: number[] = [0];

  for (let index = 0; index < horizon; index += 1) {
    const year = index + 1;
    const flow = businessFlows[index];
    const kwacc =
      kwaccByColumn[year] ?? kwaccByColumn[kwaccByColumn.length - 1] ?? terminalKwacc;
    const countryRisk =
      countryRiskEvolution[year] ??
      countryRiskEvolution[countryRiskEvolution.length - 1] ??
      0;

    const fflUsd = flow.operationalFflUsd;
    const isLastYear = index === lastIndex;
    const terminalValueUsd = isLastYear ? terminalValue : 0;
    const fflPlusTerminalUsd = fflUsd + terminalValueUsd;

    const discountFactor = cumulativeDiscountFactor(kwaccByColumn, year);
    const presentValueUsd = fflPlusTerminalUsd / discountFactor;

    operationalYears.push({
      year,
      exchangeRate,
      countryRiskEvolution: countryRisk,
      kwacc,
      nopatUsd: flow.nopatUsd,
      fflUsd,
      terminalValueUsd,
      fflPlusTerminalUsd,
      discountFactor,
      presentValueUsd,
    });

    valuationCashFlows.push(fflPlusTerminalUsd);
    discountRates.push(kwacc);
  }

  const year0Kwacc = kwaccByColumn[0] ?? rates.wacc;

  return {
    rates,
    kwaccSchedule: kwaccByColumn,
    years: [
      {
        year: 0,
        exchangeRate,
        countryRiskEvolution:
          countryRiskEvolution[0] ?? waccInputs.countryRiskPremium,
        kwacc: year0Kwacc,
        nopatUsd: 0,
        fflUsd: -equityInvestmentUsd,
        terminalValueUsd: 0,
        fflPlusTerminalUsd: -equityInvestmentUsd,
        discountFactor: 1,
        presentValueUsd: -equityInvestmentUsd,
      },
      ...operationalYears,
    ],
    valuationCashFlows,
    discountRates,
    npv: computeNpv(valuationCashFlows, discountRates),
    irr: computeIrr(valuationCashFlows),
    terminalGrowthRate: waccInputs.terminalGrowthRate,
    returnOnNewInvestedCapital: waccInputs.returnOnNewInvestedCapital,
  };
}

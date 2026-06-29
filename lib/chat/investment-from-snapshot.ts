import type { ModelChatSnapshot } from "@/lib/chat/model-snapshot";
import { kwaccForInvestorYears } from "@/lib/cashflow/parse-cashflow-excel";
import type { BusinessYearFlow } from "@/lib/investment/eerr-operational-flows";
import {
  buildInvestorCashflow,
  type InvestmentModelParams,
  type InvestorCashflowResult,
} from "@/lib/investment/investor-cashflow";
import { resolveOperatorBonusTiers } from "@/lib/investment/investment-model";
import type { InvestmentAssumptions } from "@/lib/investment/investment-assumptions";

function resolveExchangeRatesByYear(
  snapshot: ModelChatSnapshot,
  businessFlows: BusinessYearFlow[],
): number[] {
  return businessFlows.map((_, index) => {
    const fromSchedule = snapshot.cashFlowSchedule?.exchangeRates[index + 1];
    return fromSchedule && fromSchedule > 0 ? fromSchedule : snapshot.exchangeRate;
  });
}

function buildInvestmentParamsFromSnapshot(
  snapshot: ModelChatSnapshot,
  loanRateAnnual: number,
): InvestmentModelParams {
  const kwaccScheduleFull = snapshot.kwaccScheduleFull;
  const kwaccForInvestorDiscount = kwaccForInvestorYears(kwaccScheduleFull);

  return {
    equityUsd: snapshot.equityUsd,
    totalInvestmentUsd: snapshot.financingTotalUsd,
    loanRateAnnual,
    kwaccInitial: kwaccForInvestorDiscount[0] ?? kwaccScheduleFull[0] ?? 0,
    kwaccFinal:
      kwaccForInvestorDiscount[kwaccForInvestorDiscount.length - 1] ??
      kwaccScheduleFull[kwaccScheduleFull.length - 1] ??
      0,
    kwaccSchedule: kwaccForInvestorDiscount,
    kwaccScheduleFull,
  };
}

export function buildInvestorCashflowForSnapshot(
  snapshot: ModelChatSnapshot,
  businessFlows: BusinessYearFlow[],
  loanRateAnnual = snapshot.investmentAssumptions.loanRateAnnual,
  assumptions: InvestmentAssumptions = snapshot.investmentAssumptions,
): InvestorCashflowResult {
  return buildInvestorCashflow(
    buildInvestmentParamsFromSnapshot(snapshot, loanRateAnnual),
    businessFlows,
    {
      operatorBonusTiers: resolveOperatorBonusTiers(assumptions),
      exchangeRatesByYear: resolveExchangeRatesByYear(snapshot, businessFlows),
      debtRollYears: assumptions.debtRollYears,
    },
  );
}

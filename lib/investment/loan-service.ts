export type LoanServiceYear = {
  year: number;
  operationalFfl: number;
  balanceStart: number;
  interestAccrued: number;
  interestPaid: number;
  principalPaid: number;
  equityFfl: number;
  balanceEnd: number;
};

/**
 * Servicio de deuda: primero interés, luego amortización de capital con el remanente.
 */
export function computeLoanServiceSchedule(
  loanPrincipal: number,
  annualRate: number,
  operationalFflByYear: number[],
): LoanServiceYear[] {
  let balance = loanPrincipal;

  return operationalFflByYear.map((operationalFfl, index) => {
    const year = index + 1;
    const balanceStart = balance;
    const interestAccrued = balanceStart > 0 ? balanceStart * annualRate : 0;

    const interestPaid =
      balanceStart > 0 ? Math.min(interestAccrued, Math.max(0, operationalFfl)) : 0;

    const afterInterest = operationalFfl - interestPaid;
    const principalPaid =
      balanceStart > 0 ? Math.min(Math.max(0, afterInterest), balanceStart) : 0;

    const equityFfl = afterInterest - principalPaid;
    const balanceEnd = balanceStart - principalPaid;
    balance = balanceEnd;

    return {
      year,
      operationalFfl,
      balanceStart,
      interestAccrued,
      interestPaid,
      principalPaid,
      equityFfl,
      balanceEnd,
    };
  });
}

export function equityCashFlows(
  equityInvestment: number,
  loanSchedule: LoanServiceYear[],
): number[] {
  return [-equityInvestment, ...loanSchedule.map((row) => row.equityFfl)];
}

export type LoanServiceYear = {
  year: number;
  operationalFfl: number;
  balanceStart: number;
  interestAccrued: number;
  interestPaid: number;
  principalPaid: number;
  /** true si en este año no se amortiza capital (roll de deuda). */
  principalRollActive: boolean;
  equityFfl: number;
  balanceEnd: number;
};

export type LoanServiceOptions = {
  /** Años iniciales sin amortizar capital: solo interés (roll de deuda). */
  principalRollYears?: number;
};

/**
 * Servicio de deuda: primero interés, luego amortización de capital con el remanente.
 * Con roll de deuda, los primeros N años no amortizan capital (saldo se mantiene).
 */
export function computeLoanServiceSchedule(
  loanPrincipal: number,
  annualRate: number,
  operationalFflByYear: number[],
  options: LoanServiceOptions = {},
): LoanServiceYear[] {
  const rollYears = Math.max(0, options.principalRollYears ?? 0);
  let balance = loanPrincipal;

  return operationalFflByYear.map((operationalFfl, index) => {
    const year = index + 1;
    const balanceStart = balance;
    const interestAccrued = balanceStart > 0 ? balanceStart * annualRate : 0;

    const interestPaid =
      balanceStart > 0 ? Math.min(interestAccrued, Math.max(0, operationalFfl)) : 0;

    const afterInterest = operationalFfl - interestPaid;
    const rollActive = rollYears > 0 && year <= rollYears && balanceStart > 0;
    const principalPaid = rollActive
      ? 0
      : balanceStart > 0
        ? Math.min(Math.max(0, afterInterest), balanceStart)
        : 0;

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
      principalRollActive: rollActive,
      equityFfl,
      balanceEnd,
    };
  });
}

/** Flujo neto al equity por año operativo (Año 1…10). Inversión en Año 1. */
export function equityCashFlows(
  equityInvestment: number,
  loanSchedule: LoanServiceYear[],
): number[] {
  return loanSchedule.map((row, index) =>
    index === 0 ? row.equityFfl - equityInvestment : row.equityFfl,
  );
}

/** Año 0: −equity · Años 1…10: FFL to equity post-deuda (100% al inversor). */
export function buildEquityInvestorFlowsYearZero(
  equityInvestment: number,
  loanSchedule: LoanServiceYear[],
): number[] {
  return [-equityInvestment, ...loanSchedule.map((row) => row.equityFfl)];
}

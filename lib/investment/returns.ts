/** Valor presente neto con tasa de descuento por período. */
export function computeNpv(cashFlows: number[], discountRates: number[]): number {
  return cashFlows.reduce((total, cashFlow, index) => {
    const rate = discountRates[index] ?? discountRates[discountRates.length - 1] ?? 0;
    const discountFactor = Math.pow(1 + rate, index);
    return total + cashFlow / discountFactor;
  }, 0);
}

/** TIR (IRR) — tasa que hace NPV = 0. Newton-Raphson sobre flujo completo. */
export function computeIrr(cashFlows: number[], guess = 0.15): number | null {
  if (cashFlows.length < 2) return null;
  if (!cashFlows.some((value) => value > 0) || !cashFlows.some((value) => value < 0)) {
    return null;
  }

  let rate = guess;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t += 1) {
      const factor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / factor;
      if (t > 0) {
        derivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < 1e-6) return rate;
    if (Math.abs(derivative) < 1e-12) break;

    rate -= npv / derivative;

    if (rate <= -0.9999) rate = -0.9999;
    if (rate > 10) rate = 10;
  }

  return null;
}

/**
 * Payback simple en años (puede ser fraccionario).
 * Retorna null si no se recupera dentro del horizonte.
 */
export function computePaybackYears(cashFlows: number[]): number | null {
  if (cashFlows.length === 0 || cashFlows[0] >= 0) return null;

  let cumulative = cashFlows[0];
  for (let year = 1; year < cashFlows.length; year += 1) {
    const previous = cumulative;
    cumulative += cashFlows[year];
    if (cumulative >= 0) {
      const shortfall = -previous;
      const inflow = cashFlows[year];
      if (inflow === 0) return year;
      return year - 1 + shortfall / inflow;
    }
  }

  return null;
}

/** Interpola Kwacc linealmente entre inicial y final. */
export function buildKwaccSchedule(
  horizonYears: number,
  kwaccInitial: number,
  kwaccFinal: number,
): number[] {
  if (horizonYears <= 1) return [kwaccInitial];
  return Array.from({ length: horizonYears + 1 }, (_, index) => {
    const progress = index / horizonYears;
    return kwaccInitial + (kwaccFinal - kwaccInitial) * progress;
  });
}

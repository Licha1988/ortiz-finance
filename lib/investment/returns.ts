/** Valor presente neto con tasa de descuento por período. */
export function computeNpv(
  cashFlows: number[],
  discountRates: number[],
  /** Período del primer flujo (1 = Año 1, sin Año 0). */
  firstPeriod = 0,
): number {
  return cashFlows.reduce((total, cashFlow, index) => {
    const rate = discountRates[index] ?? discountRates[discountRates.length - 1] ?? 0;
    const period = firstPeriod + index;
    const discountFactor = Math.pow(1 + rate, period);
    return total + cashFlow / discountFactor;
  }, 0);
}

/** TIR (IRR) — tasa que hace NPV = 0. Newton-Raphson sobre flujo completo. */
export function computeIrr(
  cashFlows: number[],
  guess = 0.15,
  firstPeriod = 0,
): number | null {
  if (cashFlows.length < 2) return null;
  if (!cashFlows.some((value) => value > 0) || !cashFlows.some((value) => value < 0)) {
    return null;
  }

  let rate = guess;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t += 1) {
      const period = firstPeriod + t;
      const factor = Math.pow(1 + rate, period);
      npv += cashFlows[t] / factor;
      if (period > 0) {
        derivative -= (period * cashFlows[t]) / Math.pow(1 + rate, period + 1);
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
export function computePaybackYears(
  cashFlows: number[],
  /** Período del primer flujo (1 = Año 1). */
  firstPeriod = 0,
): number | null {
  if (cashFlows.length === 0) return null;

  let cumulative = 0;
  for (let index = 0; index < cashFlows.length; index += 1) {
    const previous = cumulative;
    cumulative += cashFlows[index];
    if (cumulative >= 0 && previous < 0) {
      const shortfall = -previous;
      const inflow = cashFlows[index];
      if (inflow === 0) return firstPeriod + index;
      return firstPeriod + index - 1 + shortfall / inflow;
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

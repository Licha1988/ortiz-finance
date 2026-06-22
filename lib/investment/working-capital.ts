/** Días de capital de trabajo — alineado al Excel «Cash Flow» (Diego). */
export const WORKING_CAPITAL_DAYS = {
  caja: 4,
  clientes: 0,
  proveedores: 15,
} as const;

export type WorkingCapitalDays = typeof WORKING_CAPITAL_DAYS;

/**
 * Stock de NOF (USD): (Caja + Clientes) − Proveedores sobre ventas/compras anuales.
 * Fórmula Excel: (días caja + días clientes) / 365 × ventas − días proveedores / 365 × compras.
 */
export function nofStockUsd(
  ventasUsd: number,
  comprasUsd: number,
  days: WorkingCapitalDays = WORKING_CAPITAL_DAYS,
): number {
  const receivablesAndCash =
    ((days.caja + days.clientes) / 365) * ventasUsd;
  const payables = (days.proveedores / 365) * comprasUsd;
  return receivablesAndCash - payables;
}

/**
 * Δ NOF anual: variación del stock respecto al cierre del año anterior.
 * Año 1 compara contra stock inicial 0 (pre-apertura).
 */
export function deltaNofUsd(
  ventasUsd: number,
  comprasUsd: number,
  priorNofStockUsd: number,
  days: WorkingCapitalDays = WORKING_CAPITAL_DAYS,
): { deltaUsd: number; endStockUsd: number } {
  const endStockUsd = nofStockUsd(ventasUsd, comprasUsd, days);
  return {
    deltaUsd: endStockUsd - priorNofStockUsd,
    endStockUsd,
  };
}

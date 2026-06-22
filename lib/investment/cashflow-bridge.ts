import { deltaNofUsd } from "@/lib/investment/working-capital";

/** Retenciones de caja entre NOPAT y FFL operativo. */
export type CashflowBridgeLineId = "delta-nof" | "reserva-despidos";

export type CashflowBridgeLineDef = {
  id: CashflowBridgeLineId;
  label: string;
};

export const CASHFLOW_BRIDGE_LINES: CashflowBridgeLineDef[] = [
  {
    id: "delta-nof",
    label: "Δ NOF (capital de trabajo)",
  },
  {
    id: "reserva-despidos",
    label: "Reserva despidos (Fondo Despidos)",
  },
];

export type CashflowBridgeLine = {
  id: CashflowBridgeLineId;
  label: string;
  /** Salida de caja (USD). Positivo = reduce FFL. */
  amountUsd: number;
};

export type CashflowBridgeInput = {
  /** NOPAT = Resultado neto EERR (USD). */
  nopatUsd: number;
  ventasUsd: number;
  comprasUsd: number;
  priorNofStockUsd: number;
  reservaDespidosUsd: number;
};

export type CashflowBridgeResult = {
  lines: CashflowBridgeLine[];
  bridgeTotalUsd: number;
  operationalFflUsd: number;
  endNofStockUsd: number;
};

/** Puente NOPAT → FFL operativo desde datos EERR. */
export function buildCashflowBridge(input: CashflowBridgeInput): CashflowBridgeResult {
  const { deltaUsd, endStockUsd } = deltaNofUsd(
    input.ventasUsd,
    input.comprasUsd,
    input.priorNofStockUsd,
  );

  const lines: CashflowBridgeLine[] = [
    {
      id: "delta-nof",
      label: "Δ NOF (capital de trabajo)",
      amountUsd: deltaUsd,
    },
    {
      id: "reserva-despidos",
      label: "Reserva despidos (Fondo Despidos)",
      amountUsd: input.reservaDespidosUsd,
    },
  ];

  const bridgeTotalUsd = lines.reduce((sum, line) => sum + line.amountUsd, 0);
  const operationalFflUsd = input.nopatUsd - bridgeTotalUsd;

  return {
    lines,
    bridgeTotalUsd,
    operationalFflUsd,
    endNofStockUsd: endStockUsd,
  };
}

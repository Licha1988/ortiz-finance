/** Retenciones de caja entre NOPAT y FFL operativo. */
export type CashflowBridgeLineId = "reserva-despidos";

export type CashflowBridgeLineDef = {
  id: CashflowBridgeLineId;
  label: string;
};

export const CASHFLOW_BRIDGE_LINES: CashflowBridgeLineDef[] = [
  {
    id: "reserva-despidos",
    label: "Reserva despidos (Fondo Despidos · 1% RRHH)",
  },
];

export type CashflowBridgeLine = {
  id: CashflowBridgeLineId;
  label: string;
  /** Salida de caja (USD). Positivo = reduce FFL. */
  amountUsd: number;
};

export type CashflowBridgeInput = {
  nopatUsd: number;
  reservaDespidosUsd: number;
};

export type CashflowBridgeResult = {
  lines: CashflowBridgeLine[];
  bridgeTotalUsd: number;
  operationalFflUsd: number;
};

/** Puente NOPAT → FFL: solo reserva despidos (1% RRHH EERR). El resto queda en FFL Excel. */
export function buildCashflowBridge(input: CashflowBridgeInput): CashflowBridgeResult {
  const lines: CashflowBridgeLine[] = [
    {
      id: "reserva-despidos",
      label: CASHFLOW_BRIDGE_LINES[0].label,
      amountUsd: input.reservaDespidosUsd,
    },
  ];

  const bridgeTotalUsd = input.reservaDespidosUsd;
  const operationalFflUsd = input.nopatUsd - bridgeTotalUsd;

  return {
    lines,
    bridgeTotalUsd,
    operationalFflUsd,
  };
}

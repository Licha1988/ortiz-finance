import type { EerrRow } from "@/lib/cashflow/parse-eerr-excel";

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function sumValues(values: (number | null)[]): number | null {
  const numeric = values.filter((value): value is number => value !== null);
  if (numeric.length === 0) return null;
  return numeric.reduce((sum, value) => sum + value, 0);
}

function findRow(rows: EerrRow[], matcher: (label: string) => boolean): EerrRow | undefined {
  return rows.find((row) => matcher(normalizeLabel(row.label)));
}

function mapRow(
  rows: EerrRow[],
  labelMatch: (label: string) => boolean,
  mapper: (row: EerrRow) => EerrRow,
): EerrRow[] {
  return rows.map((row) => (labelMatch(normalizeLabel(row.label)) ? mapper(row) : row));
}

/** Costos que pasan de variables a estructura / fijos. */
export const MOVED_TO_STRUCTURE_LABELS = new Set([
  "gastos adicion",
  "gastos adición",
  "mantenimiento",
  "bazar",
  "inversion",
  "inversión",
]);

/** Detalle que permanece en Costos Variables. */
export const VARIABLE_DETAIL_LABELS = new Set([
  "costo de mercaderia",
  "costo de mercadería",
  "costo delivery",
  "com. / impuestos (incluye iva)",
]);

export function isMovedToStructureRow(row: EerrRow): boolean {
  return MOVED_TO_STRUCTURE_LABELS.has(normalizeLabel(row.label));
}

export function isVariableDetailRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  return VARIABLE_DETAIL_LABELS.has(label);
}

export function isAguinaldoRow(row: EerrRow): boolean {
  return normalizeLabel(row.label).includes("aguinaldo");
}

/** Impuesto a las ganancias (fila «Impuestos» post-EBIT). No es Com. / Impuestos en variables. */
export function isIncomeTaxEerrRow(row: EerrRow): boolean {
  return normalizeLabel(row.label) === "impuestos";
}

/** Filas ocultas en la tabla EERR (permanecen en datos / KPIs). */
export function isHiddenEerrDisplayRow(row: EerrRow): boolean {
  const label = normalizeLabel(row.label);
  if (isIncomeTaxEerrRow(row)) return true;
  if (label.includes("base imp")) return true;
  if (label.includes("resultado neto")) return true;
  if (label === "inversion") return true;
  if (label.includes("depreciacion")) return true;
  if (label === "ebit") return true;
  return false;
}

const STRUCTURE_DETAIL_ORDER = [
  "rrhh",
  "aguinaldo",
  "costo locativo",
  "servicios publicos",
  "marketing",
  "gastos operativos",
  "honorarios",
  "gastos adicion",
  "gastos adición",
  "mantenimiento",
  "bazar",
  "inversion",
  "inversión",
  "gestion operativ",
  "gestión operativ",
] as const;

function structureSortKey(label: string): number {
  const normalized = normalizeLabel(label);
  const index = STRUCTURE_DETAIL_ORDER.findIndex((token) => normalized.includes(token));
  return index >= 0 ? index : STRUCTURE_DETAIL_ORDER.length + 1;
}

function rowBetween(rows: EerrRow[], startLabel: string, endLabel: string): EerrRow[] {
  const start = rows.findIndex((row) => normalizeLabel(row.label) === startLabel);
  const end = rows.findIndex((row) => normalizeLabel(row.label) === endLabel);
  if (start < 0 || end < 0 || end <= start) return [];
  return rows.slice(start + 1, end);
}

/** Reordena filas: fijos bajo Costos Estructura; aguinaldo debajo de RRHH. */
export function reorganizeEerrStatementRows(rows: EerrRow[]): EerrRow[] {
  const costosVariables = findRow(rows, (l) => l === "costos variables");
  const margenBruto = findRow(rows, (l) => l.includes("margen bruto"));
  const costosEstructura = findRow(rows, (l) => l === "costos estructura");
  const ebitda = findRow(rows, (l) => l === "ebitda");
  if (!costosVariables || !margenBruto || !costosEstructura || !ebitda) return rows;

  const costosVariablesIndex = rows.indexOf(costosVariables);
  const margenBrutoIndex = rows.indexOf(margenBruto);
  const costosEstructuraIndex = rows.indexOf(costosEstructura);
  const ebitdaIndex = rows.indexOf(ebitda);

  const variableBlock = rows.slice(costosVariablesIndex + 1, margenBrutoIndex);
  const variableDetails = variableBlock.filter((row) => isVariableDetailRow(row));

  const aguinaldoTemplate = rows.find(isAguinaldoRow) ?? {
    id: `${costosEstructura.id}-aguinaldo`,
    label: "Aguinaldo",
    isSubRow: true,
    isSection: false,
    valueKind: "currency" as const,
    values: costosEstructura.values.map(() => 0),
    yearTotal: 0,
  };

  const aguinaldoRow: EerrRow = {
    ...aguinaldoTemplate,
    label: "Aguinaldo",
    isSubRow: true,
    isSection: false,
  };

  const structureBase = rowBetween(rows, "costos estructura", "ebitda").filter(
    (row) =>
      row.valueKind === "currency" &&
      !isAguinaldoRow(row) &&
      !isMovedToStructureRow(row) &&
      normalizeLabel(row.label) !== "rrhh",
  );

  const rrhh = findRow(rows, (l) => l === "rrhh");
  const movedFromVariables = variableBlock.filter((row) => isMovedToStructureRow(row));

  const structureDetails = [
    ...(rrhh ? [rrhh] : []),
    aguinaldoRow,
    ...structureBase,
    ...movedFromVariables,
  ].sort((a, b) => structureSortKey(a.label) - structureSortKey(b.label));

  const dedupedStructure = structureDetails.filter(
    (row, index, list) =>
      list.findIndex((item) => normalizeLabel(item.label) === normalizeLabel(row.label)) === index,
  );

  const beforeVariables = rows.slice(0, costosVariablesIndex + 1);
  const rampBlock = rows.slice(margenBrutoIndex, costosEstructuraIndex).filter(
    (row) =>
      row === margenBruto ||
      normalizeLabel(row.label).includes("ramp"),
  );
  const afterEbitda = rows.slice(ebitdaIndex);

  return [
    ...beforeVariables,
    ...variableDetails.map((row) => ({ ...row, isSubRow: true })),
    ...rampBlock,
    costosEstructura,
    ...dedupedStructure.map((row) => ({
      ...row,
      isSubRow: true,
    })),
    ...afterEbitda,
  ];
}

export function recalculateCostosVariablesTotal(rows: EerrRow[]): EerrRow[] {
  const costosVariables = findRow(rows, (l) => l === "costos variables");
  const margenBruto = findRow(rows, (l) => l.includes("margen bruto"));
  if (!costosVariables || !margenBruto) return rows;

  const start = rows.indexOf(costosVariables);
  const end = rows.indexOf(margenBruto);
  const details = rows.slice(start + 1, end).filter(isVariableDetailRow);
  if (details.length === 0) return rows;

  const monthCount = costosVariables.values.length;
  const values = Array.from({ length: monthCount }, (_, index) => {
    let total = 0;
    for (const row of details) {
      const value = row.values[index];
      if (value === null) return null;
      total += value;
    }
    return total;
  });

  return mapRow(rows, (l) => l === "costos variables", () => ({
    ...costosVariables,
    values,
    yearTotal: sumValues(values),
  }));
}

/** Aguinaldo mensual = sueldo (RRHH) / 12. */
export function recalculateAguinaldoFromRrhh(rows: EerrRow[]): EerrRow[] {
  const rrhh = findRow(rows, (l) => l === "rrhh");
  const aguinaldo = rows.find(isAguinaldoRow);
  if (!rrhh || !aguinaldo) return rows;

  const values = rrhh.values.map((payroll) =>
    payroll === null ? null : payroll / 12,
  );

  return rows.map((row) =>
    isAguinaldoRow(row)
      ? {
          ...aguinaldo,
          label: "Aguinaldo",
          isSubRow: true,
          values,
          yearTotal: sumValues(values),
        }
      : row,
  );
}

export function applyEerrRowLayout(rows: EerrRow[]): EerrRow[] {
  let next = reorganizeEerrStatementRows(rows);
  next = recalculateCostosVariablesTotal(next);
  return next;
}

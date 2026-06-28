import { syncPrimaryYear } from "@/lib/cashflow/eerr-model-mutate";
import { normalizeOperationalMonths } from "@/lib/cashflow/months";
import { parseEerrExcelFromBuffer, type ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";

export const BUNDLED_EERR_MODEL_URL = "/models/ortiz-cashflow.xlsx";
export const BUNDLED_EERR_SOURCE_NAME = "ortiz-cashflow.xlsx";

export async function loadEerrModelFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedEerrExcel> {
  const result = await parseEerrExcelFromBuffer(buffer, fileName);
  if (result.years.length === 0 || result.years[0]?.rows.length === 0) {
    throw new Error("No se encontraron filas del EERR.");
  }
  return syncPrimaryYear({
    ...result,
    years: normalizeOperationalMonths(result.years),
  });
}

export async function loadEerrModelFromUrl(
  url: string,
  sourceFileName: string,
): Promise<ParsedEerrExcel> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el modelo (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return loadEerrModelFromBuffer(buffer, sourceFileName);
}

export function loadBundledEerrModel(): Promise<ParsedEerrExcel> {
  return loadEerrModelFromUrl(BUNDLED_EERR_MODEL_URL, BUNDLED_EERR_SOURCE_NAME);
}

import { readFileSync, writeFileSync } from "node:fs";
import { parseEerrExcelFromBuffer } from "../lib/cashflow/parse-eerr-excel";

async function main() {
  const excelPath =
    process.argv[2] ??
    "C:/Users/Lisandro/OneDrive/Escritorio/Ortiz cashflow Diego.xlsx";

  const buffer = readFileSync(excelPath);
  const parsed = await parseEerrExcelFromBuffer(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    "Ortiz cashflow Diego.xlsx",
  );

  const out = `import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";

/** EERR importado desde «Ortiz cashflow Diego.xlsx» (hojas Año 1 y Año 2). */
export const DEFAULT_EERR_DATA: ParsedEerrExcel = ${JSON.stringify(parsed, null, 2)};
`;

  writeFileSync("lib/cashflow/default-eerr.ts", out, "utf8");
  console.log(
    `Exportado: ${parsed.years.length} años · ${parsed.years[0]?.rows.length ?? 0} filas por año.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

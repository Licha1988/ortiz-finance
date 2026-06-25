import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseEerrExcelFromBuffer } from "../lib/cashflow/parse-eerr-excel";

const OUTPUT_PATH = "public/models/ortiz-cashflow.xlsx";

/** Acepta link de compartir de Drive o el FILE_ID solo. */
export function extractGoogleDriveFileId(input: string): string {
  const trimmed = input.trim();

  const filePathMatch = trimmed.match(/\/file\/d\/([^/?]+)/);
  if (filePathMatch?.[1]) return filePathMatch[1];

  const idParamMatch = trimmed.match(/[?&]id=([^&]+)/);
  if (idParamMatch?.[1]) return idParamMatch[1];

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  throw new Error(
    "URL de Drive inválida. Pegá el link «Compartir» o el FILE_ID del archivo.",
  );
}

async function downloadGoogleDriveFile(fileId: string): Promise<ArrayBuffer> {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let response = await fetch(baseUrl, { redirect: "follow" });

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const html = await response.text();
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
    if (confirmMatch?.[1]) {
      response = await fetch(`${baseUrl}&confirm=${confirmMatch[1]}`, {
        redirect: "follow",
      });
    } else {
      throw new Error(
        "Google Drive devolvió HTML en lugar del Excel. Verificá que el archivo esté compartido como «Cualquier persona con el enlace».",
      );
    }
  }

  if (!response.ok) {
    throw new Error(`No se pudo descargar desde Drive (${response.status}).`);
  }

  const buffer = await response.arrayBuffer();
  const header = new Uint8Array(buffer.slice(0, 4));
  const isZip =
    header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  if (!isZip) {
    throw new Error(
      "La descarga no parece un .xlsx. Revisá permisos del archivo en Drive.",
    );
  }

  return buffer;
}

async function main() {
  const driveInput = process.argv[2] ?? process.env.EERR_DRIVE_URL?.trim();
  if (!driveInput) {
    console.error("Uso: npm run sync-eerr-from-drive -- \"https://drive.google.com/file/d/.../view\"");
    console.error("  o definí EERR_DRIVE_URL en .env.local");
    process.exit(1);
  }

  const fileId = extractGoogleDriveFileId(driveInput);
  console.log(`Descargando desde Drive (${fileId})…`);

  const buffer = await downloadGoogleDriveFile(fileId);
  const parsed = await parseEerrExcelFromBuffer(buffer, "ortiz-cashflow.xlsx");

  const outPath = resolve(OUTPUT_PATH);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(buffer));

  console.log(`Guardado: ${OUTPUT_PATH}`);
  console.log(
    `Validado: ${parsed.years.length} años · ${parsed.years[0]?.rows.length ?? 0} filas (Año 1).`,
  );
  console.log("Siguiente: npm run export-eerr  (opcional, fallback embebido)");
  console.log("Luego: commit + deploy en Vercel para que producción use este archivo.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

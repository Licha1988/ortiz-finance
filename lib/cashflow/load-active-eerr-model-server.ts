import { readFileSync } from "node:fs";
import { join } from "node:path";
import { get } from "@vercel/blob";
import {
  BUNDLED_EERR_SOURCE_NAME,
  loadEerrModelFromBuffer,
} from "@/lib/cashflow/load-eerr-model";
import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";

const BUNDLED_MODEL_PATH = join(process.cwd(), "public/models/ortiz-cashflow.xlsx");
const BLOB_MODEL_PATH = "eerr/model.xlsx";
const BLOB_META_PATH = "eerr/meta.json";

export type ActiveEerrModelSource = "import" | "bundled";

export type ActiveEerrModelLoadResult = {
  parsed: ParsedEerrExcel;
  source: ActiveEerrModelSource;
};

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function loadImportedModelFromBlob(): Promise<ParsedEerrExcel | null> {
  if (!blobConfigured()) return null;

  try {
    const result = await get(BLOB_MODEL_PATH, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;

    let fileName = "modelo-importado.xlsx";
    try {
      const metaResult = await get(BLOB_META_PATH, { access: "private" });
      if (metaResult?.stream) {
        const meta = JSON.parse(await new Response(metaResult.stream).text()) as {
          fileName?: string;
        };
        if (meta.fileName?.trim()) fileName = meta.fileName.trim();
      }
    } catch {
      // Meta opcional; el buffer del Excel alcanza.
    }

    const buffer = await new Response(result.stream).arrayBuffer();
    return loadEerrModelFromBuffer(buffer, fileName);
  } catch {
    return null;
  }
}

async function loadBundledModelFromDisk(): Promise<ParsedEerrExcel> {
  const buffer = readFileSync(BUNDLED_MODEL_PATH);
  return loadEerrModelFromBuffer(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    BUNDLED_EERR_SOURCE_NAME,
  );
}

/** Misma prioridad que la UI: Excel importado en Blob (dev) → bundled del repo. */
export async function loadActiveEerrModelServer(): Promise<ActiveEerrModelLoadResult> {
  const imported = await loadImportedModelFromBlob();
  if (imported) {
    return { parsed: imported, source: "import" };
  }

  const bundled = await loadBundledModelFromDisk();
  return { parsed: bundled, source: "bundled" };
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BUNDLED_EERR_SOURCE_NAME,
  loadEerrModelFromBuffer,
} from "@/lib/cashflow/load-eerr-model";
import {
  buildModelSnapshot,
  type ModelChatSnapshot,
} from "@/lib/chat/model-snapshot";

const BUNDLED_MODEL_PATH = join(process.cwd(), "public/models/ortiz-cashflow.xlsx");

let cachedSnapshot: ModelChatSnapshot | null = null;

export async function loadBundledModelSnapshot(): Promise<ModelChatSnapshot> {
  if (cachedSnapshot) return cachedSnapshot;

  const buffer = readFileSync(BUNDLED_MODEL_PATH);
  const parsed = await loadEerrModelFromBuffer(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    BUNDLED_EERR_SOURCE_NAME,
  );

  cachedSnapshot = buildModelSnapshot(parsed);
  return cachedSnapshot;
}

/** Solo tests o tras reemplazar el Excel en runtime (dev). */
export function clearModelSnapshotCache(): void {
  cachedSnapshot = null;
}

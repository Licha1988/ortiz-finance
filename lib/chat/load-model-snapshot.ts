import { loadActiveEerrModelServer } from "@/lib/cashflow/load-active-eerr-model-server";
import {
  DEFAULT_INVESTMENT_ASSUMPTIONS,
  normalizeInvestmentAssumptions,
  type InvestmentAssumptions,
} from "@/lib/investment/investment-assumptions";
import {
  buildModelSnapshot,
  type ModelChatSnapshot,
} from "@/lib/chat/model-snapshot";

type SnapshotCacheEntry = {
  modelKey: string;
  assumptionsKey: string;
  snapshot: ModelChatSnapshot;
};

let cachedSnapshot: SnapshotCacheEntry | null = null;

function cacheKeyForAssumptions(assumptions: InvestmentAssumptions): string {
  return JSON.stringify(assumptions);
}

export async function loadModelSnapshot(
  partialAssumptions: Partial<InvestmentAssumptions> = {},
): Promise<ModelChatSnapshot> {
  const assumptions = normalizeInvestmentAssumptions({
    ...DEFAULT_INVESTMENT_ASSUMPTIONS,
    ...partialAssumptions,
  });
  const assumptionsKey = cacheKeyForAssumptions(assumptions);

  const { parsed, source } = await loadActiveEerrModelServer();
  const modelKey = `${source}:${parsed.sourceFileName}`;

  if (
    cachedSnapshot &&
    cachedSnapshot.modelKey === modelKey &&
    cachedSnapshot.assumptionsKey === assumptionsKey
  ) {
    return cachedSnapshot.snapshot;
  }

  const snapshot = buildModelSnapshot(parsed, { assumptions, modelSource: source });
  cachedSnapshot = { modelKey, assumptionsKey, snapshot };
  return snapshot;
}

/** @deprecated Usar loadModelSnapshot */
export async function loadBundledModelSnapshot(): Promise<ModelChatSnapshot> {
  return loadModelSnapshot();
}

/** Solo tests o tras reemplazar el Excel / supuestos en runtime (dev). */
export function clearModelSnapshotCache(): void {
  cachedSnapshot = null;
}

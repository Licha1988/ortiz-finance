"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getBundledEerrCache,
  getEerrModelServerSnapshot,
  getEerrModelSnapshot,
  replaceEerrFromFile,
  restoreBundledEerrModel,
  subscribeEerrModel,
  updateEerrYearRows,
  type EerrModelSnapshot,
  type EerrModelSource,
} from "@/lib/cashflow/eerr-model-store";
import { BUNDLED_EERR_SOURCE_NAME } from "@/lib/cashflow/load-eerr-model";
import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearId } from "@/lib/cashflow/eerr-years";

export type { EerrModelSource };

type EerrModelContextValue = EerrModelSnapshot & {
  replaceFromFile: (file: File) => Promise<void>;
  restoreBundled: () => Promise<void>;
  updateYearRows: (yearId: EerrYearId, rows: ParsedEerrExcel["rows"]) => void;
};

const EerrModelContext = createContext<EerrModelContextValue | null>(null);

export function EerrModelProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeEerrModel,
    getEerrModelSnapshot,
    getEerrModelServerSnapshot,
  );

  const replaceFromFile = useCallback(async (file: File) => {
    await replaceEerrFromFile(file);
  }, []);

  const restoreBundled = useCallback(async () => {
    await restoreBundledEerrModel();
  }, []);

  const updateYearRows = useCallback(
    (yearId: EerrYearId, rows: ParsedEerrExcel["rows"]) => {
      updateEerrYearRows(yearId, rows);
    },
    [],
  );

  return (
    <EerrModelContext.Provider
      value={{
        ...snapshot,
        replaceFromFile,
        restoreBundled,
        updateYearRows,
      }}
    >
      {children}
    </EerrModelContext.Provider>
  );
}

export function useEerrModel(): EerrModelContextValue {
  const context = useContext(EerrModelContext);
  if (!context) {
    throw new Error("useEerrModel debe usarse dentro de EerrModelProvider.");
  }
  return context;
}

export function isBundledEerrModel(
  source: EerrModelSource,
  parsed: ParsedEerrExcel,
): boolean {
  return source === "bundled" || parsed.sourceFileName === BUNDLED_EERR_SOURCE_NAME;
}

export { getBundledEerrCache };

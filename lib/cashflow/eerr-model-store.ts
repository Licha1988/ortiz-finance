import { DEFAULT_EERR_DATA } from "@/lib/cashflow/default-eerr";
import { isEerrImportAllowed } from "@/lib/cashflow/eerr-model-admin";
import { updateYearRows as mutateYearRows } from "@/lib/cashflow/eerr-model-mutate";
import {
  clearEerrModelLocalStorage,
  deleteEerrModelFromServer,
  fetchEerrModelFromServer,
  readEerrModelFromLocalStorage,
  uploadEerrModelToServer,
  writeEerrModelToLocalStorage,
} from "@/lib/cashflow/eerr-model-persist";
import {
  loadBundledEerrModel,
  loadEerrModelFromBuffer,
} from "@/lib/cashflow/load-eerr-model";
import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";
import type { EerrYearId } from "@/lib/cashflow/eerr-years";

export type EerrModelSource = "bundled" | "import" | "fallback";

export type EerrModelSnapshot = {
  parsed: ParsedEerrExcel;
  source: EerrModelSource;
  loading: boolean;
  loadError: string | null;
};

const SERVER_SNAPSHOT: EerrModelSnapshot = {
  parsed: DEFAULT_EERR_DATA,
  source: "fallback",
  loading: true,
  loadError: null,
};

let clientSnapshot: EerrModelSnapshot = SERVER_SNAPSHOT;
let bundledCached: ParsedEerrExcel | null = null;
let loadStarted = false;
let bundledLoadPromise: Promise<ParsedEerrExcel> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: EerrModelSnapshot) {
  clientSnapshot = next;
  emit();
}

function fetchBundledOnce(): Promise<ParsedEerrExcel> {
  if (!bundledLoadPromise) {
    bundledLoadPromise = loadBundledEerrModel();
  }
  return bundledLoadPromise;
}

async function loadUploadedModel(): Promise<ParsedEerrExcel | null> {
  try {
    const fromServer = await fetchEerrModelFromServer();
    if (fromServer) {
      writeEerrModelToLocalStorage(fromServer.buffer, fromServer.meta.fileName);
      return loadEerrModelFromBuffer(fromServer.buffer, fromServer.meta.fileName);
    }
  } catch {
    // Si falla el servidor, probamos caché local del navegador.
  }

  const fromLocal = readEerrModelFromLocalStorage();
  if (!fromLocal) return null;

  return loadEerrModelFromBuffer(fromLocal.buffer, fromLocal.meta.fileName);
}

async function loadInitialModel(): Promise<EerrModelSnapshot> {
  const uploaded = isEerrImportAllowed() ? await loadUploadedModel() : null;
  if (uploaded) {
    return {
      parsed: uploaded,
      source: "import",
      loading: false,
      loadError: null,
    };
  }

  try {
    const bundled = await fetchBundledOnce();
    bundledCached = bundled;
    return {
      parsed: bundled,
      source: "bundled",
      loading: false,
      loadError: null,
    };
  } catch (caught) {
    return {
      parsed: bundledCached ?? DEFAULT_EERR_DATA,
      source: bundledCached ? "bundled" : "fallback",
      loading: false,
      loadError:
        caught instanceof Error ? caught.message : "No se pudo cargar el Excel del repo.",
    };
  }
}

function ensureInitialLoad() {
  if (loadStarted || typeof window === "undefined") return;
  loadStarted = true;

  void loadInitialModel().then(setSnapshot);
}

export function subscribeEerrModel(listener: () => void): () => void {
  ensureInitialLoad();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEerrModelSnapshot(): EerrModelSnapshot {
  return clientSnapshot;
}

export function getEerrModelServerSnapshot(): EerrModelSnapshot {
  return SERVER_SNAPSHOT;
}

async function persistUploadedModel(buffer: ArrayBuffer, fileName: string): Promise<void> {
  writeEerrModelToLocalStorage(buffer, fileName);

  try {
    await uploadEerrModelToServer(buffer, fileName);
  } catch {
    // En local sin Blob el upload falla; localStorage alcanza en ese entorno.
  }
}

async function clearUploadedModel(): Promise<void> {
  clearEerrModelLocalStorage();
  try {
    await deleteEerrModelFromServer();
  } catch {
    // Ignorar si no hay token Blob configurado.
  }
}

export async function replaceEerrFromFile(file: File): Promise<void> {
  if (!isEerrImportAllowed()) {
    throw new Error("La importación de Excel solo está disponible en desarrollo local.");
  }

  if (!file.name.match(/\.xlsx?$/i)) {
    throw new Error("Subí un archivo Excel (.xlsx).");
  }

  const previous = clientSnapshot;
  setSnapshot({ ...previous, loading: true, loadError: null });

  try {
    const buffer = await file.arrayBuffer();
    const result = await loadEerrModelFromBuffer(buffer, file.name);
    await persistUploadedModel(buffer, file.name);
    setSnapshot({
      parsed: result,
      source: "import",
      loading: false,
      loadError: null,
    });
  } catch (caught) {
    setSnapshot({
      ...previous,
      loading: false,
      loadError: caught instanceof Error ? caught.message : "No se pudo leer el archivo.",
    });
    throw caught;
  }
}

export async function restoreBundledEerrModel(): Promise<void> {
  await clearUploadedModel();

  if (bundledCached) {
    setSnapshot({
      parsed: bundledCached,
      source: "bundled",
      loading: false,
      loadError: null,
    });
    return;
  }

  setSnapshot({ ...clientSnapshot, loading: true, loadError: null });
  bundledLoadPromise = null;

  try {
    const bundled = await fetchBundledOnce();
    bundledCached = bundled;
    setSnapshot({
      parsed: bundled,
      source: "bundled",
      loading: false,
      loadError: null,
    });
  } catch (caught) {
    setSnapshot({
      parsed: DEFAULT_EERR_DATA,
      source: "fallback",
      loading: false,
      loadError:
        caught instanceof Error ? caught.message : "No se pudo cargar el Excel del repo.",
    });
  }
}

export function updateEerrYearRows(
  yearId: EerrYearId,
  rows: ParsedEerrExcel["rows"],
): void {
  setSnapshot({
    ...clientSnapshot,
    parsed: mutateYearRows(clientSnapshot.parsed, yearId, rows),
  });
}

export function getBundledEerrCache(): ParsedEerrExcel | null {
  return bundledCached;
}

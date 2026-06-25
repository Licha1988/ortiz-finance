const STORAGE_KEY = "ortiz-finance:eerr-model";

export type PersistedEerrMeta = {
  fileName: string;
  savedAt: string;
};

type PersistedEerrPayload = PersistedEerrMeta & {
  dataBase64: string;
};

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export function readEerrModelFromLocalStorage(): {
  buffer: ArrayBuffer;
  meta: PersistedEerrMeta;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as PersistedEerrPayload;
    if (!payload.dataBase64 || !payload.fileName) return null;

    return {
      buffer: fromBase64(payload.dataBase64),
      meta: { fileName: payload.fileName, savedAt: payload.savedAt },
    };
  } catch {
    return null;
  }
}

export function writeEerrModelToLocalStorage(
  buffer: ArrayBuffer,
  fileName: string,
): void {
  if (typeof window === "undefined") return;

  const payload: PersistedEerrPayload = {
    fileName,
    savedAt: new Date().toISOString(),
    dataBase64: toBase64(buffer),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Archivos muy grandes pueden superar la cuota; el servidor sigue siendo la fuente.
  }
}

export function clearEerrModelLocalStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function uploadEerrModelToServer(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<void> {
  const body = new FormData();
  body.append("file", new Blob([buffer]), fileName);

  const response = await fetch("/api/eerr-model", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || `No se pudo guardar el modelo en el servidor (${response.status}).`,
    );
  }
}

export async function fetchEerrModelFromServer(): Promise<{
  buffer: ArrayBuffer;
  meta: PersistedEerrMeta;
} | null> {
  const response = await fetch("/api/eerr-model", { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudo cargar el modelo del servidor (${response.status}).`);
  }

  const fileName =
    response.headers.get("X-Eerr-File-Name")?.trim() || "modelo-importado.xlsx";
  const savedAt =
    response.headers.get("X-Eerr-Saved-At")?.trim() || new Date().toISOString();
  const buffer = await response.arrayBuffer();

  return {
    buffer,
    meta: { fileName, savedAt },
  };
}

export async function deleteEerrModelFromServer(): Promise<void> {
  const response = await fetch("/api/eerr-model", { method: "DELETE" });
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`No se pudo borrar el modelo del servidor (${response.status}).`);
  }
}

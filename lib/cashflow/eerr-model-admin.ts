/** Importar Excel solo en desarrollo local. En deploy se usa siempre public/models/. */
export function isEerrImportAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}

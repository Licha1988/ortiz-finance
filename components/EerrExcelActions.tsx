"use client";

import { BUNDLED_EERR_MODEL_URL, BUNDLED_EERR_SOURCE_NAME } from "@/lib/cashflow/load-eerr-model";
import { isEerrImportAllowed } from "@/lib/cashflow/eerr-model-admin";

type EerrExcelActionsProps = {
  onImportClick?: () => void;
  onRestoreBundled?: () => void;
  className?: string;
};

const buttonSecondary =
  "rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50";

const buttonPrimary =
  "rounded-full bg-violet-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-900";

export default function EerrExcelActions({
  onImportClick,
  onRestoreBundled,
  className = "",
}: EerrExcelActionsProps) {
  const devImport = isEerrImportAllowed();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <a href={BUNDLED_EERR_MODEL_URL} download={BUNDLED_EERR_SOURCE_NAME} className={buttonSecondary}>
        Descargar Excel
      </a>
      {devImport && onRestoreBundled ? (
        <button type="button" onClick={onRestoreBundled} className={buttonSecondary}>
          Restaurar repo
        </button>
      ) : null}
      {devImport && onImportClick ? (
        <button type="button" onClick={onImportClick} className={buttonPrimary}>
          Importar Excel
        </button>
      ) : null}
      {devImport ? (
        <span className="w-full text-[11px] leading-relaxed text-stone-500 sm:w-auto">
          Para publicar: copiá el archivo a{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5 text-[10px]">public/models/ortiz-cashflow.xlsx</code>{" "}
          y commiteá.
        </span>
      ) : null}
    </div>
  );
}

"use client";

type AppHeaderProps = {
  username?: string;
  onLogout?: () => void;
  loggingOut?: boolean;
};

export default function AppHeader({
  username,
  onLogout,
  loggingOut = false,
}: AppHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-violet-900/10 bg-gradient-to-br from-violet-950 via-violet-900 to-violet-800 text-white shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 120%, rgb(251 191 36 / 0.25), transparent 45%), radial-gradient(circle at 85% -20%, rgb(255 255 255 / 0.12), transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-100 ring-1 ring-white/15">
                Casa Ortiz
              </span>
              <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-medium text-amber-100 ring-1 ring-amber-300/25">
                Inversión · EERR · Pipeline
              </span>
            </div>
            <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Cashflow e inversión
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-violet-100/85">
              Modelo financiero, pipeline de apertura e inversión del Proyecto Ortiz.
              Usá las pestañas para navegar entre secciones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {username ? (
              <>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-violet-50 ring-1 ring-white/15">
                  {username}
                </span>
                {onLogout ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {loggingOut ? "Saliendo…" : "Salir"}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

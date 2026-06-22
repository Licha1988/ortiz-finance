import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-violet-100 bg-violet-800 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
            Casa Ortiz
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-white">
            Cashflow e inversión
          </h1>
          <p className="mt-1 text-sm text-violet-200">
            Ingresá con tu usuario y contraseña asignados.
          </p>
        </div>

        <div className="px-6 py-6">
          <Suspense fallback={<p className="text-sm text-stone-500">Cargando…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

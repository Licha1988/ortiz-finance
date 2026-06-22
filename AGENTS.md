# Casa Ortiz Finance — Guía para agentes

App de **cashflow e inversión**. Next.js 16 (App Router) + React 19 + Tailwind v4, 100% client-side para la UI principal.

**Proyecto hermano** de `ortiz` (gestión operativa). No comparte estado ni repo con la app operativa.

## Entorno

- SO del dev: **Windows + PowerShell**. Encadená comandos con `;`, NO con `&&`.
- Node con npm.

## Comandos

- `npm run dev` → localhost:3000 (usar otro puerto si ortiz ya corre: `npm run dev -- -p 3001`)
- `npm run build` → validación obligatoria antes de commit
- `npm run lint` → ESLint

## Arquitectura

- `lib/` = lógica pura (parse Excel, format, auth). **Sin JSX, sin `"use client"`.**
- `components/` = UI con `"use client"`.
- `components/ui/` = primitivas reutilizables.
- Alias `@/*` → raíz del repo.

## Dominio v1

| Módulo | Responsabilidad |
|--------|-----------------|
| `lib/cashflow/parse-eerr-excel.ts` | Importar hoja EERR Mensual (año 1) |
| `components/CashflowExcelView.tsx` | Vista espejo del Excel |

Fuente de datos actual: **Excel importado** (no conectado al hub operativo).

## UI

Seguir `DESIGN_SYSTEM.md`: `AppHeader` + `PageLayout`, `SectionCard`, `KpiCard`, tablas densas, `tabular-nums`, moneda vía `lib/format.ts`.

## Auth

Opcional por ahora: sin `.env.local` la app abre directo (sin login).

Cuando quieras protegerla: `AUTH_SECRET` + `AUTH_USERS` en `.env.local` / Vercel.

## Antes de commitear

1. `npm run build` y `npm run lint` en verde.
2. Commits/push solo cuando el usuario lo pida.

# Casa Ortiz Finance — Design System

Mismas convenciones visuales que la app operativa (`ortiz/DESIGN_SYSTEM.md`), adaptadas a finanzas.

## Layout

```
AppHeader → PageLayout → KPIs → SectionCard (contenido)
```

- Contenedor: `PageLayout` (`max-w-[1400px]`).
- Espaciado: `space-y-6`, grids `gap-4`.

## Componentes

- `SectionCard` — tone: `cashflow` | `finance` | `investment`
- `KpiCard` — métricas anuales (ventas, EBITDA, resultado neto)
- `EmptyState` — import Excel sin datos

## Tablas

- Header violeta, columna concepto sticky.
- Números: `tabular-nums`, `compactCurrency()`, tooltip `title` con valor exacto.

## Formato

- Moneda: `lib/format.ts` → `formatCurrency`, `compactCurrency`
- Porcentajes: `formatPercent`

## Reglas

- Reutilizar `components/ui/` antes de crear componentes nuevos.
- No inventar tokens fuera de `lib/ui/tokens.ts`.
- Input editable → `bg-amber-50` (cuando haya edición inline).

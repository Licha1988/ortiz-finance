# Casa Ortiz — Cashflow e inversión

Modelo financiero (EERR, cash flow, inversión) importado desde Excel. Proyecto independiente de la app operativa.

## Inicio rápido

```powershell
cd C:\Users\Lisandro\ortiz-finance
npm run dev -- -p 3001
```

Abrí **http://localhost:3001** — el EERR del Excel de Diego **ya viene cargado** (no hace falta subirlo).

Para actualizar el modelo base cuando cambie el Excel:

```powershell
npm run export-eerr "C:\ruta\al\archivo.xlsx"
```

### Auth (opcional, más adelante)

```powershell
node scripts/generate-auth-users.mjs Lisandro:tu-clave
# Pegá AUTH_SECRET y AUTH_USERS en .env.local (con \$ en los hashes)
npm run dev -- -p 3001
```

## Vercel (cuando quieras publicar)

1. Subí el repo a GitHub.
2. Vercel → **Add New Project** → importá `ortiz-finance`.
3. Agregá `AUTH_SECRET` y `AUTH_USERS` (JSON **sin** backslashes).
4. Deploy.

No hace falta configurar Vercel **antes** de desarrollar local.

## Relación con ortiz

| ortiz | ortiz-finance |
|-------|---------------|
| Cubiertos, staffing, nómina | EERR, cash flow, TIR/VAN |
| Hub operativo | Excel / modelo financiero |

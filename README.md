# La Forêt · Cellar Manager v5

Control de producción de madurados y embutidos de La Forêt.
v5 rehace la interfaz con **React + shadcn/ui + Sonner** y un tema crema claro. La lógica de cálculo de v4.4.3 se conserva sin cambios.

> **Estado: v5.2.0.** Migración completa: todas las secciones de v4.4.3 están rehechas en v5 con shadcn/ui y Sonner. Ver [`docs/UI-REVIEW.md`](docs/UI-REVIEW.md).

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # genera dist/ (lo que publica GitHub Pages)
npm run preview      # sirve dist/ localmente
```

## Cómo está armado

```
src/
  lib/core/core.js      ← GENERADO: cálculos, modelo de datos y acciones de v4.4.3, copiados textualmente
  lib/core/bridge.js    ← lo que core.js llama para render/toast/modales/navegación
  lib/store.js          ← conecta el `db` del core con React (se re-renderiza en cada saveDB)
  lib/notify.js         ← Sonner + diálogos: lo que el core pide a la UI
  lib/dialogs.js        ← un diálogo abierto a la vez; confirm() → AlertDialog
  lib/fixes.js          ← correcciones documentadas sobre el core textual
  dialogs/              ← registros, cata, asistente de lote, ingredientes, sync
  lib/router.js         ← rutas con hash (#/lotes/<id>), sin configurar el servidor
  lib/domain.js         ← helpers de presentación (colores de etapa, estados, filas)
  components/ui/        ← componentes shadcn (new-york), editables
  components/           ← shell: barra lateral, barra móvil, encabezados
  views/                ← Panel, Cava, Lotes, batch/ (detalle), Tipos, Ingredientes, Biblioteca, Analytics, Defectos
legacy/index-v4.4.3.html ← fuente original de la que sale core.js
```

### La lógica no se reescribe, se extrae
`scripts/gen-core.mjs` lee el HTML de v4.4.3 y separa:
- **se conserva textualmente:** todas las declaraciones de cálculo y datos (aw, Fick, nitritos residuales, HACCP, balance de masa, agenda, sync…) y los generadores SVG de etiqueta y sello;
- **se descarta:** la capa de UI que arma HTML o toca el DOM, que se rehace en React;
- **se redirige:** las llamadas de UI que hace la lógica (`render`, `toast`, `goto`, modales) pasan por `bridge.js`.

Las funciones que guardan formularios (crear lote, pesos, aw, pH, cata, ingredientes…) también entran textualmente: el generador solo cambia `document.getElementById(id)` por un lector del formulario de React y `window._estado` por un estado del módulo. Si encuentra una dependencia de UI sin resolver, falla.

```bash
npm run gen:core       # regenera src/lib/core/core.js
npm run test:parity    # compara core.js con el código original ejecutado en un sandbox
```

`test:parity` corre dos pruebas contra el script original de v4.4.3:
- **cálculos** (`parity-test.mjs`): salmuera EB, aw, peso objetivo, secado, Fick, nitrito/nitrato residual, VPD, humo → resultados idénticos;
- **formularios** (`parity-forms.mjs`): 19 flujos de usuario con la misma base, reloj y aleatoriedad → base de datos idéntica byte a byte. También verifica que la corrección de `lib/fixes.js` funcione.

### Datos
Misma clave de `localStorage` (`laforet_cellar_v1`), mismos backups (`laforet_backup_*`) y mismo formato JSON que v4.4.3: no hay migración. Si otra pestaña guarda, v5 se actualiza sola.

`npm run demo:data` genera `scripts/demo-db.json` (5 recetas, 8 lotes) para probar la UI sin tocar datos reales.

### Agregar componentes shadcn
`components.json` ya está configurado (new-york, JSX, alias `@/`):
```bash
npx shadcn@latest add dialog alert-dialog select
```

## Publicación (GitHub Pages)
`.github/workflows/deploy.yml` compila y publica `dist/` en cada push a `main`. En **Settings → Pages**, la fuente debe ser **GitHub Actions**.

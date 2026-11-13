# La Forêt · Cellar Manager v5

Control de producción de madurados y embutidos de La Forêt.
v5 rehace la interfaz con **React + shadcn/ui + Sonner** y un tema crema claro. La lógica de cálculo de v4.4.3 se conserva sin cambios.

> **Estado: v5.0.0 · fase 1 (vista previa).** Panel, Vista de cava, Lotes y el resumen de lote ya están en v5. El resto sigue en v4.4.3, incluida en `/v4/` con los mismos datos. Ver [`docs/UI-REVIEW.md`](docs/UI-REVIEW.md).

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
  lib/notify.js         ← Sonner: toasts heredados (✓ ⚠ ✗) y avisos de «llega en fase 2»
  lib/router.js         ← rutas con hash (#/lotes/<id>), sin configurar el servidor
  lib/domain.js         ← helpers de presentación (colores de etapa, estados, filas)
  components/ui/        ← componentes shadcn (new-york), editables
  components/           ← shell: barra lateral, barra móvil, encabezados
  views/                ← Panel, Vista de cava, Lotes, Resumen de lote, Placeholder
legacy/index-v4.4.3.html ← fuente original de la que sale core.js
public/v4/index.html     ← v4.4.3 servida junto a v5 durante la transición
```

### La lógica no se reescribe, se extrae
`scripts/gen-core.mjs` lee el HTML de v4.4.3 y separa:
- **se conserva textualmente:** todas las declaraciones de cálculo y datos (aw, Fick, nitritos residuales, HACCP, balance de masa, agenda, sync…) y los generadores SVG de etiqueta y sello;
- **se descarta:** la capa de UI que arma HTML o toca el DOM, que se rehace en React;
- **se redirige:** las llamadas de UI que hace la lógica (`render`, `toast`, `goto`, modales) pasan por `bridge.js`.

Si el generador encuentra una dependencia de UI sin resolver, falla.

```bash
npm run gen:core       # regenera src/lib/core/core.js
npm run test:parity    # compara core.js con el código original ejecutado en un sandbox
```

`test:parity` ejecuta el script original de v4.4.3 y el `core.js` generado con las mismas entradas (salmuera EB, aw, peso objetivo, tasa de secado, días de difusión de sal, nitrito/nitrato residual, VPD, perfil de humo) y exige resultados idénticos.

### Datos
Misma clave de `localStorage` (`laforet_cellar_v1`) y mismo formato JSON que v4.4.3: no hay migración. Si v4.4.3 está abierta en otra pestaña y guarda, v5 se actualiza sola.

`npm run demo:data` genera `scripts/demo-db.json` (5 recetas, 8 lotes) para probar la UI sin tocar datos reales.

### Agregar componentes shadcn
`components.json` ya está configurado (new-york, JSX, alias `@/`):
```bash
npx shadcn@latest add dialog alert-dialog select
```

## Publicación (GitHub Pages)
`.github/workflows/deploy.yml` compila y publica `dist/` en cada push a `main`. En **Settings → Pages**, la fuente debe ser **GitHub Actions**.

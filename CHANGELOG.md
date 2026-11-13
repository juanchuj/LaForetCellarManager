# Changelog

## v5.0.0 — 2026-11-12 · Fase 1 (vista previa)

### Nuevo
- Interfaz reconstruida en React 19 + Vite + Tailwind CSS 4 con componentes **shadcn/ui** (new-york) y toasts **Sonner**.
- Tema claro en crema basado en la marca (Pantone Black C + 7527 C), con contraste AA.
- Navegación con URL por vista (`#/lotes/<id>`), barra lateral con íconos lucide y menú lateral en móvil.
- **Panel:** KPIs primero; «¿Qué hago hoy?» por severidad (crítico / alerta / aviso) con contadores; lotes en curso con progreso por etapa; distribución de cava con kg.
- **Vista de cava:** abre centrada en hoy, botón «Hoy», zoom Semanas/Meses/Trimestre, tooltips por segmento, etapas vencidas resaltadas, opción para incluir terminados.
- **Lotes:** filtros con contadores, búsqueda, rendimiento actual vs objetivo, tarjetas en móvil.
- **Resumen de lote** (solo lectura): KPIs, pasos de etapas, piezas con aw estimada ± incertidumbre y estado de seguridad, HACCP y ambiente.
- Fuentes de marca empaquetadas (funcionan sin conexión).
- v4.4.3 incluida en `/v4/` para las secciones aún no migradas, con los mismos datos.

### Técnico
- `scripts/gen-core.mjs` extrae textualmente la lógica de v4.4.3 a `src/lib/core/core.js` (303 declaraciones); `scripts/parity-test.mjs` verifica que los cálculos coinciden con el original.
- Workflow de GitHub Actions para publicar en GitHub Pages.

### Sin cambios
- Fórmulas y modelos (aw, Fick, nitritos residuales, HACCP, secado, balance de masa) y formato de datos (`laforet_cellar_v1`).

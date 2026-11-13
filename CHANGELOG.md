# Changelog

## v5.2.0 — 2026-11-12 · Fase 3 (migración completa)

### Nuevo
- **Biblioteca**: exportar biblioteca completa, solo recetas o solo ingredientes; importar con combinación por nombre; reponer sales base; backups automáticos con descarga y restauración; importación de lotes históricos con vista previa (importables, duplicados, sin tipo) y backup previo; exportar, restaurar o borrar la base completa con confirmación.
- **Analytics**: rendimiento real vs esperado, calibración del modelo de aw, calidad y rentabilidad por tipo, punto óptimo de consumo, defectos y sus causas probables, equilibrio de sabor, receta ganadora, calibración del modelo de perfil, correlaciones de Pearson, pérdida por etapa y tendencias estacionales.
- **Comparador** de 2 a 4 lotes del mismo tipo: resumen, curvas de peso superpuestas y pérdida por etapa (con URL propia).
- **Defectos**: catálogo con búsqueda y tarjetas expandibles.
- **Etiqueta nutricional** (desde el detalle de lote y el editor de receta): tabla INVIMA y sellos frontales con descarga PNG y SVG, umbrales de la Res. 810/2021.

### Cambios
- v5 ya no incluye la copia de v4.4.3 en `/v4/`: todas las secciones están migradas.
- Restaurar un backup, restaurar desde JSON y borrar todo piden confirmación con AlertDialog.

### Técnico
- `exportLibrary` y `downloadBackup` también se extraen textualmente al core (327 declaraciones).
- Paridad de formularios ampliada con importación de biblioteca y reposición de sales: 19 flujos idénticos a v4.4.3.

## v5.1.0 — 2026-11-12 · Fase 2

### Nuevo
- **Detalle de lote completo** con pestañas Piezas, Etapas, HACCP, Catas y Análisis: curvas de peso con curva teórica, fichas de pieza (aw estimado/medido, objetivo por %, objetivo por aw, estimación exponencial, historial con outliers), salmuera EB con nitrito/nitrato, residual y curva de degradación, inoculación, ahumado, pH, balance de masa, perfil organoléptico, proteólisis y peligros.
- **Nuevo lote / editar lote** como asistente de 5 pasos: tipo, recepción HACCP, piezas, curado (EB +20 %, cronograma, Fick, sales del lote, receta escalada y mix por pieza) y resumen.
- Diálogos de registro: pesar todas las piezas, peso por pieza, aw medido, inicio de Secado con tara, ajustar fechas, pH con escala y veredicto, T/HR e importación de CSV Govee, jornada de pesaje secuencial, desviación HACCP, ficha de cata completa (puntajes por color, notas identificables, defectos, nota sugerida).
- **Tipos**: lista con barra de etapas y editor completo (general, rendimiento, aw, calidad y negocio, carne base con perfil nutricional, flujo, salmuera con sales y dosis, ahumado con maderas, ambiente, pH, receta e inoculante).
- **Ingredientes**: tabla única con filtros por categoría, búsqueda, uso en recetas y lotes, y edición en diálogo (incluye clasificación y nutrientes de carnes).
- **Sincronización iCloud** con estado visible en la barra lateral; exportar/importar JSON en navegadores sin soporte.
- Confirmaciones con AlertDialog y borrado seguro (5 s + escribir ELIMINAR) en lugar de los diálogos nativos.

### Corregido
- Editar un lote ya no borra las mediciones de aw ni la tara de las piezas (bug de v4.4.3).
- Los campos numéricos del asistente aceptan decimales mientras se escriben (p. ej. 6.1 °C).
- La fecha por defecto del registro T/HR usa la hora local (v4.4.3 mostraba la hora UTC).

### Técnico
- Las 22 funciones de guardado de formularios de v4.4.3 se extraen textualmente al core; solo cambia su lectura de campos (bridge.form).
- `npm run test:parity` agrega `scripts/parity-forms.mjs`: 17 flujos ejecutados en v4.4.3 y v5 con la misma base, reloj y aleatoriedad producen datos idénticos.
- Al editar un lote ya no se puede cambiar el tipo (evita etapas inconsistentes con la receta).

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

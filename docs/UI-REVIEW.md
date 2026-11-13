# Revisión de UI · La Forêt Cellar Manager (v4.4.3 → v5.0.0)

Revisión hecha sobre v4.4.3 con un lote de datos demo realista (5 recetas, 8 lotes en distintas etapas, alertas HACCP reales del motor). Cada hallazgo indica qué se corrigió ya en la fase 1 y qué queda para las fases siguientes.

## Problemas transversales

| # | Hallazgo en v4.4.3 | Impacto | v5 |
|---|---|---|---|
| T1 | Toda la UI se arma con strings HTML (`innerHTML`), 163 `onclick` en línea y estilos en línea por todas partes. | Cada vista se ve un poco distinta; cambiar un estilo obliga a tocar decenas de lugares. | **Fase 1:** React + shadcn/ui. Un solo set de componentes (Button, Card, Badge, Table, Tabs, Tooltip, DropdownMenu, Sheet). |
| T2 | Texto secundario `#8c877d` sobre `#2D2926` (~4,2:1) en tamaños de 10–11 px; etiquetas en versalitas con mucho tracking. | Lectura difícil en la cava o en el celular. | **Fase 1:** tema crema claro, texto secundario `#675F56` sobre `#F3EFE6` (≥ 5:1), mínimo 11 px solo en metadatos. |
| T3 | Íconos con glifos Unicode (◐ ▬ ◪ ◈ ∿). | Ambiguos; se ven distintos según la fuente. | **Fase 1:** íconos lucide. |
| T4 | Fuentes desde Google Fonts: sin red, la app cae a fuentes del sistema (pasa en la cava sin señal). | Se rompe la tipografía de marca offline. | **Fase 1:** fuentes empaquetadas con `@fontsource` + Copperplate/AcademyEngraved locales. |
| T5 | El toast es un `div` con texto plano, sin tono (éxito/error), sin acciones, y desaparece a los 2,2 s. | Errores de importación o sync pasan desapercibidos. | **Fase 1:** Sonner. Los mensajes heredados `✓ / ⚠ / ✗` se convierten en éxito/alerta/error, y admiten acciones. |
| T6 | Botones destructivos junto a acciones normales (p. ej. «Eliminar tipo» junto a «Duplicar», «×» junto a «Editar» en cada fila de ingredientes). | Riesgo de borrar por error. | **Fase 2:** acciones destructivas dentro de un menú «…» con confirmación (AlertDialog). |
| T7 | Números de feature internos visibles (`#42`, `#43`, `v2.1 #18`) en Analytics. | Ruido para el usuario. | **Fase 3:** se quitan. |
| T8 | Sin navegación móvil real: la barra lateral se colapsa con un botón flotante. | Uso incómodo en el celular. | **Fase 1:** barra superior + menú lateral (Sheet) en móvil; tablas que pasan a tarjetas. |
| T9 | Sin URL por vista (todo en memoria). | No se puede recargar ni compartir el enlace de un lote. | **Fase 1:** rutas con hash (`#/lotes/<id>`), compatibles con GitHub Pages. |

## Por vista

### Panel
- Los KPIs quedaban debajo de la agenda; ahora van primero, con ícono y unidad.
- «¿Qué hago hoy?»: las etiquetas tipo píldora (`HACCP ⚠` partía en dos líneas) pasan a tres niveles de severidad (crítico / alerta / aviso) con borde de color, ícono y contadores en el encabezado. Toda la fila es clicable; se quita el botón «→» redundante.
- «Lotes en curso»: se agrega barra de progreso coloreada por etapa, y «vencida / hoy / N d» en chips de color.
- «Distribución de cava» ahora muestra también los kg por etapa.

### Vista de cava (Gantt)
- **Bug principal:** abría siempre en la fecha del lote más viejo. Los lotes recientes se veían con la pista vacía hasta hacer scroll horizontal. v5 abre centrada en **hoy** y tiene un botón «Hoy».
- La leyenda «REAL» usaba verde salvia aunque las barras usan el color de cada etapa. Ahora la leyenda muestra solo las etapas presentes, más «Proyectado» y «Vencida».
- Zoom Semanas / Meses / Trimestre, líneas guía semanales, columna de lotes fija y tooltip con fechas y estado por segmento.
- Opción «Incluir terminados».

### Lotes
- Filtros con contadores (los vacíos quedan deshabilitados) y búsqueda por ref, producto o lote.
- La columna «Yield esp/real» mezclaba gramos esperados con % real, y pintaba de verde un lote recién empezado (97 % de rendimiento = todavía sin secar). Ahora muestra el % actual en neutro y el objetivo en % y gramos debajo.
- En móvil, tarjetas en vez de una tabla de 8 columnas.

### Detalle de lote *(fase 1: resumen de solo lectura; fase 2: completo)*
- Fase 1: KPIs, etapas como pasos con estado, tabla de piezas con aw (valor ± incertidumbre, «est.» o «medido») y estado de seguridad, panel HACCP y promedios ambientales. Todo calculado con las mismas funciones de v4.4.3.
- Fase 2: pestañas Piezas / Etapas / HACCP / Catas / Análisis con edición, y gráfico de curvas de peso.

### Tipos y editor de receta *(fase 2)*
- El editor es un formulario muy denso: inputs numéricos diminutos con flechas, anchos dispares y secciones plegables con etiquetas pequeñas.
- Propuesta: secciones en Cards (General, Rendimiento, Carne base, Etapas), inputs con sufijo de unidad (%, g/kg, °C), etapas reordenables con arrastre visible y vista previa del flujo a la derecha.

### Ingredientes *(fase 2)*
- Una página larga con una tabla por categoría, sin búsqueda; «×» de borrado en cada fila.
- Propuesta: tabla única con Tabs por categoría, búsqueda, columna «Uso» enlazada a las recetas y edición en un Sheet lateral.

### Nuevo lote (modal) *(fase 2)*
- El modal es más alto que la pantalla. El selector de fecha muestra `mm/dd/yyyy` (formato del navegador) aunque la app usa `dd/mm`. Las advertencias críticas («Fick sal: Curado 10d insuficiente…») van en texto rojo de 10 px.
- Propuesta: asistente por pasos (Tipo y ref → Recepción HACCP → Piezas → Sal y curado → Resumen), con las advertencias como `Alert` destacadas y la fecha en formato local.

### Biblioteca *(fase 3)*
- Botones con flechas ↑ ↓ ambiguas (¿exportar o importar?). «Borrar todos los datos» queda al lado de «Restaurar».
- Propuesta: «Exportar» e «Importar» explícitos con íconos, y la zona de peligro separada con confirmación escribiendo «BORRAR».

### Analytics *(fase 3)*
- Tablas densas; los estados vacíos son párrafos largos.
- Propuesta: gráficos con la paleta de etapas, estados vacíos cortos con lo que falta («Necesitás 3 lotes terminados del mismo tipo»).

### Defectos *(fase 3)*
- Diez tarjetas largas sin índice ni búsqueda.
- Propuesta: lista con búsqueda y Accordion por defecto (Visual / Causa / Prevención / Acción).

## Plan de fases

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Base técnica (Vite, React, Tailwind 4, shadcn, Sonner), tema crema, shell y navegación, Panel, Vista de cava, Lotes, resumen de lote | **Entregada** (vista previa) |
| 2 | Detalle de lote completo + registros (peso, pH, ambiente/Govee, aw, catas), nuevo lote, jornada de pesaje, Tipos + editor, Ingredientes, sync iCloud | Pendiente |
| 3 | Biblioteca (import/export/backups), Analytics, Defectos, etiqueta nutricional y sellos | Pendiente |

Hasta terminar la fase 2, v4.4.3 sigue siendo la versión de producción. v5 incluye v4.4.3 en `/v4/` y ambas leen y escriben los mismos datos del navegador.

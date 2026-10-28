# Diseño: Mejora de Bordes y Líneas de la Tabla del Reporte de Cobranzas

**Fecha:** 2026-10-28  
**Alcance:** Cambio pequeño (`src/components/views/CobranzasView.tsx` — componente `PrintModal` y estilos `.report-table`)

## 1. Intención y Por Qué
Mejorar la definición, nitidez y consistencia de los bordes y líneas divisorias de la tabla del Reporte PDF de Cobranzas (`.report-table`) para que tanto en la vista previa A4 en pantalla como en la hoja impresa / PDF las filas y columnas tengan un contraste institucional claro y uniforme.

## 2. Objetivos y No-Objetivos
- **Objetivos:**
  - Eliminar grosores decimales (`1.5px`) que causan bordes borrosos o desparejos en motores PDF y pantallas, estandarizando a `2px solid #0f172a` para el marco y separadores principales, y `1px solid #475569` para la grilla interna.
  - Asegurar que todas las celdas (`th` y `td`) cierren sus 4 lados de forma consistente con `border-collapse: collapse`.
  - Agregar líneas punteadas de guía de escritura en las columnas opcionales de terreno (*N° Recibo* y *Firma / Obs.*).
  - Aislar las reglas de impresión (`body`, `*`, `.no-print`) para que en la vista previa en pantalla no se oculte la columna `✕` ni se desajusten los bordes derechos de la tabla.
- **No-Objetivos:**
  - No modificar la lógica de filtrado, ordenamiento ni selección de deudores.
  - No alterar el diseño de otras vistas fuera del reporte de cobranzas.

## 3. Enfoques Considerados
1. **Grilla Institucional Nítida (Elegido):** Marco exterior, cabecera y fila de totales con bordes de `2px solid #0f172a`; grilla interna uniforme en `1px solid #475569`; guías punteadas en casilleros de terreno. Equilibra nitidez en papel y pulcritud en PDF digital.
2. **Estilo Contable Editorial:** Líneas horizontales marcadas (`#334155`) y verticales suaves (`#94a3b8`). Más liviano en pantalla pero menos visible en impresoras láser económicas.
3. **Grilla de Alto Contraste 100% Negra:** Todos los bordes internos en `#0f172a`. Máximo contraste en fotocopias pero recarga visualmente el texto.

## 4. Detalles de Implementación Acordados
- **Tabla (`.report-table`):** `border: 2px solid #0f172a`, `border-collapse: collapse`.
- **Cabecera (`thead th`):** Fondo `#e2e8f0`, `border-top: 2px solid #0f172a`, `border-bottom: 2px solid #0f172a`, bordes verticales `1px solid #475569`.
- **Celdas del cuerpo (`tbody td`):** Bordes completos `1px solid #475569` con filas cebradas (`#ffffff` / `#f8fafc`) y columna de saldo destacada (`#fff1f2` con borde izquierdo reforzado).
- **Fila de total (`.total-row td`):** `border-top: 2px solid #0f172a`, `border-bottom: 2px solid #0f172a`, divisores verticales `1px solid #475569`.
- **Casilleros de terreno (`.col-recibo`, `.col-firma`):** Línea inferior punteada (`1px dashed #64748b`) dentro de la celda para facilitar la anotación manual.
- **Vista previa vs. Impresión:** Separar los estilos exclusivos de ventana de impresión (`@media print` / popup) de los estilos del contenedor `.a4-sheet` en pantalla para que el botón `✕` sea visible en el modal pero desaparezca al imprimir.

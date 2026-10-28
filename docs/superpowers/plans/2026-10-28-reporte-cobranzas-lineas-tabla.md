# Mejora de Bordes y Líneas de la Tabla del Reporte de Cobranzas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mejorar la definición, nitidez y consistencia de los bordes y líneas divisorias de `.report-table` en `CobranzasView.tsx`, tanto en la vista previa A4 como en la impresión PDF.

**Architecture:** Se separa el CSS base de la hoja A4 (`A4_SHEET_STYLES`) del CSS exclusivo de ventana de impresión (`PRINT_WINDOW_STYLES`) para evitar fugas globales en el modal, y se redefinen los bordes de `.report-table`, `thead th`, `tbody td`, `.total-row td` y las guías punteadas de `.col-recibo` / `.col-firma` con grosores enteros (`2px` y `1px`) y alto contraste institucional (`#0f172a` y `#475569`).

**Tech Stack:** React 19, TypeScript, CSS-in-JS (`<style>` scoped a `.a4-sheet`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-reporte-cobranzas-lineas-tabla-design.md`

## Global Constraints

- Marco exterior de `.report-table` y bordes superior/inferior de `thead th` y `.total-row td` en `2px solid #0f172a` (sin valores decimales `1.5px`).
- Grilla interna (`tbody td`, divisores verticales de `thead th` y `.total-row td`) en `1px solid #475569` en los 4 lados.
- Casilleros de terreno (`.col-recibo`, `.col-firma`) con línea guía punteada `1px dashed #64748b`.
- La columna `.no-print` (`✕`) debe ser visible en la vista previa del modal y ocultarse únicamente en `@media print` y en la ventana de impresión.

## Review Focus

- Cuando `colCasillerosTerreno` está activo, las celdas `.col-recibo` y `.col-firma` deben renderizar la guía punteada interior sin romper el alto ni los bordes de la fila.
- Cuando se desactivan columnas opcionales (`colDomicilio`, `colTelefono`, `colDiaPago`), los bordes laterales de las columnas adyacentes y el `colSpan` de `.total-row` deben mantenerse cerrados a `2px solid #0f172a`.
- En pantalla dentro de `PrintModal`, el botón `✕` (`.no-print`) debe permanecer visible para poder quitar filas individualmente antes de imprimir.

---

### Task 1: Actualizar estilos de bordes y líneas de `.report-table` y agregar prueba unitaria de estilos/estructura

**Files:**
- Modify: `src/components/views/CobranzasView.tsx:108-436`
- Modify: `src/components/views/CobranzasView.tsx:942-1041`
- Test: `src/tests/cobranzasReportTable.test.ts`

**Interfaces:**
- Consumes: `DeudorCobranza`, `CobranzasView` de `src/components/views/CobranzasView.tsx`
- Produces: `A4_SHEET_STYLES` y `PRINT_STYLES` exportados desde `src/components/views/CobranzasView.tsx` para verificación determinista de reglas de grilla e impresión.

- [x] **Step 1: Write the failing test**

Crear `src/tests/cobranzasReportTable.test.ts` verificando que `A4_SHEET_STYLES` y `PRINT_STYLES` definen bordes enteros (`2px solid #0f172a` en `.report-table`, `thead th`, `.total-row td`), grilla interna cerrada (`1px solid #475569` en `.report-table tbody td`), guías de escritura (`.field-guide-line` con `border-bottom: 1px dashed #64748b`), y que `.no-print` solo se oculta en `@media print` / `PRINT_STYLES` y no globalmente en la vista previa.

```typescript
import { describe, it, expect } from 'vitest'
import { A4_SHEET_STYLES, PRINT_STYLES } from '../components/views/CobranzasView'

describe('Reporte de Cobranzas - Bordes y líneas de la tabla (.report-table)', () => {
  it('usa bordes enteros de 2px solid #0f172a para el marco de la tabla, cabecera y fila de totales', () => {
    expect(A4_SHEET_STYLES).toContain('border: 2px solid #0f172a')
    expect(A4_SHEET_STYLES).toContain('border-top: 2px solid #0f172a')
    expect(A4_SHEET_STYLES).toContain('border-bottom: 2px solid #0f172a')
    expect(A4_SHEET_STYLES).not.toContain('1.5px solid #0f172a')
  })

  it('define grilla interna nítida de 1px solid #475569 en celdas de cabecera y cuerpo', () => {
    expect(A4_SHEET_STYLES).toContain('border: 1px solid #475569')
    expect(A4_SHEET_STYLES).toContain('border-left: 1px solid #475569')
    expect(A4_SHEET_STYLES).toContain('border-right: 1px solid #475569')
  })

  it('incluye línea guía punteada para casilleros de recibo y firma en terreno', () => {
    expect(A4_SHEET_STYLES).toContain('.field-guide-line')
    expect(A4_SHEET_STYLES).toContain('1px dashed #64748b')
  })

  it('no oculta .no-print fuera de @media print en A4_SHEET_STYLES pero sí en PRINT_STYLES', () => {
    const withoutMediaPrint = A4_SHEET_STYLES.replace(/@media\s+print\s*\{[\s\S]*?\}/g, '')
    expect(withoutMediaPrint).not.toContain('.no-print {\n    display: none')
    expect(PRINT_STYLES).toContain('.no-print')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/cobranzasReportTable.test.ts`
Expected: FAIL (`A4_SHEET_STYLES` is not exported from `../components/views/CobranzasView`)

- [x] **Step 3: Implement `A4_SHEET_STYLES`, `PRINT_STYLES` and `.field-guide-line` in `src/components/views/CobranzasView.tsx`**

En `src/components/views/CobranzasView.tsx`:
1. Exportar `A4_SHEET_STYLES` (aplicado en el modal de vista previa) y `PRINT_STYLES` (compuesto por reset de página + `A4_SHEET_STYLES` + `.no-print { display: none !important; }` para la ventana de impresión).
2. Actualizar `.report-table` con `border: 2px solid #0f172a`, `thead th` con `border-top: 2px solid #0f172a !important; border-bottom: 2px solid #0f172a !important; border-left: 1px solid #475569 !important; border-right: 1px solid #475569 !important;`.
3. Actualizar `.report-table tbody tr` con `border-bottom: 1px solid #475569` y `.report-table tbody td` con `border: 1px solid #475569 !important;` para que cada fila y celda tenga sus 4 lados perfectamente definidos, más `.col-saldo` con `border-left: 1.5px` reemplazado por `border-left: 2px solid #991b1b !important;` o `1px solid #475569 !important;`.
4. Agregar `.field-guide-line` (`border-bottom: 1px dashed #64748b; height: 14px; width: 100%;`) dentro de `<td className="col-recibo"><div className="field-guide-line" /></td>` y `<td className="col-firma"><div className="field-guide-line" /></td>`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/cobranzasReportTable.test.ts`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add src/components/views/CobranzasView.tsx src/tests/cobranzasReportTable.test.ts docs/superpowers/specs/2026-10-28-reporte-cobranzas-lineas-tabla-design.md docs/superpowers/plans/2026-10-28-reporte-cobranzas-lineas-tabla.md
git commit -m "fix(cobranzas): mejorar bordes y lineas divisorias de la tabla del reporte PDF"
```

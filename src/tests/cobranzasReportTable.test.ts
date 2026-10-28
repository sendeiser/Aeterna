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

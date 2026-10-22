import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNomenclatura, isValidCBU } from '../lib/formatters'

describe('Formatters test', () => {
  it('formats Argentine pesos with dots for thousands and comma for decimals', () => {
    expect(formatCurrency(18000)).toBe('$ 18.000,00')
    expect(formatCurrency(470608.61)).toBe('$ 470.608,61')
    expect(formatCurrency(0)).toBe('$ 0,00')
  })

  it('formats nomenclatura standardized', () => {
    expect(formatNomenclatura('A', '25', '96')).toBe('A-25-96')
    expect(formatNomenclatura('e', '13', '127')).toBe('E-13-127')
  })

  it('validates 22-digit numeric CBU correctly', () => {
    expect(isValidCBU('0000003100012345678901')).toBe(true)
    expect(isValidCBU('123')).toBe(false)
    expect(isValidCBU('000000310001234567890A')).toBe(false)
  })
})

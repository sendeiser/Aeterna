import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNomenclatura, isValidCBU, montoEnLetras } from '../lib/formatters'

describe('Formatters test', () => {
  it('formats Argentine pesos with dots for thousands and comma for decimals', () => {
    expect(formatCurrency(18000)).toBe('$ 18.000,00')
    expect(formatCurrency(470608.61)).toBe('$ 470.608,61')
    expect(formatCurrency(0)).toBe('$ 0,00')
  })

  it('formats amount in Spanish words correctly', () => {
    expect(montoEnLetras(18000)).toBe('Dieciocho Mil Pesos')
    expect(montoEnLetras(100000)).toBe('Cien Mil Pesos')
    expect(montoEnLetras(25500.5)).toBe('Veinticinco Mil Quinientos Pesos con 50/100')
    expect(montoEnLetras(0)).toBe('Cero Pesos')
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

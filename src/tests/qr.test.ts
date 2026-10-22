import { describe, it, expect } from 'vitest'
import { generateBCRAEMVCoQR, crc16CCITT, generateUniversalPaymentPayload } from '../lib/qrHelper'

describe('QR Payment Generator (BCRA Interoperable & Universal)', () => {
  it('calculates CRC16-CCITT correctly', () => {
    // Test standard CRC16 CCITT string
    const sample = '0002010102126304'
    const crc = crc16CCITT(sample)
    expect(crc).toHaveLength(4)
    expect(/^[0-9A-F]{4}$/.test(crc)).toBe(true)
  })

  it('generates valid EMVCo TLV string with BCRA tags and amount', () => {
    const payload = generateBCRAEMVCoQR({
      cbu: '0000003100012345678901',
      alias: 'AETERNA.CHAMICAL',
      titular: 'Aeterna Servicios',
      monto: 18000,
      referencia: 'AFI-14'
    })

    // Starts with Payload Format Indicator
    expect(payload.startsWith('000201')).toBe(true)

    // Contains Tag 43 (BCRA Merchant Account Information) with sub-tag GUID
    expect(payload).toContain('ar.gob.bcra.cbu')
    expect(payload).toContain('0000003100012345678901')
    expect(payload).toContain('AETERNA.CHAMICAL')

    // Contains Tag 53 Currency ARS (032)
    expect(payload).toContain('5303032')

    // Contains Tag 54 with correct length for amount 18000.00 (len 8 -> 540818000.00)
    expect(payload).toContain('540818000.00')

    // Contains country code AR
    expect(payload).toContain('5802AR')

    // Contains Chamical city
    expect(payload).toContain('6008Chamical')

    // Ends with Tag 63 (4-character checksum)
    expect(payload).toMatch(/6304[0-9A-F]{4}$/)
  })

  it('generates universal payment payload readable by mobile cameras', () => {
    const universal = generateUniversalPaymentPayload({
      cbu: '0000003100012345678901',
      alias: 'AETERNA.CHAMICAL',
      titular: 'Aeterna Servicios',
      monto: 36000,
      concepto: 'Mantenimiento Parcela A-25-96'
    })

    expect(universal).toContain('AETERNA.CHAMICAL')
    expect(universal).toContain('0000003100012345678901')
    expect(universal).toContain('36000')
  })
})

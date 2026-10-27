import { describe, it, expect } from 'vitest'
import {
  formatPaymentShareMessage,
  getWhatsAppShareUrl,
  getInstagramShareData,
  getFacebookShareData,
  getEmailShareUrl,
  cleanPhoneNumber,
  cleanSocialHandle,
} from '../lib/paymentShareHelper'

describe('paymentShareHelper - Compartición Omnicanal de Pagos', () => {
  const mockParams = {
    titularNombre: 'Carlos Morales',
    identificador: 'PARCELA A-25-96',
    concepto: 'Mantenimiento Anual de Parcela',
    monto: 35000,
    alias: 'AETERNA.CHAMICAL',
    cbu: '0000003100012345678901',
    banco: 'Banco Rioja',
    titularCuenta: 'Aeterna Servicios S.R.L.',
    cuit: '30-71234567-9',
    paymentUrl: 'https://aeterna.chamical.gob.ar/?pago=1&id=A-25-96&monto=35000',
    telefono: '+54 9 3826 401234',
    email: 'carlosmorales@gmail.com',
    facebook: 'carlos.morales.lr',
    instagram: '@carlos_morales',
  }

  it('formatea correctamente el mensaje institucional completo con Alias, CBU y Link QR', () => {
    const msg = formatPaymentShareMessage(mockParams)

    expect(msg).toContain('AETERNA')
    expect(msg).toContain('Carlos Morales')
    expect(msg).toContain('PARCELA A-25-96')
    expect(msg).toContain('Mantenimiento Anual de Parcela')
    expect(msg).toContain('AETERNA.CHAMICAL')
    expect(msg).toContain('0000003100012345678901')
    expect(msg).toContain('35.000')
    expect(msg).toContain(mockParams.paymentUrl)
  })

  it('limpia números de teléfono argentinos para WhatsApp (añade 549 si corresponde)', () => {
    expect(cleanPhoneNumber('+54 9 3826 401234')).toBe('5493826401234')
    expect(cleanPhoneNumber('3826-401234')).toBe('5493826401234')
    expect(cleanPhoneNumber('03826 15 401234')).toBe('5493826401234')
    expect(cleanPhoneNumber('5493826401234')).toBe('5493826401234')
  })

  it('genera enlace de WhatsApp directo con teléfono y texto codificado', () => {
    const waUrl = getWhatsAppShareUrl(mockParams)
    expect(waUrl.startsWith('https://wa.me/5493826401234?text=')).toBe(true)
    expect(waUrl).toContain(encodeURIComponent('AETERNA.CHAMICAL'))
  })

  it('genera enlace de WhatsApp genérico si no hay teléfono asignado', () => {
    const waUrl = getWhatsAppShareUrl({ ...mockParams, telefono: null })
    expect(waUrl.startsWith('https://wa.me/?text=')).toBe(true)
  })

  it('limpia handles de redes sociales eliminando arrobas y espacios', () => {
    expect(cleanSocialHandle('@carlos_morales')).toBe('carlos_morales')
    expect(cleanSocialHandle(' https://instagram.com/carlos_morales/ ')).toBe('carlos_morales')
    expect(cleanSocialHandle('carlos.morales.lr')).toBe('carlos.morales.lr')
  })

  it('genera datos para Instagram con perfil directo y mensaje para copiar', () => {
    const igData = getInstagramShareData(mockParams)
    expect(igData.profileUrl).toBe('https://www.instagram.com/carlos_morales/')
    expect(igData.message).toContain('AETERNA.CHAMICAL')
  })

  it('genera datos para Facebook con enlace a Messenger y mensaje', () => {
    const fbData = getFacebookShareData(mockParams)
    expect(fbData.messengerUrl).toBe('https://m.me/carlos.morales.lr')
    expect(fbData.message).toContain('AETERNA.CHAMICAL')
  })

  it('genera enlace mailto con asunto y cuerpo pre-armados', () => {
    const mailto = getEmailShareUrl(mockParams)
    expect(mailto.startsWith('mailto:carlosmorales@gmail.com?subject=')).toBe(true)
    expect(mailto).toContain('&body=')
    expect(mailto).toContain(encodeURIComponent('AETERNA.CHAMICAL'))
  })
})

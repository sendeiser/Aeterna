import { formatCurrency } from './formatters'

export interface PaymentShareParams {
  titularNombre: string
  identificador: string
  concepto: string
  monto: number
  alias: string
  cbu: string
  banco?: string
  titularCuenta?: string
  cuit?: string
  paymentUrl?: string
  telefono?: string | null
  email?: string | null
  facebook?: string | null
  instagram?: string | null
}

/**
 * Limpia y normaliza números telefónicos argentinos para WhatsApp.
 * Asegura el formato internacional 549XXXXXXXXXX.
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')

  // Si ya empieza con 549, verificar
  if (digits.startsWith('549')) {
    return digits
  }

  // Si empieza con 54 pero no tiene el 9 (móvil)
  if (digits.startsWith('54') && digits.length >= 12) {
    return '549' + digits.slice(2)
  }

  // Si empieza con 0 (prefijo interurbano nacional), quitarlo
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // Quitar el 15 local si viene tras el código de área (ej. 3826 15 401234 -> 3826 401234)
  // Códigos de área en Argentina: 2 a 4 dígitos
  // Si tiene más de 10 dígitos y contiene 15 en posición 2-4
  if (digits.length === 12 && digits.slice(4, 6) === '15') {
    digits = digits.slice(0, 4) + digits.slice(6)
  } else if (digits.length === 11 && digits.slice(3, 5) === '15') {
    digits = digits.slice(0, 3) + digits.slice(5)
  } else if (digits.length === 10 && digits.slice(2, 4) === '15') {
    digits = digits.slice(0, 2) + digits.slice(4)
  }

  return '549' + digits
}

/**
 * Limpia un handle o link de red social (Instagram o Facebook) extrayendo solo el identificador de usuario.
 */
export function cleanSocialHandle(handle: string): string {
  if (!handle) return ''
  let cleaned = handle.trim()

  // Si es una URL completa
  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      const url = new URL(cleaned)
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) {
        return segments[0].replace('@', '').trim()
      }
    }
  } catch {
    // Continuar con limpieza regex
  }

  cleaned = cleaned.replace(/^https?:\/\/(www\.)?(instagram|facebook)\.com\//i, '')
  cleaned = cleaned.replace(/^[#@]/, '')
  cleaned = cleaned.replace(/\/.*$/, '')
  return cleaned.trim()
}

export interface ReciboShareParams {
  nroRecibo: string
  titularNombre: string
  identificador: string
  concepto: string
  monto: number
  metodo: 'efectivo' | 'transferencia_qr'
  comprobante?: string
  fecha?: string
  telefono?: string | null
  email?: string | null
  facebook?: string | null
  instagram?: string | null
}

/**
 * Genera el texto institucional detallado con los datos de cobro, Alias, CBU y Link interactivo al QR.
 */
export function formatPaymentShareMessage(params: PaymentShareParams): string {
  const lines: string[] = [
    '🏛️ *AETERNA PARQUE & SEPELIOS - MUNICIPALIDAD DE CHAMICAL*',
    '📋 *DATOS DE PAGO Y TRANSFERENCIA OFICIAL*',
    '',
    `• *Titular / Contribuyente:* ${params.titularNombre}`,
    `• *Identificador / Parcela:* ${params.identificador}`,
    `• *Concepto:* ${params.concepto}`,
    `• *Monto a abonar:* ${formatCurrency(params.monto)} ARS`,
    '',
    '💳 *DATOS BANCARIOS PARA TRANSFERENCIA:*',
    `• *Alias CBU/CVU:* ${(params.alias || 'AETERNA.CHAMICAL').trim().toUpperCase()}`,
    `• *CBU:* ${(params.cbu || '0000003100012345678901').trim()}`,
    `• *Banco:* ${params.banco || 'Banco Rioja'}`,
  ]

  if (params.titularCuenta) {
    lines.push(`• *Titular de Cuenta:* ${params.titularCuenta}`)
  }
  if (params.cuit) {
    lines.push(`• *CUIT:* ${params.cuit}`)
  }

  // Si paymentUrl está presente y no es una dirección interna (localhost / 127.0.0.1), incluir el link
  const isLocalLink = params.paymentUrl && /(localhost|127\.0\.0\.1)/i.test(params.paymentUrl)
  if (params.paymentUrl && !isLocalLink) {
    lines.push(
      '',
      '📲 *PAGO DIRECTO Y CÓDIGO QR INTERACTIVO:*',
      'Puede escanear el código QR o ingresar al enlace web para copiar el Alias/CBU con 1 clic:',
      params.paymentUrl
    )
  }

  lines.push(
    '',
    'Una vez realizada la transferencia, por favor envíe su comprobante por este medio para registrar su pago y emitir el recibo oficial.',
    'Atención al Contribuyente · Chamical, La Rioja'
  )

  return lines.join('\n')
}

/**
 * Genera el texto oficial del comprobante / recibo emitido para enviar al contribuyente.
 */
export function formatReciboShareMessage(params: ReciboShareParams): string {
  const metodoLabel =
    params.metodo === 'transferencia_qr'
      ? 'Transferencia QR Interoperable'
      : 'Efectivo en Caja Registradora'

  const fechaFormateada = params.fecha
    ? new Date(params.fecha).toLocaleDateString('es-AR')
    : new Date().toLocaleDateString('es-AR')

  const lines: string[] = [
    '🏛️ *AETERNA PARQUE & SEPELIOS - MUNICIPALIDAD DE CHAMICAL*',
    '🧾 *COMPROBANTE OFICIAL DE PAGO Y CANCELACIÓN*',
    '',
    `• *N° Recibo Oficial:* ${params.nroRecibo}`,
    `• *Fecha:* ${fechaFormateada}`,
    `• *Titular / Contribuyente:* ${params.titularNombre}`,
    `• *Referencia:* ${params.identificador}`,
    `• *Concepto:* ${params.concepto}`,
    `• *Canal de Pago:* ${metodoLabel}`,
  ]

  if (params.comprobante) {
    lines.push(`• *N° Operación / Transf:* #${params.comprobante}`)
  }

  lines.push(
    `• *Total Cancelado:* ${formatCurrency(params.monto)} ARS`,
    '',
    '✅ *ESTADO: CANCELADO Y REGISTRADO*',
    'Su pago ha sido imputado satisfactoriamente en el sistema oficial del Parque y Cementerio Municipal.',
    'Documento emitido conforme Ordenanza Municipal y AFIP RG 1415.',
    '',
    'Dirección de Rentas y Servicios Públicos · Chamical, La Rioja'
  )

  return lines.join('\n')
}

/**
 * Genera el enlace directo para enviar por WhatsApp.
 */
export function getWhatsAppShareUrl(params: PaymentShareParams): string {
  const msg = formatPaymentShareMessage(params)
  const phone = params.telefono ? cleanPhoneNumber(params.telefono) : null
  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

/**
 * Genera el enlace de WhatsApp para enviar el comprobante de pago emitido.
 */
export function getWhatsAppReciboShareUrl(params: ReciboShareParams): string {
  const msg = formatReciboShareMessage(params)
  const phone = params.telefono ? cleanPhoneNumber(params.telefono) : null
  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}

/**
 * Genera el enlace de perfil y el mensaje optimizado para Instagram.
 */
export function getInstagramShareData(params: PaymentShareParams): {
  profileUrl: string | null
  message: string
} {
  const msg = formatPaymentShareMessage(params)
  const handle = params.instagram ? cleanSocialHandle(params.instagram) : null
  return {
    profileUrl: handle ? `https://www.instagram.com/${handle}/` : null,
    message: msg,
  }
}

/**
 * Genera los datos de Instagram para enviar el comprobante de pago.
 */
export function getInstagramReciboShareData(params: ReciboShareParams): {
  profileUrl: string | null
  message: string
} {
  const msg = formatReciboShareMessage(params)
  const handle = params.instagram ? cleanSocialHandle(params.instagram) : null
  return {
    profileUrl: handle ? `https://www.instagram.com/${handle}/` : null,
    message: msg,
  }
}

/**
 * Genera el enlace de Messenger o Facebook y el mensaje optimizado.
 */
export function getFacebookShareData(params: PaymentShareParams): {
  messengerUrl: string | null
  profileUrl: string | null
  message: string
} {
  const msg = formatPaymentShareMessage(params)
  const handle = params.facebook ? cleanSocialHandle(params.facebook) : null
  return {
    messengerUrl: handle ? `https://m.me/${handle}` : null,
    profileUrl: handle ? `https://www.facebook.com/${handle}` : null,
    message: msg,
  }
}

/**
 * Genera los datos de Facebook para enviar el comprobante de pago.
 */
export function getFacebookReciboShareData(params: ReciboShareParams): {
  messengerUrl: string | null
  profileUrl: string | null
  message: string
} {
  const msg = formatReciboShareMessage(params)
  const handle = params.facebook ? cleanSocialHandle(params.facebook) : null
  return {
    messengerUrl: handle ? `https://m.me/${handle}` : null,
    profileUrl: handle ? `https://www.facebook.com/${handle}` : null,
    message: msg,
  }
}

/**
 * Genera el enlace mailto para envío por Gmail u otros clientes de correo.
 */
export function getEmailShareUrl(params: PaymentShareParams): string {
  const email = (params.email || '').trim()
  const subject = `Datos de Pago Oficial - ${params.concepto} (${params.identificador})`
  const body = formatPaymentShareMessage(params)
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Genera el enlace mailto para envío del comprobante de pago por correo.
 */
export function getEmailReciboShareUrl(params: ReciboShareParams): string {
  const email = (params.email || '').trim()
  const subject = `Comprobante Oficial de Pago - ${params.nroRecibo} (${params.identificador})`
  const body = formatReciboShareMessage(params)
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}


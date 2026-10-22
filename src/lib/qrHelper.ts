/**
 * Módulo de Generación de Códigos QR para Pagos Bancarios
 * Cumple con el estándar EMVCo Merchant-Presented QR Code y la especificación
 * Transferencias 3.0 del Banco Central de la República Argentina (BCRA).
 */

export interface QRParams {
  cbu: string
  alias: string
  titular: string
  monto: number
  referencia?: string
  concepto?: string
}

/**
 * Cálculo de suma de verificación CRC-16/CCITT-FALSE (Polinomio 0x1021, Init 0xFFFF)
 * Estándar obligatorio ISO/IEC 13239 y EMVCo Tag 63.
 */
export function crc16CCITT(str: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8)
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * Función auxiliar para formatear tags TLV (Tag-Length-Value)
 */
function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${tag}${len}${value}`
}

/**
 * Genera el payload EMVCo interoperable oficial para transferencias bancarias y billeteras
 * (Mercado Pago, BNA+, MODO, Cuenta DNI, Galicia, Santander, BBVA, etc.)
 */
export function generateBCRAEMVCoQR(params: QRParams): string {
  const { cbu, alias, titular, monto, referencia } = params

  // Tag 00: Formato de carga útil
  let payload = formatTLV('00', '01')

  // Tag 01: Método de iniciación de punto (12 = dinámico con monto específico, 11 = estático)
  payload += formatTLV('01', monto > 0 ? '12' : '11')

  // Tag 43: Información de cuenta del comercio (BCRA Sub-tags)
  // Sub-tag 00: Identificador de sistema global BCRA
  const sub00 = formatTLV('00', 'ar.gob.bcra.cbu')
  // Sub-tag 01: CBU (22 dígitos numéricos)
  const cleanCbu = (cbu || '').replace(/\D/g, '')
  const sub01 = formatTLV('01', cleanCbu.padEnd(22, '0').slice(0, 22))
  // Sub-tag 02: Alias CBU
  const cleanAlias = (alias || 'AETERNA.CHAMICAL').trim().toUpperCase()
  const sub02 = formatTLV('02', cleanAlias)

  const tag43Value = `${sub00}${sub01}${sub02}`
  payload += formatTLV('43', tag43Value)

  // Tag 52: Merchant Category Code (0000 = Servicios Generales / Cementerio)
  payload += formatTLV('52', '0000')

  // Tag 53: Moneda de transacción (032 = ARS Pesos Argentinos ISO 4217)
  payload += formatTLV('53', '032')

  // Tag 54: Monto de la transacción (formato con 2 decimales si > 0)
  if (monto > 0) {
    const amountStr = monto.toFixed(2)
    payload += formatTLV('54', amountStr)
  }

  // Tag 58: Código de país ISO 3166-1 alpha 2
  payload += formatTLV('58', 'AR')

  // Tag 59: Nombre del beneficiario / Titular de cuenta (máx 25 caracteres)
  const cleanTitular = (titular || 'Aeterna Servicios S.R.L.').slice(0, 25).trim()
  payload += formatTLV('59', cleanTitular)

  // Tag 60: Ciudad
  payload += formatTLV('60', 'Chamical')

  // Tag 62: Campo de datos adicionales (Referencia / Identificador)
  if (referencia) {
    const cleanRef = referencia.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20)
    const sub05 = formatTLV('05', cleanRef)
    payload += formatTLV('62', sub05)
  }

  // Tag 63: Checksum CRC-16
  // Se concatena el prefijo de tag 63 con longitud 04 ('6304') y se calcula el CRC
  const stringToHash = `${payload}6304`
  const checksum = crc16CCITT(stringToHash)

  return `${stringToHash}${checksum}`
}

/**
 * Genera un payload universal de pago para billeteras digitales o escaneo con cámara del teléfono.
 * Permite que billeteras virtuales o lectores de cámara reconozcan al instante CBU, Alias, Titular y Monto.
 */
export function generateUniversalPaymentPayload(params: QRParams): string {
  const cleanCbu = (params.cbu || '').replace(/\D/g, '')
  const cleanAlias = (params.alias || '').trim().toUpperCase()
  const cleanMonto = params.monto > 0 ? params.monto.toFixed(2) : '0.00'

  // Generamos un formato multipropósito con datos claros para transferencia
  return `TRANSFERENCIA AETERNA\nAlias: ${cleanAlias}\nCBU: ${cleanCbu}\nTitular: ${params.titular}\nMonto: $${cleanMonto}\nRef: ${params.concepto || params.referencia || 'Servicios Parque Aeterna'}`
}

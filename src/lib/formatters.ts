/**
 * Formatea valores numéricos a formato moneda de Argentina (ARS).
 * Ejemplo: 18000 -> "$ 18.000,00"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$ 0,00'
  }
  const parts = amount.toFixed(2).split('.')
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimalPart = parts[1]
  return `$ ${integerPart},${decimalPart}`
}

/**
 * Normaliza y formatea la nomenclatura de una parcela.
 * Ejemplo: ('A', '25', '96') -> 'A-25-96'
 */
export function formatNomenclatura(sector: string, manzana: string, parcela: string): string {
  const cleanSector = sector.trim().toUpperCase()
  const cleanManzana = manzana.trim()
  const cleanParcela = parcela.trim()
  return `${cleanSector}-${cleanManzana}-${cleanParcela}`
}

/**
 * Valida si un CBU bancario argentino cumple con los 22 dígitos numéricos.
 */
export function isValidCBU(cbu: string): boolean {
  return /^\d{22}$/.test(cbu.trim())
}

/**
 * Copia un texto al portapapeles con fallback para navegadores móviles o contextos HTTP.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    }
  } catch (err) {
    console.error('Error al copiar al portapapeles:', err)
    return false
  }
}

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DECENAS_10 = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function convertirCentenas(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'

  let res = ''
  const c = Math.floor(n / 100)
  const d = Math.floor((n % 100) / 10)
  const u = n % 10

  if (c > 0) res += CENTENAS[c] + ' '

  if (d === 1) {
    res += DECENAS_10[u]
  } else if (d === 2) {
    if (u === 0) res += 'veinte'
    else res += 'veinti' + UNIDADES[u]
  } else if (d > 2) {
    res += DECENAS[d]
    if (u > 0) res += ' y ' + UNIDADES[u]
  } else if (u > 0) {
    res += UNIDADES[u]
  }

  return res.trim()
}

/**
 * Convierte un importe en pesos a texto formal en español.
 * Ejemplo: 18000 -> "Dieciocho Mil Pesos"
 *          25500.50 -> "Veinticinco Mil Quinientos Pesos con 50/100"
 */
export function montoEnLetras(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto) || monto === 0) {
    return 'Cero Pesos'
  }

  const entero = Math.floor(Math.abs(monto))
  const centavos = Math.round((Math.abs(monto) - entero) * 100)

  let resultado = ''

  if (entero === 0) {
    resultado = 'cero'
  } else if (entero < 1000) {
    resultado = convertirCentenas(entero)
  } else if (entero < 1000000) {
    const miles = Math.floor(entero / 1000)
    const resto = entero % 1000
    const strMiles = miles === 1 ? 'mil' : convertirCentenas(miles) + ' mil'
    resultado = `${strMiles} ${convertirCentenas(resto)}`.trim()
  } else {
    const millones = Math.floor(entero / 1000000)
    const restoMillones = entero % 1000000
    const miles = Math.floor(restoMillones / 1000)
    const resto = restoMillones % 1000
    const strMillones = millones === 1 ? 'un millón' : convertirCentenas(millones) + ' millones'
    const strMiles = miles === 1 ? 'mil' : miles > 1 ? convertirCentenas(miles) + ' mil' : ''
    resultado = `${strMillones} ${strMiles} ${convertirCentenas(resto)}`.trim()
  }

  // Capitalizar cada palabra importante
  const palabras = resultado.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  const base = `${palabras} Pesos`

  if (centavos > 0) {
    return `${base} con ${centavos.toString().padStart(2, '0')}/100`
  }
  return base
}

/**
 * Formatea una fecha ISO a formato argentino legible con fecha y hora:
 * Ejemplo: "2026-10-24T18:30:00Z" -> "24/10/2026 18:30 hs"
 */
export function formatDateHour(isoString?: string | null): string {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString.slice(0, 10)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${mins} hs`
  } catch {
    return String(isoString)
  }
}

/**
 * Normaliza una nomenclatura catastral para comparaciones exactas sin importar ceros a la izquierda
 * ni espacios. Ejemplo: "A-01-01" -> "A-1-1", "a 11 05" -> "A-11-5", "A-1-15" -> "A-1-15".
 */
export function normalizeNomenclatura(nom?: string | null): string {
  if (!nom) return ''
  const raw = String(nom).trim().toUpperCase()
  if (!raw) return ''
  const parts = raw
    .split(/[\s-]+/)
    .map((part) => {
      if (/^\d+$/.test(part)) {
        return String(parseInt(part, 10))
      }
      return part
    })
    .filter(Boolean)
  return parts.join('-')
}

/**
 * Extrae la nomenclatura de parcela asociada a un registro de inhumación.
 */
export function extractInhumacionNomenclatura(inh?: any): string {
  if (!inh) return ''
  if (inh.parcela && typeof inh.parcela === 'object' && inh.parcela.nomenclatura) {
    return String(inh.parcela.nomenclatura).trim()
  }
  if (typeof inh.parcela === 'string' && inh.parcela.trim()) {
    return inh.parcela.trim()
  }
  if (inh.parcela_nomenclatura) {
    return String(inh.parcela_nomenclatura).trim()
  }
  return ''
}

/**
 * Obtiene la lista de difuntos inhumados en una parcela específica comparando por ID y por
 * nomenclatura normalizada.
 */
export function getDifuntosEnParcela<T extends Record<string, any> = any>(
  parcela: { id?: string | null; nomenclatura?: string | null } | string | null | undefined,
  inhumaciones: T[] = [],
  ignoreInhumacionId?: string | null
): T[] {
  if (!parcela || !Array.isArray(inhumaciones) || inhumaciones.length === 0) return []

  const targetId = typeof parcela === 'object' ? (parcela.id || '').trim() : ''
  const rawNom = typeof parcela === 'string' ? parcela : parcela.nomenclatura || ''
  const normTargetNom = normalizeNomenclatura(rawNom)

  if (!targetId && !normTargetNom) return []

  return inhumaciones
    .filter((inh) => {
      if (!inh) return false
      if (ignoreInhumacionId && inh.id === ignoreInhumacionId) return false

      const inhParcId =
        inh.parcela_id ||
        (inh.parcela && typeof inh.parcela === 'object' ? inh.parcela.id : '') ||
        ''

      if (targetId && inhParcId && targetId === inhParcId) {
        return true
      }

      const inhNom = extractInhumacionNomenclatura(inh)
      if (normTargetNom && inhNom) {
        return normalizeNomenclatura(inhNom) === normTargetNom
      }

      return false
    })
    .sort((a, b) => (Number(a.nivel_posicion) || 1) - (Number(b.nivel_posicion) || 1))
}

/**
 * Calcula el estado real de ocupación por niveles (fosas) de una parcela a partir de las inhumaciones.
 * Garantiza que ningún difunto quede oculto si dos registros comparten el mismo nivel_posicion.
 */
export function getOcupacionParcela<T extends Record<string, any> = any>(
  parcela:
    | { id?: string | null; nomenclatura?: string | null; capacidad_total?: number | null }
    | null
    | undefined,
  inhumaciones: T[] = [],
  ignoreInhumacionId?: string | null
) {
  const difuntos = getDifuntosEnParcela(parcela, inhumaciones, ignoreInhumacionId)
  const baseCapacidad = Number(parcela?.capacidad_total) || 3
  const capacidad = Math.max(baseCapacidad, difuntos.length)
  const porNivel = new Map<number, T>()
  const pendientes: T[] = []

  for (const d of difuntos) {
    const lvl = Number(d.nivel_posicion) || 1
    if (lvl >= 1 && lvl <= capacidad && !porNivel.has(lvl)) {
      porNivel.set(lvl, d)
    } else {
      pendientes.push(d)
    }
  }

  for (const d of pendientes) {
    for (let lvl = 1; lvl <= capacidad; lvl++) {
      if (!porNivel.has(lvl)) {
        porNivel.set(lvl, d)
        break
      }
    }
  }

  return {
    capacidad,
    ocupados: difuntos.length,
    difuntos,
    porNivel,
  }
}



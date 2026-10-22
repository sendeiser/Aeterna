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

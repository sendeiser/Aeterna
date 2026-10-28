import type { Parcela, AfiliadoSeguro } from '../types/database'

export interface EvaluacionMoraParcela {
  enStandby: boolean
  aniosMora: number
  fechaUltimoPago: string | null
  ultimaCuotaPagada: string
}

export interface EvaluacionMoraAfiliado {
  enStandby: boolean
  mesesMora: number
  fechaUltimoPago: string | null
  ultimaCuotaPagada: string
}

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const META_CUOTA_REGEX = /\[CuotaAnual:(\d+(?:\.\d+)?)\|AnioPago:(\d{4})\]/i

export function extraerMetaAnualDeNotas(notas?: string | null): {
  ultimoMontoAnual?: number
  ultimoAnioPagado?: number
} {
  if (!notas) return {}
  const match = notas.match(META_CUOTA_REGEX)
  if (!match) return {}
  const monto = Number(match[1])
  const anio = Number(match[2])
  return {
    ultimoMontoAnual: !isNaN(monto) && monto > 0 ? monto : undefined,
    ultimoAnioPagado: !isNaN(anio) && anio >= 2000 ? anio : undefined,
  }
}

export function inyectarMetaAnualEnNotas(
  notas: string | null | undefined,
  monto: number,
  anio: number
): string {
  const tag = `[CuotaAnual:${Math.round(monto)}|AnioPago:${anio}]`
  const base = (notas || '').replace(META_CUOTA_REGEX, '').trim()
  return base ? `${base} ${tag}` : tag
}

/**
 * Sincroniza la renovación anual al iniciar cada año calendario:
 * Si el año actual supera al último año abonado por el titular, vuelve a cargar
 * en saldo_mantenimiento exactamente el mismo monto anual abonado el año anterior
 * (multiplicado por los años impagos transcurridos).
 */
export function sincronizarRenovacionAnualParcela(
  parcela: Parcela,
  fechaReferenciaISO: string = new Date().toISOString().slice(0, 10)
): Parcela {
  const metaNotas = extraerMetaAnualDeNotas(parcela.notas)
  const ultimoMontoAnual =
    (parcela.ultimo_monto_anual && parcela.ultimo_monto_anual > 0
      ? parcela.ultimo_monto_anual
      : metaNotas.ultimoMontoAnual) || undefined

  let ultimoAnioPagado = parcela.ultimo_anio_pagado || metaNotas.ultimoAnioPagado
  if (!ultimoAnioPagado && parcela.fecha_ultimo_pago && (parcela.saldo_mantenimiento || 0) <= 0) {
    const parsedYear = Number(parcela.fecha_ultimo_pago.slice(0, 4))
    if (!isNaN(parsedYear) && parsedYear >= 2000) {
      ultimoAnioPagado = parsedYear
    }
  }

  if (parcela.estado === 'disponible' || parcela.estado === 'baja' || !parcela.titular) {
    return {
      ...parcela,
      ...(ultimoMontoAnual ? { ultimo_monto_anual: ultimoMontoAnual } : {}),
      ...(ultimoAnioPagado ? { ultimo_anio_pagado: ultimoAnioPagado } : {}),
    }
  }

  const refYear = Number(fechaReferenciaISO.slice(0, 4)) || new Date(fechaReferenciaISO).getFullYear()
  const montoBaseAnual = ultimoMontoAnual || 36000

  let nuevoSaldo = parcela.saldo_mantenimiento || 0
  if (ultimoAnioPagado && refYear > ultimoAnioPagado) {
    const aniosAdeudados = refYear - ultimoAnioPagado
    const cargoRenovado = aniosAdeudados * montoBaseAnual
    if (nuevoSaldo < cargoRenovado) {
      nuevoSaldo = cargoRenovado
    }
  }

  return {
    ...parcela,
    saldo_mantenimiento: nuevoSaldo,
    ...(ultimoMontoAnual ? { ultimo_monto_anual: ultimoMontoAnual } : {}),
    ...(ultimoAnioPagado ? { ultimo_anio_pagado: ultimoAnioPagado } : {}),
  }
}

/**
 * Evalúa si una parcela con titular asignado cae en mora crítica (>= 3 años de falta de pago)
 * produciendo la pérdida automática de titularidad y pase a stand-by.
 */
export function evaluarMoraParcela(
  parcela: Parcela,
  fechaReferenciaISO: string = new Date().toISOString().slice(0, 10)
): EvaluacionMoraParcela {
  const parcelaSincronizada = sincronizarRenovacionAnualParcela(parcela, fechaReferenciaISO)

  // Las parcelas sin titular o disponibles no aplican para pérdida de titularidad
  if (parcelaSincronizada.estado === 'disponible' || !parcelaSincronizada.titular) {
    return {
      enStandby: false,
      aniosMora: 0,
      fechaUltimoPago: parcelaSincronizada.fecha_ultimo_pago || null,
      ultimaCuotaPagada: parcelaSincronizada.ultima_cuota_pagada || 'N/A'
    }
  }

  const refDate = new Date(fechaReferenciaISO)
  const montoAnualRef = parcelaSincronizada.ultimo_monto_anual || 36000

  let aniosMora = 0

  if (parcelaSincronizada.estado === 'standby') {
    aniosMora = 3
  }

  if (parcelaSincronizada.saldo_mantenimiento >= montoAnualRef * 3) {
    aniosMora = Math.max(aniosMora, Math.floor(parcelaSincronizada.saldo_mantenimiento / montoAnualRef))
  }

  if (parcelaSincronizada.fecha_ultimo_pago) {
    const ultimoPagoDate = new Date(parcelaSincronizada.fecha_ultimo_pago)
    const diffMs = refDate.getTime() - ultimoPagoDate.getTime()
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
    aniosMora = Math.max(aniosMora, Math.floor(diffYears))
  } else if (parcelaSincronizada.fecha_adquisicion && aniosMora === 0) {
    const adqDate = new Date(parcelaSincronizada.fecha_adquisicion)
    const diffMs = refDate.getTime() - adqDate.getTime()
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
    aniosMora = Math.max(aniosMora, Math.floor(diffYears))
  } else if (parcelaSincronizada.saldo_mantenimiento > 0 && aniosMora === 0) {
    aniosMora = Math.floor(parcelaSincronizada.saldo_mantenimiento / montoAnualRef)
  }

  const enStandby = aniosMora >= 3 || parcelaSincronizada.estado === 'standby'

  let ultimaCuotaPagada = parcelaSincronizada.ultima_cuota_pagada || ''
  if (!ultimaCuotaPagada) {
    if (parcelaSincronizada.fecha_ultimo_pago) {
      ultimaCuotaPagada = `Abonada el ${parcelaSincronizada.fecha_ultimo_pago}`
    } else {
      ultimaCuotaPagada = 'Sin pagos registrados desde adquisición'
    }
  }

  return {
    enStandby,
    aniosMora,
    fechaUltimoPago: parcelaSincronizada.fecha_ultimo_pago || null,
    ultimaCuotaPagada
  }
}

/**
 * Evalúa si un afiliado al Plan Seguro Integral adeuda 3 o más meses consecutivos,
 * activando la alerta de suspensión / stand-by.
 */
export function evaluarMoraAfiliado(
  afiliado: AfiliadoSeguro,
  mesReferencia: number = new Date().getMonth() + 1,
  anioReferencia: number = new Date().getFullYear()
): EvaluacionMoraAfiliado {
  const pagadas = new Set(afiliado.cuotasPagadas || [])
  
  // Contamos cuántos meses transcurridos hasta el mes de referencia no han sido pagados
  let mesesMora = 0
  for (let m = 1; m <= mesReferencia; m++) {
    if (!pagadas.has(m)) {
      mesesMora++
    }
  }

  const enStandby = mesesMora >= 3

  // Identificar última cuota pagada
  let ultimaCuotaPagada = afiliado.ultima_cuota_pagada || ''
  let fechaUltimoPago = afiliado.fecha_ultimo_pago || null

  if (!ultimaCuotaPagada) {
    const mesesPagadosOrdenados = Array.from(pagadas).sort((a, b) => b - a)
    if (mesesPagadosOrdenados.length > 0) {
      const ultimoMes = mesesPagadosOrdenados[0]
      const nombreMes = NOMBRES_MESES[ultimoMes - 1] || `Mes ${ultimoMes}`
      ultimaCuotaPagada = `${nombreMes} ${anioReferencia}`

      // Buscar si hay fecha en cuotasDetalle
      const detalle = afiliado.cuotasDetalle?.find((c) => (c.mes || c.nro_cuota) === ultimoMes && c.estado === 'pagada')
      if (detalle?.fecha_pago) {
        fechaUltimoPago = detalle.fecha_pago
        ultimaCuotaPagada += ` (${detalle.fecha_pago.slice(0, 10)})`
      }
    } else {
      ultimaCuotaPagada = 'Sin cuotas abonadas'
    }
  }

  return {
    enStandby,
    mesesMora,
    fechaUltimoPago,
    ultimaCuotaPagada
  }
}

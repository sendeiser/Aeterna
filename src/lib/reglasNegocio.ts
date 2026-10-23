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

/**
 * Evalúa si una parcela con titular asignado cae en mora crítica (>= 3 años de falta de pago)
 * produciendo la pérdida automática de titularidad y pase a stand-by.
 */
export function evaluarMoraParcela(
  parcela: Parcela,
  fechaReferenciaISO: string = new Date().toISOString().slice(0, 10)
): EvaluacionMoraParcela {
  // Las parcelas sin titular o disponibles no aplican para pérdida de titularidad
  if (parcela.estado === 'disponible' || !parcela.titular) {
    return {
      enStandby: false,
      aniosMora: 0,
      fechaUltimoPago: parcela.fecha_ultimo_pago || null,
      ultimaCuotaPagada: parcela.ultima_cuota_pagada || 'N/A'
    }
  }

  const refDate = new Date(fechaReferenciaISO)
  const refYear = refDate.getFullYear()

  let aniosMora = 0

  if (parcela.estado === 'standby') {
    aniosMora = 3
  }

  if (parcela.saldo_mantenimiento >= 108000) {
    aniosMora = Math.max(aniosMora, Math.floor(parcela.saldo_mantenimiento / 36000))
  }

  if (parcela.fecha_ultimo_pago) {
    const ultimoPagoDate = new Date(parcela.fecha_ultimo_pago)
    const diffMs = refDate.getTime() - ultimoPagoDate.getTime()
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
    aniosMora = Math.max(aniosMora, Math.floor(diffYears))
  } else if (parcela.fecha_adquisicion && aniosMora === 0) {
    const adqDate = new Date(parcela.fecha_adquisicion)
    const diffMs = refDate.getTime() - adqDate.getTime()
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
    aniosMora = Math.max(aniosMora, Math.floor(diffYears))
  } else if (parcela.saldo_mantenimiento > 0 && aniosMora === 0) {
    aniosMora = Math.floor(parcela.saldo_mantenimiento / 36000)
  }

  const enStandby = aniosMora >= 3 || parcela.estado === 'standby'

  let ultimaCuotaPagada = parcela.ultima_cuota_pagada || ''
  if (!ultimaCuotaPagada) {
    if (parcela.fecha_ultimo_pago) {
      ultimaCuotaPagada = `Abonada el ${parcela.fecha_ultimo_pago}`
    } else {
      ultimaCuotaPagada = 'Sin pagos registrados desde adquisición'
    }
  }

  return {
    enStandby,
    aniosMora,
    fechaUltimoPago: parcela.fecha_ultimo_pago || null,
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

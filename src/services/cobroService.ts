import { Parcela, AfiliadoSeguro, CuotaSeguro } from '../types/database'
import { PagoRecibo } from './dataService'

export interface CobroParcelaInput {
  parcela: Parcela
  montoCobrado: number
  nroRecibo?: string
  comprobante?: string
  metodo?: 'efectivo' | 'transferencia_qr'
  concepto?: string
  fecha?: string
  periodo?: string
}

export function aplicarCobroParcela(input: CobroParcelaInput): {
  updatedParcela: Parcela
  nuevoPago: PagoRecibo
} {
  const { parcela, montoCobrado } = input
  const nuevoSaldo = Math.max(0, (parcela.saldo_mantenimiento || 0) - montoCobrado)
  const nuevoEstado =
    nuevoSaldo <= 0 && (parcela.estado === 'en_mora' || parcela.estado === 'standby')
      ? 'ocupada'
      : parcela.estado

  const fechaIso = input.fecha || new Date().toISOString()
  const anioActual = new Date().getFullYear()

  const updatedParcela: Parcela = {
    ...parcela,
    saldo_mantenimiento: nuevoSaldo,
    estado: nuevoEstado,
    fecha_ultimo_pago: fechaIso,
    ultima_cuota_pagada:
      input.periodo || parcela.ultima_cuota_pagada || `Cuota Anual ${anioActual}`,
  }

  const nroRecibo =
    input.nroRecibo || `REC-${parcela.nomenclatura}-${Date.now().toString().slice(-6)}`
  const concepto =
    input.concepto || `Mantenimiento Anual - Parcela ${parcela.nomenclatura}`
  const titularNombre = parcela.titular?.nombre_completo || 'Sin Titular'

  const nuevoPago: PagoRecibo = {
    id: `pago-${Date.now()}`,
    concepto,
    monto: montoCobrado,
    identificador: parcela.nomenclatura,
    titularNombre,
    metodo: input.metodo || 'transferencia_qr',
    fecha: fechaIso,
    nroRecibo,
    comprobante: input.comprobante || '7849',
    tipo: 'ingreso',
    categoria: 'Mantenimiento de Parcela',
  }

  return {
    updatedParcela,
    nuevoPago,
  }
}

export interface CobroCuotasInput {
  afiliado: AfiliadoSeguro
  nrosCuotas: number[]
  valorUnitario?: number
  nroRecibo?: string
  comprobante?: string
  metodo?: 'efectivo' | 'transferencia_qr'
  fecha?: string
  concepto?: string
}

export function aplicarCobroCuotas(input: CobroCuotasInput): {
  updatedAfiliado: AfiliadoSeguro
  nuevoPago: PagoRecibo
  cuotasDetalleNuevas: CuotaSeguro[]
} {
  const { afiliado, nrosCuotas } = input
  const valorUnitario = input.valorUnitario ?? (afiliado.monto_cuota_mensual || 18000)
  const montoTotal = valorUnitario * nrosCuotas.length
  const anioActual = new Date().getFullYear()
  const fechaIso = input.fecha || new Date().toISOString()
  const nroRecibo =
    input.nroRecibo || `REC-${anioActual}-${Math.floor(1000 + Math.random() * 9000)}`

  const currentPaid = afiliado.cuotasPagadas || []
  const updatedPaid = Array.from(new Set([...currentPaid, ...nrosCuotas])).sort((a, b) => a - b)
  const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))

  const cuotasDetalleNuevas: CuotaSeguro[] = nrosCuotas.map((m) => ({
    id: `cuota-${afiliado.id}-${m}`,
    afiliado_id: afiliado.id,
    anio: anioActual,
    nro_cuota: m,
    mes: m,
    monto: valorUnitario,
    estado: 'pagada',
    fecha_pago: fechaIso,
    metodo_pago: input.metodo || 'transferencia_qr',
    nro_recibo: `${nroRecibo}-M${m}`,
  }))

  const currentDetalles = afiliado.cuotasDetalle || []
  const updatedDetalles = [
    ...currentDetalles.filter((c) => !nrosCuotas.includes(c.mes || (c as any).nro_cuota)),
    ...cuotasDetalleNuevas,
  ]

  const mesesNombres = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]
  const nombresStr = nrosCuotas.map((n) => mesesNombres[n - 1] || `Mes ${n}`).join(', ')
  const defaultConcepto = `Plan Seguro Integral - Cuotas (${nombresStr} ${anioActual}) (#${afiliado.numero_afiliado})`

  const updatedAfiliado: AfiliadoSeguro = {
    ...afiliado,
    cuotasPagadas: updatedPaid,
    cuotasDetalle: updatedDetalles,
    estado: alDia ? 'activo' : afiliado.estado,
    fecha_ultimo_pago: fechaIso,
    ultima_cuota_pagada:
      nrosCuotas.length > 0
        ? `Cuota ${Math.max(...nrosCuotas)}`
        : afiliado.ultima_cuota_pagada,
  }

  const nuevoPago: PagoRecibo = {
    id: `pago-${Date.now()}`,
    concepto: input.concepto || defaultConcepto,
    monto: montoTotal,
    identificador: `AFI-${afiliado.numero_afiliado}`,
    titularNombre: afiliado.nombre_completo,
    metodo: input.metodo || 'transferencia_qr',
    fecha: fechaIso,
    nroRecibo,
    comprobante: input.comprobante,
    tipo: 'ingreso',
    categoria: 'Cuota Plan Seguro',
  }

  return {
    updatedAfiliado,
    nuevoPago,
    cuotasDetalleNuevas,
  }
}

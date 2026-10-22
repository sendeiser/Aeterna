export type EstadoParcela = 'disponible' | 'ocupada' | 'reservada' | 'en_mora' | 'baja'
export type EstadoTitular = 'activo' | 'inactivo' | 'fallecido' | 'baja'
export type EstadoAfiliado = 'activo' | 'en_mora' | 'suspendido' | 'baja'
export type EstadoCuota = 'pendiente' | 'pagada' | 'anulada'
export type MetodoPago = 'efectivo' | 'transferencia_qr' | 'debito' | 'credito' | 'otro'

export interface ConfiguracionCobro {
  id: string
  alias_cbu: string
  cbu: string
  titular_cuenta: string
  banco: string
  cuit: string
  mensaje_recibo: string
  activo: boolean
}

export interface Titular {
  id: string
  nombre_completo: string
  dni?: string | null
  telefono?: string | null
  telefono_secundario?: string | null
  direccion?: string | null
  barrio?: string | null
  ciudad?: string
  provincia?: string
  estado_titular: EstadoTitular
  observaciones?: string | null
  created_at?: string
}

export interface Sector {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
}

export interface Parcela {
  id: string
  nomenclatura: string // ej: 'A-25-96'
  sector_id?: string | null
  manzana_fila?: string | null
  numero_parcela?: string | null
  capacidad_total: number
  espacios_ocupados: number
  titular_id?: string | null
  estado: EstadoParcela
  saldo_mantenimiento: number
  fecha_adquisicion?: string | null
  notas?: string | null
  titular?: Titular | null
  sector?: Sector | null
  inhumaciones?: Inhumacion[]
}

export interface Inhumacion {
  id: string
  parcela_id: string
  nombre_difunto: string
  dni_difunto?: string | null
  fecha_fallecimiento?: string | null
  fecha_inhumacion: string
  nivel_posicion: number
  es_covid: boolean
  causa_defuncion?: string | null
  empresa_funebrera?: string | null
  responsable_contacto?: string | null
  telefono_responsable?: string | null
  observaciones?: string | null
  parcela?: Parcela | null
}

export interface AfiliadoSeguro {
  id: string
  numero_afiliado: number
  titular_id?: string | null
  nombre_completo: string
  dni?: string | null
  direccion_cobro?: string | null
  zona_cobro?: string | null
  cobrador_asignado?: string | null
  monto_cuota_mensual: number
  estado: EstadoAfiliado
  fecha_alta: string
  notas?: string | null
  cuotas?: CuotaSeguro[]
}

export interface CuotaSeguro {
  id: string
  afiliado_id: string
  anio: number
  nro_cuota: number
  monto: number
  estado: EstadoCuota
  fecha_vencimiento?: string | null
  fecha_pago?: string | null
  metodo_pago?: MetodoPago | null
  nro_recibo?: string | null
}

export interface PagoMantenimiento {
  id: string
  nro_recibo: string
  parcela_id: string
  titular_id: string
  monto_pagado: number
  periodo_cubierto?: string | null
  metodo_pago: MetodoPago
  comprobante_transferencia?: string | null
  operador_nombre: string
  observaciones?: string | null
  fecha_pago: string
}

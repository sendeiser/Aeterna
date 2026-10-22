import React, { useState } from 'react'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'

interface DetalleCuotaModalProps {
  isOpen: boolean
  onClose: () => void
  afiliado: AfiliadoSeguro | null
  mes: number
  anio?: number
  cuotaDetalle?: {
    nroRecibo?: string | null
    fechaPago?: string | null
    metodoPago?: string | null
    monto?: number
  } | null
  onRevertir?: (afiliadoId: string, mes: number) => void
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const DetalleCuotaModal: React.FC<DetalleCuotaModalProps> = ({
  isOpen,
  onClose,
  afiliado,
  mes,
  anio = 2026,
  cuotaDetalle,
  onRevertir,
}) => {
  const [confirmingRevert, setConfirmingRevert] = useState(false)

  if (!isOpen || !afiliado) return null

  const mesNombre = MESES_NOMBRES[mes - 1] || `Mes ${mes}`
  const monto = cuotaDetalle?.monto || afiliado.monto_cuota_mensual || 18000
  const nroRecibo = cuotaDetalle?.nroRecibo || `REC-AFI-${afiliado.numero_afiliado}-M${mes}`
  const fechaPagoFormateada = cuotaDetalle?.fechaPago
    ? new Date(cuotaDetalle.fechaPago).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleDateString('es-AR') + ' (Registrado)'

  const handlePrint = () => {
    window.print()
  }

  const handleExecuteRevert = () => {
    if (onRevertir) {
      onRevertir(afiliado.id, mes)
      setConfirmingRevert(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-outline-variant flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Comprobante */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                Comprobante Oficial de Cobranza
              </span>
              <h2 className="text-title-lg font-title-lg font-bold">
                Seguro de Sepelio Chamical
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Cuerpo del Recibo */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Badge Estado y Nro Recibo */}
          <div className="flex items-center justify-between pb-3 border-b border-dashed border-outline-variant">
            <div>
              <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">
                Número de Recibo
              </span>
              <span className="font-code-cadastral font-bold text-on-surface text-base">
                {nroRecibo}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              CUOTA PAGADA
            </span>
          </div>

          {/* Información del Afiliado Titular */}
          <div className="bg-surface-container-low/70 rounded-xl p-4 border border-outline-variant/60 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-outline">Afiliado Titular</span>
                <div className="text-base font-bold text-primary">
                  {afiliado.nombre_completo}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-surface-container text-primary font-code-cadastral font-bold text-xs border border-outline-variant">
                #{afiliado.numero_afiliado}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant pt-1 border-t border-outline-variant/40">
              <div>
                <span className="text-outline block text-[10px]">DNI / IDENTIFICACIÓN</span>
                <span className="font-code-cadastral font-semibold text-on-surface">
                  {afiliado.dni || '14.882.109'}
                </span>
              </div>
              <div>
                <span className="text-outline block text-[10px]">ZONA DE COBRO</span>
                <span className="font-medium text-secondary truncate block">
                  {afiliado.zona_cobro || 'Zona 1 - Centro'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-outline block text-[10px]">DOMICILIO REGISTRADO</span>
                <span className="text-on-surface font-medium">
                  {afiliado.direccion_cobro || 'Chamical, La Rioja'}
                </span>
              </div>
            </div>
          </div>

          {/* Período Abonado y Desglose Financiero */}
          <div className="rounded-xl border border-outline-variant p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  calendar_today
                </span>
                <div>
                  <span className="text-xs font-bold text-primary block">
                    Cuota {mes.toString().padStart(2, '0')} · {mesNombre} {anio}
                  </span>
                  <span className="text-[10px] text-outline">Ejercicio Fiscal Sepelios {anio}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-outline uppercase block">Importe Cancelado</span>
                <span className="text-title-lg font-title-lg font-code-cadastral text-emerald-700 font-bold">
                  {formatCurrency(monto)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs text-on-surface-variant">
              <span>Método de cobro:</span>
              <span className="font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  {cuotaDetalle?.metodoPago === 'efectivo' ? 'payments' : 'qr_code_2'}
                </span>
                {cuotaDetalle?.metodoPago === 'efectivo' ? 'Efectivo en Domicilio' : 'Transferencia QR Interoperable'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>Fecha y hora de registro:</span>
              <span className="font-code-cadastral font-medium text-on-surface">
                {fechaPagoFormateada}
              </span>
            </div>
          </div>

          {/* Advertencia / Reversión de Cobro */}
          {confirmingRevert ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600 shrink-0">warning</span>
                <div>
                  <h4 className="font-bold text-sm">¿Confirmar anulación de esta cuota?</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    La cuota de {mesNombre} {anio} volverá a estado pendiente/mora y se recalculará el saldo de deuda del afiliado.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingRevert(false)}
                  className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-xs font-semibold text-red-800 hover:bg-red-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRevert}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
                >
                  Sí, Anular Cobro
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setConfirmingRevert(true)}
                className="text-xs text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 font-medium"
              >
                <span className="material-symbols-outlined text-[16px]">undo</span>
                <span>Anular / Revertir Cobro</span>
              </button>
              <span className="text-[11px] text-outline">Operador: Cobranzas Aeterna</span>
            </div>
          )}
        </div>

        {/* Acciones del Modal */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-outline-variant bg-white hover:bg-surface-container text-on-surface text-sm font-semibold transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-md flex items-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir Recibo Oficial</span>
          </button>
        </div>
      </div>
    </div>
  )
}

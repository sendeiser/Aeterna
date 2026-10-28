import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency, montoEnLetras } from '../../lib/formatters'
import { ReciboSeguroFisico } from '../recibos/ReciboSeguroFisico'
import { ReportModeToggle } from '../../lib/reportPrintHelper'

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
  const [tabVista, setTabVista] = useState<'recibo' | 'auditoria'>('recibo')
  const [confirmingRevert, setConfirmingRevert] = useState(false)
  const [isBW, setIsBW] = useState(true)

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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-printable-modal="true"
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-outline-variant flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Comprobante */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-4 sm:p-5 text-white flex items-start justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                Comprobante Oficial de Cobranza
              </span>
              <h2 className="text-title-lg font-title-lg font-bold">
                Seguro Plan Integral Familiar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors print:hidden"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Selector de Pestaña: Recibo Físico vs Auditoría */}
        <div className="px-5 pt-3 pb-2 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 bg-surface-container p-1 rounded-lg border border-outline-variant text-xs">
            <button
              type="button"
              onClick={() => setTabVista('recibo')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                tabVista === 'recibo'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Recibo Físico Tradicional
            </button>
            <button
              type="button"
              onClick={() => setTabVista('auditoria')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                tabVista === 'auditoria'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Auditoría y Desglose
            </button>
          </div>
          <span className="font-mono text-xs font-bold text-primary">
            {nroRecibo}
          </span>
        </div>

        {/* Cuerpo del Recibo */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[75vh] print:max-h-none print:overflow-visible print:p-2">
          {/* VISTA 1: Recibo Físico Tradicional (AETERNA PARQUE SAN NICOLÁS) */}
          <div className={tabVista === 'recibo' ? 'block' : 'hidden print:block'}>
            <ReciboSeguroFisico
              isBW={isBW}
              recibiDe={afiliado.nombre_completo}
              certificado={afiliado.numero_afiliado}
              laSumaDePesos={`${montoEnLetras(monto)} (${formatCurrency(monto)})`}
              concepto={`Cuota ${mes.toString().padStart(2, '0')} · ${mesNombre} ${anio} - Seguro Plan Integral`}
              reciboNro={nroRecibo}
              fecha={fechaPagoFormateada}
            />
          </div>

          {/* VISTA 2: Detalle Administrativo y Auditoría */}
          {tabVista === 'auditoria' && (
            <div className="space-y-4 print:hidden">
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
            <div className="flex items-center justify-between pt-2 print:hidden">
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
        )}

        {/* Línea de corte punteada y Duplicado para Administración en Impresión */}
        <div className="hidden print:block pt-4">
          <div className="flex items-center justify-center my-3 py-1 border-t-2 border-dashed border-black text-[10px] text-black font-mono font-bold">
            ✂️ ------------------ CORTE PARA ARCHIVO Y TESORERÍA (TALÓN DUPLICADO) ------------------ ✂️
          </div>
          <ReciboSeguroFisico
            isBW={isBW}
            recibiDe={afiliado.nombre_completo}
            certificado={afiliado.numero_afiliado}
            laSumaDePesos={`${montoEnLetras(monto)} (${formatCurrency(monto)})`}
            concepto={`Cuota ${mes.toString().padStart(2, '0')} · ${mesNombre} ${anio} - Seguro Plan Integral [DUPLICADO]`}
            reciboNro={nroRecibo}
            fecha={fechaPagoFormateada}
          />
        </div>
        </div>

        {/* Acciones del Modal */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-outline-variant bg-white hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={false} />
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Imprimir Recibo (Doble Talón)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

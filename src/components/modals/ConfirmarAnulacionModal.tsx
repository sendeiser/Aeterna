import React from 'react'
import { createPortal } from 'react-dom'
import { PagoRecibo } from '../../services/dataService'
import { formatCurrency } from '../../lib/formatters'

interface ConfirmarAnulacionModalProps {
  isOpen: boolean
  onClose: () => void
  pago: PagoRecibo | null
  onConfirmar: () => void
  isDeleting?: boolean
}

export const ConfirmarAnulacionModal: React.FC<ConfirmarAnulacionModalProps> = ({
  isOpen,
  onClose,
  pago,
  onConfirmar,
  isDeleting = false,
}) => {
  if (!isOpen || !pago) return null

  const isEgreso = pago.tipo === 'egreso'

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-on-surface flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de Peligro */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-rose-700 text-white">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl">warning</span>
            <div>
              <h3 className="font-bold text-base">Confirmar Anulación</h3>
              <p className="text-xs text-rose-100">Caja Diaria & Supabase Cloud</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            ¿Está seguro de anular el siguiente movimiento asentado en el libro de caja?
          </p>

          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs text-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">N° Comprobante:</span>
              <span className="font-mono font-bold text-slate-900">{pago.nroRecibo || 'S/N'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Tipo de Movimiento:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  isEgreso ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isEgreso ? 'Egreso Operativo' : 'Cobro / Ingreso'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Titular / Pagador:</span>
              <span className="font-semibold text-slate-900">{pago.titularNombre || 'General'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 font-medium">Concepto:</span>
              <span className="font-medium text-slate-900 text-right max-w-[200px] truncate">
                {pago.concepto}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-rose-200 pt-2 font-bold">
              <span className="text-slate-700">Importe a revertir:</span>
              <span className={`text-sm ${isEgreso ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isEgreso ? '-' : '+'}
                {formatCurrency(pago.monto)} ARS
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
              info
            </span>
            <span>
              Esta operación eliminará el registro de la tabla <strong>pagos_recibos</strong> en Supabase
              y actualizará el arqueo y balance neto de caja en tiempo real.
            </span>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Anulando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Sí, Anular Movimiento</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

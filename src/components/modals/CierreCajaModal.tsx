import React from 'react'
import { formatCurrency } from '../../lib/formatters'
import { PagoRecibo } from '../../services/dataService'

interface CierreCajaModalProps {
  isOpen: boolean
  onClose: () => void
  totalRecaudado: number
  pagos: PagoRecibo[]
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  totalRecaudado,
  pagos,
}) => {
  if (!isOpen) return null

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant w-full max-w-xl rounded-xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">point_of_sale</span>
            <span className="font-bold text-sm text-primary uppercase tracking-wide">
              Balance y Cierre de Caja Diario
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scroll">
          <div className="text-center pb-3 border-b border-outline-variant space-y-1">
            <span className="text-[11px] font-bold uppercase text-outline">
              Oficina de Recaudación y Catastro · Chamical
            </span>
            <h3 className="text-xl font-bold text-primary capitalize">{fechaHoy}</h3>
          </div>

          {/* Metric Hero */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-on-surface-variant font-medium block">
                Total Recaudado en el Ejercicio
              </span>
              <span className="text-2xl font-mono font-bold text-primary">
                {formatCurrency(totalRecaudado)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Caja Cuadrada
              </span>
              <span className="block text-[11px] text-outline mt-1 font-mono">
                {pagos.length} operaciones registradas
              </span>
            </div>
          </div>

          {/* Listado de Operaciones Recientes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
              Detalle de Cobros Registrados
            </span>
            <div className="border border-outline-variant rounded-lg divide-y divide-outline-variant/50 max-h-56 overflow-y-auto custom-scroll">
              {pagos.length === 0 ? (
                <div className="p-4 text-center text-xs text-outline">
                  No se han registrado pagos en esta sesión todavía.
                </div>
              ) : (
                pagos.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-surface-container-low">
                    <div>
                      <span className="font-semibold text-on-surface block">{p.concepto}</span>
                      <span className="text-[10px] text-outline">
                        {p.titularNombre} · {p.nroRecibo}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-primary block">
                        {formatCurrency(p.monto)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">QR Transferencia</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant bg-surface-container-low">
          <button
            onClick={() => window.print()}
            className="px-3.5 h-8 rounded-lg border border-outline-variant bg-white text-on-surface text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimir Cierre</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

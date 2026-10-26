import React, { useState } from 'react'
import { formatCurrency } from '../../lib/formatters'
import { PagoRecibo } from '../../services/dataService'
import { EgresoCajaModal } from './EgresoCajaModal'

interface CierreCajaModalProps {
  isOpen: boolean
  onClose: () => void
  totalRecaudado: number
  pagos: PagoRecibo[]
  onRegistrarEgreso?: (egreso: {
    concepto: string
    categoria: string
    monto: number
    comprobante: string
    metodo: 'efectivo' | 'transferencia'
  }) => void
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  totalRecaudado,
  pagos,
  onRegistrarEgreso,
}) => {
  const [cajaCerrada, setCajaCerrada] = useState(false)
  const [egresoModalOpen, setEgresoModalOpen] = useState(false)

  if (!isOpen) return null

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Separación de Ingresos y Egresos
  const ingresos = pagos.filter((p) => p.tipo !== 'egreso')
  const egresos = pagos.filter((p) => p.tipo === 'egreso')

  const totalIngresos = ingresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEgresos = egresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const balanceNeto = totalIngresos - totalEgresos

  // Desglose de ingresos
  const ingresosQR = ingresos.filter((p) => p.metodo !== 'efectivo')
  const totalIngresosQR = ingresosQR.reduce((sum, p) => sum + (p.monto || 0), 0)

  const ingresosEfectivo = ingresos.filter((p) => p.metodo === 'efectivo')
  const totalIngresosEfectivo = ingresosEfectivo.reduce((sum, p) => sum + (p.monto || 0), 0)

  // Desglose de egresos
  const egresosEfectivo = egresos.filter((p) => p.metodo === 'efectivo')
  const totalEgresosEfectivo = egresosEfectivo.reduce((sum, p) => sum + (p.monto || 0), 0)

  const egresosQR = egresos.filter((p) => p.metodo !== 'efectivo')
  const totalEgresosQR = egresosQR.reduce((sum, p) => sum + (p.monto || 0), 0)

  const efectivoEnCaja = totalIngresosEfectivo - totalEgresosEfectivo
  const digitalEnBanco = totalIngresosQR - totalEgresosQR

  const nroCierre = `CIE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`

  const handleConfirmarCierre = () => {
    setCajaCerrada(true)
    const cierreLog = {
      nroCierre,
      fecha: new Date().toISOString(),
      totalIngresos,
      totalEgresos,
      balanceNeto,
      totalQR: totalIngresosQR,
      totalEfectivo: totalIngresosEfectivo,
      cantOperaciones: pagos.length,
      operador: 'Of. Registro Civil - Chamical',
    }
    const cierresPrevios = JSON.parse(localStorage.getItem('aeterna_cierres_caja') || '[]')
    cierresPrevios.unshift(cierreLog)
    localStorage.setItem('aeterna_cierres_caja', JSON.stringify(cierresPrevios))
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          data-printable-modal="true"
          className="bg-surface-container-lowest border border-outline-variant w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Oficial Imprimible */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-gradient-to-r from-primary to-primary-container text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                  Municipalidad de Chamical · Tesorería
                </span>
                <h2 className="text-title-lg font-title-lg font-bold">
                  Acta de Balance & Cierre Diario de Caja
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {onRegistrarEgreso && (
                <button
                  type="button"
                  onClick={() => setEgresoModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Registrar nuevo gasto u operativo"
                >
                  <span className="material-symbols-outlined text-[15px]">outbox</span>
                  <span>- Registrar Egreso</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 overflow-y-auto custom-scroll flex-1 print:max-h-none print:overflow-visible print:p-4">
            {/* Membrete y Fecha */}
            <div className="text-center pb-3 border-b border-dashed border-outline-variant space-y-1">
              <div className="flex items-center justify-between text-xs text-outline font-code-cadastral">
                <span>N° ACTA: <strong>{nroCierre}</strong></span>
                <span>TERMINAL: 01 (REGISTRO CIVIL)</span>
              </div>
              <h3 className="text-lg font-bold text-primary capitalize pt-1">{fechaHoy}</h3>
              <span className="text-xs text-on-surface-variant block">
                Parque & Sepelios Aeterna Chamical · Ejercicio Fiscal 2026
              </span>
            </div>

            {/* Metric Hero Cards: Ingresos, Egresos, Balance Neto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Total Ingresos */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Total Ingresos (Cobros)
                </span>
                <span className="text-xl font-code-cadastral font-bold text-emerald-700 block">
                  +{formatCurrency(totalIngresos)}
                </span>
                <span className="text-[11px] text-emerald-600 block">
                  {ingresos.length} cobranza{ingresos.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Card 2: Total Egresos */}
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">
                  Total Egresos (Gastos)
                </span>
                <span className="text-xl font-code-cadastral font-bold text-rose-700 block">
                  -{formatCurrency(totalEgresos)}
                </span>
                <span className="text-[11px] text-rose-600 block">
                  {egresos.length} egreso{egresos.length === 1 ? '' : 's'} operativo{egresos.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Card 3: Balance Neto */}
              <div className={`p-3.5 rounded-xl border space-y-0.5 ${
                balanceNeto >= 0
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                <span className="text-[10px] uppercase font-bold opacity-80 block">
                  Balance Neto de Caja
                </span>
                <span className="text-xl font-code-cadastral font-bold block">
                  {formatCurrency(balanceNeto)}
                </span>
                <span className="text-[11px] font-semibold block opacity-90">
                  {balanceNeto >= 0 ? 'Superávit / Disponible' : 'Déficit operativo'}
                </span>
              </div>
            </div>

            {/* Sub-totales por Vía de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Efectivo en Mostrador:</span>
                  <span className="text-[10px] text-on-surface-variant">
                    Ingresos: {formatCurrency(totalIngresosEfectivo)} | Egresos: {formatCurrency(totalEgresosEfectivo)}
                  </span>
                </div>
                <span className="font-bold font-code-cadastral text-sm text-slate-800">
                  {formatCurrency(efectivoEnCaja)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Bancos & QR BCRA:</span>
                  <span className="text-[10px] text-on-surface-variant">
                    Ingresos: {formatCurrency(totalIngresosQR)} | Egresos: {formatCurrency(totalEgresosQR)}
                  </span>
                </div>
                <span className="font-bold font-code-cadastral text-sm text-emerald-700">
                  {formatCurrency(digitalEnBanco)}
                </span>
              </div>
            </div>

            {/* Estado de Caja */}
            {cajaCerrada ? (
              <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-700 text-2xl">verified</span>
                <div>
                  <h4 className="font-bold text-sm">Caja Cerrada y Auditada con Éxito</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    El balance de la jornada ha sido archivado y enviado a la Dirección de Rentas y Tesorería.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-on-surface">Estado: Jornada en Curso</span>
                </div>
                <span className="font-code-cadastral text-outline">
                  Sincronización Supabase: Activa
                </span>
              </div>
            )}

            {/* Listado de Operaciones Recientes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
                  Detalle de Comprobantes Registrados ({pagos.length})
                </span>
                <span className="text-[10px] text-outline">Orden cronológico</span>
              </div>
              <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant/50 max-h-56 overflow-y-auto custom-scroll shadow-xs">
                {pagos.length === 0 ? (
                  <div className="p-6 text-center text-xs text-outline">
                    No se han registrado cobros ni egresos en la jornada actual.
                  </div>
                ) : (
                  pagos.map((p) => {
                    const isEgreso = p.tipo === 'egreso'
                    return (
                      <div
                        key={p.id}
                        className={`p-3 flex items-center justify-between text-xs transition-colors ${
                          isEgreso ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-surface-container-low/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {isEgreso ? (
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                EGRESO
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                INGRESO
                              </span>
                            )}
                            <span className="font-semibold text-on-surface block text-sm">
                              {p.concepto}
                            </span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium">{p.titularNombre}</span>
                            <span>•</span>
                            <span className="font-code-cadastral text-outline">{p.nroRecibo}</span>
                            {p.categoria && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] italic text-outline">{p.categoria}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-code-cadastral font-bold text-sm block ${
                            isEgreso ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {isEgreso ? '-' : '+'}{formatCurrency(p.monto)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                            {p.metodo === 'efectivo' ? 'Efectivo' : 'QR / Transf.'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Firmas de Autoridad para Impresión */}
            <div className="pt-8 border-t border-dashed border-outline-variant grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-t border-outline-variant/80 mx-6 pt-1">
                  <span className="font-bold text-primary block">Operador de Turno</span>
                  <span className="text-[10px] text-outline">Oficina Registro Civil & Sepelios</span>
                </div>
              </div>
              <div>
                <div className="border-t border-outline-variant/80 mx-6 pt-1">
                  <span className="font-bold text-primary block">Tesorería Municipal</span>
                  <span className="text-[10px] text-outline">Municipalidad de Chamical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant bg-surface-container-low print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 h-9 rounded-xl border border-outline-variant bg-white text-on-surface text-xs font-semibold flex items-center gap-2 hover:bg-surface-container transition-colors shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Imprimir Acta de Cierre</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-9 rounded-xl border border-outline-variant bg-white text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              {!cajaCerrada && (
                <button
                  type="button"
                  onClick={handleConfirmarCierre}
                  className="px-4 h-9 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold shadow-md transition-transform active:scale-[0.98] cursor-pointer"
                >
                  Confirmar y Cerrar Caja
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Egreso */}
      {onRegistrarEgreso && (
        <EgresoCajaModal
          isOpen={egresoModalOpen}
          onClose={() => setEgresoModalOpen(false)}
          onGuardarEgreso={(datos) => {
            onRegistrarEgreso(datos)
          }}
        />
      )}
    </>
  )
}

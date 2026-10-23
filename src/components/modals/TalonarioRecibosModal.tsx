import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AfiliadoSeguro } from '../../types/database'
import { ReciboSeguroFisico } from '../recibos/ReciboSeguroFisico'
import { montoEnLetras, formatCurrency } from '../../lib/formatters'

interface TalonarioRecibosModalProps {
  isOpen: boolean
  onClose: () => void
  afiliados: (AfiliadoSeguro & { cuotasPagadas?: number[] })[]
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const TalonarioRecibosModal: React.FC<TalonarioRecibosModalProps> = ({
  isOpen,
  onClose,
  afiliados,
}) => {
  const [modo, setModo] = useState<'blanco' | 'preimpreso'>('preimpreso')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedMes, setSelectedMes] = useState<number>(3) // Marzo por defecto
  const [cantidadHojas, setCantidadHojas] = useState<number>(1) // 1 hoja = 8 recibos

  // Obtener zonas únicas
  const zonas = useMemo(() => {
    const setZ = new Set<string>()
    afiliados.forEach((a) => {
      if (a.zona_cobro) setZ.add(a.zona_cobro)
    })
    return Array.from(setZ)
  }, [afiliados])

  // Filtrar afiliados si es preimpreso
  const afiliadosParaRecibos = useMemo(() => {
    let list = afiliados
    if (selectedZone !== 'all') {
      list = list.filter((a) => a.zona_cobro === selectedZone)
    }
    // Priorizar afiliados que deben la cuota del mes seleccionado
    return list.filter((a) => !(a.cuotasPagadas || []).includes(selectedMes))
  }, [afiliados, selectedZone, selectedMes])

  if (!isOpen) return null

  const totalRecibosRequeridos = cantidadHojas * 8
  const mesNombre = MESES_NOMBRES[selectedMes - 1] || `Mes ${selectedMes}`

  // Generar lista de recibos a mostrar
  const itemsRecibos = Array.from({ length: totalRecibosRequeridos }).map((_, idx) => {
    if (modo === 'blanco') {
      return {
        id: `blank-${idx}`,
        esBlanco: true,
      }
    }

    const af = afiliadosParaRecibos[idx % (afiliadosParaRecibos.length || 1)]
    if (!af) {
      return {
        id: `blank-${idx}`,
        esBlanco: true,
      }
    }

    const monto = af.monto_cuota_mensual || 18000
    return {
      id: `pre-${af.id}-${idx}`,
      esBlanco: false,
      recibiDe: af.nombre_completo,
      certificado: af.numero_afiliado,
      laSumaDePesos: `${montoEnLetras(monto)} (${formatCurrency(monto)})`,
      concepto: `Cuota ${selectedMes.toString().padStart(2, '0')} · ${mesNombre} 2026 - Seguro Plan Integral`,
      reciboNro: `TAL-${af.numero_afiliado}-${selectedMes.toString().padStart(2, '0')}`,
      fecha: new Date().toLocaleDateString('es-AR'),
    }
  })

  const handlePrint = () => {
    window.print()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent"
      data-printable-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden border border-outline-variant flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0 print:overflow-visible print:static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Oculto en Impresión) */}
        <div className="bg-surface-container-lowest p-4 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
            <div>
              <h2 className="text-title-md font-semibold text-primary">
                Talonario Físico de Recibos (8 por Hoja A4)
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Cementerio Parque San Nicolás · Seguro Plan Integral Familiar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Toolbar de Configuración (Oculto en Impresión) */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Modo */}
            <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant">
              <button
                type="button"
                onClick={() => setModo('preimpreso')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  modo === 'preimpreso'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pre-impreso con Deudores
              </button>
              <button
                type="button"
                onClick={() => setModo('blanco')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  modo === 'blanco'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                En Blanco (Talonario Tradicional)
              </button>
            </div>

            {/* Selector de Mes */}
            {modo === 'preimpreso' && (
              <div className="flex items-center gap-1.5">
                <span className="text-outline font-medium">Cuota Mes:</span>
                <select
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-outline-variant rounded font-semibold text-primary"
                >
                  {MESES_NOMBRES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Zona */}
            {modo === 'preimpreso' && zonas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-outline font-medium">Zona:</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="px-2 py-1 bg-white border border-outline-variant rounded font-semibold text-primary"
                >
                  <option value="all">Todas las Zonas</option>
                  {zonas.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cantidad de Hojas A4 */}
            <div className="flex items-center gap-1.5">
              <span className="text-outline font-medium">Hojas A4:</span>
              <select
                value={cantidadHojas}
                onChange={(e) => setCantidadHojas(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-outline-variant rounded font-semibold text-primary"
              >
                <option value={1}>1 Hoja (8 recibos)</option>
                <option value={2}>2 Hojas (16 recibos)</option>
                <option value={3}>3 Hojas (24 recibos)</option>
                <option value={4}>4 Hojas (32 recibos)</option>
              </select>
            </div>
          </div>

          {/* Botón Imprimir */}
          <button
            id="btn-confirmar-imprimir-talonario"
            type="button"
            onClick={handlePrint}
            className="h-9 px-4 bg-primary hover:bg-secondary text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Imprimir Hoja A4 ({totalRecibosRequeridos} Recibos)</span>
          </button>
        </div>

        {/* Contenedor Imprimible: Hoja A4 en Grilla 2 Columnas x 4 Filas */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll bg-slate-100 flex-1 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          {Array.from({ length: cantidadHojas }).map((_, hojaIdx) => {
            const hojaRecibos = itemsRecibos.slice(hojaIdx * 8, (hojaIdx + 1) * 8)

            return (
              <div
                key={hojaIdx}
                className="talonario-a4-page bg-white shadow-md mx-auto mb-6 print:mb-0 print:shadow-none p-4 print:p-0 border border-slate-300 print:border-none"
                style={{
                  width: '100%',
                  maxWidth: '196mm',
                  maxHeight: '276mm',
                  boxSizing: 'border-box',
                }}
              >
                {/* Cuadrícula de 2 columnas x 4 filas = 8 recibos exactos */}
                <div className="grid grid-cols-2 gap-2 h-full content-between">
                  {hojaRecibos.map((rec, rIdx) => (
                    <div
                      key={rec.id || rIdx}
                      className="border border-dashed border-slate-400 p-0 rounded-none flex flex-col justify-between overflow-hidden"
                      style={{ height: '66mm', boxSizing: 'border-box' }}
                    >
                      <ReciboSeguroFisico
                        variante="a4-grid"
                        esBlanco={rec.esBlanco}
                        recibiDe={rec.recibiDe}
                        certificado={rec.certificado}
                        laSumaDePesos={rec.laSumaDePesos}
                        concepto={rec.concepto}
                        reciboNro={rec.reciboNro}
                        fecha={rec.fecha}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer (Oculto en Impresión) */}
        <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant print:hidden">
          <span>
            💡 Formato estandarizado para hoja A4 vertical (troquelado o cortado en 8 unidades).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-outline-variant rounded font-medium hover:bg-surface-container"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

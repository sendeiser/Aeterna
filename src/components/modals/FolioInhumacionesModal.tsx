import React, { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Inhumacion } from '../../types/database'
import { getA4ReportStyles, openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

interface FolioInhumacionesModalProps {
  isOpen: boolean
  onClose: () => void
  inhumaciones: Inhumacion[]
  currentFilterProtocol?: string
  currentSearchTerm?: string
}

export const FolioInhumacionesModal: React.FC<FolioInhumacionesModalProps> = ({
  isOpen,
  onClose,
  inhumaciones,
  currentFilterProtocol = 'all',
  currentSearchTerm = '',
}) => {
  const [filterScope, setFilterScope] = useState<'actual' | 'all' | 'covid' | 'standard'>('actual')
  const [ordenarPor, setOrdenarPor] = useState<'fecha-desc' | 'fecha-asc' | 'alfa-asc' | 'parcela-asc'>('fecha-desc')
  const [tomoFolio, setTomoFolio] = useState<string>('TOMO XXXII · FOLIO 2026')
  const [responsableRegistro, setResponsableRegistro] = useState<string>('Dirección y Archivo Parroquial')
  const [fechaEmision, setFechaEmision] = useState<string>(
    new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  )
  const [isBW, setIsBW] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  // Filtrado de actas para el folio
  const actasFolio = useMemo(() => {
    let list = [...inhumaciones]

    // Si elige solo protocolo
    if (filterScope === 'covid') {
      list = list.filter((i) => i.es_covid)
    } else if (filterScope === 'standard') {
      list = list.filter((i) => !i.es_covid)
    } else if (filterScope === 'actual') {
      // Aplica el filtro que el usuario tenía en la vista principal
      if (currentFilterProtocol === 'covid') {
        list = list.filter((i) => i.es_covid)
      } else if (currentFilterProtocol === 'standard') {
        list = list.filter((i) => !i.es_covid)
      }
      if (currentSearchTerm.trim()) {
        const q = currentSearchTerm.toLowerCase()
        list = list.filter((i) => {
          const nom = (i.nombre_difunto || '').toLowerCase()
          const parc = (typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || ''
          const causa = (i.causa_defuncion || '').toLowerCase()
          const dni = (i.dni_difunto || '').toLowerCase()
          return nom.includes(q) || parc.toLowerCase().includes(q) || causa.includes(q) || dni.includes(q)
        })
      }
    }

    // Ordenamiento
    return list.sort((a, b) => {
      if (ordenarPor === 'alfa-asc') {
        return (a.nombre_difunto || '').localeCompare(b.nombre_difunto || '')
      }
      if (ordenarPor === 'fecha-desc') {
        const dateA = a.fecha_inhumacion ? new Date(a.fecha_inhumacion).getTime() : 0
        const dateB = b.fecha_inhumacion ? new Date(b.fecha_inhumacion).getTime() : 0
        return dateB - dateA
      }
      if (ordenarPor === 'fecha-asc') {
        const dateA = a.fecha_inhumacion ? new Date(a.fecha_inhumacion).getTime() : 0
        const dateB = b.fecha_inhumacion ? new Date(b.fecha_inhumacion).getTime() : 0
        return dateA - dateB
      }
      const parcA = typeof a.parcela === 'object' ? a.parcela?.nomenclatura : a.parcela
      const parcB = typeof b.parcela === 'object' ? b.parcela?.nomenclatura : b.parcela
      return (parcA || '').localeCompare(parcB || '')
    })
  }, [inhumaciones, filterScope, currentFilterProtocol, currentSearchTerm, ordenarPor])

  if (!isOpen) return null

  const totalCovidEnFolio = actasFolio.filter((i) => i.es_covid).length
  const totalEstandarEnFolio = actasFolio.length - totalCovidEnFolio

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const opened = openA4PrintWindow(
      `Folio Oficial de Inhumaciones (${tomoFolio}) — Aeterna`,
      printContent,
      isBW
    )
    if (!opened) {
      window.print()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent"
      data-printable-modal="true"
      onClick={onClose}
    >
      <style>{getA4ReportStyles(isBW)}</style>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[96vh] overflow-hidden border border-outline-variant flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0 print:overflow-visible print:static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* HEADER MODAL (OCULTO EN IMPRESIÓN)                                   */}
        {/* ===================================================================== */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">history_edu</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Folio Oficial del Libro de Inhumaciones</span>
                <span className="text-[11px] font-semibold bg-primary/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/40">
                  Formato A4 PDF
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Aeterna Parque San Nicolás · Documento Oficial Estructurado para Impresión y Legajo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={true} />
            <button
              type="button"
              id="btn-imprimir-folio-pdf"
              onClick={handlePrint}
              className="h-8 px-3.5 bg-primary hover:bg-secondary text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              title="Abrir diálogo de impresión para guardar en PDF o imprimir en hoja A4"
            >
              <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TOOLBAR DE PARÁMETROS DEL FOLIO (OCULTO EN IMPRESIÓN)                 */}
        {/* ===================================================================== */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Alcance de registros */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Registros:</span>
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="actual">Filtro actual de la vista ({actasFolio.length} actas)</option>
                <option value="all">Todas las Inhumaciones Registradas ({inhumaciones.length} actas)</option>
                <option value="covid">Solo Protocolo COVID-19 ({inhumaciones.filter(i => i.es_covid).length} actas)</option>
                <option value="standard">Solo Inhumaciones Estándar ({inhumaciones.filter(i => !i.es_covid).length} actas)</option>
              </select>
            </div>

            {/* Orden */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Orden:</span>
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="fecha-desc">Cronológico (Más reciente primero)</option>
                <option value="fecha-asc">Cronológico (Más antiguo primero)</option>
                <option value="alfa-asc">Alfabético por Difunto (A → Z)</option>
                <option value="parcela-asc">Por Parcela (Nomenclatura)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tomo / Folio */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Tomo/Folio:</span>
              <input
                type="text"
                value={tomoFolio}
                onChange={(e) => setTomoFolio(e.target.value)}
                placeholder="TOMO XXXII · FOLIO 2026"
                className="h-7 px-2 w-44 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono"
              />
            </div>

            {/* Fecha Emisión */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Fecha:</span>
              <input
                type="text"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="h-7 px-2 w-24 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono text-center"
              />
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* DOCUMENTO IMPRIMIBLE A4 (PREVIEW EN PANTALLA & MOTOR DE IMPRESIÓN)    */}
        {/* ===================================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll bg-slate-200/80 flex-1 print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <div
            ref={printRef}
            className="a4-sheet bg-white shadow-lg mx-auto p-6 sm:p-8 max-w-[210mm] border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
          >
            {/* Encabezado Institucional del Folio */}
            <div className="doc-header">
              <div className="brand-box">
                <img
                  src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logo_aeterna.png`}
                  alt="Aeterna Parque San Nicolás"
                  className="brand-logo"
                />
                <div>
                  <h1 className="brand-title">AETERNA PARQUE SAN NICOLÁS</h1>
                  <h2 className="brand-subtitle">
                    LIBRO GENERAL DE INHUMACIONES Y SEPULTURAS · FOLIO OFICIAL
                  </h2>
                  <p className="brand-caption">
                    Registro Catastral y Archivo de Sepulturas · Ley Sanitaria N° 4.120
                  </p>
                </div>
              </div>

              <div className="meta-box">
                <span className="meta-badge">FOLIO REGISTRAL</span>
                <div className="meta-line">{tomoFolio}</div>
                <div className="meta-sub">
                  EMISIÓN: <strong>{fechaEmision}</strong>
                </div>
              </div>
            </div>

            {/* Metadatos KPI del Folio */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Total Inhumaciones</span>
                <span className="kpi-val">{actasFolio.length} Actas Asentadas</span>
              </div>
              <div className="kpi-card-ingreso">
                <span className="kpi-label">Protocolo Estándar</span>
                <span className="kpi-val">{totalEstandarEnFolio} Registros</span>
              </div>
              <div className="kpi-card-egreso">
                <span className="kpi-label">Bioseguridad COVID-19</span>
                <span className="kpi-val">{totalCovidEnFolio} Registros</span>
              </div>
              <div className="kpi-card-neto">
                <span className="kpi-label">Responsable de Archivo</span>
                <span className="kpi-val" style={{ fontSize: '10.5px' }}>
                  {responsableRegistro}
                </span>
              </div>
            </div>

            {/* TABLA OFICIAL FOLIADA DE INHUMACIONES CON BORDES NÍTIDOS */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '68px' }}>Acta N°</th>
                  <th style={{ textAlign: 'center', width: '88px' }}>Fecha / Hora</th>
                  <th style={{ textAlign: 'left' }}>Fallecido / Difunto & DNI</th>
                  <th style={{ textAlign: 'center', width: '84px' }}>Parcela</th>
                  <th style={{ textAlign: 'center', width: '62px' }}>Nivel</th>
                  <th style={{ textAlign: 'center', width: '84px' }}>Protocolo</th>
                  <th style={{ textAlign: 'left', width: '140px' }}>Causa / Servicio</th>
                </tr>
              </thead>
              <tbody>
                {actasFolio.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                      No se encontraron registros de inhumación con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  actasFolio.map((inh, idx) => {
                    const parcNom =
                      typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela || 'S/D'
                    const fecha = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
                    const hora = inh.fecha_inhumacion?.includes('T')
                      ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                      : '10:30 hs'
                    const actaNum = `#84${String(90 + idx).padStart(2, '0')}-B`

                    return (
                      <tr key={inh.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                        <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 900, whiteSpace: 'nowrap' }}>
                          {actaNum}
                        </td>
                        <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700, whiteSpace: 'nowrap' }}>
                          <div>{fecha}</div>
                          <div style={{ fontSize: '8.5px' }}>{hora}</div>
                        </td>
                        <td className="col-titular">
                          <div className="titular-name">{inh.nombre_difunto}</div>
                          <div className="titular-dni">
                            {inh.dni_difunto ? `DNI: ${inh.dni_difunto}` : 'DNI: Constatado en acta'}
                          </div>
                        </td>
                        <td className="col-parcela">
                          <span className="parcela-pill">{parcNom}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          Nivel {inh.nivel_posicion || 1}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span className={inh.es_covid ? 'badge-egreso' : 'badge-ingreso'}>
                            {inh.es_covid ? 'COVID-19' : 'Estándar'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{inh.causa_defuncion || 'Causa Natural'}</div>
                          <div style={{ fontSize: '8.5px', fontWeight: 600 }}>
                            {inh.empresa_funebrera || 'Servicio Aeterna'}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* SECCIÓN DE CERTIFICACIÓN Y FIRMAS LEGALES */}
            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">Capataz / Campo</div>
                <div className="firma-sub">Verificación de Fosa y Nivel</div>
              </div>
              <div className="footer-note">
                Aeterna Parque San Nicolás · Folio Oficial del Libro Digital de Inhumaciones.
              </div>
              <div className="firma-block">
                <div className="firma-line">Dirección y Archivo</div>
                <div className="firma-sub">Firma y Sello Oficial</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

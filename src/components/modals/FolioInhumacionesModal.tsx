import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Inhumacion } from '../../types/database'

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
    window.print()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent"
      data-printable-modal="true"
      onClick={onClose}
    >
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
                Cementerio Parque San Nicolás · Documento Oficial Estructurado para Impresión y Legajo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="bg-white shadow-lg mx-auto p-6 sm:p-8 max-w-[210mm] border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-slate-900 font-sans">
            
            {/* Encabezado Institucional del Folio */}
            <div className="border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-[#00236f] text-white flex items-center justify-center font-serif font-black text-xl shrink-0 print:border print:border-black">
                    ✝
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-wide text-[#00236f] uppercase font-serif leading-tight">
                      CEMENTERIO PARQUE SAN NICOLÁS
                    </h1>
                    <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase mt-0.5">
                      LIBRO GENERAL DE INHUMACIONES Y SEPULTURAS · FOLIO OFICIAL
                    </h2>
                    <p className="text-[10px] text-slate-600 italic">
                      Parroquia El Salvador & Municipalidad de Chamical · Provincia de La Rioja · Ley Sanitaria N° 4.120
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded">
                    FOLIO REGISTRAL
                  </span>
                  <div className="text-[11px] font-mono text-slate-800 font-bold mt-1">
                    {tomoFolio}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    EMISIÓN: <strong>{fechaEmision}</strong>
                  </div>
                </div>
              </div>

              {/* Metadatos del Folio */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Inhumaciones:</span>
                  <span className="font-bold text-slate-900 text-[11px] font-mono">
                    {actasFolio.length} Actas Asentadas
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Protocolo Estándar:</span>
                  <span className="font-bold text-emerald-800 text-[11px]">
                    {totalEstandarEnFolio} Registros
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Bioseguridad COVID-19:</span>
                  <span className="font-bold text-purple-900 text-[11px]">
                    {totalCovidEnFolio} Registros
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Responsable de Archivo:</span>
                  <span className="font-bold text-slate-900 text-[10px] truncate block">
                    {responsableRegistro}
                  </span>
                </div>
              </div>
            </div>

            {/* TABLA OFICIAL FOLIADA DE INHUMACIONES */}
            <div className="overflow-visible mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-mono uppercase text-[9.5px] tracking-wider print:bg-slate-900 print:text-white">
                    <th className="p-1.5 border border-slate-700 w-14 text-center">Acta N°</th>
                    <th className="p-1.5 border border-slate-700 w-24 text-center">Fecha / Hora</th>
                    <th className="p-1.5 border border-slate-700">Fallecido / Difunto</th>
                    <th className="p-1.5 border border-slate-700 w-24 text-center">Parcela</th>
                    <th className="p-1.5 border border-slate-700 w-16 text-center">Nivel</th>
                    <th className="p-1.5 border border-slate-700 w-24 text-center">Protocolo</th>
                    <th className="p-1.5 border border-slate-700 w-32">Causa / Empresa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {actasFolio.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                        No se encontraron registros de inhumación con los criterios seleccionados.
                      </td>
                    </tr>
                  ) : (
                    actasFolio.map((inh, idx) => {
                      const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela || 'S/D'
                      const fecha = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
                      const hora = inh.fecha_inhumacion?.includes('T')
                        ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                        : '10:30 hs'
                      const actaNum = `#84${String(90 + idx).padStart(2, '0')}-B`

                      return (
                        <tr
                          key={inh.id}
                          className={`page-break-inside-avoid text-[10.5px] ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'
                          }`}
                        >
                          {/* Acta N° */}
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                            {actaNum}
                          </td>

                          {/* Fecha / Hora */}
                          <td className="p-1.5 border border-slate-300 text-center font-mono text-[10px] whitespace-nowrap">
                            <span className="font-semibold block">{fecha}</span>
                            <span className="text-slate-500 block">{hora}</span>
                          </td>

                          {/* Fallecido / DNI */}
                          <td className="p-1.5 border border-slate-300">
                            <div className="font-bold text-slate-900 leading-tight">
                              {inh.nombre_difunto}
                            </div>
                            <div className="text-[9.5px] text-slate-600 font-mono mt-0.5">
                              {inh.dni_difunto ? `DNI: ${inh.dni_difunto}` : 'DNI: Constatado en defunción'}
                            </div>
                          </td>

                          {/* Parcela */}
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-[#00236f] whitespace-nowrap">
                            {parcNom}
                          </td>

                          {/* Nivel */}
                          <td className="p-1.5 border border-slate-300 text-center font-semibold text-slate-800 whitespace-nowrap">
                            Nivel {inh.nivel_posicion || 1}
                          </td>

                          {/* Protocolo */}
                          <td className="p-1.5 border border-slate-300 text-center whitespace-nowrap">
                            {inh.es_covid ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                COVID-19
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Estándar
                              </span>
                            )}
                          </td>

                          {/* Causa / Empresa */}
                          <td className="p-1.5 border border-slate-300 text-[9.5px] text-slate-700">
                            <div className="truncate font-medium">{inh.causa_defuncion || 'Causa Natural'}</div>
                            <div className="text-slate-500 truncate text-[8.5px]">
                              {inh.empresa_funebrera || 'Servicio Parroquial'}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* SECCIÓN DE CERTIFICACIÓN Y FIRMAS LEGALES */}
            <div className="pt-4 border-t-2 border-slate-900 page-break-inside-avoid">
              <div className="text-[10px] text-slate-600 italic text-center mb-6">
                El presente Folio Oficial del Libro Digital de Inhumaciones da fe registral de las sepulturas practicadas conforme a las normas del Código de Procedimientos Administrativos y Sanitarios Municipales.
              </div>

              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* Firma 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-dashed border-slate-800 mb-1.5 h-10"></div>
                  <span className="font-bold text-slate-900 text-[10.5px]">Capataz / Campo</span>
                  <span className="text-[9px] text-slate-500 uppercase">Verificación de Fosa y Nivel</span>
                </div>

                {/* Firma 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-dashed border-slate-800 mb-1.5 h-10"></div>
                  <span className="font-bold text-slate-900 text-[10.5px]">Registro y Archivo Parroquial</span>
                  <span className="text-[9px] text-slate-500 uppercase">Firma y Sello Oficial</span>
                </div>

                {/* Firma 3 */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-dashed border-slate-800 mb-1.5 h-10"></div>
                  <span className="font-bold text-slate-900 text-[10.5px]">Dirección Municipal</span>
                  <span className="text-[9px] text-slate-500 uppercase">Visado Legal y Tesorería</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 font-mono mt-5">
                Aeterna Parque San Nicolás · Sistema Mortuorio Municipal · Folio emitido electrónicamente con validez legal
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

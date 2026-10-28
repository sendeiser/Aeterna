import React, { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { getA4ReportStyles, openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

interface PlanillaRutaModalProps {
  isOpen: boolean
  onClose: () => void
  afiliados: (AfiliadoSeguro & { cuotasPagadas?: number[] })[]
}

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const PlanillaRutaModal: React.FC<PlanillaRutaModalProps> = ({
  isOpen,
  onClose,
  afiliados,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [filtroEstado, setFiltroEstado] = useState<'deuda' | 'todos'>('deuda')
  const [ordenarPor, setOrdenarPor] = useState<'domicilio' | 'numero' | 'nombre'>('domicilio')
  const [cobradorNombre, setCobradorNombre] = useState<string>('Flores, Juan Carlos')
  const [fechaRecorrido, setFechaRecorrido] = useState<string>(
    new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  )
  const [isBW, setIsBW] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const mesActual = 3 // Marzo 2026

  // Obtener zonas únicas
  const zonas = useMemo(() => {
    const setZ = new Set<string>()
    afiliados.forEach((a) => {
      if (a.zona_cobro) setZ.add(a.zona_cobro)
    })
    return Array.from(setZ).sort()
  }, [afiliados])

  // Filtrar y ordenar afiliados para la planilla de ruta
  const afiliadosEnRuta = useMemo(() => {
    let list = [...afiliados]

    // Filtro por zona
    if (selectedZone !== 'all') {
      list = list.filter((a) => a.zona_cobro === selectedZone)
    }

    // Calcular cuotas vencidas y saldo para cada uno
    const listConCalculos = list.map((a) => {
      const cuotasPagadas = a.cuotasPagadas || (a.estado === 'activo' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2])
      const mesesVencidos = [1, 2, 3].filter((m) => !cuotasPagadas.includes(m))
      const saldoDeuda = mesesVencidos.length * (a.monto_cuota_mensual || 18000)
      const tieneDeuda = mesesVencidos.length > 0
      return {
        ...a,
        cuotasPagadas,
        mesesVencidos,
        saldoDeuda,
        tieneDeuda,
      }
    })

    // Filtro por estado: solo deuda vs todos
    let filtrados = listConCalculos
    if (filtroEstado === 'deuda') {
      filtrados = listConCalculos.filter((a) => a.tieneDeuda)
    }

    // Ordenamiento
    return filtrados.sort((a, b) => {
      if (ordenarPor === 'domicilio') {
        const zonaComp = (a.zona_cobro || '').localeCompare(b.zona_cobro || '')
        if (zonaComp !== 0) return zonaComp
        return (a.direccion_cobro || '').localeCompare(b.direccion_cobro || '')
      }
      if (ordenarPor === 'numero') {
        return (Number(a.numero_afiliado) || 0) - (Number(b.numero_afiliado) || 0)
      }
      return (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
    })
  }, [afiliados, selectedZone, filtroEstado, ordenarPor])

  if (!isOpen) return null

  // Métricas totales de la planilla
  const totalMontoExigible = afiliadosEnRuta.reduce((acc, a) => acc + (a.saldoDeuda || 0), 0)
  const totalCuotasAdeudadas = afiliadosEnRuta.reduce((acc, a) => acc + (a.mesesVencidos?.length || 0), 0)

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const opened = openA4PrintWindow(
      `Planilla de Ruta (${selectedZone === 'all' ? 'Todas las Zonas' : selectedZone}) — Aeterna`,
      printContent,
      isBW
    )
    if (!opened) {
      window.print()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent"
      data-printable-modal="true"
      onClick={onClose}
    >
      <style>{getA4ReportStyles(isBW)}</style>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[96vh] overflow-hidden border border-outline-variant flex flex-col print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0 print:overflow-visible print:static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* MODAL HEADER (OCULTO EN IMPRESIÓN)                                   */}
        {/* ===================================================================== */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">route</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Planilla de Ruta para Cobrador</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  Formato A4 PDF
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Aeterna Parque San Nicolás · Cobranza Domiciliaria Ordenada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={true} />
            <button
              type="button"
              id="btn-imprimir-planilla-pdf"
              onClick={handlePrint}
              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
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
        {/* TOOLBAR DE PARÁMETROS Y FILTROS (OCULTO EN IMPRESIÓN)                 */}
        {/* ===================================================================== */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zona */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Zona:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="all">Todas las Zonas ({afiliados.length} af.)</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Deuda vs Todos */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Listar:</span>
              <div className="flex items-center bg-slate-200 rounded p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setFiltroEstado('deuda')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    filtroEstado === 'deuda'
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Solo Pendientes ({afiliados.filter(a => !(a.cuotasPagadas || []).includes(mesActual)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroEstado('todos')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    filtroEstado === 'todos'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Padrón Completo ({afiliados.length})
                </button>
              </div>
            </div>

            {/* Orden */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Orden:</span>
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
              >
                <option value="domicilio">Ruta de Calle (Zona y Domicilio)</option>
                <option value="numero">N° de Afiliado</option>
                <option value="nombre">Apellido y Nombre (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Cobrador */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Cobrador:</span>
              <input
                type="text"
                value={cobradorNombre}
                onChange={(e) => setCobradorNombre(e.target.value)}
                placeholder="Nombre del cobrador"
                className="h-7 px-2 w-36 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />
            </div>

            {/* Fecha Recorrido */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Fecha:</span>
              <input
                type="text"
                value={fechaRecorrido}
                onChange={(e) => setFechaRecorrido(e.target.value)}
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
            {/* Encabezado Institucional de la Planilla */}
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
                    SEGURO PLAN INTEGRAL FAMILIAR · PLANILLA DE RUTA DOMICILIARIA
                  </h2>
                  <p className="brand-caption">
                    Administración y Tesorería · Gestión de Cobranza de Seguro ({MESES_NOMBRES[mesActual - 1]} 2026)
                  </p>
                </div>
              </div>

              <div className="meta-box">
                <span className="meta-badge">PLANILLA DE RUTA</span>
                <div className="meta-line">
                  FECHA: <strong>{fechaRecorrido}</strong>
                </div>
                <div className="meta-sub">
                  CUOTAS EXIGIBLES: {totalCuotasAdeudadas} CUOTAS
                </div>
              </div>
            </div>

            {/* Tarjetas KPI de la Ruta */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Zona de Recorrido</span>
                <span className="kpi-val">
                  {selectedZone === 'all' ? 'Todas las Zonas' : selectedZone}
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Cobrador Asignado</span>
                <span className="kpi-val">{cobradorNombre || 'A designar'}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Afiliados a Visitar</span>
                <span className="kpi-val">{afiliadosEnRuta.length} Titulares</span>
              </div>
              <div className="kpi-card-danger">
                <span className="kpi-label">Total a Recaudar</span>
                <span className="kpi-val-danger">{formatCurrency(totalMontoExigible)}</span>
              </div>
            </div>

            {/* Tabla de Cobranza Domiciliaria con Bordes Nítidos */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '28px' }}>#</th>
                  <th style={{ textAlign: 'center', width: '54px' }}>N° Af.</th>
                  <th style={{ textAlign: 'left' }}>Afiliado / Titular & DNI</th>
                  <th style={{ textAlign: 'left' }}>Domicilio de Cobro & Zona</th>
                  <th style={{ textAlign: 'right', width: '74px' }}>Cuota Base</th>
                  <th style={{ textAlign: 'center', width: '88px' }}>Meses Adeud.</th>
                  <th style={{ textAlign: 'right', width: '92px' }}>Total a Cobrar</th>
                  <th style={{ textAlign: 'center', width: '72px' }}>N° Recibo</th>
                  <th style={{ textAlign: 'center', width: '92px' }}>Firma / Obs.</th>
                </tr>
              </thead>
              <tbody>
                {afiliadosEnRuta.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                      No hay afiliados en esta selección.
                    </td>
                  </tr>
                ) : (
                  afiliadosEnRuta.map((af, index) => {
                    const isEven = index % 2 === 0
                    const mesesStr =
                      af.mesesVencidos?.length > 0
                        ? af.mesesVencidos
                            .map((m: number) => MESES_NOMBRES[m - 1]?.slice(0, 3))
                            .join(', ')
                        : 'Al día'

                    return (
                      <tr key={af.id} className={isEven ? 'row-even' : 'row-odd'}>
                        <td className="col-num">{index + 1}</td>
                        <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
                          #{af.numero_afiliado}
                        </td>
                        <td className="col-titular">
                          <div className="titular-name">{af.nombre_completo}</div>
                          <div className="titular-dni">DNI {af.dni || 'S/D'}</div>
                        </td>
                        <td className="col-domicilio">
                          <div>{af.direccion_cobro || 'Domicilio no especificado'}</div>
                          <div className="domicilio-barrio">{af.zona_cobro}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: "'Courier New', monospace", fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {formatCurrency(af.monto_cuota_mensual || 18000)}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {af.mesesVencidos?.length > 0 ? (
                            <span>
                              {mesesStr} ({af.mesesVencidos.length})
                            </span>
                          ) : (
                            <span>Al día</span>
                          )}
                        </td>
                        <td className="col-saldo">
                          {af.saldoDeuda > 0 ? formatCurrency(af.saldoDeuda) : '$ 0,00'}
                        </td>
                        <td className="col-recibo">
                          <span className="field-guide-line" />
                        </td>
                        <td className="col-firma">
                          <span className="field-guide-line" />
                        </td>
                      </tr>
                    )
                  })
                )}
                {afiliadosEnRuta.length > 0 && (
                  <tr className="total-row">
                    <td colSpan={6} style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                      TOTAL GENERAL EXIGIBLE EN RUTA ({afiliadosEnRuta.length} AFILIADOS):
                    </td>
                    <td className="total-amount">{formatCurrency(totalMontoExigible)}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pie de Firmas */}
            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">{cobradorNombre || 'Cobrador Oficial'}</div>
                <div className="firma-sub">Firma y Aclaración del Cobrador</div>
              </div>
              <div className="footer-note">
                Rendición Efectivo: $ ______________ · Recibos N° _______ al _______
              </div>
              <div className="firma-block">
                <div className="firma-line">Administración y Tesorería</div>
                <div className="firma-sub">Aeterna Parque San Nicolás</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* MODAL FOOTER ACTIONS (OCULTO EN IMPRESIÓN)                           */}
        {/* ===================================================================== */}
        <div className="bg-slate-100 p-3 border-t border-slate-300 flex items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">info</span>
            <span>
              Tip: Al presionar <strong>"Imprimir / Guardar PDF"</strong>, elija la opción <strong>"Guardar como PDF"</strong> en el navegador para descargar el archivo digital.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir Planilla</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}

import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'

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
    window.print()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent"
      data-printable-modal="true"
      onClick={onClose}
    >
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
                Cementerio Parque San Nicolás · Cobranza Domiciliaria Ordenada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="bg-white shadow-lg mx-auto p-6 sm:p-8 max-w-[210mm] border border-slate-300 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-slate-900 font-sans">
            
            {/* Encabezado Institucional de la Planilla */}
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
                      SEGURO PLAN INTEGRAL FAMILIAR · EJERCICIO 2026
                    </h2>
                    <p className="text-[10px] text-slate-600 italic">
                      Dirección y Tesorería Parroquial / Municipal · Chamical, La Rioja
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded">
                    PLANILLA DE RUTA
                  </span>
                  <div className="text-[11px] font-mono text-slate-700 font-semibold mt-1">
                    FECHA: <strong>{fechaRecorrido}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    REF: MES {mesActual} ({MESES_NOMBRES[mesActual - 1]} 2026)
                  </div>
                </div>
              </div>

              {/* Fila de Metadatos de la Ruta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Zona de Recorrido:</span>
                  <span className="font-bold text-slate-900 truncate block text-[11px]">
                    {selectedZone === 'all' ? 'Todas las Zonas' : selectedZone}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Cobrador Asignado:</span>
                  <span className="font-bold text-slate-900 truncate block text-[11px]">
                    {cobradorNombre || 'A designar'}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-right sm:text-left">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Afiliados a Visitar:</span>
                  <span className="font-bold text-slate-900 text-[11px] font-mono">
                    {afiliadosEnRuta.length} Titulares
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-200 text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Monto Total a Recaudar:</span>
                  <span className="font-bold text-red-700 text-[12px] font-mono">
                    {formatCurrency(totalMontoExigible)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de Cobranza Domiciliaria */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px] border border-slate-800">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase text-[9px] tracking-wider text-center">
                    <th className="p-1 border border-slate-700 w-8">#</th>
                    <th className="p-1 border border-slate-700 w-12">N° Af.</th>
                    <th className="p-1.5 border border-slate-700 text-left w-48">Afiliado / Titular & DNI</th>
                    <th className="p-1.5 border border-slate-700 text-left">Domicilio de Cobro & Zona</th>
                    <th className="p-1 border border-slate-700 w-16">Cuota Base</th>
                    <th className="p-1 border border-slate-700 w-24">Meses Adeudados</th>
                    <th className="p-1.5 border border-slate-700 w-24 bg-red-900 text-white">Total a Cobrar</th>
                    <th className="p-1 border border-slate-700 w-24">N° Recibo Talonario</th>
                    <th className="p-1 border border-slate-700 w-28">Firma Afiliado / Fecha</th>
                    <th className="p-1 border border-slate-700 w-28">Observaciones de Visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {afiliadosEnRuta.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-500 italic">
                        No hay afiliados en esta selección.
                      </td>
                    </tr>
                  ) : (
                    afiliadosEnRuta.map((af, index) => {
                      const isEven = index % 2 === 0
                      const mesesStr = af.mesesVencidos?.length > 0
                        ? af.mesesVencidos.map((m: number) => MESES_NOMBRES[m - 1]?.slice(0, 3)).join(', ')
                        : 'Al día'

                      return (
                        <tr
                          key={af.id}
                          className={`border-b border-slate-300 ${
                            isEven ? 'bg-white' : 'bg-slate-50'
                          } print:border-slate-400`}
                          style={{ pageBreakInside: 'avoid' }}
                        >
                          {/* 1. N° Orden */}
                          <td className="p-1 border-r border-slate-300 text-center font-mono font-bold text-slate-600">
                            {index + 1}
                          </td>

                          {/* 2. N° Afiliado */}
                          <td className="p-1 border-r border-slate-300 text-center font-mono font-bold text-[#00236f]">
                            #{af.numero_afiliado}
                          </td>

                          {/* 3. Nombre y DNI */}
                          <td className="p-1.5 border-r border-slate-300">
                            <div className="font-bold text-slate-950 text-[10.5px]">
                              {af.nombre_completo}
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">
                              DNI {af.dni || 'S/D'}
                            </div>
                          </td>

                          {/* 4. Domicilio y Zona */}
                          <td className="p-1.5 border-r border-slate-300">
                            <div className="font-semibold text-slate-900 text-[10px]">
                              {af.direccion_cobro || 'Domicilio no especificado'}
                            </div>
                            <div className="text-[8.5px] text-slate-500 font-medium">
                              {af.zona_cobro}
                            </div>
                          </td>

                          {/* 5. Cuota Base */}
                          <td className="p-1 border-r border-slate-300 text-right font-mono font-semibold text-slate-700">
                            {formatCurrency(af.monto_cuota_mensual || 18000)}
                          </td>

                          {/* 6. Meses Adeudados */}
                          <td className="p-1 border-r border-slate-300 text-center font-medium">
                            {af.mesesVencidos?.length > 0 ? (
                              <span className="font-bold text-red-800">
                                {mesesStr} ({af.mesesVencidos.length})
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Al día</span>
                            )}
                          </td>

                          {/* 7. Total a Cobrar */}
                          <td className="p-1.5 border-r border-slate-400 text-right font-mono font-black text-slate-950 bg-slate-100 text-[11px]">
                            {af.saldoDeuda > 0 ? (
                              <span className="text-red-700">{formatCurrency(af.saldoDeuda)}</span>
                            ) : (
                              <span className="text-emerald-700">$ 0,00</span>
                            )}
                          </td>

                          {/* 8. N° Recibo Talonario (Espacio para anotar a mano) */}
                          <td className="p-1 border-r border-slate-300 text-center text-slate-400 font-mono">
                            <span className="text-[8.5px] block text-slate-400">TAL-</span>
                            <div className="border-b border-dotted border-slate-500 w-16 mx-auto mt-2"></div>
                          </td>

                          {/* 9. Firma / Fecha */}
                          <td className="p-1 border-r border-slate-300 text-center">
                            <div className="border-b border-dotted border-slate-500 w-20 mx-auto mt-4"></div>
                            <span className="text-[7.5px] text-slate-400 block mt-0.5">Firma / Fecha</span>
                          </td>

                          {/* 10. Observaciones */}
                          <td className="p-1">
                            <div className="border-b border-dotted border-slate-400 w-full mt-3"></div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ================================================================= */}
            {/* PIE DE RENDICIÓN DE CUENTAS (RESUMEN DE CAJA Y FIRMAS)             */}
            {/* ================================================================= */}
            <div className="mt-4 pt-3 border-t-2 border-slate-900 text-xs text-slate-800" style={{ pageBreakInside: 'avoid' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-2 border border-slate-300 rounded bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    1. Rendición Efectivo:
                  </span>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span>Total Recaudado:</span>
                    <strong className="text-slate-900 text-sm">$ _________________</strong>
                  </div>
                </div>

                <div className="p-2 border border-slate-300 rounded bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    2. Recibos Utilizados:
                  </span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div>Desde Recibo N°: <strong>_____________</strong></div>
                    <div>Hasta Recibo N°: <strong>_____________</strong></div>
                  </div>
                </div>

                <div className="p-2 border border-slate-300 rounded bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    3. Resumen Operativo:
                  </span>
                  <div className="text-[10px] font-mono space-y-0.5">
                    <div>Cobrados con éxito: <strong>_____ / {afiliadosEnRuta.length}</strong></div>
                    <div>Ausentes / Re-visitar: <strong>_____</strong></div>
                  </div>
                </div>
              </div>

              {/* Bloque de Firmas y Sellos Legales */}
              <div className="grid grid-cols-2 gap-8 pt-6 mt-3 border-t border-slate-300 text-center">
                <div>
                  <div className="border-b border-slate-700 w-48 mx-auto mb-1"></div>
                  <span className="font-bold text-[10px] text-slate-900 block">
                    {cobradorNombre || 'Cobrador Oficial'}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">
                    Firma y Aclaración del Cobrador
                  </span>
                </div>

                <div>
                  <div className="border-b border-slate-700 w-48 mx-auto mb-1"></div>
                  <span className="font-bold text-[10px] text-slate-900 block">
                    Administración y Tesorería
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">
                    Firma y Sello Receptor Municipal
                  </span>
                </div>
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

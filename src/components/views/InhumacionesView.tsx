import React, { useState, useMemo } from 'react'
import { Inhumacion, Parcela } from '../../types/database'
import { formatDateHour } from '../../lib/formatters'
import { ActaInhumacionModal } from '../modals/ActaInhumacionModal'
import { FolioInhumacionesModal } from '../modals/FolioInhumacionesModal'
import { InhumacionForm } from '../forms/InhumacionForm'

interface InhumacionesViewProps {
  inhumaciones: Inhumacion[]
  parcelasDisponibles: Parcela[]
  onRegistrarInhumacion: (datos: Partial<Inhumacion>) => void
  onEliminarInhumacion?: (id: string) => void
  onVerParcela?: (nomenclatura: string) => void
  onNuevaInhumacion?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

function compareNaturalInhumacion(a: string | undefined, b: string | undefined): number {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })
}

export const InhumacionesView: React.FC<InhumacionesViewProps> = ({
  inhumaciones,
  parcelasDisponibles,
  onRegistrarInhumacion,
  onEliminarInhumacion,
  onVerParcela,
  onNuevaInhumacion,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProtocol, setFilterProtocol] = useState<'all' | 'covid' | 'standard' | 'judicial'>('all')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [sortOption, setSortOption] = useState<string>('fecha-desc')
  const [isFolioModalOpen, setIsFolioModalOpen] = useState(false)
  const [actaModal, setActaModal] = useState<{
    isOpen: boolean
    inhumacion: Inhumacion | null
    folio: number
  }>({
    isOpen: false,
    inhumacion: null,
    folio: 148,
  })

  // Estado de edición mediante modal oficial
  const [modalEditInhumacion, setModalEditInhumacion] = useState<Inhumacion | null>(null)

  // Filtrado
  const filtered = inhumaciones.filter((i) => {
    if (filterProtocol === 'covid' && !i.es_covid) return false
    if (filterProtocol === 'standard' && i.es_covid) return false

    if (filterFechaDesde) {
      const iDate = i.fecha_inhumacion || i.created_at
      if (!iDate || iDate.slice(0, 10) < filterFechaDesde) return false
    }

    if (filterFechaHasta) {
      const iDate = i.fecha_inhumacion || i.created_at
      if (!iDate || iDate.slice(0, 10) > filterFechaHasta) return false
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const nom = i.nombre_difunto.toLowerCase()
      const parc = (typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || ''
      const causa = (i.causa_defuncion || '').toLowerCase()
      const dni = (i.dni_difunto || '').toLowerCase()
      return nom.includes(q) || parc.toLowerCase().includes(q) || causa.includes(q) || dni.includes(q)
    }
    return true
  })

  // Ordenamiento dinámico de actas de inhumación
  const sortedInhumaciones = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const parcA = typeof a.parcela === 'object' ? a.parcela?.nomenclatura : a.parcela || ''
      const parcB = typeof b.parcela === 'object' ? b.parcela?.nomenclatura : b.parcela || ''

      if (sortOption === 'alfa-asc' || sortOption === 'difunto-asc') {
        return (a.nombre_difunto || '').localeCompare(b.nombre_difunto || '')
      }
      if (sortOption === 'alfa-desc' || sortOption === 'difunto-desc') {
        return (b.nombre_difunto || '').localeCompare(a.nombre_difunto || '')
      }
      if (sortOption === 'fecha-desc') {
        const dateA = (a.fecha_inhumacion || a.created_at) ? new Date(a.fecha_inhumacion || a.created_at!).getTime() : 0
        const dateB = (b.fecha_inhumacion || b.created_at) ? new Date(b.fecha_inhumacion || b.created_at!).getTime() : 0
        return dateB - dateA
      }
      if (sortOption === 'fecha-asc') {
        const dateA = (a.fecha_inhumacion || a.created_at) ? new Date(a.fecha_inhumacion || a.created_at!).getTime() : 0
        const dateB = (b.fecha_inhumacion || b.created_at) ? new Date(b.fecha_inhumacion || b.created_at!).getTime() : 0
        return dateA - dateB
      }
      if (sortOption === 'parcela-asc') {
        return compareNaturalInhumacion(parcA, parcB)
      }
      if (sortOption === 'parcela-desc') {
        return compareNaturalInhumacion(parcB, parcA)
      }
      if (sortOption === 'dni-asc') {
        return (a.dni_difunto || '').localeCompare(b.dni_difunto || '')
      }
      if (sortOption === 'dni-desc') {
        return (b.dni_difunto || '').localeCompare(a.dni_difunto || '')
      }
      if (sortOption === 'nivel-asc') {
        return (a.nivel_posicion || 1) - (b.nivel_posicion || 1)
      }
      if (sortOption === 'nivel-desc') {
        return (b.nivel_posicion || 1) - (a.nivel_posicion || 1)
      }
      if (sortOption === 'empresa-asc') {
        return (a.empresa_funebrera || '').localeCompare(b.empresa_funebrera || '')
      }
      if (sortOption === 'empresa-desc') {
        return (b.empresa_funebrera || '').localeCompare(a.empresa_funebrera || '')
      }
      return compareNaturalInhumacion(parcA, parcB)
    })
  }, [filtered, sortOption])

  const totalCovid = inhumaciones.filter((i) => i.es_covid).length

  return (
    <div className="w-full h-full flex flex-col overflow-hidden space-y-1.5 sm:space-y-3">

      {/* ===================================================================== */}
      {/* HEADER BAR CON BOTÓN MODAL PARA NUEVA INHUMACIÓN                     */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg px-2.5 py-1.5 sm:p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs sm:text-headline-sm font-headline-sm text-on-surface font-bold tracking-tight flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-primary text-[18px] sm:text-[24px]">history_edu</span>
            <span>Libro Digital de Inhumaciones</span>
          </h2>
          <p className="text-[11px] sm:text-body-sm text-outline mt-0.5 hidden sm:block">
            Registro oficial y legajo histórico de defunciones e inhumaciones en parcelas municipales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Métricas breves del libro */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-300">
              Registradas: <strong className="text-slate-900">{inhumaciones.length}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
              COVID-19: <strong className="text-purple-900">{totalCovid}</strong>
            </span>
          </div>

          {/* Botoncito Actualizar / Sincronizar Supabase */}
          {onRefresh && (
            <button
              id="btn-refresh-inhumaciones"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-7 sm:h-[38px] px-2.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
              title="Actualizar y sincronizar con la base de datos"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span className="hidden sm:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          )}

          {onNuevaInhumacion && (
            <button
              type="button"
              id="btn-nueva-inhumacion"
              onClick={onNuevaInhumacion}
              className="h-7 sm:h-[38px] px-2.5 sm:px-4 rounded bg-primary hover:bg-secondary text-white text-xs sm:text-body-sm font-semibold inline-flex items-center justify-center gap-1 shadow-sm transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[18px]">add_circle</span>
              <span className="hidden xs:inline">+ Nueva Inhumación</span>
              <span className="xs:hidden">+ Nueva</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HISTORICAL RECORD & SEARCH                                            */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Filter Toolbar (Buscador por nombre, protocolos, orden y exportar folio) */}
        <div className="p-2 sm:p-3 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-4xl w-full flex-wrap">
            {/* Search bar */}
            <div className="relative flex-1 min-w-[180px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre de difunto o parcela..."
                className="w-full h-[34px] pl-8 pr-3 text-body-sm font-body-sm bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary/30 outline-none"
              />
            </div>

            {/* Filtro por Rango de Fechas (Desde - Hasta) */}
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant text-xs shrink-0">
              <span className="material-symbols-outlined text-[15px] text-outline">calendar_today</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Desde:</span>
              <input
                id="filter-fecha-desde-inhumaciones"
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="h-6 text-[11px] bg-white border border-outline-variant rounded px-1.5 focus:border-secondary focus:outline-none"
                title="Filtrar inhumaciones desde fecha"
              />
              <span className="text-[11px] text-on-surface-variant font-medium">Hasta:</span>
              <input
                id="filter-fecha-hasta-inhumaciones"
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="h-6 text-[11px] bg-white border border-outline-variant rounded px-1.5 focus:border-secondary focus:outline-none"
                title="Filtrar inhumaciones hasta fecha"
              />
              {(filterFechaDesde || filterFechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterFechaDesde('')
                    setFilterFechaHasta('')
                  }}
                  className="p-0.5 text-outline hover:text-error rounded cursor-pointer"
                  title="Limpiar filtro de fecha"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Sanity Filter Quick Select */}
            <select
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value as any)}
              className="h-[34px] px-2.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded text-on-surface-variant focus:border-secondary outline-none shrink-0 cursor-pointer"
            >
              <option value="all">Todos los Protocolos</option>
              <option value="covid">Solo Protocolo COVID-19</option>
              <option value="standard">Inhumación Estándar</option>
              <option value="judicial">Intervención Judicial / Morgue</option>
            </select>

            {/* Ordenar por Alfabeto o Fecha */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="h-[34px] px-2.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded text-on-surface-variant focus:border-secondary outline-none shrink-0 cursor-pointer font-medium"
              title="Ordenar actas de inhumación por alfabeto o fecha"
            >
              <option value="fecha-desc">📅 Fecha: Más reciente</option>
              <option value="fecha-asc">📅 Fecha: Más antiguo</option>
              <option value="alfa-asc">🔤 Difunto: A → Z</option>
              <option value="alfa-desc">🔤 Difunto: Z → A</option>
              <option value="parcela-asc">📍 Parcela (A → Z)</option>
            </select>
          </div>

          {/* Exportar Folio PDF Oficial */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              id="btn-exportar-folio"
              onClick={() => setIsFolioModalOpen(true)}
              title="Exportar Folio Oficial del Libro de Inhumaciones en PDF Estructurado A4"
              className="h-[34px] px-3 bg-surface-container-lowest border border-outline-variant hover:border-primary hover:text-primary rounded text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[17px] text-red-600">picture_as_pdf</span>
              <span>Exportar Folio</span>
            </button>
          </div>
        </div>

        {/* MOBILE VIEW (< md): Responsive Inhumaciones Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll">
          {sortedInhumaciones.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron actas de inhumación.</div>
          ) : (
            sortedInhumaciones.map((inh, index) => {
              const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
              const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
              const hora = inh.fecha_inhumacion?.includes('T')
                ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                : '10:30 hs'

              const isEven = index % 2 === 0

              return (
                <div
                  key={inh.id}
                  onDoubleClick={() => setModalEditInhumacion(inh)}
                  title="Doble clic para modificar acta de inhumación"
                  className={`p-3 rounded-lg border flex flex-col gap-2.5 shadow-xs cursor-pointer transition-colors ${
                    inh.es_covid
                      ? 'bg-[#F5F3FF] border-[#DDD6FE]'
                      : isEven
                      ? 'bg-white border-slate-200/90'
                      : 'bg-[#eaf0f6] border-slate-200/90'
                  }`}
                >
                  {/* Card Header: Fecha, Hora, Protocolo Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-code-cadastral font-bold text-on-surface text-sm">
                        {formatDateHour(inh.fecha_inhumacion || inh.created_at)}
                      </span>
                      <div className="text-[11px] font-code-cadastral text-outline">Acta #84{90 + index}-B</div>
                    </div>
                    {inh.es_covid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]">
                        <span className="material-symbols-outlined text-[12px]">coronavirus</span>
                        <span>COVID-19</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        <span>Estándar</span>
                      </span>
                    )}
                  </div>

                  {/* Difunto */}
                  <div>
                    <div className="font-bold text-on-surface text-base">
                      {inh.nombre_difunto}
                    </div>
                    <div className="text-[12px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                      <span>Fosa:</span>
                      <span className="font-code-cadastral font-bold text-primary bg-surface px-1.5 py-0.5 rounded border border-outline-variant">
                        {parcNom || 'A-25-96'}
                      </span>
                      <span className="text-secondary font-semibold text-xs">[Nivel {inh.nivel_posicion || 1}]</span>
                    </div>
                  </div>

                  {/* Empresa fúnebre */}
                  <div className="text-xs text-outline flex items-center justify-between pt-1 border-t border-outline-variant/30">
                    <span className="truncate">{inh.empresa_funebrera || 'Servicios Sociales Chamical'}</span>
                    <span className="text-on-surface-variant shrink-0">Oficial: Lic. Albarracín</span>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-outline-variant/40 mt-0.5">
                    <button
                      type="button"
                      id={`btn-editar-inhumacion-m-${inh.id}`}
                      onClick={() => setModalEditInhumacion(inh)}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant cursor-pointer"
                      title="Editar en formulario modal"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActaModal({
                          isOpen: true,
                          inhumacion: inh,
                          folio: 148 + index,
                        })
                      }}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                      <span>Acta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onVerParcela && parcNom) {
                          onVerParcela(parcNom)
                        }
                      }}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-secondary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[15px]">domain</span>
                      <span>Parcela</span>
                    </button>

                    {onEliminarInhumacion && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Confirma anular o eliminar el acta de ${inh.nombre_difunto}?`)) {
                            onEliminarInhumacion(inh.id)
                          }
                        }}
                        className="h-8 w-8 rounded bg-red-50 hover:bg-red-100 text-error inline-flex items-center justify-center border border-red-200"
                        title="Eliminar Registro"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* DESKTOP VIEW (>= md): Institutional Data Grid */}
        <div className="hidden md:block overflow-x-auto flex-1 min-h-0 custom-scroll">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
              <tr className="bg-slate-100 text-[11px] font-label-caps uppercase text-slate-700 tracking-wider select-none">
                <th
                  onClick={() => setSortOption((prev) => (prev === 'fecha-desc' ? 'fecha-asc' : 'fecha-desc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Fecha Más reciente / Más antiguo"
                >
                  <div className="flex items-center gap-1">
                    <span>Fecha Inhumación</span>
                    {sortOption === 'fecha-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                    {sortOption === 'fecha-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'alfa-asc' ? 'alfa-desc' : 'alfa-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Difunto A-Z / Z-A"
                >
                  <div className="flex items-center gap-1">
                    <span>Difunto / DNI</span>
                    {sortOption === 'alfa-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'alfa-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'parcela-asc' ? 'parcela-desc' : 'parcela-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Parcela (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1">
                    <span>Parcela y Nivel</span>
                    {sortOption === 'parcela-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'parcela-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th className="py-2.5 px-3 bg-slate-100 text-right">Acciones Registrales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-body-md font-body-md">
              {sortedInhumaciones.map((inh, index) => {
                const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
                const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
                const hora = inh.fecha_inhumacion?.includes('T')
                  ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                  : '10:30 hs'

                const isEven = index % 2 === 0
                return (
                  <tr
                    key={inh.id}
                    onDoubleClick={() => setModalEditInhumacion(inh)}
                    title="Doble clic para modificar acta de inhumación"
                    className={`transition-colors h-[42px] border-b border-slate-200/80 cursor-pointer ${
                      isEven ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    {/* Fecha */}
                    <td className="py-1 px-3 font-code-cadastral text-code-cadastral whitespace-nowrap text-on-surface">
                      <div className="font-semibold">{formatDateHour(inh.fecha_inhumacion || inh.created_at)}</div>
                    </td>

                    {/* Difunto / DNI */}
                    <td className="py-1 px-3">
                      <div className={`font-semibold ${inh.es_covid ? 'text-primary' : 'text-on-surface'}`}>
                        {inh.nombre_difunto}
                      </div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        Acta #84{90 + index}-B
                      </div>
                    </td>

                    {/* Parcela y Nivel */}
                    <td className="py-1 px-3 whitespace-nowrap">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-on-surface bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/60">
                        {parcNom || 'A-25-96'}
                      </span>
                      <span className="text-[11px] text-secondary font-medium ml-1">
                        [Nivel {inh.nivel_posicion || 1}]
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-1 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          id={`btn-editar-inhumacion-${inh.id}`}
                          onClick={() => setModalEditInhumacion(inh)}
                          className="h-7 px-2 rounded hover:bg-surface-container text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant/60 cursor-pointer"
                          title="Editar en formulario modal"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActaModal({
                              isOpen: true,
                              inhumacion: inh,
                              folio: 148 + index,
                            })
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
                          title="Imprimir Constancia de Sepelio"
                        >
                          <span className="material-symbols-outlined text-[16px]">print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onVerParcela && parcNom) {
                              onVerParcela(parcNom)
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-secondary hover:bg-surface-container transition-colors"
                          title="Ver Parcela"
                        >
                          <span className="material-symbols-outlined text-[16px]">domain</span>
                        </button>
                        {onEliminarInhumacion && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Confirma anular o eliminar el acta de ${inh.nombre_difunto}?`)) {
                                onEliminarInhumacion(inh.id)
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Eliminar Registro"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Acta Oficial */}
      {actaModal.inhumacion && (
        <ActaInhumacionModal
          isOpen={actaModal.isOpen}
          onClose={() => setActaModal({ ...actaModal, isOpen: false })}
          inhumacion={actaModal.inhumacion}
          folioNumber={actaModal.folio}
        />
      )}

      {/* Modal Folio Oficial A4 PDF del Libro de Inhumaciones */}
      <FolioInhumacionesModal
        isOpen={isFolioModalOpen}
        onClose={() => setIsFolioModalOpen(false)}
        inhumaciones={inhumaciones}
        currentFilterProtocol={filterProtocol}
        currentSearchTerm={searchTerm}
      />

      {/* Modal de Edición de Inhumación (Requerimiento explícito: editar mediante modales) */}
      {modalEditInhumacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <InhumacionForm
              parcelasDisponibles={parcelasDisponibles}
              inhumaciones={inhumaciones}
              initialData={modalEditInhumacion}
              onSave={(updated) => {
                onRegistrarInhumacion(updated)
                setModalEditInhumacion(null)
              }}
              onCancel={() => setModalEditInhumacion(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

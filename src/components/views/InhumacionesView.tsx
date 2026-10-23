import React, { useState } from 'react'
import { Inhumacion, Parcela } from '../../types/database'
import { ActaInhumacionModal } from '../modals/ActaInhumacionModal'

interface InhumacionesViewProps {
  inhumaciones: Inhumacion[]
  parcelasDisponibles: Parcela[]
  onRegistrarInhumacion: (datos: Partial<Inhumacion>) => void
  onEliminarInhumacion?: (id: string) => void
  onVerParcela?: (nomenclatura: string) => void
  onNuevaInhumacion?: () => void
}

export const InhumacionesView: React.FC<InhumacionesViewProps> = ({
  inhumaciones,
  parcelasDisponibles,
  onRegistrarInhumacion,
  onEliminarInhumacion,
  onVerParcela,
  onNuevaInhumacion,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProtocol, setFilterProtocol] = useState<'all' | 'covid' | 'standard' | 'judicial'>('all')
  const [yearFilter, setYearFilter] = useState<string>('2026')
  const [actaModal, setActaModal] = useState<{
    isOpen: boolean
    inhumacion: Inhumacion | null
    folio: number
  }>({
    isOpen: false,
    inhumacion: null,
    folio: 148,
  })

  // Estado de edición en línea en la misma tabla
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<{
    id: string
    nombre_difunto: string
    fecha_inhumacion: string
    parcela: string
    nivel_posicion: number
    es_covid: boolean
    causa_defuncion: string
    empresa_funebrera: string
  } | null>(null)

  const startEditRow = (inh: Inhumacion) => {
    const parcNom = (typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : (inh.parcela || '')) || ''
    setEditingRowId(inh.id)
    setEditRowData({
      id: inh.id,
      nombre_difunto: inh.nombre_difunto || '',
      fecha_inhumacion: inh.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      parcela: parcNom,
      nivel_posicion: inh.nivel_posicion || 1,
      es_covid: !!inh.es_covid,
      causa_defuncion: inh.causa_defuncion || 'Causa Natural',
      empresa_funebrera: inh.empresa_funebrera || '',
    })
  }

  const cancelEditRow = () => {
    setEditingRowId(null)
    setEditRowData(null)
  }

  const saveEditRow = () => {
    if (!editRowData) return
    if (!editRowData.nombre_difunto.trim()) {
      alert('Por favor ingrese el nombre del difunto.')
      return
    }

    const updatedInh: Partial<Inhumacion> = {
      id: editRowData.id,
      nombre_difunto: editRowData.nombre_difunto.trim(),
      fecha_inhumacion: editRowData.fecha_inhumacion,
      nivel_posicion: Number(editRowData.nivel_posicion) || 1,
      es_covid: editRowData.es_covid,
      causa_defuncion: editRowData.causa_defuncion,
      empresa_funebrera: editRowData.empresa_funebrera,
      parcela: {
        id: `parc-${Date.now()}`,
        nomenclatura: editRowData.parcela,
        capacidad_total: 3,
        espacios_ocupados: Number(editRowData.nivel_posicion) || 1,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
      },
    }

    onRegistrarInhumacion(updatedInh)
    setEditingRowId(null)
    setEditRowData(null)
  }

  // Filtrado
  const filtered = inhumaciones.filter((i) => {
    if (filterProtocol === 'covid' && !i.es_covid) return false
    if (filterProtocol === 'standard' && i.es_covid) return false

    if (yearFilter !== 'all') {
      if (yearFilter === 'covid_era') {
        const year = i.fecha_inhumacion?.slice(0, 4)
        if (year !== '2020' && year !== '2021' && year !== '2022' && !i.es_covid) return false
      } else {
        const year = i.fecha_inhumacion?.slice(0, 4)
        if (year !== yearFilter) return false
      }
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

  const totalCovid = inhumaciones.filter((i) => i.es_covid).length

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BREADCRUMBS & CONTEXT BANNER (Stitch Verbatim)                       */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-outline-variant/40">
        <div className="flex items-center gap-2 text-body-sm text-outline">
          <span className="hover:text-primary cursor-pointer flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">home</span> Registro Central
          </span>
          <span>/</span>
          <span className="text-on-surface font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">history_edu</span> Libro Digital de Inhumaciones
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Libro Abierto Tomo XXXII - Folio {inhumaciones.length + 148}</span>
          </span>
          <span className="text-label-caps font-label-caps text-outline bg-surface-container px-2 py-0.5 rounded">
            Jurisdicción: Parque Municipal Este · Chamical
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* HEADER BAR CON BOTÓN MODAL PARA NUEVA INHUMACIÓN                     */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
        <div>
          <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">history_edu</span>
            <span>Libro Digital de Inhumaciones y Actas</span>
          </h2>
          <p className="text-body-sm text-outline mt-0.5">
            Registro oficial y legajo histórico de defunciones e inhumaciones en parcelas municipales.
          </p>
        </div>

        {onNuevaInhumacion && (
          <button
            type="button"
            id="btn-nueva-inhumacion"
            onClick={onNuevaInhumacion}
            className="h-[38px] px-4 rounded bg-primary hover:bg-secondary text-white text-body-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Nueva Inhumación</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* HISTORICAL RECORD & SEARCH (Bottom Region Stitch Verbatim)             */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Tabbed Year Selector & Header Filters */}
        <div className="border-b border-outline-variant bg-surface-container-low/40 px-3 sm:px-4 pt-3 pb-0 flex flex-wrap items-end justify-between gap-3 overflow-hidden">
          {/* Year Tabs - Scrollable on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setYearFilter('2026')}
              className={`px-3 py-2 text-body-sm font-semibold rounded-t flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2026'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>Recientes / 2026</span>
              <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-label-numeric">
                {inhumaciones.filter((i) => i.fecha_inhumacion?.startsWith('2026')).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('2025')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2025'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              2025
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('2024')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2024'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              2024
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('covid_era')}
              className={`px-3 py-2 text-body-sm font-semibold rounded-t transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                yearFilter === 'covid_era'
                  ? 'border-b-2 border-[#7C3AED] text-[#7C3AED] bg-surface-container-lowest'
                  : 'text-[#7C3AED] hover:bg-[#F5F3FF]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">coronavirus</span>
              <span>2020-2022 (Etapa COVID)</span>
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('all')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === 'all'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Ver Archivo Completo
            </button>
          </div>

          {/* Total Metrics Counter */}
          <div className="flex items-center gap-3 pb-2 text-[12px] text-outline font-label-caps shrink-0">
            <span>
              Registradas:{' '}
              <strong className="text-on-surface font-label-numeric font-bold">{inhumaciones.length}</strong>
            </span>
            <span className="h-3 w-[1px] bg-outline-variant"></span>
            <span>
              COVID-19:{' '}
              <strong className="text-[#7C3AED] font-label-numeric font-bold">{totalCovid}</strong>
            </span>
          </div>
        </div>

        {/* Filter Sub-Toolbar */}
        <div className="p-3 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl w-full">
            {/* Search bar */}
            <div className="relative flex-1 min-w-0">
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
            {/* Sanity Filter Quick Select */}
            <select
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value as any)}
              className="h-[34px] px-2.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded text-on-surface-variant focus:border-secondary outline-none shrink-0"
            >
              <option value="all">Todos los Protocolos</option>
              <option value="covid">Solo Protocolo COVID-19</option>
              <option value="standard">Inhumación Estándar</option>
              <option value="judicial">Intervención Judicial / Morgue</option>
            </select>
          </div>

          {/* Quick export tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              title="Exportar Libro en PDF Oficial"
              className="h-[32px] px-2.5 bg-surface-container-lowest border border-outline-variant rounded text-body-sm text-on-surface-variant hover:bg-surface-container-low flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Exportar Folio</span>
            </button>
          </div>
        </div>

        {/* MOBILE VIEW (< md): Responsive Inhumaciones Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron actas de inhumación.</div>
          ) : (
            filtered.map((inh, index) => {
              const isEditing = editingRowId === inh.id && editRowData
              const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
              const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
              const hora = inh.fecha_inhumacion?.includes('T')
                ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                : '10:30 hs'

              if (isEditing) {
                return (
                  <div
                    key={inh.id}
                    className="p-3 rounded-lg border-2 border-primary bg-primary/5 shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-code-cadastral font-bold text-primary text-sm">
                        Editando Acta #84{90 + index}-B
                      </span>
                      <span className="text-[11px] font-semibold text-primary uppercase">
                        Edición en Línea
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-outline font-medium block mb-0.5">Nombre Difunto:</label>
                        <input
                          type="text"
                          value={editRowData.nombre_difunto}
                          onChange={(e) => setEditRowData({ ...editRowData, nombre_difunto: e.target.value })}
                          className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Fecha Inhumación:</label>
                          <input
                            type="date"
                            value={editRowData.fecha_inhumacion}
                            onChange={(e) => setEditRowData({ ...editRowData, fecha_inhumacion: e.target.value })}
                            className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-code-cadastral"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Parcela:</label>
                          <input
                            type="text"
                            value={editRowData.parcela}
                            onChange={(e) => setEditRowData({ ...editRowData, parcela: e.target.value })}
                            className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-code-cadastral font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Nivel:</label>
                          <select
                            value={editRowData.nivel_posicion}
                            onChange={(e) => setEditRowData({ ...editRowData, nivel_posicion: Number(e.target.value) })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-outline-variant bg-surface font-medium"
                          >
                            <option value={1}>Nivel 1</option>
                            <option value={2}>Nivel 2</option>
                            <option value={3}>Nivel 3</option>
                          </select>
                        </div>
                        <div className="flex items-center pt-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#5B21B6]">
                            <input
                              type="checkbox"
                              checked={editRowData.es_covid}
                              onChange={(e) => setEditRowData({ ...editRowData, es_covid: e.target.checked })}
                              className="rounded text-[#7C3AED]"
                            />
                            COVID-19
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                      <button
                        type="button"
                        onClick={cancelEditRow}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant"
                      >
                        Cancelar ✕
                      </button>
                      <button
                        type="button"
                        onClick={saveEditRow}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">check</span>
                        <span>Guardar ✓</span>
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={inh.id}
                  className={`p-3 rounded-lg border flex flex-col gap-2.5 ${
                    inh.es_covid
                      ? 'bg-[#F5F3FF]/40 border-[#DDD6FE]'
                      : 'bg-surface-container-low/40 border-outline-variant/70'
                  }`}
                >
                  {/* Card Header: Fecha, Hora, Protocolo Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-code-cadastral font-bold text-on-surface text-sm">
                        {fechaInh}
                      </span>
                      <span className="text-[11px] text-outline ml-1.5">{hora}</span>
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
                      onClick={() => startEditRow(inh)}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                      title="Editar en la misma tabla"
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-outline-variant text-[11px] font-label-caps uppercase text-outline tracking-wider select-none">
                <th className="py-2 px-3">Fecha Inhumación</th>
                <th className="py-2 px-3">Difunto / DNI</th>
                <th className="py-2 px-3">Parcela y Nivel</th>
                <th className="py-2 px-3 text-right">Acciones Registrales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-body-md font-body-md">
              {filtered.map((inh, index) => {
                const isEditing = editingRowId === inh.id && editRowData
                const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
                const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
                const hora = inh.fecha_inhumacion?.includes('T')
                  ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                  : '10:30 hs'

                if (isEditing) {
                  return (
                    <tr key={inh.id} className="bg-primary/5 border-l-4 border-l-primary h-[52px]">
                      {/* Fecha Inhumación Editable */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={editRowData.fecha_inhumacion}
                          onChange={(e) => setEditRowData({ ...editRowData, fecha_inhumacion: e.target.value })}
                          className="text-xs px-2 py-1 rounded border border-primary bg-surface font-code-cadastral"
                        />
                      </td>

                      {/* Difunto Editable */}
                      <td className="py-1 px-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editRowData.nombre_difunto}
                            onChange={(e) => setEditRowData({ ...editRowData, nombre_difunto: e.target.value })}
                            placeholder="Nombre del Difunto"
                            className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface focus:outline-none"
                          />
                          <div className="flex items-center gap-3 text-[11px]">
                            <label className="flex items-center gap-1 cursor-pointer select-none text-[#5B21B6] font-semibold">
                              <input
                                type="checkbox"
                                checked={editRowData.es_covid}
                                onChange={(e) => setEditRowData({ ...editRowData, es_covid: e.target.checked })}
                                className="rounded text-[#7C3AED]"
                              />
                              COVID-19
                            </label>
                            <input
                              type="text"
                              value={editRowData.causa_defuncion}
                              onChange={(e) => setEditRowData({ ...editRowData, causa_defuncion: e.target.value })}
                              placeholder="Causa defunción"
                              className="text-[11px] px-1.5 py-0.5 rounded border border-outline-variant bg-surface"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Parcela y Nivel Editable */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editRowData.parcela}
                            onChange={(e) => setEditRowData({ ...editRowData, parcela: e.target.value })}
                            placeholder="Parcela (ej: A-12-04)"
                            className="w-24 text-xs font-code-cadastral font-bold px-2 py-1 rounded border border-outline-variant bg-surface"
                          />
                          <select
                            value={editRowData.nivel_posicion}
                            onChange={(e) => setEditRowData({ ...editRowData, nivel_posicion: Number(e.target.value) })}
                            className="text-xs px-1.5 py-1 rounded border border-outline-variant bg-surface font-medium"
                          >
                            <option value={1}>Nivel 1</option>
                            <option value={2}>Nivel 2</option>
                            <option value={3}>Nivel 3</option>
                          </select>
                        </div>
                      </td>

                      {/* Acciones Guardar / Cancelar */}
                      <td className="py-1 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            id={`btn-guardar-inhumacion-${inh.id}`}
                            onClick={saveEditRow}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer"
                            title="Guardar cambios"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Guardar</span>
                          </button>
                          <button
                            type="button"
                            id={`btn-cancelar-inhumacion-${inh.id}`}
                            onClick={cancelEditRow}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant flex items-center gap-0.5 cursor-pointer"
                            title="Cancelar edición"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={inh.id} className="hover:bg-surface-container-low transition-colors h-[40px]">
                    {/* Fecha */}
                    <td className="py-1 px-3 font-code-cadastral text-code-cadastral whitespace-nowrap text-on-surface">
                      <div className="font-semibold">{fechaInh}</div>
                      <div className="text-[10px] text-outline">{hora}</div>
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
                          onClick={() => startEditRow(inh)}
                          className="h-7 px-2 rounded hover:bg-surface-container text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant/60 cursor-pointer"
                          title="Editar en la misma tabla"
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
    </div>
  )
}

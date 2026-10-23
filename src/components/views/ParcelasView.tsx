import React, { useState, useEffect } from 'react'
import { Parcela, Inhumacion, EstadoTitular } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { reactivarParcelaStandby, liberarParcelaStandby } from '../../services/dataService'

interface ParcelasViewProps {
  parcelas: Parcela[]
  inhumaciones?: Inhumacion[]
  onCobrarQR: (parcela: Parcela) => void
  onSaveParcela: (parcela: Partial<Parcela>) => void
  onDeleteParcela?: (id: string) => void
  onNuevaInhumacionParaParcela?: (nomenclatura: string) => void
  onReactivarParcela?: (parcela: Parcela) => void
  onLiberarParcela?: (parcela: Parcela) => void
  onNuevaParcela?: () => void
  isOnline: boolean
}

export const ParcelasView: React.FC<ParcelasViewProps> = ({
  parcelas,
  inhumaciones = [],
  onCobrarQR,
  onSaveParcela,
  onDeleteParcela,
  onNuevaInhumacionParaParcela,
  onReactivarParcela,
  onLiberarParcela,
  onNuevaParcela,
  isOnline,
}) => {
  const [filterSector, setFilterSector] = useState<'todos' | 'A' | 'E' | 'SALINAS' | 'mora' | 'standby'>('todos')
  const [filterTitularVital, setFilterTitularVital] = useState<'todos' | 'vivo' | 'fallecido'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState<'todas' | 50 | 100>('todas')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(
    parcelas.length > 0 ? parcelas[0].id : null
  )

  // Estado de edición en línea en la misma tabla
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<{
    id: string
    nomenclatura: string
    sector_id: string
    manzana_fila: string
    numero_parcela: string
    titularNombre: string
    titularDni: string
    titularTelefono: string
    titularDireccion: string
    titularEstadoVital: 'vivo' | 'fallecido'
    capacidad_total: number
    estado: 'disponible' | 'ocupada' | 'en_mora' | 'baja' | 'standby'
    saldo_mantenimiento: number
    notas: string
  } | null>(null)

  const handleSelectParcela = (p: Parcela) => {
    setSelectedParcelaId(p.id)
  }

  const startEditRow = (p: Parcela) => {
    setEditingRowId(p.id)
    setSelectedParcelaId(p.id)
    setEditRowData({
      id: p.id,
      nomenclatura: p.nomenclatura,
      sector_id: p.sector_id || 'A',
      manzana_fila: p.manzana_fila || '',
      numero_parcela: String(p.numero_parcela || ''),
      titularNombre: p.titular?.nombre_completo || '',
      titularDni: p.titular?.dni || '',
      titularTelefono: (p.titular?.telefono || '').replace('+54 9 ', ''),
      titularDireccion: p.titular?.direccion || '',
      titularEstadoVital: p.titular?.estado_vital || (p.titular?.estado_titular === 'fallecido' ? 'fallecido' : 'vivo'),
      capacidad_total: p.capacidad_total || 3,
      estado: p.estado as any,
      saldo_mantenimiento: p.saldo_mantenimiento || 0,
      notas: p.notas || '',
    })
  }

  const cancelEditRow = () => {
    setEditingRowId(null)
    setEditRowData(null)
  }

  const saveEditRow = () => {
    if (!editRowData) return

    const updatedTitular = editRowData.titularNombre.trim()
      ? {
          id: `tit-${Date.now()}`,
          nombre_completo: editRowData.titularNombre.trim(),
          dni: editRowData.titularDni.trim() || null,
          telefono: editRowData.titularTelefono.trim() ? `+54 9 ${editRowData.titularTelefono.trim()}` : null,
          direccion: editRowData.titularDireccion.trim() || null,
          estado_titular: (editRowData.titularEstadoVital === 'fallecido' ? 'fallecido' : 'activo') as EstadoTitular,
          estado_vital: editRowData.titularEstadoVital,
        }
      : undefined

    const updatedParcela: Partial<Parcela> = {
      id: editRowData.id,
      nomenclatura: editRowData.nomenclatura,
      sector_id: editRowData.sector_id,
      manzana_fila: editRowData.manzana_fila,
      numero_parcela: editRowData.numero_parcela,
      capacidad_total: Number(editRowData.capacidad_total) || 3,
      estado: editRowData.estado,
      saldo_mantenimiento: Number(editRowData.saldo_mantenimiento) || 0,
      notas: editRowData.notas,
      titular: updatedTitular,
    }

    onSaveParcela(updatedParcela)
    setEditingRowId(null)
    setEditRowData(null)
  }

  // Acciones administrativas de stand-by
  const handleReactivar = async (parcela: Parcela) => {
    if (confirm(`¿Confirma reactivar la parcela ${parcela.nomenclatura} (${parcela.titular?.nombre_completo || 'Titular'}) tras regularizar el pago?`)) {
      try {
        const updated = await reactivarParcelaStandby(parcela.id)
        onSaveParcela(updated)
        if (onReactivarParcela) onReactivarParcela(updated)
        alert(`Parcela ${parcela.nomenclatura} reactivada con éxito. Titularidad restablecida.`)
      } catch (e: any) {
        alert(`Error al reactivar: ${e.message}`)
      }
    }
  }

  const handleLiberar = async (parcela: Parcela) => {
    if (
      confirm(
        `⚠️ ATENCIÓN: ¿Confirma dar de baja y liberar la titularidad de la parcela ${parcela.nomenclatura}?\n\nEl titular actual (${parcela.titular?.nombre_completo || 'Titular'}) será archivado al registro histórico y la parcela quedará Disponible para nueva asignación municipal.`
      )
    ) {
      try {
        const updated = await liberarParcelaStandby(
          parcela.id,
          'Caducidad administrativa municipal por mora superior a 3 años'
        )
        onSaveParcela(updated)
        if (onLiberarParcela) onLiberarParcela(updated)
        alert(`Parcela ${parcela.nomenclatura} liberada. Estado actual: Disponible.`)
      } catch (e: any) {
        alert(`Error al liberar: ${e.message}`)
      }
    }
  }

  // Filtrado de parcelas
  const filteredParcelas = parcelas.filter((p) => {
    if (filterSector !== 'todos') {
      if (filterSector === 'mora') {
        if (p.estado !== 'en_mora' && (p.saldo_mantenimiento || 0) <= 0) return false
      } else if (filterSector === 'standby') {
        if (p.estado !== 'standby') return false
      } else {
        if (p.sector_id !== filterSector) return false
      }
    }

    if (filterTitularVital !== 'todos') {
      if (!p.titular) return false
      const esFallecido = p.titular.estado_vital === 'fallecido' || p.titular.estado_titular === 'fallecido'
      if (filterTitularVital === 'fallecido' && !esFallecido) return false
      if (filterTitularVital === 'vivo' && esFallecido) return false
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const nom = p.nomenclatura.toLowerCase()
      const titular = (p.titular?.nombre_completo || '').toLowerCase()
      const dni = (p.titular?.dni || '').toLowerCase()
      const dir = (p.titular?.direccion || '').toLowerCase()
      return nom.includes(q) || titular.includes(q) || dni.includes(q) || dir.includes(q)
    }

    return true
  })

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSector, filterTitularVital, searchTerm, pageSize])

  const totalPages = pageSize === 'todas' ? 1 : Math.ceil(filteredParcelas.length / pageSize)
  const displayedParcelas =
    pageSize === 'todas'
      ? filteredParcelas
      : filteredParcelas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Selected Parcela Object
  const selectedParcela = parcelas.find((p) => p.id === selectedParcelaId) || filteredParcelas[0] || parcelas[0]

  // Difuntos asociados a la parcela seleccionada
  const difuntosEnParcela = inhumaciones.filter((inh) => {
    if (!selectedParcela) return false
    const inhParc = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
    return inhParc === selectedParcela.nomenclatura
  })

  // Counters
  const countSecA = parcelas.filter((p) => p.sector_id === 'A').length
  const countSecE = parcelas.filter((p) => p.sector_id === 'E').length
  const countSalinas = parcelas.filter((p) => p.sector_id === 'SALINAS').length
  const countMora = parcelas.filter((p) => p.estado === 'en_mora' || (p.saldo_mantenimiento || 0) > 0).length
  const countStandby = parcelas.filter((p) => p.estado === 'standby').length

  return (
    <div className="w-full space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest rounded border border-outline-variant p-3 shadow-sm flex flex-col gap-2.5">
        {/* Header de Toolbar: Título + Botón Nueva Parcela */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">domain</span>
            <div>
              <h2 className="text-headline-sm font-semibold text-on-surface">Padrón de Parcelas</h2>
              <p className="text-body-sm text-on-surface-variant">
                Gestión de parcelas, titulares y asignaciones de fosa
              </p>
            </div>
          </div>
          {onNuevaParcela && (
            <button
              id="btn-nueva-parcela"
              type="button"
              onClick={onNuevaParcela}
              className="h-8 px-3.5 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Nueva Parcela</span>
            </button>
          )}
        </div>
          {/* Filter Tabs / Sector Chips - Scrollable on mobile */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterSector('todos')}
                className={`px-3 py-1 rounded text-body-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'todos'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Todos ({parcelas.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('A')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'A'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Sector A ({countSecA})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('E')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'E'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Sector E ({countSecE})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('SALINAS')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'SALINAS'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Salinas ({countSalinas})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('mora')}
                className={`px-3 py-1 rounded text-body-sm font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'mora'
                    ? 'border-amber-600 bg-amber-600 text-white font-semibold'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                En Mora ({countMora})
              </button>
              <button
                id="btn-filtro-sector-standby"
                type="button"
                onClick={() => setFilterSector('standby')}
                className={`px-3 py-1 rounded text-body-sm font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'standby'
                    ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                    : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                ⚠️ Stand-by (+3 años) ({countStandby})
              </button>
            </div>
            {/* Quick Counter Metric */}
            <span className="text-body-sm font-code-cadastral text-outline shrink-0">
              Total reg: {filteredParcelas.length} parcelas
            </span>
          </div>

          {/* Quick Search Cadastral Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                data-icon="search"
              >
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por parcela (ej. A-25), apellido titular o DNI..."
                className="w-full h-9 pl-9 pr-3 text-body-md bg-surface-container-low border border-outline-variant rounded focus:border-secondary focus:bg-white focus:outline-none"
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="h-9 px-3 rounded border border-outline-variant bg-surface text-on-surface hover:bg-surface-container flex items-center gap-1 text-body-sm font-medium shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* Titular Vital Condition Filter */}
          <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/40 flex-wrap">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Condición Titular:
            </span>
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-outline-variant">
              <button
                id="btn-filtro-vital-todos"
                type="button"
                onClick={() => setFilterTitularVital('todos')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  filterTitularVital === 'todos'
                    ? 'bg-primary text-white shadow-xs font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                Todos
              </button>
              <button
                id="btn-filtro-vital-vivo"
                type="button"
                onClick={() => setFilterTitularVital('vivo')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  filterTitularVital === 'vivo'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Vivos</span>
              </button>
              <button
                id="btn-filtro-vital-fallecido"
                type="button"
                onClick={() => setFilterTitularVital('fallecido')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  filterTitularVital === 'fallecido'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Fallecidos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parcel List / Interactive Data Grid & Mobile Cards */}
        <div className="bg-surface-container-lowest rounded border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
            <span className="text-label-caps font-label-caps text-outline uppercase font-semibold">
              Listado de Parcelas Dinámico
            </span>
            <span className="text-[11px] text-outline">
              {filteredParcelas.length} parcelas listadas
            </span>
          </div>

          {/* MOBILE VIEW (< md): Responsive Interactive Cards */}
          <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
            {displayedParcelas.map((p) => {
              const isSelected = p.id === selectedParcela?.id
              const isEditing = editingRowId === p.id && editRowData
              const ocupados = p.espacios_ocupados || (p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0)
              const totalNiveles = p.capacidad_total || 3

              if (isEditing) {
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border-2 border-primary bg-primary/5 shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-code-cadastral font-bold text-primary text-base">
                        {p.nomenclatura}
                      </span>
                      <span className="text-[11px] font-semibold text-primary uppercase">
                        Edición en Línea
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-outline font-medium block mb-0.5">Nombre Titular:</label>
                        <input
                          type="text"
                          value={editRowData.titularNombre}
                          onChange={(e) => setEditRowData({ ...editRowData, titularNombre: e.target.value })}
                          placeholder="Nombre del Titular"
                          className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">DNI:</label>
                          <input
                            type="text"
                            value={editRowData.titularDni}
                            onChange={(e) => setEditRowData({ ...editRowData, titularDni: e.target.value })}
                            placeholder="DNI Titular"
                            className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-code-cadastral"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Condición Vital:</label>
                          <select
                            value={editRowData.titularEstadoVital}
                            onChange={(e) => setEditRowData({ ...editRowData, titularEstadoVital: e.target.value as any })}
                            className="w-full text-xs px-1.5 py-1 rounded border border-outline-variant bg-surface font-medium"
                          >
                            <option value="vivo">Vivo</option>
                            <option value="fallecido">Fallecido</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Capacidad:</label>
                          <select
                            value={editRowData.capacidad_total}
                            onChange={(e) => setEditRowData({ ...editRowData, capacidad_total: Number(e.target.value) })}
                            className="w-full text-xs px-1 py-1 rounded border border-outline-variant bg-surface font-medium"
                          >
                            <option value={1}>1 nivel</option>
                            <option value={2}>2 niveles</option>
                            <option value={3}>3 niveles</option>
                            <option value={4}>4 niveles</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Estado:</label>
                          <select
                            value={editRowData.estado}
                            onChange={(e) => setEditRowData({ ...editRowData, estado: e.target.value as any })}
                            className="w-full text-xs px-1 py-1 rounded border border-outline-variant bg-surface font-semibold"
                          >
                            <option value="disponible">Disponible</option>
                            <option value="ocupada">Ocupada</option>
                            <option value="en_mora">En Mora</option>
                            <option value="standby">Stand-by</option>
                            <option value="baja">Baja</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Saldo ($):</label>
                          <input
                            type="number"
                            value={editRowData.saldo_mantenimiento}
                            onChange={(e) => setEditRowData({ ...editRowData, saldo_mantenimiento: Number(e.target.value) })}
                            className="w-full text-xs px-1 py-1 rounded border border-outline-variant bg-surface font-code-cadastral text-right"
                          />
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
                  key={p.id}
                  onClick={() => handleSelectParcela(p)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-surface-container-low/40 border-outline-variant/70 hover:border-secondary/50'
                  }`}
                >
                  {/* Card Header: Nomenclatura, Sector, Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-code-cadastral font-bold text-primary text-base">
                          {p.nomenclatura}
                        </span>
                        <span className="text-[10px] text-outline font-medium px-1.5 py-0.5 rounded bg-surface border border-outline-variant">
                          Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id === 'A' ? 'A (Trad.)' : 'E (Parque)'}
                        </span>
                      </div>
                      <div className="text-[11px] text-outline">
                        Fila {p.manzana_fila || '0'} • Parcela #{p.numero_parcela || '1'}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.estado === 'standby'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : p.estado === 'ocupada'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : p.estado === 'en_mora'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : p.estado === 'disponible'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}
                    >
                      {p.estado === 'standby'
                        ? '⚠️ Stand-by (+3 años)'
                        : p.estado === 'en_mora'
                        ? 'En Mora'
                        : p.estado.toUpperCase()}
                    </span>
                  </div>

                  {/* Titular info */}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-on-surface text-sm">
                        {p.titular?.nombre_completo || '(Sin titular asignado)'}
                      </span>
                      {p.titular?.estado_vital === 'fallecido' || p.titular?.estado_titular === 'fallecido' ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                          Fallecido
                        </span>
                      ) : p.titular ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Vivo
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] font-code-cadastral text-outline">
                      {p.titular?.dni ? `DNI: ${p.titular.dni}` : 'Parcela Municipal / Sin DNI'}
                    </div>
                    {p.estado === 'standby' && (
                      <div className="text-[11px] text-rose-700 font-medium bg-rose-50 p-1.5 rounded border border-rose-200 mt-1">
                        <span className="font-bold">⚠️ Pérdida de titularidad:</span> +3 años sin pago.<br />
                        <span className="font-semibold text-on-surface">Última cuota pagada:</span> {p.ultima_cuota_pagada || (p.fecha_ultimo_pago ? `Abonada el ${p.fecha_ultimo_pago}` : 'Sin pagos registrados')}
                      </div>
                    )}
                  </div>

                  {/* Visual 3-level bars */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-surface rounded border border-outline-variant/60">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Capacidad: {ocupados}/{totalNiveles} niveles
                    </span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalNiveles }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-2 rounded-xs ${
                            idx < ocupados ? 'bg-primary' : 'bg-outline-variant/60'
                          }`}
                          title={`Nivel ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Footer: Saldo + Actions */}
                  <div
                    className="flex flex-wrap items-center justify-between pt-2 border-t border-outline-variant/40 mt-0.5 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-outline block">Saldo</span>
                      <span
                        className={`font-code-cadastral font-bold text-sm ${
                          (p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.estado === 'standby' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReactivar(p)}
                            className="h-8 px-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Reactivar Parcela tras regularización"
                          >
                            <span className="material-symbols-outlined text-[15px]">restore</span>
                            <span>Reactivar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLiberar(p)}
                            className="h-8 px-2.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Liberar Parcela y pasar a Disponible"
                          >
                            <span className="material-symbols-outlined text-[15px]">lock_open</span>
                            <span>Liberar</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            id={`btn-editar-parcela-m-${p.id}`}
                            onClick={() => startEditRow(p)}
                            className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                            title="Editar en la misma tabla"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onCobrarQR(p)}
                            className="h-8 px-2.5 rounded bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Cobrar mantenimiento con QR"
                          >
                            <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                            <span>Cobrar</span>
                          </button>
                        </>
                      )}

                      {onDeleteParcela && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Confirma eliminar la parcela ${p.nomenclatura}?`)) {
                              onDeleteParcela(p.id)
                            }
                          }}
                          className="h-8 w-8 rounded bg-red-50 hover:bg-red-100 text-error inline-flex items-center justify-center border border-red-200"
                          title="Eliminar Parcela"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP VIEW (>= md): High Density Table */}
          <div className="hidden md:block overflow-x-auto flex-1 max-h-[460px] custom-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-surface-container">
                <tr className="border-b border-outline-variant text-label-caps font-label-caps text-outline uppercase bg-surface-container">
                  <th className="py-2.5 px-3 bg-surface-container">Parcela</th>
                  <th className="py-2.5 px-3 bg-surface-container">Titular Actual</th>
                  <th className="py-2.5 px-3 bg-surface-container text-center">Ocupación / Niveles</th>
                  <th className="py-2.5 px-3 bg-surface-container">Estado</th>
                  <th className="py-2.5 px-3 bg-surface-container text-right">Saldo</th>
                  <th className="py-2.5 px-2 bg-surface-container text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-body-sm font-body-sm">
                {displayedParcelas.map((p) => {
                  const isSelected = p.id === selectedParcela?.id
                  const isEditing = editingRowId === p.id && editRowData
                  const ocupados =
                    p.espacios_ocupados || (p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0)
                  const totalNiveles = p.capacidad_total || 3

                  if (isEditing) {
                    return (
                      <tr
                        key={p.id}
                        className="bg-primary/5 border-l-4 border-l-primary"
                      >
                        {/* Nomenclatura */}
                        <td className="py-2.5 px-3">
                          <span className="font-code-cadastral text-code-cadastral font-bold block text-primary">
                            {p.nomenclatura}
                          </span>
                          <span className="text-[11px] text-outline">
                            Sec. {p.sector_id === 'SALINAS' ? 'Salinas (Panteón)' : p.sector_id === 'A' ? 'Tradicional' : 'Parque Central'}
                          </span>
                        </td>

                        {/* Titular Editable */}
                        <td className="py-2 px-3">
                          <div className="space-y-1 max-w-[220px]">
                            <input
                              type="text"
                              value={editRowData.titularNombre}
                              onChange={(e) => setEditRowData({ ...editRowData, titularNombre: e.target.value })}
                              placeholder="Nombre Titular"
                              className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editRowData.titularDni}
                                onChange={(e) => setEditRowData({ ...editRowData, titularDni: e.target.value })}
                                placeholder="DNI"
                                className="w-24 text-[11px] px-1.5 py-0.5 rounded border border-outline-variant bg-surface font-code-cadastral"
                              />
                              <select
                                value={editRowData.titularEstadoVital}
                                onChange={(e) => setEditRowData({ ...editRowData, titularEstadoVital: e.target.value as any })}
                                className="text-[11px] px-1 py-0.5 rounded border border-outline-variant bg-surface font-medium"
                              >
                                <option value="vivo">Vivo</option>
                                <option value="fallecido">Fallecido</option>
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* Capacidad Editable */}
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[10px] text-outline mb-0.5">Capacidad</span>
                            <select
                              value={editRowData.capacidad_total}
                              onChange={(e) => setEditRowData({ ...editRowData, capacidad_total: Number(e.target.value) })}
                              className="text-xs px-1.5 py-0.5 rounded border border-outline-variant bg-surface font-medium"
                            >
                              <option value={1}>1 Nivel</option>
                              <option value={2}>2 Niveles</option>
                              <option value={3}>3 Niveles</option>
                              <option value={4}>4 Niveles</option>
                            </select>
                          </div>
                        </td>

                        {/* Estado Editable */}
                        <td className="py-2 px-3">
                          <select
                            value={editRowData.estado}
                            onChange={(e) => setEditRowData({ ...editRowData, estado: e.target.value as any })}
                            className="text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-semibold"
                          >
                            <option value="disponible">Disponible</option>
                            <option value="ocupada">Ocupada</option>
                            <option value="en_mora">En Mora</option>
                            <option value="standby">Stand-by</option>
                            <option value="baja">Baja</option>
                          </select>
                        </td>

                        {/* Saldo Editable */}
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <span className="text-xs text-outline">$</span>
                            <input
                              type="number"
                              value={editRowData.saldo_mantenimiento}
                              onChange={(e) => setEditRowData({ ...editRowData, saldo_mantenimiento: Number(e.target.value) })}
                              className="w-20 text-xs text-right px-1.5 py-1 rounded border border-outline-variant bg-surface font-code-cadastral font-semibold"
                            />
                          </div>
                        </td>

                        {/* Acciones Guardar / Cancelar */}
                        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              id={`btn-guardar-parcela-${p.id}`}
                              onClick={saveEditRow}
                              title="Guardar cambios en línea"
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              id={`btn-cancelar-parcela-${p.id}`}
                              onClick={cancelEditRow}
                              title="Cancelar edición"
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant flex items-center gap-0.5 cursor-pointer"
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
                    <tr
                      key={p.id}
                      onClick={() => handleSelectParcela(p)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      {/* Nomenclatura */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-code-cadastral text-code-cadastral font-bold block ${
                            isSelected ? 'text-primary' : 'text-on-surface'
                          }`}
                        >
                          {p.nomenclatura}
                        </span>
                        <span className="text-[11px] text-outline">
                          Sec. {p.sector_id === 'SALINAS' ? 'Salinas (Panteón)' : p.sector_id === 'A' ? 'Tradicional' : 'Parque Central'}
                        </span>
                      </td>

                      {/* Titular */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-on-surface truncate max-w-[170px]">
                            {p.titular?.nombre_completo || '(Sin titular asignado)'}
                          </span>
                          {p.titular?.estado_vital === 'fallecido' || p.titular?.estado_titular === 'fallecido' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                              Fallecido
                            </span>
                          ) : p.titular ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Vivo
                            </span>
                          ) : null}
                        </div>
                        <div className="font-code-cadastral text-[11px] text-outline">
                          {p.titular?.dni ? `DNI: ${p.titular.dni}` : 'Parcela Municipal'}
                        </div>
                        {p.estado === 'standby' && (
                          <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                            Últ. cuota: {p.ultima_cuota_pagada || (p.fecha_ultimo_pago ? p.fecha_ultimo_pago : 'S/D')}
                          </div>
                        )}
                      </td>

                      {/* Ocupación / Niveles with 3 bars */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-medium text-on-surface text-[12px]">
                            {ocupados} de {totalNiveles} ocupados
                          </span>
                          <div className="flex gap-1 mt-1">
                            {Array.from({ length: totalNiveles }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-4 h-1.5 rounded-sm ${
                                  idx < ocupados ? 'bg-primary' : 'bg-outline-variant/60'
                                }`}
                                title={`Nivel ${idx + 1} ${idx < ocupados ? 'Ocupado' : 'Disponible'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            p.estado === 'standby'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : p.estado === 'ocupada'
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : p.estado === 'en_mora'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : p.estado === 'disponible'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-red-50 text-red-900 border-red-200'
                          }`}
                        >
                          {p.estado === 'standby'
                            ? '⚠️ Stand-by (+3 años)'
                            : p.estado === 'en_mora'
                            ? 'En Mora'
                            : p.estado === 'ocupada'
                            ? 'Ocupada'
                            : p.estado === 'disponible'
                            ? 'Disponible'
                            : 'Baja'}
                        </span>
                      </td>

                      {/* Saldo */}
                      <td
                        className={`py-2.5 px-3 text-right font-code-cadastral font-semibold ${
                          (p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {p.estado === 'standby' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReactivar(p)}
                                title="Reactivar Parcela (Restablecer titularidad)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[13px]">restore</span>
                                <span>Reactivar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLiberar(p)}
                                title="Liberar Parcela (Caducidad de titularidad y pase a Disponible)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-0.5 shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                <span>Liberar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                id={`btn-editar-parcela-${p.id}`}
                                onClick={() => startEditRow(p)}
                                title="Modificar directamente en la tabla"
                                className="h-7 px-2 rounded hover:bg-surface-container text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant/60"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onCobrarQR(p)}
                                title="Cobrar mantenimiento con QR"
                                className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-primary"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="qr_code_2">
                                  qr_code_2
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectParcela(p)}
                                title="Ver detalle de difuntos"
                                className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-outline"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="visibility">
                                  visibility
                                </span>
                              </button>
                            </>
                          )}
                          {onDeleteParcela && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Confirma eliminar la parcela ${p.nomenclatura}?`)) {
                                  onDeleteParcela(p.id)
                                }
                              }}
                              title="Eliminar Parcela"
                              className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-red-50 text-error"
                            >
                              <span className="material-symbols-outlined text-[18px]" data-icon="delete">
                                delete
                              </span>
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

          {/* Table Footer: Totals & Pagination Controls */}
          <div className="p-2.5 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="font-medium text-on-surface text-xs sm:text-sm">
                {pageSize === 'todas'
                  ? `Mostrando todas las ${filteredParcelas.length} parcelas`
                  : `Mostrando ${(currentPage - 1) * (pageSize as number) + 1} - ${Math.min(
                      currentPage * (pageSize as number),
                      filteredParcelas.length
                    )} de ${filteredParcelas.length} parcelas`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] text-outline hidden sm:inline">Mostrar:</span>
              <button
                type="button"
                onClick={() => setPageSize('todas')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 'todas'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                Todas ({filteredParcelas.length})
              </button>
              <button
                type="button"
                onClick={() => setPageSize(100)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 100
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                100
              </button>
              <button
                type="button"
                onClick={() => setPageSize(50)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 50
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                50
              </button>

              {pageSize !== 'todas' && totalPages > 1 && (
                <div className="flex items-center gap-1 ml-2 border-l border-outline-variant pl-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Página Anterior"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-mono px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Página Siguiente"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FICHA RÁPIDA INFERIOR (Stitch Verbatim: Detalle de parcela y difuntos)    */}
        {/* ========================================================================= */}
        {selectedParcela && (
          <div className="bg-surface-container-lowest rounded border border-outline-variant p-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-outline-variant">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]" data-icon="inventory_2">
                  inventory_2
                </span>
                <h3 className="text-title-md font-title-md text-on-surface font-semibold">
                  Ficha Rápida: Parcela{' '}
                  <span className="font-code-cadastral text-primary">{selectedParcela.nomenclatura}</span>
                </h3>
                <span className="text-body-sm text-outline">
                  ({selectedParcela.espacios_ocupados || (selectedParcela.estado === 'ocupada' ? 1 : 0)}/
                  {selectedParcela.capacidad_total || 3} Ocupados)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNuevaInhumacionParaParcela) {
                    onNuevaInhumacionParaParcela(selectedParcela.nomenclatura)
                  }
                }}
                className="h-8 px-3 rounded text-body-sm font-semibold bg-secondary hover:bg-primary text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]" data-icon="add_circle">
                  add_circle
                </span>
                <span className="hidden sm:inline">Registrar Nueva Inhumación en esta Parcela</span>
                <span className="sm:hidden">Nueva Inhumación</span>
              </button>
            </div>

            {/* Alerta Destacada de Stand-by en Ficha Rápida */}
            {selectedParcela.estado === 'standby' && (
              <div className="mb-3.5 p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-600 text-[24px] mt-0.5 shrink-0">
                    warning
                  </span>
                  <div>
                    <h4 className="text-body-md font-bold text-rose-900 flex items-center gap-2 flex-wrap">
                      <span>Parcela en Stand-by por Deuda de Mantenimiento (+3 Años)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                        Titularidad Suspendida
                      </span>
                    </h4>
                    <p className="text-body-sm text-rose-800 mt-0.5">
                      Esta parcela ha entrado en suspensión preventiva tras acumular más de 3 años de mora en tasas de mantenimiento.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-rose-900 font-medium">
                      <span className="bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                        <strong>Última cuota pagada:</strong> {selectedParcela.ultima_cuota_pagada || (selectedParcela.fecha_ultimo_pago ? selectedParcela.fecha_ultimo_pago : 'Sin pagos registrados')}
                      </span>
                      {selectedParcela.saldo_mantenimiento && selectedParcela.saldo_mantenimiento > 0 ? (
                        <span className="bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                          <strong>Deuda estimada:</strong> ${selectedParcela.saldo_mantenimiento.toLocaleString('es-AR')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleReactivar(selectedParcela)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">restore</span>
                    <span>Reactivar Parcela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLiberar(selectedParcela)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock_open</span>
                    <span>Liberar Parcela</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Deceased in this plot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {difuntosEnParcela.length > 0 ? (
                difuntosEnParcela.map((dif, idx) => (
                  <div
                    key={dif.id}
                    className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N{dif.nivel_posicion || idx + 1}
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">{dif.nombre_difunto}</h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: {dif.fecha_inhumacion?.slice(0, 10)}</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">{dif.causa_defuncion || 'Causa Natural'}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                        dif.es_covid
                          ? 'text-[#5B21B6] bg-[#F5F3FF] border-[#DDD6FE]'
                          : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {dif.es_covid ? 'COVID-19' : 'Regular'}
                    </span>
                  </div>
                ))
              ) : (
                /* Fallback Stitch Mock Data si no hay difunto registrado para ver la estructura */
                <>
                  <div className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N1
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">
                          {selectedParcela.titular?.nombre_completo || 'Fernández Morales, Ernesto'}
                        </h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: 14/06/1998</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">Acta #451-B</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Regular
                    </span>
                  </div>

                  <div className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N2
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">
                          Morales de Fernández, Carmen Rosa
                        </h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: 09/11/2017</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">Acta #882-C</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Regular
                    </span>
                  </div>
                </>
              )}

              {/* Nivel 3 (Disponible) Stitch Card */}
              <div className="md:col-span-2 p-2 rounded border border-dashed border-outline-variant bg-surface-bright flex items-center justify-between text-body-sm text-outline">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded border border-dashed border-outline-variant flex items-center justify-center font-code-cadastral text-[12px] font-medium text-outline">
                    N3
                  </span>
                  <span className="font-medium text-on-surface-variant">
                    Nivel Superior Disponible para futura asignación familiar
                  </span>
                </div>
                <span className="font-code-cadastral text-[12px] text-primary font-semibold">
                  Espacio Apto
                </span>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Parcela, Inhumacion, EstadoTitular } from '../../types/database'
import { formatCurrency, formatDateHour } from '../../lib/formatters'
import { reactivarParcelaStandby, liberarParcelaStandby } from '../../services/dataService'
import { ParcelaForm } from '../forms/ParcelaForm'

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
  onRefresh?: () => void
  isRefreshing?: boolean
}

function compareNaturalParcela(a: string, b: string): number {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })
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
  onRefresh,
  isRefreshing = false,
}) => {
  const [filterSector, setFilterSector] = useState<'todos' | 'A' | 'E' | 'SALINAS' | 'mora' | 'standby' | 'baja_libre' | 'baja_inhumados'>('todos')
  const [filterTitularVital, setFilterTitularVital] = useState<'todos' | 'vivo' | 'fallecido'>('todos')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState<'todas' | 50 | 100>('todas')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOption, setSortOption] = useState<string>('parcela-asc')
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(
    parcelas.length > 0 ? parcelas[0].id : null
  )

  // Estado Modal de Edición de Parcela (Requerimiento explícito: editar a través de un modal)
  const [modalEditParcela, setModalEditParcela] = useState<Parcela | null>(null)

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

  // Mapa de conteo de inhumaciones por parcela
  const inhumadosMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const inh of inhumaciones) {
      const nom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
      if (nom) {
        map.set(nom, (map.get(nom) || 0) + 1)
      }
    }
    return map
  }, [inhumaciones])

  // Filtrado de parcelas
  const filteredParcelas = parcelas.filter((p) => {
    if (filterSector !== 'todos') {
      if (filterSector === 'mora') {
        if (p.estado !== 'en_mora' && (p.saldo_mantenimiento || 0) <= 0) return false
      } else if (filterSector === 'standby') {
        if (p.estado !== 'standby') return false
      } else if (filterSector === 'baja_libre') {
        const esBaja = p.estado === 'baja' || p.estado === 'standby'
        const hasInh = (inhumadosMap.get(p.nomenclatura) || 0) > 0
        if (!esBaja || hasInh) return false
      } else if (filterSector === 'baja_inhumados') {
        const esBaja = p.estado === 'baja' || p.estado === 'standby'
        const hasInh = (inhumadosMap.get(p.nomenclatura) || 0) > 0
        if (!esBaja || !hasInh) return false
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
      if (!nom.includes(q) && !titular.includes(q) && !dni.includes(q) && !dir.includes(q)) {
        return false
      }
    }

    if (filterFechaDesde) {
      const pDate = p.created_at || p.fecha_adquisicion
      if (!pDate || pDate.slice(0, 10) < filterFechaDesde) return false
    }

    if (filterFechaHasta) {
      const pDate = p.created_at || p.fecha_adquisicion
      if (!pDate || pDate.slice(0, 10) > filterFechaHasta) return false
    }

    return true
  })

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSector, filterTitularVital, searchTerm, pageSize, sortOption, filterFechaDesde, filterFechaHasta])

  // Ordenamiento dinámico de parcelas por columnas
  const sortedParcelas: Parcela[] = useMemo(() => {
    return [...filteredParcelas].sort((a, b) => {
      if (sortOption === 'parcela-asc' || sortOption === 'nomenclatura-asc') {
        return compareNaturalParcela(a.nomenclatura, b.nomenclatura)
      }
      if (sortOption === 'parcela-desc' || sortOption === 'nomenclatura-desc') {
        return compareNaturalParcela(b.nomenclatura, a.nomenclatura)
      }
      if (sortOption === 'alfa-asc' || sortOption === 'titular-asc') {
        const nomA = a.titular?.nombre_completo || 'ZZZ'
        const nomB = b.titular?.nombre_completo || 'ZZZ'
        return nomA.localeCompare(nomB)
      }
      if (sortOption === 'alfa-desc' || sortOption === 'titular-desc') {
        const nomA = a.titular?.nombre_completo || ''
        const nomB = b.titular?.nombre_completo || ''
        return nomB.localeCompare(nomA)
      }
      if (sortOption === 'sector-asc') {
        return (a.sector_id || '').localeCompare(b.sector_id || '')
      }
      if (sortOption === 'sector-desc') {
        return (b.sector_id || '').localeCompare(a.sector_id || '')
      }
      if (sortOption === 'fila-asc') {
        const fA = parseInt(a.manzana_fila || '0', 10) || 0
        const fB = parseInt(b.manzana_fila || '0', 10) || 0
        return fA !== fB ? fA - fB : (a.manzana_fila || '').localeCompare(b.manzana_fila || '')
      }
      if (sortOption === 'fila-desc') {
        const fA = parseInt(a.manzana_fila || '0', 10) || 0
        const fB = parseInt(b.manzana_fila || '0', 10) || 0
        return fA !== fB ? fB - fA : (b.manzana_fila || '').localeCompare(a.manzana_fila || '')
      }
      if (sortOption === 'ocupacion-asc') {
        const oA = a.espacios_ocupados || (a.estado === 'ocupada' ? 1 : 0)
        const oB = b.espacios_ocupados || (b.estado === 'ocupada' ? 1 : 0)
        return oA - oB
      }
      if (sortOption === 'ocupacion-desc') {
        const oA = a.espacios_ocupados || (a.estado === 'ocupada' ? 1 : 0)
        const oB = b.espacios_ocupados || (b.estado === 'ocupada' ? 1 : 0)
        return oB - oA
      }
      if (sortOption === 'estado-asc') {
        return (a.estado || '').localeCompare(b.estado || '')
      }
      if (sortOption === 'estado-desc') {
        return (b.estado || '').localeCompare(a.estado || '')
      }
      if (sortOption === 'deuda-desc' || sortOption === 'saldo-desc') {
        return (b.saldo_mantenimiento || 0) - (a.saldo_mantenimiento || 0)
      }
      if (sortOption === 'deuda-asc' || sortOption === 'saldo-asc') {
        return (a.saldo_mantenimiento || 0) - (b.saldo_mantenimiento || 0)
      }
      if (sortOption === 'fecha-desc') {
        const dateA = (a.created_at || a.fecha_adquisicion) ? new Date(a.created_at || a.fecha_adquisicion!).getTime() : 0
        const dateB = (b.created_at || b.fecha_adquisicion) ? new Date(b.created_at || b.fecha_adquisicion!).getTime() : 0
        return dateB - dateA
      }
      if (sortOption === 'fecha-asc') {
        const dateA = (a.created_at || a.fecha_adquisicion) ? new Date(a.created_at || a.fecha_adquisicion!).getTime() : 0
        const dateB = (b.created_at || b.fecha_adquisicion) ? new Date(b.created_at || b.fecha_adquisicion!).getTime() : 0
        return dateA - dateB
      }
      return compareNaturalParcela(a.nomenclatura, b.nomenclatura)
    })
  }, [filteredParcelas, sortOption])

  const totalPages = pageSize === 'todas' ? 1 : Math.ceil(sortedParcelas.length / pageSize)
  const displayedParcelas =
    pageSize === 'todas'
      ? sortedParcelas
      : sortedParcelas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Selected Parcela Object
  const selectedParcela = parcelas.find((p) => p.id === selectedParcelaId) || sortedParcelas[0] || parcelas[0]

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
  const countBajaLibre = parcelas.filter((p) => {
    const esBaja = p.estado === 'baja' || p.estado === 'standby'
    const hasInh = (inhumadosMap.get(p.nomenclatura) || 0) > 0
    return esBaja && !hasInh
  }).length
  const countBajaInhumados = parcelas.filter((p) => {
    const esBaja = p.estado === 'baja' || p.estado === 'standby'
    const hasInh = (inhumadosMap.get(p.nomenclatura) || 0) > 0
    return esBaja && hasInh
  }).length

  return (
    <div className="w-full h-full flex flex-col overflow-hidden space-y-1.5 sm:space-y-3">
      {/* Search & Filter Toolbar (Shrink-0: Pinned at top of view) */}
      <div className="bg-surface-container-lowest rounded border border-outline-variant p-2 sm:p-3 shadow-sm shrink-0 flex flex-col gap-1.5 sm:gap-2.5">

        {/* MOBILE VIEW (< sm): Ultra-compact 2-row Toolbar */}
        <div className="sm:hidden flex flex-col gap-1.5">
          {/* Row 1: Title & Count + Search Input + Nueva Parcela Button */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">domain</span>
              <span className="font-bold text-xs text-primary whitespace-nowrap">Padrón</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {filteredParcelas.length}
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative flex-1 min-w-0">
              <span
                className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[14px]"
                data-icon="search"
              >
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar parcela o titular..."
                className="w-full h-7 pl-6 pr-6 text-[11px] bg-surface-container-low border border-outline-variant rounded focus:border-secondary focus:bg-white focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              )}
            </div>

            {/* Botoncito Actualizar Mobile */}
            {onRefresh && (
              <button
                id="btn-refresh-parcelas-mobile"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-7 w-7 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container text-primary flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
                title="Actualizar datos con la base de datos"
              >
                <span className={`material-symbols-outlined text-[15px] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
              </button>
            )}

            {/* Nueva Parcela Button */}
            {onNuevaParcela && (
              <button
                type="button"
                onClick={onNuevaParcela}
                className="h-7 px-2 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-[11px] rounded flex items-center gap-0.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                title="Nueva Parcela"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Nueva</span>
              </button>
            )}
          </div>

          {/* Row 2: Unified Horizontal Scrollable Chips (Sectores + Condición Vital) */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-0.5 w-full text-[10px]">
            <button
              type="button"
              onClick={() => setFilterSector('todos')}
              className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'todos'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              Todos ({parcelas.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSector('A')}
              className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'A'
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              Sec. A ({countSecA})
            </button>
            <button
              type="button"
              onClick={() => setFilterSector('E')}
              className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'E'
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              Sec. E ({countSecE})
            </button>
            <button
              type="button"
              onClick={() => setFilterSector('SALINAS')}
              className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'SALINAS'
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              Salinas ({countSalinas})
            </button>
            <button
              type="button"
              onClick={() => setFilterSector('mora')}
              className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'mora'
                  ? 'border-amber-600 bg-amber-600 text-white font-semibold'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              Mora ({countMora})
            </button>
            <button
              id="btn-filtro-sector-standby-mobile"
              type="button"
              onClick={() => setFilterSector('standby')}
              className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'standby'
                  ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                  : 'border-rose-300 bg-rose-50 text-rose-900'
              }`}
            >
              Stand-by ({countStandby})
            </button>
            <button
              id="btn-filtro-baja-libre-mobile"
              type="button"
              onClick={() => setFilterSector('baja_libre')}
              className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'baja_libre'
                  ? 'border-emerald-600 bg-emerald-600 text-white font-semibold'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900'
              }`}
            >
              Baja Libre ({countBajaLibre})
            </button>
            <button
              id="btn-filtro-baja-inhumados-mobile"
              type="button"
              onClick={() => setFilterSector('baja_inhumados')}
              className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 transition-colors ${
                filterSector === 'baja_inhumados'
                  ? 'border-purple-600 bg-purple-600 text-white font-semibold'
                  : 'border-purple-300 bg-purple-50 text-purple-900'
              }`}
            >
              Baja c/ Inh ({countBajaInhumados})
            </button>

            <span className="h-3 w-px bg-outline-variant shrink-0 mx-0.5" />

            <button
              type="button"
              onClick={() => setFilterTitularVital('todos')}
              className={`px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 transition-colors ${
                filterTitularVital === 'todos'
                  ? 'bg-primary text-white font-semibold'
                  : 'bg-surface-container text-on-surface'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterTitularVital('vivo')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                filterTitularVital === 'vivo'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Vivos</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTitularVital('fallecido')}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                filterTitularVital === 'fallecido'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>Fallecidos</span>
            </button>
          </div>
        </div>

        {/* DESKTOP VIEW (>= sm): Consolidated 2-Row Toolbar */}
        <div className="hidden sm:flex flex-col gap-2">
          {/* Row 1: Título + Búsqueda Rápida + Botón Nueva Parcela */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-primary text-[22px]">domain</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-headline-sm font-semibold text-on-surface leading-tight">Padrón de Parcelas</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {parcelas.length}
                </span>
              </div>
            </div>

            {/* Quick Search Cadastral Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span
                className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]"
                data-icon="search"
              >
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por parcela (ej. A-25), apellido titular o DNI..."
                className="w-full h-8 pl-8 pr-8 text-xs bg-surface-container-low border border-outline-variant rounded focus:border-secondary focus:bg-white focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Filtro por Rango de Fechas (Desde - Hasta) */}
            <div className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-lg border border-outline-variant text-xs shrink-0">
              <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Desde:</span>
              <input
                id="filter-fecha-desde-parcelas"
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="h-6 text-[11px] bg-white border border-outline-variant rounded px-1.5 focus:border-secondary focus:outline-none"
                title="Filtrar parcelas desde fecha de registro"
              />
              <span className="text-[11px] text-on-surface-variant font-medium">Hasta:</span>
              <input
                id="filter-fecha-hasta-parcelas"
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="h-6 text-[11px] bg-white border border-outline-variant rounded px-1.5 focus:border-secondary focus:outline-none"
                title="Filtrar parcelas hasta fecha de registro"
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

            {/* Ordenar por Alfabeto o Fecha */}
            <div className="flex items-center gap-1 text-xs shrink-0">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="h-8 text-xs bg-white border border-outline-variant rounded px-2 py-1 focus:border-secondary font-medium text-slate-800 cursor-pointer"
                title="Ordenar parcelas"
              >
                <option value="parcela-asc">📍 Parcela (A → Z)</option>
                <option value="parcela-desc">📍 Parcela (Z → A)</option>
                <option value="alfa-asc">🔤 Titular: A → Z</option>
                <option value="alfa-desc">🔤 Titular: Z → A</option>
                <option value="sector-asc">🏛️ Sector</option>
                <option value="fila-asc">🔢 Fila / Nro</option>
                <option value="deuda-desc">💰 Mayor deuda</option>
                <option value="saldo-asc">💰 Menor deuda (Al día)</option>
                <option value="fecha-desc">📅 Fecha: Más reciente</option>
                <option value="fecha-asc">📅 Fecha: Más antiguo</option>
              </select>
            </div>

            {/* Botón pequeño para refrescar / sincronizar con Supabase Cloud */}
            {onRefresh && (
              <button
                id="btn-refresh-parcelas"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
                title="Actualizar y sincronizar parcelas con la base de datos"
              >
                <span
                  className={`material-symbols-outlined text-[16px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                >
                  sync
                </span>
                <span className="hidden xl:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            )}

            {onNuevaParcela && (
              <button
                id="btn-nueva-parcela"
                type="button"
                onClick={onNuevaParcela}
                className="h-8 px-3 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Nueva Parcela</span>
              </button>
            )}
          </div>

          {/* Row 2: Sectores + Condición Vital */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-outline-variant/60 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto custom-scroll">
              <button
                type="button"
                onClick={() => setFilterSector('todos')}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'standby'
                    ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                    : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                ⚠️ Stand-by ({countStandby})
              </button>
              <button
                id="btn-filtro-baja-libre"
                type="button"
                onClick={() => setFilterSector('baja_libre')}
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'baja_libre'
                    ? 'border-emerald-600 bg-emerald-600 text-white font-semibold'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                🍃 Baja Libre ({countBajaLibre})
              </button>
              <button
                id="btn-filtro-baja-inhumados"
                type="button"
                onClick={() => setFilterSector('baja_inhumados')}
                className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'baja_inhumados'
                    ? 'border-purple-600 bg-purple-600 text-white font-semibold'
                    : 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100'
                }`}
              >
                🪦 Baja c/ Inhumados ({countBajaInhumados})
              </button>

              <span className="h-4 w-px bg-outline-variant/60 mx-1 shrink-0"></span>

              {/* Titular Vital Condition Filter */}
              <div className="flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded border border-outline-variant shrink-0">
                <button
                  id="btn-filtro-vital-todos"
                  type="button"
                  onClick={() => setFilterTitularVital('todos')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
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
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
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
                  className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
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

            {/* Quick Counter Metric */}
            <span className="text-xs font-code-cadastral text-outline shrink-0 hidden lg:inline">
              {filteredParcelas.length} parcelas listadas
            </span>
          </div>
        </div>
      </div>

      {/* Parcel List / Interactive Data Grid & Mobile Cards */}
      <div className="bg-surface-container-lowest rounded border border-outline-variant shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Subheader: Hidden on mobile (< sm) so cards start right under the toolbar */}
        <div className="hidden sm:flex px-2.5 py-1.5 sm:px-3 sm:py-2 bg-surface-container-low border-b border-outline-variant items-center justify-between shrink-0">
          <span className="text-[11px] sm:text-label-caps font-semibold uppercase text-outline">
            Listado de Parcelas Dinámico
          </span>
          <span className="text-[10px] sm:text-[11px] text-outline">
            {filteredParcelas.length} parcelas listadas
          </span>
        </div>

        {/* MOBILE VIEW (< md): Responsive Interactive Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll">
            {displayedParcelas.map((p, index) => {
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

              const isEven = index % 2 === 0

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectParcela(p)}
                  onDoubleClick={() => setModalEditParcela(p)}
                  title="Doble clic para modificar parcela"
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                      : isEven
                      ? 'bg-white border-slate-200/90 shadow-xs hover:border-primary/50'
                      : 'bg-[#eaf0f6] border-slate-200/90 shadow-xs hover:border-primary/50'
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
                        p.estado === 'standby' || p.estado === 'baja'
                          ? (inhumadosMap.get(p.nomenclatura) || 0) > 0
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : p.estado === 'ocupada'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : p.estado === 'en_mora'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : p.estado === 'disponible'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}
                    >
                      {p.estado === 'standby' || p.estado === 'baja'
                        ? (inhumadosMap.get(p.nomenclatura) || 0) > 0
                          ? `Baja (c/ Inhumados)`
                          : `Baja Libre`
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
                    <div className="text-[10px] font-code-cadastral text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-outline">schedule</span>
                      <span>Alta: {formatDateHour(p.created_at || p.fecha_adquisicion)}</span>
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
                      <button
                        type="button"
                        id={`btn-editar-parcela-m-${p.id}`}
                        onClick={() => setModalEditParcela(p)}
                        className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant cursor-pointer"
                        title="Editar Parcela en Modal"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Editar</span>
                      </button>

                      {p.estado === 'standby' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReactivar(p)}
                            className="h-8 px-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Reactivar Parcela tras regularización"
                          >
                            <span className="material-symbols-outlined text-[15px]">restore</span>
                            <span>Reactivar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLiberar(p)}
                            className="h-8 px-2.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
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
                            onClick={() => onCobrarQR(p)}
                            className="h-8 px-2.5 rounded bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
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
          <div className="hidden md:block overflow-x-auto flex-1 min-h-0 custom-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="text-label-caps font-label-caps text-slate-700 uppercase bg-slate-100 select-none">
                  <th
                    onClick={() => setSortOption((prev) => (prev === 'alfa-asc' ? 'alfa-desc' : 'alfa-asc'))}
                    className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                    title="Ordenar por Titular Actual (A-Z / Z-A)"
                  >
                    <div className="flex items-center gap-1">
                      <span>Titular Actual</span>
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
                      <span>Parcela</span>
                      {(sortOption === 'parcela-asc' || sortOption === 'nomenclatura-asc') && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                      {(sortOption === 'parcela-desc' || sortOption === 'nomenclatura-desc') && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                    </div>
                  </th>
                  <th
                    onClick={() => setSortOption((prev) => (prev === 'ocupacion-desc' ? 'ocupacion-asc' : 'ocupacion-desc'))}
                    className="py-2.5 px-3 bg-slate-100 text-center cursor-pointer hover:bg-slate-200 transition-colors"
                    title="Ordenar por Ocupación / Niveles"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Ocupación / Niveles</span>
                      {sortOption === 'ocupacion-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                      {sortOption === 'ocupacion-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    </div>
                  </th>
                  <th
                    onClick={() => setSortOption((prev) => (prev === 'estado-asc' ? 'estado-desc' : 'estado-asc'))}
                    className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                    title="Ordenar por Estado"
                  >
                    <div className="flex items-center gap-1">
                      <span>Estado</span>
                      {sortOption === 'estado-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                      {sortOption === 'estado-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                    </div>
                  </th>
                  <th
                    onClick={() => setSortOption((prev) => (prev === 'fecha-desc' ? 'fecha-asc' : 'fecha-desc'))}
                    className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                    title="Ordenar por Fecha y Hora de Registro"
                  >
                    <div className="flex items-center gap-1">
                      <span>Fecha / Registro</span>
                      {sortOption === 'fecha-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                      {sortOption === 'fecha-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    </div>
                  </th>
                  <th
                    onClick={() => setSortOption((prev) => (prev === 'deuda-desc' ? 'saldo-asc' : 'deuda-desc'))}
                    className="py-2.5 px-3 bg-slate-100 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                    title="Ordenar por Saldo (Mayor / Menor Deuda)"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Saldo</span>
                      {(sortOption === 'deuda-desc' || sortOption === 'saldo-desc') && <span className="material-symbols-outlined text-[13px] text-red-600">arrow_downward</span>}
                      {(sortOption === 'deuda-asc' || sortOption === 'saldo-asc') && <span className="material-symbols-outlined text-[13px] text-emerald-600">arrow_upward</span>}
                    </div>
                  </th>
                  <th className="py-2.5 px-2 bg-slate-100 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-body-sm font-body-sm">
                {displayedParcelas.map((p, index) => {
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

                        {/* Nomenclatura */}
                        <td className="py-2.5 px-3">
                          <span className="font-code-cadastral text-code-cadastral font-bold block text-primary">
                            {p.nomenclatura}
                          </span>
                          <span className="text-[11px] text-outline">
                            Sec. {p.sector_id === 'SALINAS' ? 'Salinas (Panteón)' : p.sector_id === 'A' ? 'Tradicional' : 'Parque Central'}
                          </span>
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

                        {/* Fecha Registro */}
                        <td className="py-2 px-3 text-xs text-outline font-code-cadastral whitespace-nowrap">
                          {formatDateHour(p.created_at || p.fecha_adquisicion)}
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

                  const isEven = index % 2 === 0

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectParcela(p)}
                      onDoubleClick={() => setModalEditParcela(p)}
                      title="Doble clic para modificar los datos de la parcela"
                      className={`transition-colors cursor-pointer border-b border-slate-200/80 ${
                        isSelected
                          ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary font-medium'
                          : isEven
                          ? 'bg-white hover:bg-blue-50/80'
                          : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                      }`}
                    >
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
                            p.estado === 'standby' || p.estado === 'baja'
                              ? (inhumadosMap.get(p.nomenclatura) || 0) > 0
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : p.estado === 'ocupada'
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : p.estado === 'en_mora'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : p.estado === 'disponible'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-red-50 text-red-900 border-red-200'
                          }`}
                        >
                          {p.estado === 'standby' || p.estado === 'baja'
                            ? (inhumadosMap.get(p.nomenclatura) || 0) > 0
                              ? 'Baja (c/ Inhumados)'
                              : 'Baja Libre'
                            : p.estado === 'en_mora'
                            ? 'En Mora'
                            : p.estado === 'ocupada'
                            ? 'Ocupada'
                            : p.estado === 'disponible'
                            ? 'Disponible'
                            : 'Baja'}
                        </span>
                      </td>

                      {/* Fecha / Registro */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs text-on-surface-variant font-code-cadastral">
                        {formatDateHour(p.created_at || p.fecha_adquisicion)}
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
                          <button
                            type="button"
                            id={`btn-editar-parcela-${p.id}`}
                            onClick={() => setModalEditParcela(p)}
                            title="Editar Parcela en Modal"
                            className="h-7 px-2 rounded hover:bg-surface-container text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant/60 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Editar</span>
                          </button>

                          {p.estado === 'standby' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReactivar(p)}
                                title="Reactivar Parcela (Restablecer titularidad)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">restore</span>
                                <span>Reactivar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLiberar(p)}
                                title="Liberar Parcela (Caducidad de titularidad y pase a Disponible)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                <span>Liberar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onCobrarQR(p)}
                                title="Cobrar mantenimiento con QR"
                                className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-primary cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="qr_code_2">
                                  qr_code_2
                                </span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setModalEditParcela(p)}
                            title="Ver y editar detalles de parcela"
                            className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-outline cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon="visibility">
                              visibility
                            </span>
                          </button>
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
          <div className="shrink-0 p-2 sm:p-2.5 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
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

      {/* Modal de Edición de Parcela (Requerimiento explícito: editar a través de un modal) */}
      {modalEditParcela && (
        <ParcelaForm
          initialData={modalEditParcela}
          inhumaciones={inhumaciones}
          onSave={(updated) => {
            onSaveParcela(updated)
            setModalEditParcela(null)
          }}
          onCancel={() => setModalEditParcela(null)}
          onNuevaInhumacionParaParcela={onNuevaInhumacionParaParcela}
        />
      )}
    </div>
  )
}

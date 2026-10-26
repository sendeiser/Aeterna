import React, { useState, useMemo } from 'react'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { DetalleCuotaModal } from '../modals/DetalleCuotaModal'
import { TalonarioRecibosModal } from '../modals/TalonarioRecibosModal'
import { PlanillaRutaModal } from '../modals/PlanillaRutaModal'
import { evaluarMoraAfiliado } from '../../lib/reglasNegocio'

interface AfiliadosSeguroViewProps {
  afiliados: (AfiliadoSeguro & { cuotasPagadas?: number[] })[]
  onCobrarCuota: (afiliado: AfiliadoSeguro, nroCuota: number) => void
  onCobrarMultiplesCuotas?: (afiliado: AfiliadoSeguro, nrosCuotas: number[]) => void
  onRevertirCuota?: (afiliadoId: string, nroCuota: number) => void
  onNuevoAfiliado: () => void
  onEditarAfiliado: (afiliado: AfiliadoSeguro) => void
  onSaveAfiliado?: (afiliado: Partial<AfiliadoSeguro>) => void
  onEliminarAfiliado?: (id: string) => void
}

export const AfiliadosSeguroView: React.FC<AfiliadosSeguroViewProps> = ({
  afiliados,
  onCobrarCuota,
  onCobrarMultiplesCuotas,
  onRevertirCuota,
  onNuevoAfiliado,
  onEditarAfiliado,
  onSaveAfiliado,
  onEliminarAfiliado,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'deuda' | 'aldia' | 'standby'>('all')
  const [sortOption, setSortOption] = useState<string>('numero-asc')
  const [isTalonarioModalOpen, setIsTalonarioModalOpen] = useState(false)
  const [isPlanillaModalOpen, setIsPlanillaModalOpen] = useState(false)

  const [modalDetalleCuota, setModalDetalleCuota] = useState<{
    isOpen: boolean
    afiliado: AfiliadoSeguro | null
    mes: number
    detalle: any
  }>({
    isOpen: false,
    afiliado: null,
    mes: 1,
    detalle: null,
  })

  // Estado de edición en línea en la misma tabla
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editRowData, setEditRowData] = useState<{
    id: string
    nombre_completo: string
    dni: string
    direccion_cobro: string
    zona_cobro: string
    monto_cuota_mensual: number
    estado: string
  } | null>(null)

  const startEditRow = (afiliado: AfiliadoSeguro) => {
    setEditingRowId(afiliado.id)
    setEditRowData({
      id: afiliado.id,
      nombre_completo: afiliado.nombre_completo,
      dni: afiliado.dni || '',
      direccion_cobro: afiliado.direccion_cobro || '',
      zona_cobro: afiliado.zona_cobro || '',
      monto_cuota_mensual: afiliado.monto_cuota_mensual || 0,
      estado: afiliado.estado || 'activo',
    })
  }

  const cancelEditRow = () => {
    setEditingRowId(null)
    setEditRowData(null)
  }

  const saveEditRow = () => {
    if (!editRowData) return
    if (!editRowData.nombre_completo.trim()) {
      alert('Por favor ingrese el nombre del afiliado.')
      return
    }

    const original = afiliados.find((a) => a.id === editRowData.id)
    if (!original) return

    const updated: AfiliadoSeguro = {
      ...original,
      nombre_completo: editRowData.nombre_completo.trim(),
      dni: editRowData.dni.trim(),
      direccion_cobro: editRowData.direccion_cobro.trim(),
      zona_cobro: editRowData.zona_cobro.trim(),
      monto_cuota_mensual: Number(editRowData.monto_cuota_mensual) || 0,
      estado: editRowData.estado as any,
    }

    if (onSaveAfiliado) {
      onSaveAfiliado(updated)
    } else {
      onEditarAfiliado(updated)
    }
    setEditingRowId(null)
    setEditRowData(null)
  }

  const handleVerDetalleCuota = (afiliado: AfiliadoSeguro, mes: number) => {
    const detalle = (afiliado.cuotasDetalle || []).find((c) => c.mes === mes || (c as any).nro_cuota === mes)
    setModalDetalleCuota({
      isOpen: true,
      afiliado,
      mes,
      detalle: detalle
        ? {
            nroRecibo: detalle.nro_recibo,
            fechaPago: detalle.fecha_pago,
            metodoPago: detalle.metodo_pago,
            monto: detalle.monto,
          }
        : null,
    })
  }

  const meses = [
    { num: 1, label: 'Ene' },
    { num: 2, label: 'Feb' },
    { num: 3, label: 'Mar' },
    { num: 4, label: 'Abr' },
    { num: 5, label: 'May' },
    { num: 6, label: 'Jun' },
    { num: 7, label: 'Jul' },
    { num: 8, label: 'Ago' },
    { num: 9, label: 'Sep' },
    { num: 10, label: 'Oct' },
    { num: 11, label: 'Nov' },
    { num: 12, label: 'Dic' },
  ]

  // Métricas
  const totalAfiliados = afiliados.length
  const mesActual = 3 // Marzo
  const afiliadosAlDia = afiliados.filter((a) => a.estado === 'activo').length
  const afiliadosDeuda = totalAfiliados - afiliadosAlDia
  const afiliadosStandby = afiliados.filter((a) => evaluarMoraAfiliado(a, mesActual, 2026).enStandby).length

  // Filtrado y ordenamiento dinámico
  const filtered: (AfiliadoSeguro & { cuotasPagadas?: number[] })[] = useMemo(() => {
    let list = afiliados.filter((a) => {
      if (zoneFilter !== 'all') {
        if (!a.zona_cobro?.toLowerCase().includes(zoneFilter.toLowerCase())) return false
      }
      if (statusFilter === 'deuda' && a.estado === 'activo') return false
      if (statusFilter === 'aldia' && a.estado !== 'activo') return false
      if (statusFilter === 'standby' && !evaluarMoraAfiliado(a, mesActual, 2026).enStandby) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const nro = a.numero_afiliado.toString()
        const nom = a.nombre_completo.toLowerCase()
        const dir = (a.direccion_cobro || '').toLowerCase()
        const dni = (a.dni || '').toLowerCase()
        return nro.includes(q) || nom.includes(q) || dir.includes(q) || dni.includes(q)
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortOption === 'numero-asc') {
        return (Number(a.numero_afiliado) || 0) - (Number(b.numero_afiliado) || 0)
      }
      if (sortOption === 'numero-desc') {
        return (Number(b.numero_afiliado) || 0) - (Number(a.numero_afiliado) || 0)
      }
      if (sortOption === 'alfa-asc' || sortOption === 'titular-asc') {
        return a.nombre_completo.localeCompare(b.nombre_completo)
      }
      if (sortOption === 'alfa-desc' || sortOption === 'titular-desc') {
        return b.nombre_completo.localeCompare(a.nombre_completo)
      }
      if (sortOption === 'dni-asc') {
        return (a.dni || '').localeCompare(b.dni || '')
      }
      if (sortOption === 'dni-desc') {
        return (b.dni || '').localeCompare(a.dni || '')
      }
      if (sortOption === 'cuota-desc') {
        return (b.monto_cuota_mensual || 0) - (a.monto_cuota_mensual || 0)
      }
      if (sortOption === 'cuota-asc') {
        return (a.monto_cuota_mensual || 0) - (b.monto_cuota_mensual || 0)
      }
      if (sortOption === 'deuda-desc' || sortOption === 'saldo-desc') {
        const moraA = [1, 2, 3].filter((m) => !(a.cuotasPagadas || []).includes(m)).length * a.monto_cuota_mensual
        const moraB = [1, 2, 3].filter((m) => !(b.cuotasPagadas || []).includes(m)).length * b.monto_cuota_mensual
        return moraB - moraA
      }
      if (sortOption === 'deuda-asc' || sortOption === 'saldo-asc') {
        const moraA = [1, 2, 3].filter((m) => !(a.cuotasPagadas || []).includes(m)).length * a.monto_cuota_mensual
        const moraB = [1, 2, 3].filter((m) => !(b.cuotasPagadas || []).includes(m)).length * b.monto_cuota_mensual
        return moraA - moraB
      }
      if (sortOption === 'fecha-desc') {
        const timeA = a.fecha_alta ? new Date(a.fecha_alta).getTime() : (Number(a.numero_afiliado) || 0)
        const timeB = b.fecha_alta ? new Date(b.fecha_alta).getTime() : (Number(b.numero_afiliado) || 0)
        return timeB - timeA
      }
      if (sortOption === 'fecha-asc') {
        const timeA = a.fecha_alta ? new Date(a.fecha_alta).getTime() : (Number(a.numero_afiliado) || 0)
        const timeB = b.fecha_alta ? new Date(b.fecha_alta).getTime() : (Number(b.numero_afiliado) || 0)
        return timeA - timeB
      }
      return (Number(a.numero_afiliado) || 0) - (Number(b.numero_afiliado) || 0)
    })
  }, [afiliados, zoneFilter, statusFilter, searchTerm, sortOption])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden space-y-1 sm:space-y-2">
      {/* ===================================================================== */}
      {/* MOBILE COMPACT TOOLBAR (< sm): 2 ultra-dense rows (~65px total)       */}
      {/* ===================================================================== */}
      <div className="sm:hidden bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant shadow-xs shrink-0 flex flex-col gap-1.5">
        {/* Row 1: Icon/Title + Search Box + Nuevo Button */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
            <span className="font-bold text-xs text-primary whitespace-nowrap">Afiliados</span>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-full">
              {filtered.length}
            </span>
          </div>

          <div className="relative flex-1 min-w-0">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[15px]">
              search
            </span>
            <input
              id="searchBox-mobile"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-7 pl-6.5 pr-6 text-xs bg-surface-container-low border border-outline-variant rounded focus:border-secondary focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNuevoAfiliado}
            className="h-7 px-2 rounded bg-secondary hover:bg-primary text-white font-medium text-[11px] flex items-center gap-0.5 shrink-0 shadow-xs cursor-pointer active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Nuevo</span>
          </button>
        </div>

        {/* Row 2: Status chips + Zone selector + Talonario */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[10px]">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
            }`}
          >
            Todos ({totalAfiliados})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('aldia')}
            className={`px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === 'aldia'
                ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            Al Día ({afiliadosAlDia})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('deuda')}
            className={`px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === 'deuda'
                ? 'bg-amber-600 text-white shadow-xs font-semibold'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            Deuda ({afiliadosDeuda})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('standby')}
            className={`px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === 'standby'
                ? 'bg-rose-600 text-white shadow-xs font-semibold'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            Stand-by ({afiliadosStandby})
          </button>

          <span className="h-4 w-px bg-outline-variant/60 shrink-0"></span>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="h-6 text-[10px] bg-white border border-outline-variant rounded px-1.5 py-0 pr-4 shrink-0 font-medium"
            title="Filtrar por Zona"
          >
            <option value="all">Todas las Zonas</option>
            <option value="Zona 1">Zona 1</option>
            <option value="Zona 2">Zona 2</option>
            <option value="Zona 3">Zona 3</option>
          </select>

          <button
            type="button"
            onClick={() => setIsTalonarioModalOpen(true)}
            className="h-6 px-1.5 rounded border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-semibold flex items-center gap-0.5 shrink-0 whitespace-nowrap cursor-pointer"
            title="Imprimir talonario"
          >
            <span className="material-symbols-outlined text-[13px]">receipt_long</span>
            <span>Talonario</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DESKTOP VIEW (>= sm): Header + Inline Metric Pills                     */}
      {/* ===================================================================== */}
      <div className="hidden sm:flex items-center justify-between gap-3 shrink-0 pb-1 border-b border-outline-variant/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0">badge</span>
          <div className="min-w-0 flex items-baseline gap-2">
            <h1 className="text-headline-sm font-bold text-primary tracking-tight truncate">
              Padrón General de Afiliados
            </h1>
            <span className="text-body-sm text-on-surface-variant truncate hidden md:inline">
              · Plan Seguro Integral (Chamical)
            </span>
          </div>
        </div>

        {/* Inline Compact Metric Badges */}
        <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
          <div className="px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/60 flex items-center gap-1">
            <span className="text-on-surface-variant text-[11px]">Total:</span>
            <span className="font-bold text-on-surface font-code-cadastral">{totalAfiliados}</span>
          </div>
          <div className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-1 text-emerald-800">
            <span className="text-[11px]">Al Día:</span>
            <span className="font-bold font-code-cadastral">{afiliadosAlDia}</span>
          </div>
          <div className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-1 text-amber-800">
            <span className="text-[11px]">Mora:</span>
            <span className="font-bold font-code-cadastral">{afiliadosDeuda}</span>
          </div>
          <div className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 flex items-center gap-1 text-rose-800">
            <span className="text-[11px]">Stand-by:</span>
            <span className="font-bold font-code-cadastral">{afiliadosStandby}</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DESKTOP TOOLBAR (>= sm): Single-row compact bar                       */}
      {/* ===================================================================== */}
      <div className="hidden sm:flex items-center justify-between gap-2 bg-surface-container-lowest p-2 rounded-xl border border-outline-variant shadow-xs shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Live Input Search */}
          <div className="relative w-44 md:w-52">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined text-[17px]">search</span>
            </span>
            <input
              id="searchBox"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, DNI o N°... (Ctrl+K)"
              className="w-full h-8 pl-8 pr-12 text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-on-surface-variant/60"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-7 pr-1 flex items-center text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <span className="text-[9px] bg-surface-container px-1 py-0.5 rounded border border-outline-variant text-on-surface-variant font-code-cadastral">
                Ctrl+K
              </span>
            </div>
          </div>

          {/* Zone Selector */}
          <div className="flex items-center gap-1 text-xs">
            <select
              id="zoneFilter"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="h-8 text-xs bg-white border border-outline-variant rounded-lg px-2 py-1 pr-6 focus:border-secondary font-medium"
            >
              <option value="all">Todas las Zonas ({totalAfiliados})</option>
              <option value="Zona 1">Zona 1 (Flores)</option>
              <option value="Zona 2">Zona 2 (Gómez)</option>
              <option value="Zona 3">Zona 3 (Mercado)</option>
            </select>
          </div>

          {/* Ordenar por Alfabeto o Fecha */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="h-8 text-xs bg-white border border-outline-variant rounded-lg px-2 py-1 focus:border-secondary font-medium text-slate-800 cursor-pointer"
              title="Filtro de ordenamiento en la tabla"
            >
              <option value="numero-asc">🔢 N° Afiliado (1 → N)</option>
              <option value="alfa-asc">🔤 Alfabeto: A → Z (Titular)</option>
              <option value="alfa-desc">🔤 Alfabeto: Z → A (Titular)</option>
              <option value="fecha-desc">📅 Fecha: Más reciente</option>
              <option value="fecha-asc">📅 Fecha: Más antiguo</option>
              <option value="deuda-desc">💰 Mayor deuda</option>
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-0.5 border border-outline-variant rounded-lg p-0.5 bg-surface-container-low text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white shadow-xs font-semibold text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Todos ({totalAfiliados})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('deuda')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'deuda'
                  ? 'bg-white shadow-xs font-semibold text-amber-800'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Deuda ({afiliadosDeuda})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aldia')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'aldia'
                  ? 'bg-white shadow-xs font-semibold text-emerald-800'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Al Día ({afiliadosAlDia})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('standby')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === 'standby'
                  ? 'bg-rose-600 shadow-xs font-semibold text-white'
                  : 'text-rose-800 hover:text-rose-950 hover:bg-rose-50'
              }`}
            >
              Stand-by ({afiliadosStandby})
            </button>
          </div>
        </div>

        {/* Export & New Record Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="btn-imprimir-talonario"
            type="button"
            onClick={() => setIsTalonarioModalOpen(true)}
            className="h-8 px-2.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs transition-colors active:scale-[0.99] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            title="Imprimir talonario físico de 8 recibos por hoja A4"
          >
            <span className="material-symbols-outlined text-[15px]">receipt_long</span>
            <span>Talonario</span>
          </button>
          <button
            id="btn-abrir-planilla-ruta"
            type="button"
            onClick={() => setIsPlanillaModalOpen(true)}
            className="h-8 px-2.5 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface font-semibold text-xs transition-colors active:scale-[0.99] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            title="Generar e imprimir Planilla de Ruta para cobrador (Formato A4 PDF)"
          >
            <span className="material-symbols-outlined text-[15px] text-primary">route</span>
            <span>Planilla</span>
          </button>
          <button
            type="button"
            onClick={onNuevoAfiliado}
            className="h-8 px-3 rounded-lg bg-secondary hover:bg-primary text-white font-semibold text-xs transition-colors active:scale-[0.99] flex items-center justify-center gap-1 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">add_circle</span>
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MATRIX INTERACTIVE LEDGER CARD (Stitch Verbatim)                       */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Table Toolbar & Fiscal Year Header: Hidden on mobile to maximize card height */}
        <div className="hidden sm:flex px-3 sm:px-4 py-1.5 border-b border-outline-variant bg-surface-container-low items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[17px]" data-icon="calendar_month">
              calendar_month
            </span>
            <span className="text-xs font-bold text-primary">
              EJERCICIO FISCAL 2026
            </span>
            <span className="text-xs text-on-surface-variant hidden md:inline">
              · Cobertura Parroquial y Municipal para Servicios Fúnebres Completos
            </span>
          </div>

          {/* Color Key & Legend for Matrix */}
          <div className="flex items-center gap-3 text-xs bg-white px-2.5 py-1 rounded border border-outline-variant/80">
            <span className="text-[10px] text-on-surface-variant font-semibold">
              REFERENCIAS:
            </span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                ✓
              </span>
              <span className="text-on-surface font-medium text-[10px]">Pagada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                !
              </span>
              <span className="text-red-700 font-medium text-[10px]">Vencida</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-[9px]">
                ·
              </span>
              <span className="text-on-surface-variant text-[10px]">Meses futuros</span>
            </div>
          </div>
        </div>


        {/* MOBILE VIEW (< md): Responsive Interactive Afiliados Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron afiliados.</div>
          ) : (
            filtered.map((afiliado, index) => {
              const isEditing = editingRowId === afiliado.id && editRowData
              const cuotasPagadas: number[] =
                afiliado.cuotasPagadas ||
                (afiliado.estado === 'activo'
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                  : [1, 2])
              const moraInfo = evaluarMoraAfiliado(afiliado, mesActual, 2026)
              const mesesVencidos = [1, 2, 3].filter((m) => !cuotasPagadas.includes(m))
              const saldoDeuda = mesesVencidos.length * afiliado.monto_cuota_mensual
              const siguienteCuotaCobrar =
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((m) => !cuotasPagadas.includes(m)) || 1

              if (isEditing) {
                return (
                  <div
                    key={afiliado.id}
                    className="p-3.5 rounded-lg border-2 border-primary bg-primary/5 flex flex-col gap-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-code-cadastral font-bold text-primary text-sm">
                        Editando Afiliado #{afiliado.numero_afiliado}
                      </span>
                      <span className="text-[11px] font-semibold text-primary uppercase">
                        Edición en Línea
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-outline font-medium block mb-0.5">Nombre Completo:</label>
                        <input
                          type="text"
                          value={editRowData.nombre_completo}
                          onChange={(e) => setEditRowData({ ...editRowData, nombre_completo: e.target.value })}
                          className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">DNI:</label>
                          <input
                            type="text"
                            value={editRowData.dni}
                            onChange={(e) => setEditRowData({ ...editRowData, dni: e.target.value })}
                            className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-code-cadastral"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-outline font-medium block mb-0.5">Cuota Mensual ($):</label>
                          <input
                            type="number"
                            value={editRowData.monto_cuota_mensual}
                            onChange={(e) => setEditRowData({ ...editRowData, monto_cuota_mensual: Number(e.target.value) })}
                            className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface font-code-cadastral font-bold text-right"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-outline font-medium block mb-0.5">Zona de Cobro:</label>
                        <input
                          type="text"
                          value={editRowData.zona_cobro}
                          onChange={(e) => setEditRowData({ ...editRowData, zona_cobro: e.target.value })}
                          className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-outline font-medium block mb-0.5">Domicilio de Cobro:</label>
                        <input
                          type="text"
                          value={editRowData.direccion_cobro}
                          onChange={(e) => setEditRowData({ ...editRowData, direccion_cobro: e.target.value })}
                          className="w-full text-xs px-2 py-1 rounded border border-outline-variant bg-surface"
                        />
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
                  key={afiliado.id}
                  onDoubleClick={() => onEditarAfiliado(afiliado)}
                  title="Doble clic para modificar afiliado"
                  className={`p-3.5 rounded-lg border flex flex-col gap-3 shadow-xs cursor-pointer transition-colors ${
                    isEven
                      ? 'bg-white border-slate-200/90'
                      : 'bg-[#eaf0f6] border-slate-200/90'
                  }`}
                >
                  {/* Card Header: N° Afiliado, Estado, Zona */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-primary font-code-cadastral text-code-cadastral font-bold border border-outline-variant">
                        #{afiliado.numero_afiliado}
                      </span>
                      <span className="text-[11px] font-medium text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded truncate max-w-[170px]">
                        {afiliado.zona_cobro || 'Zona 1'}
                      </span>
                    </div>
                    {moraInfo.enStandby ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 shrink-0">
                        ⚠️ Stand-by (+3 meses)
                      </span>
                    ) : saldoDeuda > 0 ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-200 shrink-0">
                        {mesesVencidos.length} mora
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                        Al día
                      </span>
                    )}
                  </div>

                  {/* Afiliado Info */}
                  <div>
                    <div className="font-bold text-primary text-base">
                      {afiliado.nombre_completo}
                    </div>
                    <div className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-code-cadastral font-medium">
                        DNI {afiliado.dni || '14.882.109'}
                      </span>
                      <span>•</span>
                      <span className="truncate">{afiliado.direccion_cobro || 'Chamical, La Rioja'}</span>
                    </div>
                    {moraInfo.enStandby && (
                      <div className="text-[11px] text-rose-900 font-semibold bg-rose-50 px-2.5 py-1 rounded border border-rose-200 mt-1">
                        ⚠️ Plan suspendido (+3 meses de mora) · <strong>Última cuota pagada:</strong> {moraInfo.ultimaCuotaPagada}
                      </div>
                    )}
                  </div>

                  {/* Cuota Base & Saldo */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-surface rounded border border-outline-variant/60">
                    <div>
                      <span className="text-outline text-[10px] uppercase block font-semibold">Cuota Mensual</span>
                      <span className="font-code-cadastral font-bold text-on-surface text-sm">
                        {formatCurrency(afiliado.monto_cuota_mensual)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-outline text-[10px] uppercase block font-semibold">Saldo Deuda</span>
                      <span className={`font-code-cadastral font-bold text-sm ${saldoDeuda > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {saldoDeuda > 0 ? formatCurrency(saldoDeuda) : '$ 0,00'}
                      </span>
                    </div>
                  </div>

                  {/* 12-Month Matrix (Touch-friendly 6x2 grid) */}
                  <div>
                    <span className="text-[10px] font-bold uppercase text-outline block mb-1.5">
                      Matriz Cuotas Anuales 2026:
                    </span>
                    <div className="grid grid-cols-6 gap-1.5">
                      {meses.map((m) => {
                        const isPagada = cuotasPagadas.includes(m.num)
                        const isVencida = !isPagada && m.num <= mesActual

                        if (isPagada) {
                          return (
                            <button
                              key={m.num}
                              type="button"
                              onClick={() => handleVerDetalleCuota(afiliado, m.num)}
                              className="h-8 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center text-[11px] font-bold shadow-xs active:scale-95 transition-transform"
                              title={`${m.label}: Pagada - Tocar para ver comprobante`}
                            >
                              <span className="text-[10px] leading-tight font-bold">{m.label}</span>
                              <span className="text-[11px] leading-none font-black">✓</span>
                            </button>
                          )
                        }

                        if (isVencida) {
                          return (
                            <button
                              key={m.num}
                              type="button"
                              onClick={() => onCobrarCuota(afiliado, m.num)}
                              className="h-8 rounded bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center text-[11px] font-bold shadow-xs border border-red-300 animate-pulse active:scale-95"
                              title={`${m.label}: Vencida - Tocar para cobrar`}
                            >
                              <span className="text-[10px] leading-tight font-bold">{m.label}</span>
                              <span className="text-[11px] leading-none font-black">!</span>
                            </button>
                          )
                        }

                        return (
                          <button
                            key={m.num}
                            type="button"
                            onClick={() => onCobrarCuota(afiliado, m.num)}
                            className="h-8 rounded bg-surface border border-outline-variant text-on-surface hover:bg-surface-container flex flex-col items-center justify-center text-[11px] font-semibold active:scale-95"
                            title={`${m.label}: Adelantar`}
                          >
                            <span className="text-[10px] leading-tight font-semibold">{m.label}</span>
                            <span className="text-[11px] leading-none text-outline-variant">·</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 mt-1 gap-2 flex-wrap">
                    {mesesVencidos.length > 1 && onCobrarMultiplesCuotas ? (
                      <button
                        type="button"
                        onClick={() => onCobrarMultiplesCuotas(afiliado, mesesVencidos)}
                        className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-[0.98] flex-1 justify-center"
                        title={`Cobrar ${mesesVencidos.length} meses vencidos acumulados`}
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>Cobrar Mora Total ({mesesVencidos.length} meses)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCobrarCuota(afiliado, siguienteCuotaCobrar)}
                        className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] flex-1 justify-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                        <span>Cobrar Cuota {meses[siguienteCuotaCobrar - 1]?.label || ''}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        id={`btn-editar-afiliado-m-${afiliado.id}`}
                        onClick={() => startEditRow(afiliado)}
                        className="h-8 px-2.5 rounded-lg border border-outline-variant hover:bg-surface-container-low text-primary flex items-center gap-1 text-xs font-semibold"
                        title="Editar en la misma tabla"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>Editar</span>
                      </button>
                      {onEliminarAfiliado && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Confirma dar de baja al afiliado ${afiliado.nombre_completo}?`)) {
                              onEliminarAfiliado(afiliado.id)
                            }
                          }}
                          className="h-8 w-8 rounded-lg border border-outline-variant hover:bg-red-50 text-outline hover:text-red-700 flex items-center justify-center"
                          title="Dar de baja"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* DESKTOP VIEW (>= md): Ledger Table with 12-Month Matrix */}
        <div className="hidden md:block overflow-x-auto flex-1 min-h-0 custom-scroll">
          <table className="w-full min-w-[990px] text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
              <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none whitespace-nowrap">
                <th
                  onClick={() => setSortOption((prev) => (prev === 'numero-asc' ? 'numero-desc' : 'numero-asc'))}
                  className="px-2 py-2 w-[52px] text-left font-semibold bg-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por N° Afiliado (Asc / Desc)"
                >
                  <div className="flex items-center gap-0.5">
                    <span>N°</span>
                    {sortOption === 'numero-asc' && <span className="material-symbols-outlined text-[12px] text-primary">arrow_upward</span>}
                    {sortOption === 'numero-desc' && <span className="material-symbols-outlined text-[12px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'alfa-asc' ? 'alfa-desc' : 'alfa-asc'))}
                  className="px-2.5 py-2 w-[225px] font-semibold bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Nombre A-Z / Z-A"
                >
                  <div className="flex items-center gap-1">
                    <span>Afiliado / Titular & Domicilio</span>
                    {sortOption === 'alfa-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'alfa-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'cuota-desc' ? 'cuota-asc' : 'cuota-desc'))}
                  className="px-2 py-2 w-[110px] font-semibold bg-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Monto de Cuota Base"
                >
                  <div className="flex items-center gap-1">
                    <span>Cuota Base</span>
                    {sortOption === 'cuota-desc' && <span className="material-symbols-outlined text-[12px] text-primary">arrow_downward</span>}
                    {sortOption === 'cuota-asc' && <span className="material-symbols-outlined text-[12px] text-primary">arrow_upward</span>}
                  </div>
                </th>
                <th className="px-1 py-2 w-[265px] text-center font-semibold bg-slate-100 whitespace-nowrap">
                  <span>Cuotas Ejercicio 2026 (Ene - Dic)</span>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'deuda-desc' ? 'deuda-asc' : 'deuda-desc'))}
                  className="px-2 py-2 w-[120px] text-right font-semibold bg-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Saldo Deuda (Mayor / Menor)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Deuda</span>
                    {(sortOption === 'deuda-desc' || sortOption === 'saldo-desc') && <span className="material-symbols-outlined text-[13px] text-red-600">arrow_downward</span>}
                    {(sortOption === 'deuda-asc' || sortOption === 'saldo-asc') && <span className="material-symbols-outlined text-[13px] text-emerald-600">arrow_upward</span>}
                  </div>
                </th>
                <th className="px-2 py-2 w-[224px] text-right font-semibold bg-slate-100 whitespace-nowrap">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
              {filtered.map((afiliado, index) => {
                const isEditing = editingRowId === afiliado.id && editRowData
                const cuotasPagadas: number[] =
                  afiliado.cuotasPagadas ||
                  (afiliado.estado === 'activo'
                    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                    : [1, 2])
                const moraInfo = evaluarMoraAfiliado(afiliado, mesActual, 2026)
                const mesesVencidos = [1, 2, 3].filter((m) => !cuotasPagadas.includes(m))
                const saldoDeuda = mesesVencidos.length * afiliado.monto_cuota_mensual
                const siguienteCuotaCobrar =
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((m) => !cuotasPagadas.includes(m)) || 1

                if (isEditing) {
                  return (
                    <tr key={afiliado.id} className="bg-primary/5 border-l-4 border-l-primary">
                      {/* Col 1: N° Afiliado */}
                      <td className="px-2 py-2 align-middle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-primary font-code-cadastral text-code-cadastral font-bold border border-outline-variant">
                          #{afiliado.numero_afiliado}
                        </span>
                      </td>

                      {/* Col 2: Info Afiliado Editable */}
                      <td className="px-2.5 py-2 align-middle">
                        <div className="space-y-1 max-w-[280px]">
                          <input
                            type="text"
                            value={editRowData.nombre_completo}
                            onChange={(e) => setEditRowData({ ...editRowData, nombre_completo: e.target.value })}
                            placeholder="Nombre Completo"
                            className="w-full text-xs font-semibold px-2 py-1 rounded border border-primary bg-surface focus:outline-none"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editRowData.dni}
                              onChange={(e) => setEditRowData({ ...editRowData, dni: e.target.value })}
                              placeholder="DNI"
                              className="text-xs px-1.5 py-0.5 rounded border border-outline-variant bg-surface font-code-cadastral"
                            />
                            <input
                              type="text"
                              value={editRowData.zona_cobro}
                              onChange={(e) => setEditRowData({ ...editRowData, zona_cobro: e.target.value })}
                              placeholder="Zona de cobro"
                              className="text-xs px-1.5 py-0.5 rounded border border-outline-variant bg-surface"
                            />
                          </div>
                          <input
                            type="text"
                            value={editRowData.direccion_cobro}
                            onChange={(e) => setEditRowData({ ...editRowData, direccion_cobro: e.target.value })}
                            placeholder="Domicilio"
                            className="w-full text-[11px] px-1.5 py-0.5 rounded border border-outline-variant bg-surface"
                          />
                        </div>
                      </td>

                      {/* Col 3: Cuota Mensual Editable */}
                      <td className="px-2 py-2 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="text-xs text-outline">$</span>
                          <input
                            type="number"
                            value={editRowData.monto_cuota_mensual}
                            onChange={(e) => setEditRowData({ ...editRowData, monto_cuota_mensual: Number(e.target.value) })}
                            className="w-20 text-xs text-right font-code-cadastral font-bold px-1.5 py-1 rounded border border-outline-variant bg-surface"
                          />
                        </div>
                      </td>

                      {/* Col 4: Estado Matriz */}
                      <td className="px-2 py-2 align-middle text-center">
                        <span className="text-xs text-outline italic">Edición en línea activa</span>
                      </td>

                      {/* Col 5: Saldo */}
                      <td className="px-2 py-2 align-middle text-right whitespace-nowrap">
                        <div className="font-code-cadastral font-bold text-xs text-on-surface whitespace-nowrap">
                          {formatCurrency(saldoDeuda)}
                        </div>
                      </td>

                      {/* Col 6: Botones Guardar / Cancelar */}
                      <td className="px-2 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            id={`btn-guardar-afiliado-${afiliado.id}`}
                            onClick={saveEditRow}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer"
                            title="Guardar cambios"
                          >
                            <span className="material-symbols-outlined text-[13px]">check</span>
                            <span>Guardar</span>
                          </button>
                          <button
                            type="button"
                            id={`btn-cancelar-afiliado-${afiliado.id}`}
                            onClick={cancelEditRow}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant flex items-center gap-0.5 cursor-pointer"
                            title="Cancelar edición"
                          >
                            <span className="material-symbols-outlined text-[13px]">close</span>
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
                    key={afiliado.id}
                    onDoubleClick={() => onEditarAfiliado(afiliado)}
                    title="Doble clic para modificar afiliado"
                    className={`transition-colors border-b border-slate-200/80 cursor-pointer ${
                      isEven ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    {/* Col 1: N° Afiliado */}
                    <td className="px-2.5 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-primary font-code-cadastral text-code-cadastral font-bold border border-outline-variant">
                        #{afiliado.numero_afiliado}
                      </span>
                      <span className="block text-[10px] text-on-surface-variant/70 font-code-cadastral mt-0.5">
                        ALTA: 2018
                      </span>
                    </td>

                    {/* Col 2: Info Afiliado */}
                    <td className="px-3 py-2 align-middle">
                      <div className="font-semibold text-primary text-body-md truncate max-w-[250px]">
                        {afiliado.nombre_completo}
                      </div>
                      <div className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                        <span className="font-code-cadastral font-medium text-xs">
                          DNI {afiliado.dni || '14.882.109'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 truncate text-xs text-outline max-w-[160px]">
                          <span className="material-symbols-outlined text-xs">location_on</span>
                          <span className="truncate">{afiliado.direccion_cobro || 'Chamical'}</span>
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-secondary bg-secondary-fixed/50 px-1 py-0.2 rounded truncate max-w-[170px]">
                          <span className="material-symbols-outlined text-[11px]">two_wheeler</span>
                          <span className="truncate">{afiliado.zona_cobro || 'Zona 1'}</span>
                        </span>
                        {moraInfo.enStandby && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-900 border border-rose-300 whitespace-nowrap">
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            <span>Stand-by</span>
                          </span>
                        )}
                      </div>
                      {moraInfo.enStandby && (
                        <div className="text-[10px] text-rose-800 font-semibold mt-0.5">
                          Últ. cuota: <strong>{moraInfo.ultimaCuotaPagada}</strong>
                        </div>
                      )}
                    </td>

                    {/* Col 3: Cuota Mensual */}
                    <td className="px-2 py-2 align-middle whitespace-nowrap">
                      <div className="font-code-cadastral font-bold text-on-surface text-[13.5px] whitespace-nowrap">
                        {formatCurrency(afiliado.monto_cuota_mensual)}
                      </div>
                      <span className="text-[10px] text-on-surface-variant block uppercase font-medium whitespace-nowrap">
                        Mensual Fijo
                      </span>
                    </td>

                    {/* Col 4: Matriz 12 Cuotas (Desktop 6x2 Proportional Grid) */}
                    <td className="px-1.5 py-1.5 align-middle">
                      <div className="grid grid-cols-6 gap-1 w-full max-w-[248px] mx-auto">
                        {meses.map((m) => {
                          const isPagada = cuotasPagadas.includes(m.num)
                          const isVencida = !isPagada && m.num <= mesActual

                          if (isPagada) {
                            return (
                              <button
                                key={m.num}
                                type="button"
                                onClick={() => handleVerDetalleCuota(afiliado, m.num)}
                                className="h-[26px] rounded bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center shadow-2xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                                title={`${m.label} 2026: Pagada (${formatCurrency(
                                  afiliado.monto_cuota_mensual
                                )}) - Clic para ver recibo`}
                              >
                                <span className="text-[9.5px] leading-tight font-bold">{m.label}</span>
                                <span className="text-[10px] leading-none font-black text-emerald-100">✓</span>
                              </button>
                            )
                          }

                          if (isVencida) {
                            return (
                              <button
                                key={m.num}
                                type="button"
                                onClick={() => onCobrarCuota(afiliado, m.num)}
                                className="h-[26px] rounded bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center shadow-2xs border border-red-300 animate-pulse transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                                title={`${m.label} 2026: VENCIDA - Clic para cobrar con QR`}
                              >
                                <span className="text-[9.5px] leading-tight font-bold">{m.label}</span>
                                <span className="text-[10px] leading-none font-black text-red-100">!</span>
                              </button>
                            )
                          }

                          return (
                            <button
                              key={m.num}
                              type="button"
                              onClick={() => onCobrarCuota(afiliado, m.num)}
                              className="h-[26px] rounded bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title={`${m.label} 2026: A vencer - Clic para adelantar cobro`}
                            >
                              <span className="text-[9.5px] leading-tight font-semibold text-slate-800">{m.label}</span>
                              <span className="text-[10px] leading-none text-slate-400 font-black">·</span>
                            </button>
                          )
                        })}
                      </div>
                    </td>

                    {/* Col 5: Saldo Total Deuda */}
                    <td className="px-2 py-2 align-middle text-right whitespace-nowrap">
                      {saldoDeuda > 0 ? (
                        <div className="flex flex-col items-end whitespace-nowrap">
                          <div className="font-code-cadastral font-bold text-red-700 text-[13.5px] whitespace-nowrap">
                            {formatCurrency(saldoDeuda)}
                          </div>
                          <span className="inline-flex items-center text-[9.5px] font-bold text-red-800 bg-red-100 px-1 py-0.5 rounded border border-red-200 whitespace-nowrap mt-0.5">
                            {mesesVencidos.length} cuota{mesesVencidos.length > 1 ? 's' : ''} en mora
                          </span>
                        </div>
                      ) : (
                        <div className="font-code-cadastral font-semibold text-emerald-700 text-xs whitespace-nowrap">
                          Al día
                        </div>
                      )}
                    </td>

                    {/* Col 6: Acciones Rápidas */}
                    <td className="px-2 py-2 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          id={`btn-editar-afiliado-${afiliado.id}`}
                          onClick={() => startEditRow(afiliado)}
                          className="h-7 px-2 rounded hover:bg-surface-container text-primary text-xs font-semibold inline-flex items-center gap-0.5 border border-outline-variant/60 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
                          title="Editar en la misma tabla"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Editar</span>
                        </button>
                        {mesesVencidos.length > 1 && onCobrarMultiplesCuotas ? (
                          <button
                            type="button"
                            onClick={() => onCobrarMultiplesCuotas(afiliado, mesesVencidos)}
                            className="h-7 px-2.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1 active:scale-[0.98] shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                            title={`Cobrar ${mesesVencidos.length} cuotas vencidas juntas (${formatCurrency(saldoDeuda)})`}
                          >
                            <span className="material-symbols-outlined text-[14px]">payments</span>
                            <span className="whitespace-nowrap">Mora ({mesesVencidos.length})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCobrarCuota(afiliado, siguienteCuotaCobrar)}
                            className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs inline-flex items-center gap-1 active:scale-[0.98] shrink-0 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]" data-icon="qr_code_2">
                              qr_code_2
                            </span>
                            <span className="whitespace-nowrap">Cobrar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditarAfiliado(afiliado)}
                          className="h-7 w-7 rounded border border-outline-variant hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Ficha completa y Grupo Familiar"
                        >
                          <span className="material-symbols-outlined text-[15px]" data-icon="family_restroom">
                            family_restroom
                          </span>
                        </button>
                        {onEliminarAfiliado && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Confirma dar de baja al afiliado ${afiliado.nombre_completo}?`)) {
                                onEliminarAfiliado(afiliado.id)
                              }
                            }}
                            className="h-7 w-7 rounded border border-outline-variant hover:bg-red-50 text-outline hover:text-red-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            title="Dar de baja afiliado"
                          >
                            <span className="material-symbols-outlined text-[15px]" data-icon="delete">
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
      </div>

      {/* Modal Detalle de Cuota Pagada / Comprobante */}
      <DetalleCuotaModal
        isOpen={modalDetalleCuota.isOpen}
        onClose={() => setModalDetalleCuota((prev) => ({ ...prev, isOpen: false }))}
        afiliado={modalDetalleCuota.afiliado}
        mes={modalDetalleCuota.mes}
        cuotaDetalle={modalDetalleCuota.detalle}
        onRevertir={onRevertirCuota}
      />

      {/* Modal Talonario Físico de 8 Recibos por Hoja A4 */}
      <TalonarioRecibosModal
        isOpen={isTalonarioModalOpen}
        onClose={() => setIsTalonarioModalOpen(false)}
        afiliados={afiliados}
      />

      {/* Modal Planilla de Ruta para Cobrador (Formato A4 PDF) */}
      <PlanillaRutaModal
        isOpen={isPlanillaModalOpen}
        onClose={() => setIsPlanillaModalOpen(false)}
        afiliados={afiliados}
      />
    </div>
  )
}

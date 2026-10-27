import React, { useState, useMemo } from 'react'
import { PagoRecibo, calcularBalanceCaja } from '../../services/dataService'
import { formatCurrency, formatDateHour } from '../../lib/formatters'
import { CobroCajaModal, CobroCajaData } from '../modals/CobroCajaModal'
import { EgresoCajaModal } from '../modals/EgresoCajaModal'
import { ConfirmarAnulacionModal } from '../modals/ConfirmarAnulacionModal'
import { ReciboDetalleModal } from '../modals/ReciboDetalleModal'

interface CajaViewProps {
  pagos: PagoRecibo[]
  onNuevoCobro: (cobro: CobroCajaData) => Promise<void> | void
  onNuevoEgreso: (egreso: {
    concepto: string
    categoria: string
    monto: number
    comprobante: string
    metodo: 'efectivo' | 'transferencia'
  }) => Promise<void> | void
  onAnularPago: (pago: PagoRecibo) => Promise<void> | void
  onCierreCaja: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  isOnline?: boolean
}

type TipoFiltro = 'todos' | 'ingreso' | 'egreso'
type MetodoFiltro = 'todos' | 'efectivo' | 'digital'
type SortField = 'fecha' | 'monto' | 'recibo' | 'titular'

export const CajaView: React.FC<CajaViewProps> = ({
  pagos,
  onNuevoCobro,
  onNuevoEgreso,
  onAnularPago,
  onCierreCaja,
  onRefresh,
  isRefreshing = false,
  isOnline = true,
}) => {
  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFilter, setTipoFilter] = useState<TipoFiltro>('todos')
  const [metodoFilter, setMetodoFilter] = useState<MetodoFiltro>('todos')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [sortField, setSortField] = useState<SortField>('fecha')
  const [sortAsc, setSortAsc] = useState<boolean>(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Estados de modales
  const [cobroModalOpen, setCobroModalOpen] = useState(false)
  const [egresoModalOpen, setEgresoModalOpen] = useState(false)
  const [reciboDetallePago, setReciboDetallePago] = useState<PagoRecibo | null>(null)
  const [pagoParaAnular, setPagoParaAnular] = useState<PagoRecibo | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cálculo de totales globales (sin filtrar)
  const balanceGlobal = useMemo(() => calcularBalanceCaja(pagos), [pagos])

  // Filtrado reactivo de movimientos
  const movimientosFiltrados = useMemo(() => {
    return pagos.filter((p) => {
      // 1. Tipo
      const isEgreso = p.tipo === 'egreso' || (p.concepto && p.concepto.includes('[EGRESO]'))
      if (tipoFilter === 'ingreso' && isEgreso) return false
      if (tipoFilter === 'egreso' && !isEgreso) return false

      // 2. Método
      const isEfectivo = p.metodo === 'efectivo'
      if (metodoFilter === 'efectivo' && !isEfectivo) return false
      if (metodoFilter === 'digital' && isEfectivo) return false

      // 3. Fechas
      const fechaIso = p.fecha || ''
      const fechaCorta = fechaIso.slice(0, 10)
      if (fechaDesde && fechaCorta < fechaDesde) return false
      if (fechaHasta && fechaCorta > fechaHasta) return false

      // 4. Búsqueda de texto libre
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchRecibo = (p.nroRecibo || '').toLowerCase().includes(query)
        const matchTitular = (p.titularNombre || '').toLowerCase().includes(query)
        const matchConcepto = (p.concepto || '').toLowerCase().includes(query)
        const matchCat = (p.categoria || '').toLowerCase().includes(query)
        if (!matchRecibo && !matchTitular && !matchConcepto && !matchCat) {
          return false
        }
      }

      return true
    })
  }, [pagos, tipoFilter, metodoFilter, fechaDesde, fechaHasta, searchTerm])

  // Ordenación de movimientos
  const movimientosOrdenados = useMemo(() => {
    return [...movimientosFiltrados].sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      if (sortField === 'fecha') {
        valA = new Date(a.fecha || 0).getTime()
        valB = new Date(b.fecha || 0).getTime()
      } else if (sortField === 'monto') {
        valA = Number(a.monto) || 0
        valB = Number(b.monto) || 0
      } else if (sortField === 'recibo') {
        valA = (a.nroRecibo || '').toLowerCase()
        valB = (b.nroRecibo || '').toLowerCase()
      } else if (sortField === 'titular') {
        valA = (a.titularNombre || '').toLowerCase()
        valB = (b.titularNombre || '').toLowerCase()
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [movimientosFiltrados, sortField, sortAsc])

  // Cálculo de totales del conjunto filtrado
  const balanceFiltrado = useMemo(
    () => calcularBalanceCaja(movimientosFiltrados),
    [movimientosFiltrados]
  )

  // Acciones de fecha rápidas
  const handleFiltroHoy = () => {
    const hoy = new Date().toISOString().slice(0, 10)
    setFechaDesde(hoy)
    setFechaHasta(hoy)
  }

  const handleFiltroMes = () => {
    const now = new Date()
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const hoy = now.toISOString().slice(0, 10)
    setFechaDesde(primerDia)
    setFechaHasta(hoy)
  }

  const handleLimpiarFiltros = () => {
    setSearchTerm('')
    setTipoFilter('todos')
    setMetodoFilter('todos')
    setFechaDesde('')
    setFechaHasta('')
  }

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Exportar listado filtrado a CSV
  const handleExportCSV = () => {
    if (movimientosOrdenados.length === 0) {
      alert('No hay movimientos para exportar con los filtros actuales.')
      return
    }

    const headers = ['Nro Recibo', 'Fecha y Hora', 'Tipo', 'Titular/Pagador', 'Concepto', 'Categoria', 'Metodo', 'Monto']
    const rows = movimientosOrdenados.map((m) => {
      const isEgreso = m.tipo === 'egreso' || (m.concepto && m.concepto.includes('[EGRESO]'))
      return [
        `"${m.nroRecibo || ''}"`,
        `"${formatDateHour(m.fecha)}"`,
        `"${isEgreso ? 'Egreso' : 'Ingreso'}"`,
        `"${(m.titularNombre || '').replace(/"/g, '""')}"`,
        `"${(m.concepto || '').replace(/"/g, '""')}"`,
        `"${m.categoria || ''}"`,
        `"${m.metodo === 'efectivo' ? 'Efectivo' : 'Digital/QR'}"`,
        `${isEgreso ? -m.monto : m.monto}`,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Caja_Diaria_Aeterna_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Confirmar anulación
  const handleConfirmarAnular = async () => {
    if (!pagoParaAnular) return
    try {
      setIsDeleting(true)
      await onAnularPago(pagoParaAnular)
      setPagoParaAnular(null)
    } catch (err) {
      console.error('Error al anular pago:', err)
      alert('Ocurrió un error al intentar anular el movimiento.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden space-y-1.5 sm:space-y-3">
      {/* ========================================================================= */}
      {/* MOBILE COMPACT TOOLBAR (< sm): Diseño denso para visualización inmediata  */}
      {/* ========================================================================= */}
      <div className="sm:hidden bg-surface-container-lowest p-2 rounded-xl border border-outline-variant shadow-xs flex flex-col gap-2 shrink-0">
        {/* Fila 1: Título + Balance Neto + Botones de Acción */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
              point_of_sale
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-primary leading-tight">Caja</span>
              <span className="font-mono font-bold text-[11px] text-emerald-800 leading-tight truncate">
                {formatCurrency(balanceGlobal.balanceNeto)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-outline-variant text-slate-600 hover:bg-surface-container"
                title="Sincronizar"
              >
                <span className={`material-symbols-outlined text-[15px] ${isRefreshing ? 'animate-spin text-primary' : ''}`}>
                  refresh
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onCierreCaja}
              className="h-7 px-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1"
              title="Arqueo / Cierre"
            >
              <span className="material-symbols-outlined text-[14px]">receipt_long</span>
              <span>Arqueo</span>
            </button>

            <button
              type="button"
              onClick={() => setEgresoModalOpen(true)}
              className="h-7 px-2 rounded-lg bg-rose-700 text-white text-[11px] font-bold flex items-center gap-0.5 shadow-xs"
              title="Registrar Egreso"
            >
              <span className="material-symbols-outlined text-[13px]">remove</span>
              <span>Egreso</span>
            </button>

            <button
              type="button"
              onClick={() => setCobroModalOpen(true)}
              className="h-7 px-2 rounded-lg bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-0.5 shadow-xs"
              title="Nuevo Cobro"
            >
              <span className="material-symbols-outlined text-[13px]">add</span>
              <span>Cobro</span>
            </button>
          </div>
        </div>

        {/* Fila 2: Búsqueda rápida + Pestañas Tipo + Toggle Filtros Avanzados */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2 top-2 text-[15px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar recibo, titular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-6 py-1 text-xs rounded-lg border border-outline-variant focus:outline-none focus:border-primary bg-surface text-on-surface"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>

          <div className="flex items-center bg-surface-container rounded-lg p-0.5 text-[11px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setTipoFilter('todos')}
              className={`px-2 py-1 rounded transition-colors ${
                tipoFilter === 'todos' ? 'bg-white text-primary shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Todos ({pagos.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('ingreso')}
              className={`px-2 py-1 rounded transition-colors ${
                tipoFilter === 'ingreso' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Ingresos
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('egreso')}
              className={`px-2 py-1 rounded transition-colors ${
                tipoFilter === 'egreso' ? 'bg-rose-700 text-white shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Egresos
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border text-xs shrink-0 ${
              showMobileFilters || fechaDesde || fechaHasta || metodoFilter !== 'todos'
                ? 'bg-primary text-white border-primary'
                : 'border-outline-variant text-slate-600 bg-surface'
            }`}
            title="Filtros avanzados de fecha y método"
          >
            <span className="material-symbols-outlined text-[15px]">filter_list</span>
          </button>
        </div>

        {/* Fila 3: Resumen rápido de totales en móvil */}
        <div className="flex items-center justify-between text-[11px] font-mono px-1 pt-1 border-t border-outline-variant/50">
          <span className="text-emerald-700 font-bold">+{formatCurrency(balanceGlobal.totalIngresos)}</span>
          <span className="text-rose-700 font-bold">-{formatCurrency(balanceGlobal.totalEgresos)}</span>
          <span className="text-amber-800 font-medium">Ef: {formatCurrency(balanceGlobal.totalEfectivo)}</span>
          <span className="text-sky-800 font-medium">QR: {formatCurrency(balanceGlobal.totalDigital)}</span>
        </div>

        {/* Filtros avanzados desplegables para móvil (si el usuario los abre) */}
        {showMobileFilters && (
          <div className="pt-2 border-t border-outline-variant/60 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Método:</span>
              <div className="flex items-center gap-1">
                {(['todos', 'efectivo', 'digital'] as MetodoFiltro[]).map((met) => (
                  <button
                    key={met}
                    type="button"
                    onClick={() => setMetodoFilter(met)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      metodoFilter === met ? 'bg-primary text-white font-bold' : 'bg-surface-container text-slate-700'
                    }`}
                  >
                    {met === 'todos' ? 'Todos' : met === 'efectivo' ? 'Efectivo' : 'Digital QR'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Fecha:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-1.5 py-0.5 text-[11px] border border-outline-variant rounded bg-white"
              />
              <span className="text-slate-400">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-1.5 py-0.5 text-[11px] border border-outline-variant rounded bg-white"
              />
              <button
                type="button"
                onClick={handleFiltroHoy}
                className="px-1.5 py-0.5 rounded bg-surface-container text-[11px]"
              >
                Hoy
              </button>
              {(fechaDesde || fechaHasta || metodoFilter !== 'todos') && (
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-bold"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. HEADER INSTITUCIONAL & BOTONES DE ACCIÓN RÁPIDA (Desktop/Tablet)        */}
      {/* ========================================================================= */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-xs shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <span className="material-symbols-outlined text-[14px]">point_of_sale</span>
              <span>TESORERÍA MUNICIPAL & CAJA</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
              <span>{isOnline ? 'Supabase Cloud Activo' : 'Modo Offline'}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
            Caja Diaria & Arqueo de Tesorería
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">
            Registro cronológico de cobranzas, gastos operativos, balance en tiempo real y libro diario de caja
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 px-3 rounded-xl border border-outline-variant text-slate-700 hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Sincronizar con Supabase Cloud"
            >
              <span
                className={`material-symbols-outlined text-[17px] ${isRefreshing ? 'animate-spin text-primary' : 'text-slate-600'}`}
              >
                refresh
              </span>
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCierreCaja}
            className="h-9 px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Realizar Arqueo y Cierre Oficial de Caja"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-700">
              receipt_long
            </span>
            <span>Arqueo / Cierre</span>
          </button>

          <button
            type="button"
            onClick={() => setEgresoModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Registrar Egreso u Operación de Gasto"
          >
            <span className="material-symbols-outlined text-[17px]">outbox</span>
            <span>- Registrar Egreso</span>
          </button>

          <button
            type="button"
            onClick={() => setCobroModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            title="Registrar Cobro Manual en Caja"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>+ Nuevo Cobro</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TARJETAS DE BALANCE & MÉTRICAS KPI (Desktop / Tablet)                   */}
      {/* ========================================================================= */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 shrink-0">
        {/* Total Ingresos */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Ingresos</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-700">trending_up</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-emerald-800 block truncate">
              +{formatCurrency(balanceGlobal.totalIngresos)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Recaudación bruta</span>
          </div>
        </div>

        {/* Total Egresos */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-rose-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Egresos</span>
            <span className="material-symbols-outlined text-[18px] text-rose-700">trending_down</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-rose-800 block truncate">
              -{formatCurrency(balanceGlobal.totalEgresos)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Gastos operativos</span>
          </div>
        </div>

        {/* Balance Neto */}
        <div
          className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${
            balanceGlobal.balanceNeto >= 0
              ? 'bg-emerald-50/50 border-emerald-300/80'
              : 'bg-rose-50/50 border-rose-300/80'
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              balanceGlobal.balanceNeto >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-wider">Balance Neto</span>
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </div>
          <div className="mt-2">
            <span
              className={`text-base sm:text-lg font-black font-mono block truncate ${
                balanceGlobal.balanceNeto >= 0 ? 'text-emerald-900' : 'text-rose-900'
              }`}
            >
              {formatCurrency(balanceGlobal.balanceNeto)}
            </span>
            <span className="text-[10px] text-slate-600 font-medium">Ingresos - Egresos</span>
          </div>
        </div>

        {/* Efectivo en Caja */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efectivo en Caja</span>
            <span className="material-symbols-outlined text-[18px] text-amber-700">payments</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-amber-900 block truncate">
              {formatCurrency(balanceGlobal.totalEfectivo)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Físico disponible</span>
          </div>
        </div>

        {/* Digital / QR */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-sky-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-900">
            <span className="text-[11px] font-bold uppercase tracking-wider">QR & Digital</span>
            <span className="material-symbols-outlined text-[18px] text-sky-700">qr_code_2</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-sky-900 block truncate">
              {formatCurrency(balanceGlobal.totalDigital)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Banco / Acreditado</span>
          </div>
        </div>

        {/* Cantidad de Asientos */}
        <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Comprobantes</span>
            <span className="material-symbols-outlined text-[18px] text-slate-500">receipt</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 block truncate">
              {balanceGlobal.totalMovimientos}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {movimientosFiltrados.length !== pagos.length
                ? `${movimientosFiltrados.length} en filtro`
                : 'Asientos totales'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE HERRAMIENTAS: BÚSQUEDA & FILTROS MULTI-CRITERIO (Desktop)     */}
      {/* ========================================================================= */}
      <div className="hidden sm:block bg-surface-container-lowest p-3 sm:p-4 rounded-2xl border border-outline-variant shadow-xs space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por N° Recibo, Titular, Concepto o Categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-surface text-on-surface"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
              </button>
            )}
          </div>

          {/* Filtros de Pestañas Tipo */}
          <div className="flex items-center p-1 bg-surface-container rounded-xl gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTipoFilter('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tipoFilter === 'todos'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({pagos.length})
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('ingreso')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tipoFilter === 'ingreso'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              Ingresos ({pagos.filter((p) => p.tipo !== 'egreso').length})
            </button>
            <button
              type="button"
              onClick={() => setTipoFilter('egreso')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                tipoFilter === 'egreso'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-800'
              }`}
            >
              Egresos ({pagos.filter((p) => p.tipo === 'egreso').length})
            </button>
          </div>

          {/* Filtro Método */}
          <div className="shrink-0">
            <select
              value={metodoFilter}
              onChange={(e) => setMetodoFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-slate-800 focus:outline-none focus:border-primary"
            >
              <option value="todos">Todos los medios</option>
              <option value="efectivo">💵 Solo Efectivo</option>
              <option value="digital">📱 Solo QR / Digital</option>
            </select>
          </div>
        </div>

        {/* Filtros de Rango de Fechas & Exportar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-outline-variant text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-semibold">Periodo:</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2 py-1 rounded-lg border border-outline-variant text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2 py-1 rounded-lg border border-outline-variant text-xs text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>

            {/* Accesos rápidos de fecha */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={handleFiltroHoy}
                className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleFiltroMes}
                className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Mes Actual
              </button>
              {(fechaDesde || fechaHasta || searchTerm || tipoFilter !== 'todos' || metodoFilter !== 'todos') && (
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>

          {/* Botones de Exportar / Imprimir */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-lg border border-outline-variant text-slate-700 hover:bg-surface-container text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Descargar archivo CSV"
            >
              <span className="material-symbols-outlined text-[15px] text-slate-500">csv</span>
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded-lg border border-outline-variant text-slate-700 hover:bg-surface-container text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Imprimir Libro de Caja en A4"
            >
              <span className="material-symbols-outlined text-[15px] text-slate-500">print</span>
              <span>Imprimir Libro</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABLA DE MOVIMIENTOS DE CAJA (DESKTOP) & LISTADO RESPONSIVO (MOBILE)   */}
      {/* ========================================================================= */}
      <div className="bg-surface-container-lowest rounded-xl sm:rounded-2xl border border-outline-variant shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
        {movimientosOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <h3 className="font-bold text-base text-slate-800">
              No se encontraron movimientos de caja
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No hay registros que coincidan con los filtros seleccionados o todavía no se han asentado cobros hoy.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={handleLimpiarFiltros}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Restablecer Filtros
              </button>
              <button
                type="button"
                onClick={() => setCobroModalOpen(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
              >
                + Nuevo Cobro
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW (< md): Responsive Interactive Cards */}
            <div className="md:hidden divide-y divide-outline-variant/60 p-2 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll">
              {movimientosOrdenados.map((mov) => {
                const isEgreso = mov.tipo === 'egreso' || (mov.concepto && mov.concepto.includes('[EGRESO]'))
                const isEfectivo = mov.metodo === 'efectivo'

                return (
                  <div key={mov.id || mov.nroRecibo} className="p-3 bg-white rounded-xl border border-outline-variant/80 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isEgreso ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {mov.nroRecibo || 'REC-S/N'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isEgreso ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isEgreso ? 'Egreso' : 'Ingreso'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          {formatDateHour(mov.fecha)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold text-sm block ${
                            isEgreso ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {isEgreso ? '-' : '+'}
                          {formatCurrency(mov.monto)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isEfectivo ? 'Efectivo en Caja' : 'Digital QR'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <div className="font-semibold text-slate-900">
                        {mov.titularNombre || (isEgreso ? 'Egreso Operativo' : 'Contribuyente General')}
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1 flex-wrap">
                        {mov.categoria && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {mov.categoria}
                          </span>
                        )}
                        <span>{mov.concepto}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-dashed border-outline-variant">
                      <button
                        type="button"
                        onClick={() => setReciboDetallePago(mov)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                        <span>Ver Recibo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPagoParaAnular(mov)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        <span>Anular</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP VIEW (>= md): Full Data Table */}
            <div className="hidden md:block flex-1 min-h-0 overflow-auto custom-scroll">
              <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-container border-b border-outline-variant text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleToggleSort('recibo')}
                  >
                    <div className="flex items-center gap-1">
                      <span>N° Comprobante</span>
                      {sortField === 'recibo' && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleToggleSort('fecha')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Fecha / Hora</span>
                      {sortField === 'fecha' && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleToggleSort('titular')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Titular / Pagador</span>
                      {sortField === 'titular' && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Concepto Imputado</th>
                  <th className="py-3 px-3.5">Canal</th>
                  <th
                    className="py-3 px-3.5 text-right cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleToggleSort('monto')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Importe</span>
                      {sortField === 'monto' && (
                        <span className="material-symbols-outlined text-[14px]">
                          {sortAsc ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-center w-28">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {movimientosOrdenados.map((mov) => {
                  const isEgreso = mov.tipo === 'egreso' || (mov.concepto && mov.concepto.includes('[EGRESO]'))
                  const isEfectivo = mov.metodo === 'efectivo'

                  return (
                    <tr
                      key={mov.id || mov.nroRecibo}
                      className="hover:bg-surface-container-low transition-colors group"
                    >
                      {/* N° Comprobante */}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isEgreso ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{mov.nroRecibo || 'REC-S/N'}</span>
                        </div>
                      </td>

                      {/* Fecha y Hora */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatDateHour(mov.fecha)}
                      </td>

                      {/* Titular */}
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 max-w-[200px] truncate">
                        {mov.titularNombre || (isEgreso ? 'Egreso Operativo' : 'Contribuyente General')}
                      </td>

                      {/* Concepto & Categoría */}
                      <td className="py-2.5 px-3.5 text-slate-700">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {mov.categoria && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {mov.categoria}
                            </span>
                          )}
                          <span className="truncate max-w-xs">{mov.concepto}</span>
                        </div>
                      </td>

                      {/* Canal */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isEfectivo
                              ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                              : 'bg-sky-100/80 text-sky-900 border border-sky-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {isEfectivo ? 'payments' : 'qr_code_2'}
                          </span>
                          <span>{isEfectivo ? 'Efectivo' : 'Digital/QR'}</span>
                        </span>
                      </td>

                      {/* Importe */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={isEgreso ? 'text-rose-700' : 'text-emerald-700'}>
                          {isEgreso ? '-' : '+'}
                          {formatCurrency(mov.monto)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReciboDetallePago(mov)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Ver / Reimprimir Recibo Oficial"
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              receipt_long
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPagoParaAnular(mov)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Anular Movimiento de Caja"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

        {/* Resumen al pie del listado */}
        {movimientosOrdenados.length > 0 && (
          <div className="p-2.5 sm:p-3 bg-surface-container border-t border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1.5 sm:gap-2 shrink-0">
            <div>
              Mostrando <strong>{movimientosOrdenados.length}</strong> movimientos en el periodo
              seleccionado.
            </div>
            <div className="flex items-center gap-4 font-mono font-bold text-[11px]">
              <span className="text-emerald-800">
                +Ingresos: {formatCurrency(balanceFiltrado.totalIngresos)}
              </span>
              <span className="text-rose-800">
                -Egresos: {formatCurrency(balanceFiltrado.totalEgresos)}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  balanceFiltrado.balanceNeto >= 0
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-rose-100 text-rose-900'
                }`}
              >
                Neto: {formatCurrency(balanceFiltrado.balanceNeto)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. MODALES DEL MÓDULO                                                     */}
      {/* ========================================================================= */}
      {/* Modal Cobro Caja */}
      <CobroCajaModal
        isOpen={cobroModalOpen}
        onClose={() => setCobroModalOpen(false)}
        onGuardarCobro={async (datos) => {
          await onNuevoCobro(datos)
          setCobroModalOpen(false)
        }}
      />

      {/* Modal Egreso Caja */}
      <EgresoCajaModal
        isOpen={egresoModalOpen}
        onClose={() => setEgresoModalOpen(false)}
        onGuardarEgreso={async (datos) => {
          await onNuevoEgreso(datos)
          setEgresoModalOpen(false)
        }}
      />

      {/* Modal Detalle / Reimpresión de Recibo */}
      <ReciboDetalleModal
        isOpen={!!reciboDetallePago}
        onClose={() => setReciboDetallePago(null)}
        pago={reciboDetallePago}
      />

      {/* Modal Confirmar Anulación */}
      <ConfirmarAnulacionModal
        isOpen={!!pagoParaAnular}
        onClose={() => setPagoParaAnular(null)}
        pago={pagoParaAnular}
        onConfirmar={handleConfirmarAnular}
        isDeleting={isDeleting}
      />
    </div>
  )
}

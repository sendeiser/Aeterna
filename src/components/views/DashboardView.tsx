import React, { useState } from 'react'
import { Parcela, AfiliadoSeguro, Inhumacion } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'

interface DashboardViewProps {
  parcelas: Parcela[]
  afiliados: AfiliadoSeguro[]
  inhumaciones: Inhumacion[]
  recaudacionHoy: number
  onCobrarQR: (parcela: Parcela) => void
  onNuevaParcela: () => void
  onNuevaInhumacion: () => void
  onNuevoAfiliado: () => void
  onVerParcelasMora: () => void
  onOpenSearch: () => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  parcelas,
  afiliados,
  inhumaciones,
  recaudacionHoy,
  onCobrarQR,
  onNuevaParcela,
  onNuevaInhumacion,
  onNuevoAfiliado,
  onVerParcelasMora,
  onOpenSearch,
}) => {
  type DashboardTab = 'todos' | 'parcelas' | 'afiliados' | 'inhumaciones' | 'mora'
  const [tableTab, setTableTab] = useState<DashboardTab>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const parcelasOcupadas = parcelas.filter((p) => p.estado === 'ocupada' || p.estado === 'en_mora').length
  const parcelasSecA = parcelas.filter((p) => p.sector_id === 'A').length
  const parcelasSecE = parcelas.filter((p) => p.sector_id === 'E').length
  const parcelasSalinas = parcelas.filter((p) => p.sector_id === 'SALINAS').length

  const parcelasEnMora = parcelas.filter((p) => p.estado === 'en_mora' || (p.saldo_mantenimiento || 0) > 0)
  const totalDeudaMora = parcelasEnMora.reduce((acc, p) => acc + (p.saldo_mantenimiento || 0), 0)
  const afiliadosActivos = afiliados.filter((a) => a.estado === 'activo').length

  // Filtrado de datos según búsqueda y tab activa
  const q = searchTerm.trim().toLowerCase()

  const displayedParcelas = parcelas.filter((p) => {
    if (!q) return true
    return (
      p.nomenclatura.toLowerCase().includes(q) ||
      (p.titular?.nombre_completo || '').toLowerCase().includes(q) ||
      (p.titular?.dni || '').toLowerCase().includes(q) ||
      (p.titular?.direccion || '').toLowerCase().includes(q) ||
      (p.sector_id || '').toLowerCase().includes(q)
    )
  })

  const displayedAfiliados = afiliados.filter((a) => {
    if (!q) return true
    return (
      a.numero_afiliado.toString().includes(q) ||
      a.nombre_completo.toLowerCase().includes(q) ||
      (a.dni || '').toLowerCase().includes(q) ||
      (a.zona_cobro || '').toLowerCase().includes(q) ||
      (a.direccion_cobro || '').toLowerCase().includes(q)
    )
  })

  const displayedInhumaciones = inhumaciones.filter((i) => {
    if (!q) return true
    const parcNom = (typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || ''
    return (
      i.nombre_difunto.toLowerCase().includes(q) ||
      (i.dni_difunto || '').toLowerCase().includes(q) ||
      parcNom.toLowerCase().includes(q) ||
      (i.causa_defuncion || '').toLowerCase().includes(q) ||
      (i.empresa_funebrera || '').toLowerCase().includes(q)
    )
  })

  const displayedMora = parcelasEnMora.filter((p) => {
    if (!q) return true
    return (
      p.nomenclatura.toLowerCase().includes(q) ||
      (p.titular?.nombre_completo || '').toLowerCase().includes(q) ||
      (p.titular?.dni || '').toLowerCase().includes(q)
    )
  })

  const totalCount = parcelas.length + afiliados.length + inhumaciones.length

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* OMNIBOX SPOTLIGHT / COMMAND PALETTE COMPONENT (Stitch Verbatim)       */}
      {/* ===================================================================== */}
      <section
        aria-label="Búsqueda Universal Operativa"
        className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3">
          {/* Omnibox Search Bar Input */}
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-secondary flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-[22px]">search</span>
            </span>
            <input
              id="omnibox-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={onOpenSearch}
              placeholder="Buscar por Titular, Nomenclatura (ej: A-25-96), Difunto o N° Afiliado (Ctrl+K)..."
              className="w-full h-11 pl-11 pr-24 rounded-lg border border-outline-variant bg-surface-bright text-on-surface placeholder:text-outline font-body-md text-body-md focus:border-secondary focus:ring-2 focus:ring-secondary-fixed focus:bg-surface-container-lowest transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-code-cadastral font-semibold text-outline bg-surface-container border border-outline-variant/80 rounded shadow-xs">
                <span>Ctrl</span>+<span>K</span>
              </kbd>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-outline hover:text-on-surface p-1"
                  title="Limpiar búsqueda"
                >
                  <span className="material-symbols-outlined text-[18px]">backspace</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters Bar & Context Counters */}
          <div className="pt-1 border-t border-surface-container-high/60 w-full overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1 w-full">
              <span className="text-label-caps font-label-caps text-outline uppercase tracking-wider text-[11px] shrink-0 mr-1 font-bold">
                Filtros:
              </span>
              <button
                type="button"
                id="filter-btn-todos"
                onClick={() => setTableTab('todos')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  tableTab === 'todos'
                    ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">apps</span>
                <span>Todos ({totalCount})</span>
              </button>
              <button
                type="button"
                id="filter-btn-parcelas"
                onClick={() => setTableTab('parcelas')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  tableTab === 'parcelas'
                    ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_goldenratio</span>
                <span>Parcelas ({parcelas.length})</span>
              </button>
              <button
                type="button"
                id="filter-btn-afiliados"
                onClick={() => setTableTab('afiliados')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  tableTab === 'afiliados'
                    ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>Afiliados ({afiliados.length})</span>
              </button>
              <button
                type="button"
                id="filter-btn-inhumaciones"
                onClick={() => setTableTab('inhumaciones')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  tableTab === 'inhumaciones'
                    ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>Inhumaciones ({inhumaciones.length})</span>
              </button>
              <button
                type="button"
                id="filter-btn-mora"
                onClick={() => setTableTab('mora')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  tableTab === 'mora'
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                    : 'bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>En Mora ({parcelasEnMora.length})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4 IMPACT METRIC TILES GRID (Stitch Verbatim)                           */}
      {/* ===================================================================== */}
      <section aria-label="Métricas Operativas Principales" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: Parcelas Ocupadas */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                PARCELAS OCUPADAS
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#1E3A8A] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  park
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-display text-[#0F172A] leading-tight">
                {parcelasOcupadas}
              </span>
              <span className="text-body-sm text-outline font-medium">/ {parcelas.length || 500} parcelas</span>
            </div>
            <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
              <span>
                {Math.round((parcelasOcupadas / (parcelas.length || 1)) * 100)}% capacidad ocupada
              </span>
            </div>
          </div>
          {/* Sub-breakdown footer */}
          <div className="mt-3 pt-2.5 border-t border-surface-container-high text-body-sm font-code-cadastral text-on-surface-variant flex items-center justify-between text-[11px]">
            <span>
              Sec. A: <strong className="text-on-surface">{parcelasSecA}</strong>
            </span>
            <span className="text-outline-variant">•</span>
            <span>
              Sec. E: <strong className="text-on-surface">{parcelasSecE}</strong>
            </span>
            <span className="text-outline-variant">•</span>
            <span>
              Salinas: <strong className="text-on-surface">{parcelasSalinas}</strong>
            </span>
          </div>
        </div>

        {/* CARD 2: En Mora de Mantenimiento */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-[#D97706]/50 transition-colors">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                EN MORA DE MANTENIMIENTO
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-display text-[#92400E] leading-tight">
                {parcelasEnMora.length}
              </span>
              <span className="text-body-sm text-[#92400E] font-medium">parcelas impagas</span>
            </div>
            <div className="mt-1 font-code-cadastral font-bold text-headline-sm text-on-surface">
              {formatCurrency(totalDeudaMora || 12450000)}{' '}
              <span className="text-body-sm font-normal text-outline">ARS</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-container-high flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span>Promedio 4.2 meses mora</span>
            </span>
            <button
              type="button"
              onClick={onVerParcelasMora}
              className="text-body-sm text-secondary font-medium hover:underline text-[11px]"
            >
              Reclamar
            </button>
          </div>
        </div>

        {/* CARD 3: Afiliados al Seguro */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-secondary/50 transition-colors">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                AFILIADOS AL SEGURO
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  security
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-display text-[#0F172A] leading-tight">
                {afiliados.length}
              </span>
              <span className="text-body-sm text-[#059669] font-medium">+8 este mes</span>
            </div>
            <div className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Cuota base: <strong className="font-code-cadastral text-on-surface">$ 18.000</strong> / mes
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-container-high flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-on-surface-variant font-label-caps">
              <span className="material-symbols-outlined text-[14px] text-secondary">trending_up</span>
              <span>
                Proyección:{' '}
                <strong className="font-code-cadastral text-on-surface">
                  {formatCurrency(afiliados.length * 18000)} ARS
                </strong>
              </span>
            </span>
          </div>
        </div>

        {/* CARD 4: Recaudación del Día */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-[#059669]/50 transition-colors">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider text-[11px]">
                RECAUDACIÓN DEL DÍA
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] text-[#059669] flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-display text-[#065F46] leading-tight font-code-cadastral">
                {formatCurrency(recaudacionHoy || 360000)}
              </span>
              <span className="text-body-sm text-outline font-medium">ARS</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-code-cadastral font-medium bg-surface-container text-on-surface border border-outline-variant/60">
                <span className="material-symbols-outlined text-[13px] text-outline">local_atm</span>
                <span>Efvo: $ 140.000</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-code-cadastral font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                <span className="material-symbols-outlined text-[13px] text-[#059669]">qr_code_2</span>
                <span>Transf/QR: $ 220.000</span>
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface-container-high flex items-center justify-between text-[11px] text-outline">
            <span>
              Operaciones registradas: <strong>14</strong>
            </span>
            <span className="text-[#059669] font-medium">Caja en regla</span>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* DATA TABLE / RESPONSIVE CARDS: ACTIVIDAD Y BÚSQUEDA RÁPIDA           */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header & Tab Bar */}
        <div className="p-3 sm:p-4 border-b border-outline-variant/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-container-low/30">
          <div>
            <h2 className="font-headline-md text-base sm:text-headline-md text-primary tracking-tight font-bold">
              {tableTab === 'todos' && 'Actividad Global y Registros Unificados'}
              {tableTab === 'parcelas' && 'Padrón de Parcelas'}
              {tableTab === 'afiliados' && 'Nómina de Afiliados al Plan Seguro'}
              {tableTab === 'inhumaciones' && 'Libro Digital de Inhumaciones'}
              {tableTab === 'mora' && 'Titulares y Parcelas con Mantenimiento en Mora'}
            </h2>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              {tableTab === 'todos' && 'Listado consolidado de parcelas, afiliados e inhumaciones registradas'}
              {tableTab === 'parcelas' && 'Nomenclaturas, titulares y estados catastrales vigentes'}
              {tableTab === 'afiliados' && 'Padrón de seguro social, zonas de cobranza y estado de cuenta'}
              {tableTab === 'inhumaciones' && 'Actas de sepelio y protocolos sanitarios registrados'}
              {tableTab === 'mora' && 'Cuentas con saldo adeudado para cobro inmediato o intimación'}
            </p>
          </div>

          {/* Dense Tabs Control */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/60 overflow-x-auto custom-scroll w-full md:w-auto">
            <button
              type="button"
              onClick={() => setTableTab('todos')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                tableTab === 'todos'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setTableTab('parcelas')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                tableTab === 'parcelas'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Parcelas ({parcelas.length})
            </button>
            <button
              type="button"
              onClick={() => setTableTab('afiliados')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                tableTab === 'afiliados'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Afiliados ({afiliados.length})
            </button>
            <button
              type="button"
              onClick={() => setTableTab('inhumaciones')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                tableTab === 'inhumaciones'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Inhumaciones ({inhumaciones.length})
            </button>
            <button
              type="button"
              onClick={() => setTableTab('mora')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                tableTab === 'mora'
                  ? 'font-semibold bg-surface-container-lowest text-amber-800 shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              En Mora ({parcelasEnMora.length})
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MOBILE VIEW (< md): Responsive Interactive Cards                   */}
        {/* ================================================================= */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-2.5 max-h-[600px] overflow-y-auto custom-scroll">
          {/* TAB PARCELAS O MORA */}
          {(tableTab === 'parcelas' || tableTab === 'mora') && (
            (tableTab === 'parcelas' ? displayedParcelas : displayedMora).length === 0 ? (
              <div className="p-4 text-center text-outline text-sm">No se encontraron parcelas.</div>
            ) : (
              (tableTab === 'parcelas' ? displayedParcelas : displayedMora).slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-2 hover:border-secondary/40 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-code-cadastral font-bold text-primary text-sm bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant">
                        {p.nomenclatura}
                      </span>
                      <span className="text-[11px] text-outline font-medium">
                        Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id} • Fila {p.manzana_fila || '0'}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.estado === 'ocupada'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : p.estado === 'en_mora'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : p.estado === 'disponible'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}
                    >
                      {p.estado === 'en_mora' ? 'En Mora' : p.estado.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-on-surface text-sm">
                      {p.titular?.nombre_completo || '(Sin titular asignado)'}
                    </div>
                    <div className="text-[11px] font-code-cadastral text-outline">
                      {p.titular?.dni ? `DNI: ${p.titular.dni}` : p.titular?.direccion || 'Chamical, La Rioja'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 mt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-outline block">
                        Saldo Mantenimiento
                      </span>
                      <span
                        className={`font-code-cadastral font-bold text-sm ${
                          (p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCobrarQR(p)}
                      className="h-8 px-3 rounded-md bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                      <span>Cobrar QR</span>
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB AFILIADOS */}
          {tableTab === 'afiliados' && (
            displayedAfiliados.length === 0 ? (
              <div className="p-4 text-center text-outline text-sm">No se encontraron afiliados.</div>
            ) : (
              displayedAfiliados.slice(0, 20).map((a) => (
                <div
                  key={a.id}
                  className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-2 hover:border-secondary/40 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-code-cadastral font-bold text-primary text-sm bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant">
                        N° {a.numero_afiliado}
                      </span>
                      <span className="text-[11px] text-outline font-medium">
                        {a.zona_cobro || 'Zona 1'} • {a.cobrador_asignado || 'Cobrador Oficial'}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        a.estado === 'activo'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      {a.estado.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-on-surface text-sm">
                      {a.nombre_completo}
                    </div>
                    <div className="text-[11px] font-code-cadastral text-outline">
                      {a.dni ? `DNI: ${a.dni}` : ''} • {a.direccion_cobro || 'Chamical'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 mt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-outline block">Cuota Mensual</span>
                      <span className="font-code-cadastral font-bold text-sm text-primary">
                        {formatCurrency(a.monto_cuota_mensual || 8000)}
                      </span>
                    </div>
                    <span className="text-xs text-outline font-medium">Plan Seguro</span>
                  </div>
                </div>
              ))
            )
          )}

          {/* TAB INHUMACIONES */}
          {tableTab === 'inhumaciones' && (
            displayedInhumaciones.length === 0 ? (
              <div className="p-4 text-center text-outline text-sm">No se encontraron inhumaciones.</div>
            ) : (
              displayedInhumaciones.slice(0, 20).map((i) => {
                const parcNom = typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela
                return (
                  <div
                    key={i.id}
                    className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-2 hover:border-secondary/40 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-code-cadastral font-bold text-primary text-sm bg-surface-container-lowest px-2 py-0.5 rounded border border-outline-variant">
                          {parcNom || 'A-25-96'}
                        </span>
                        <span className="text-[11px] text-secondary font-medium">
                          Nivel {i.nivel_posicion || 1}
                        </span>
                      </div>
                      {i.es_covid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]">
                          COVID-19
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Estándar
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-on-surface text-sm">
                        {i.nombre_difunto}
                      </div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        {i.dni_difunto ? `DNI: ${i.dni_difunto} • ` : ''}Fecha: {i.fecha_inhumacion?.slice(0, 10)}
                      </div>
                    </div>

                    <div className="text-xs text-outline pt-1 border-t border-outline-variant/30 flex justify-between">
                      <span>{i.empresa_funebrera || 'Servicios Chamical'}</span>
                      <span className="font-medium text-primary">{i.causa_defuncion || 'Causa Natural'}</span>
                    </div>
                  </div>
                )
              })
            )
          )}

          {/* TAB TODOS (Feed Consolidado) */}
          {tableTab === 'todos' && (
            <div className="space-y-2">
              {displayedParcelas.slice(0, 8).map((p) => (
                <div
                  key={`p-${p.id}`}
                  className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                      PARCELA
                    </span>
                    <span className="font-code-cadastral font-bold text-primary">{p.nomenclatura}</span>
                  </div>
                  <div className="text-sm font-semibold text-on-surface">{p.titular?.nombre_completo || 'Sin titular'}</div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/40">
                    <span className="text-outline">Saldo: {formatCurrency(p.saldo_mantenimiento || 0)}</span>
                    <button
                      type="button"
                      onClick={() => onCobrarQR(p)}
                      className="px-2 py-1 rounded bg-secondary text-white text-xs font-semibold cursor-pointer"
                    >
                      Cobrar QR
                    </button>
                  </div>
                </div>
              ))}
              {displayedAfiliados.slice(0, 4).map((a) => (
                <div
                  key={`a-${a.id}`}
                  className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                      AFILIADO
                    </span>
                    <span className="font-code-cadastral font-bold text-primary">N° {a.numero_afiliado}</span>
                  </div>
                  <div className="text-sm font-semibold text-on-surface">{a.nombre_completo}</div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/40">
                    <span className="text-outline">{a.zona_cobro || 'Zona 1'}</span>
                    <span className="font-code-cadastral font-bold text-primary">{formatCurrency(a.monto_cuota_mensual || 8000)}/mes</span>
                  </div>
                </div>
              ))}
              {displayedInhumaciones.slice(0, 4).map((i) => (
                <div
                  key={`i-${i.id}`}
                  className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      INHUMACIÓN
                    </span>
                    <span className="text-[11px] font-code-cadastral text-outline">{i.fecha_inhumacion?.slice(0, 10)}</span>
                  </div>
                  <div className="text-sm font-semibold text-on-surface">{i.nombre_difunto}</div>
                  <div className="text-xs text-outline">
                    Fosa: {(typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || 'A-25-96'} [Nivel {i.nivel_posicion || 1}]
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* DESKTOP VIEW (>= md): High Density Institutional Table             */}
        {/* ================================================================= */}
        <div className="hidden md:block overflow-x-auto">
          {/* TAB PARCELAS O MORA */}
          {(tableTab === 'parcelas' || tableTab === 'mora') && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">Nomenclatura</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Titular / DNI</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Ubicación</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Monto / Saldo</th>
                  <th className="px-4 py-2 w-36 text-center font-semibold bg-slate-100">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {(tableTab === 'parcelas' ? displayedParcelas : displayedMora).slice(0, 25).map((p, index) => (
                  <tr
                    key={p.id}
                    className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-primary">
                        {p.nomenclatura}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">
                        {p.titular?.nombre_completo || 'Sin titular'}
                      </div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        {p.titular?.dni ? `DNI: ${p.titular.dni}` : p.titular?.direccion || 'Chamical'}
                      </div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-on-surface-variant">
                      Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id} • Fila {p.manzana_fila || '0'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          p.estado === 'ocupada'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : p.estado === 'en_mora'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : p.estado === 'disponible'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-red-50 text-red-900 border-red-200'
                        }`}
                      >
                        {p.estado === 'en_mora' ? 'En Mora' : p.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-body-md">
                      <span className={(p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'}>
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => onCobrarQR(p)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-primary text-white font-title-md text-body-sm shadow-xs inline-flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span>
                        <span>Cobrar QR</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB AFILIADOS */}
          {tableTab === 'afiliados' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">N° Afiliado</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Afiliado Titular / DNI</th>
                  <th className="px-4 py-2 w-44 font-semibold bg-slate-100">Zona / Domicilio</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Cuota Mensual</th>
                  <th className="px-4 py-2 w-36 text-center font-semibold bg-slate-100">Cobrador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {displayedAfiliados.slice(0, 25).map((a, index) => (
                  <tr
                    key={a.id}
                    className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-primary">
                        N° {a.numero_afiliado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">{a.nombre_completo}</div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        {a.dni ? `DNI: ${a.dni}` : 'Sin DNI'}
                      </div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-on-surface-variant">
                      <div className="font-medium">{a.zona_cobro || 'Zona 1'}</div>
                      <div className="text-[11px] text-outline truncate max-w-[180px]">{a.direccion_cobro || 'Chamical'}</div>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          a.estado === 'activo'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {a.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-body-md text-primary">
                      {formatCurrency(a.monto_cuota_mensual || 8000)}
                    </td>
                    <td className="px-4 py-2 align-middle text-center text-xs text-on-surface-variant">
                      {a.cobrador_asignado || 'Cobrador Oficial'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB INHUMACIONES */}
          {tableTab === 'inhumaciones' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-32 text-left font-semibold bg-slate-100">Fecha Sepelio</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Difunto / DNI</th>
                  <th className="px-4 py-2 w-36 font-semibold bg-slate-100">Parcela y Nivel</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Protocolo</th>
                  <th className="px-4 py-2 w-48 font-semibold bg-slate-100">Causa Defunción</th>
                  <th className="px-4 py-2 w-36 text-center font-semibold bg-slate-100">Empresa Fúnebre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {displayedInhumaciones.slice(0, 25).map((i, index) => {
                  const parcNom = typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela
                  return (
                    <tr
                      key={i.id}
                      className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                        index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                      }`}
                    >
                      <td className="px-4 py-2 align-middle font-code-cadastral font-semibold text-xs text-on-surface">
                        {i.fecha_inhumacion?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="font-semibold text-on-surface">{i.nombre_difunto}</div>
                        <div className="text-[11px] font-code-cadastral text-outline">
                          {i.dni_difunto ? `DNI: ${i.dni_difunto}` : 'Acta Sepelio'}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="font-code-cadastral font-bold text-primary bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/60">
                          {parcNom || 'A-25-96'}
                        </span>
                        <span className="text-[11px] text-secondary font-medium ml-1">
                          [Nivel {i.nivel_posicion || 1}]
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        {i.es_covid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]">
                            COVID-19
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Estándar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 align-middle text-body-sm text-outline truncate max-w-[200px]">
                        {i.causa_defuncion || 'Causa Natural'}
                      </td>
                      <td className="px-4 py-2 align-middle text-center text-xs text-on-surface-variant truncate max-w-[140px]">
                        {i.empresa_funebrera || 'Servicios Sociales'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* TAB TODOS (Consolidado) */}
          {tableTab === 'todos' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">Módulo</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Identificador</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Nombre / Titular / Difunto</th>
                  <th className="px-4 py-2 w-36 font-semibold bg-slate-100">Detalle / Ubicación</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Monto / Fecha</th>
                  <th className="px-4 py-2 w-32 text-center font-semibold bg-slate-100">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {displayedParcelas.slice(0, 10).map((p, index) => (
                  <tr
                    key={`p-${p.id}`}
                    className={`transition-colors h-[40px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        PARCELA
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                      {p.nomenclatura}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">{p.titular?.nombre_completo || 'Sin titular'}</div>
                      <div className="text-[10px] text-outline">{p.titular?.dni ? `DNI: ${p.titular.dni}` : ''}</div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-outline">
                      Sec. {p.sector_id} • Fila {p.manzana_fila || '0'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container border border-outline-variant">
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-xs">
                      {formatCurrency(p.saldo_mantenimiento || 0)}
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => onCobrarQR(p)}
                        className="px-2 py-0.5 rounded bg-secondary hover:bg-primary text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Cobrar QR
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedAfiliados.slice(0, 5).map((a, index) => (
                  <tr
                    key={`a-${a.id}`}
                    className={`transition-colors h-[40px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                        AFILIADO
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                      N° {a.numero_afiliado}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">{a.nombre_completo}</div>
                      <div className="text-[10px] text-outline">{a.dni ? `DNI: ${a.dni}` : ''}</div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-outline">
                      {a.zona_cobro || 'Zona 1'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-xs text-primary">
                      {formatCurrency(a.monto_cuota_mensual || 8000)}/m
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <span className="text-[11px] text-outline font-medium">Plan Seguro</span>
                    </td>
                  </tr>
                ))}
                {displayedInhumaciones.slice(0, 5).map((i, index) => {
                  const parcNom = typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela
                  return (
                    <tr
                      key={`i-${i.id}`}
                      className={`transition-colors h-[40px] border-b border-slate-200/80 ${
                        index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                      }`}
                    >
                      <td className="px-4 py-2 align-middle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          INHUMACIÓN
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                        {parcNom || 'A-25-96'}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="font-semibold text-on-surface">{i.nombre_difunto}</div>
                        <div className="text-[10px] text-outline">{i.causa_defuncion || 'Causa Natural'}</div>
                      </td>
                      <td className="px-4 py-2 align-middle text-body-sm text-outline">
                        Nivel {i.nivel_posicion || 1}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container border border-outline-variant">
                          {i.es_covid ? 'COVID-19' : 'Estándar'}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-right font-code-cadastral text-xs text-outline">
                        {i.fecha_inhumacion?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <span className="text-[11px] text-outline font-medium">Acta Digital</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

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
  const [tableTab, setTableTab] = useState<'todos' | 'mora' | 'inhumaciones' | 'cobranzas'>('todos')
  const [searchTerm, setSearchTerm] = useState('')

  const parcelasOcupadas = parcelas.filter((p) => p.estado === 'ocupada' || p.estado === 'en_mora').length
  const parcelasSecA = parcelas.filter((p) => p.sector_id === 'A').length
  const parcelasSecE = parcelas.filter((p) => p.sector_id === 'E').length
  const parcelasSalinas = parcelas.filter((p) => p.sector_id === 'SALINAS').length

  const parcelasEnMora = parcelas.filter((p) => p.estado === 'en_mora' || (p.saldo_mantenimiento || 0) > 0)
  const totalDeudaMora = parcelasEnMora.reduce((acc, p) => acc + (p.saldo_mantenimiento || 0), 0)
  const afiliadosActivos = afiliados.filter((a) => a.estado === 'activo').length

  // Filtrado de la tabla según pestañas y búsqueda
  const displayedParcelas = parcelas
    .filter((p) => {
      if (tableTab === 'mora' && (p.saldo_mantenimiento || 0) <= 0 && p.estado !== 'en_mora') return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        return (
          p.nomenclatura.toLowerCase().includes(q) ||
          (p.titular?.nombre_completo || '').toLowerCase().includes(q) ||
          (p.titular?.direccion || '').toLowerCase().includes(q)
        )
      }
      return true
    })
    .slice(0, 15)

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
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 w-full">
              <span className="text-label-caps font-label-caps text-outline uppercase tracking-wider text-[10px] shrink-0 mr-1">
                Filtros:
              </span>
              <button
                type="button"
                onClick={() => setTableTab('todos')}
                className={`px-2.5 py-1 rounded-full text-body-sm font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                  tableTab === 'todos'
                    ? 'bg-primary-container text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">apps</span>
                <span>Todos ({parcelas.length + afiliados.length + inhumaciones.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTab('todos')}
                className="px-2.5 py-1 rounded-full text-body-sm font-medium bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">grid_goldenratio</span>
                <span>Parcelas ({parcelas.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTab('cobranzas')}
                className="px-2.5 py-1 rounded-full text-body-sm font-medium bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">badge</span>
                <span>Afiliados ({afiliados.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTab('inhumaciones')}
                className="px-2.5 py-1 rounded-full text-body-sm font-medium bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                <span>Inhumaciones ({inhumaciones.length})</span>
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
              Actividad y Búsqueda Rápida
            </h2>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              Libro parcelario digital y nómina unificada de cobros vigentes
            </p>
          </div>
          {/* Dense Tabs Control - Scrollable on mobile */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/60 overflow-x-auto custom-scroll w-full md:w-auto">
            <button
              type="button"
              onClick={() => setTableTab('todos')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 ${
                tableTab === 'todos'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Todos los movimientos
            </button>
            <button
              type="button"
              onClick={() => setTableTab('mora')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 ${
                tableTab === 'mora'
                  ? 'font-semibold bg-surface-container-lowest text-amber-800 shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Mantenimiento en mora
            </button>
            <button
              type="button"
              onClick={() => setTableTab('inhumaciones')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-body-sm whitespace-nowrap transition-colors shrink-0 ${
                tableTab === 'inhumaciones'
                  ? 'font-semibold bg-surface-container-lowest text-primary shadow-xs'
                  : 'font-medium text-on-surface-variant hover:text-primary'
              }`}
            >
              Inhumaciones recientes
            </button>
          </div>
        </div>

        {/* MOBILE VIEW (< md): Responsive Interactive Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-2.5">
          {displayedParcelas.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron registros.</div>
          ) : (
            displayedParcelas.map((p) => (
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
                    className="h-8 px-3 rounded-md bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                    <span>Cobrar QR</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP VIEW (>= md): High Density Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-outline-variant text-[11px] font-label-caps text-on-surface-variant uppercase tracking-wider h-8 select-none">
                <th className="px-4 py-2 w-28 text-left font-semibold">Nomenclatura</th>
                <th className="px-4 py-2 min-w-[240px] font-semibold">Titular / Difunto</th>
                <th className="px-4 py-2 w-32 font-semibold">Ubicación</th>
                <th className="px-4 py-2 w-32 font-semibold">Estado</th>
                <th className="px-4 py-2 w-32 text-right font-semibold">Monto / Saldo</th>
                <th className="px-4 py-2 w-36 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
              {displayedParcelas.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-surface-container-low/60 transition-colors h-[42px]">
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
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-primary text-white font-title-md text-body-sm shadow-xs inline-flex items-center gap-1 active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span>
                        <span>Cobrar QR</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

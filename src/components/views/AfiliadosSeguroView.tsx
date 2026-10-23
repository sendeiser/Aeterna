import React, { useState } from 'react'
import { AfiliadoSeguro } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { DetalleCuotaModal } from '../modals/DetalleCuotaModal'
import { evaluarMoraAfiliado } from '../../lib/reglasNegocio'

interface AfiliadosSeguroViewProps {
  afiliados: (AfiliadoSeguro & { cuotasPagadas?: number[] })[]
  onCobrarCuota: (afiliado: AfiliadoSeguro, nroCuota: number) => void
  onCobrarMultiplesCuotas?: (afiliado: AfiliadoSeguro, nrosCuotas: number[]) => void
  onRevertirCuota?: (afiliadoId: string, nroCuota: number) => void
  onNuevoAfiliado: () => void
  onEditarAfiliado: (afiliado: AfiliadoSeguro) => void
  onEliminarAfiliado?: (id: string) => void
}

export const AfiliadosSeguroView: React.FC<AfiliadosSeguroViewProps> = ({
  afiliados,
  onCobrarCuota,
  onCobrarMultiplesCuotas,
  onRevertirCuota,
  onNuevoAfiliado,
  onEditarAfiliado,
  onEliminarAfiliado,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'deuda' | 'aldia' | 'standby'>('all')

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

  // Filtrado
  const filtered = afiliados.filter((a) => {
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

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* HEADER & METRIC COUNTERS (Stitch Verbatim)                           */}
      {/* ===================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight">
            Padrón General de Afiliados al Plan Seguro Integral
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-0.5">
            Gestión de Cobranzas, Cuotas Anuales y Hojas de Ruta de Cobradores de Calle · Chamical.
          </p>
        </div>

        {/* Metric Counters: Estado Cobranza Mensual (Marzo 2026) */}
        <div className="flex items-center gap-3 bg-surface-container-lowest p-2 rounded-xl border border-outline-variant shadow-xs shrink-0">
          <div className="px-3.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/50">
            <span className="text-label-caps font-label-caps text-on-surface-variant block">
              TOTAL AFILIADOS
            </span>
            <span className="text-headline-md font-code-cadastral text-on-surface font-bold">
              {totalAfiliados}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-label-caps font-label-caps text-emerald-800 block">
              AL DÍA (MARZO)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-headline-md font-code-cadastral text-emerald-700 font-bold">
                {afiliadosAlDia}
              </span>
              <span className="text-body-sm font-body-sm text-emerald-600">
                ({Math.round((afiliadosAlDia / (totalAfiliados || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-label-caps font-label-caps text-amber-800 block">
              PENDIENTES / MORA
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-headline-md font-code-cadastral text-amber-700 font-bold">
                {afiliadosDeuda}
              </span>
              <span className="text-body-sm font-body-sm text-amber-600">
                ({Math.round((afiliadosDeuda / (totalAfiliados || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
            <span className="text-label-caps font-label-caps text-rose-800 block">
              STAND-BY (+3 MESES)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-headline-md font-code-cadastral text-rose-700 font-bold">
                {afiliadosStandby}
              </span>
              <span className="text-body-sm font-body-sm text-rose-600">
                ({Math.round((afiliadosStandby / (totalAfiliados || 1)) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ADMINISTRATIVE CONTROL TOOLBAR (Stitch Verbatim)                      */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        {/* Filter & Search Controls */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Live Input Search */}
          <div className="relative min-w-0 sm:min-w-[280px] w-full sm:w-auto flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]" data-icon="search">
                search
              </span>
            </span>
            <input
              id="searchBox"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, DNI o N° de Afiliado... (Ctrl+K)"
              className="w-full h-9 pl-9 pr-14 text-body-md font-body-md bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 placeholder:text-on-surface-variant/60"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
              <span className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant text-on-surface-variant font-code-cadastral">
                Ctrl+K
              </span>
            </div>
          </div>

          {/* Zone / Street Collector Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="zoneFilter"
              className="text-body-sm font-body-sm text-on-surface-variant whitespace-nowrap font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]" data-icon="two_wheeler">
                two_wheeler
              </span>
              <span>Zona / Cobrador:</span>
            </label>
            <select
              id="zoneFilter"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="h-9 text-body-md font-body-md bg-white border border-outline-variant rounded-lg px-3 py-1 pr-8 focus:border-secondary focus:ring-2 focus:ring-secondary/20 font-medium"
            >
              <option value="all">[Todas las Zonas - {totalAfiliados} Afiliados]</option>
              <option value="Zona 1">[Zona 1 - Ruta 1 / B° Tiro - Cobr. Flores]</option>
              <option value="Zona 2">[Zona 2 - B° Loma Blanca - Cobr. Gómez]</option>
              <option value="Zona 3">[Zona 3 - Centro Chamical - Cobr. Mercado]</option>
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 border border-outline-variant rounded-lg p-0.5 bg-surface-container-low text-body-sm font-body-sm">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
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
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'deuda'
                  ? 'bg-white shadow-xs font-semibold text-amber-800'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Con Deuda ({afiliadosDeuda})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aldia')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
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
              className={`px-2.5 py-1 rounded-md transition-colors ${
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3.5 rounded-lg border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface font-title-md text-title-md transition-colors active:scale-[0.99] flex items-center justify-center gap-2 shadow-xs w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px] text-primary" data-icon="print">
              print
            </span>
            <span className="hidden sm:inline">Imprimir Planilla de Ruta para Cobrador</span>
            <span className="sm:hidden">Imprimir Planilla de Ruta</span>
          </button>
          <button
            type="button"
            onClick={onNuevoAfiliado}
            className="h-9 px-4 rounded-lg bg-secondary hover:bg-primary text-white font-title-md text-title-md transition-colors active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="add_circle">
              add_circle
            </span>
            <span>+ Nuevo Afiliado</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MATRIX INTERACTIVE LEDGER CARD (Stitch Verbatim)                       */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {/* Table Toolbar & Fiscal Year Header */}
        <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" data-icon="calendar_month">
                calendar_month
              </span>
              <span className="text-title-md font-title-md text-primary font-bold">
                EJERCICIO FISCAL 2026
              </span>
            </div>
            <span className="text-body-sm font-body-sm text-on-surface-variant hidden sm:inline">
              · Cobertura Parroquial y Municipal para Servicios Fúnebres Completos
            </span>
          </div>

          {/* Color Key & Legend for Matrix */}
          <div className="flex items-center gap-4 text-body-sm font-body-sm bg-white px-3 py-1.5 rounded-lg border border-outline-variant/80">
            <span className="text-label-caps font-label-caps text-on-surface-variant font-semibold">
              REFERENCIAS:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span className="text-on-surface font-medium text-[11px]">Pagada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
                !
              </span>
              <span className="text-red-700 font-medium text-[11px]">Vencida / Cobro directo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
                ·
              </span>
              <span className="text-on-surface-variant text-[11px]">A vencer (Meses futuros)</span>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW (< md): Responsive Interactive Afiliados Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-3 max-h-[550px] overflow-y-auto custom-scroll">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron afiliados.</div>
          ) : (
            filtered.map((afiliado) => {
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

              return (
                <div
                  key={afiliado.id}
                  className="p-3.5 rounded-lg border border-outline-variant/70 bg-surface-container-low/40 flex flex-col gap-3 shadow-xs"
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
                              className="h-8 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center text-[10px] font-bold shadow-xs active:scale-95 transition-transform"
                              title={`${m.label}: Pagada - Tocar para ver comprobante`}
                            >
                              <span className="text-[9px] leading-tight">{m.label}</span>
                              <span className="text-[10px] leading-none">✓</span>
                            </button>
                          )
                        }

                        if (isVencida) {
                          return (
                            <button
                              key={m.num}
                              type="button"
                              onClick={() => onCobrarCuota(afiliado, m.num)}
                              className="h-8 rounded bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center text-[10px] font-bold shadow-xs border border-red-300 animate-pulse active:scale-95"
                              title={`${m.label}: Vencida - Tocar para cobrar`}
                            >
                              <span className="text-[9px] leading-tight">{m.label}</span>
                              <span className="text-[10px] leading-none">!</span>
                            </button>
                          )
                        }

                        return (
                          <button
                            key={m.num}
                            type="button"
                            onClick={() => onCobrarCuota(afiliado, m.num)}
                            className="h-8 rounded bg-surface border border-outline-variant text-outline hover:text-on-surface hover:bg-surface-container flex flex-col items-center justify-center text-[10px] font-medium active:scale-95"
                            title={`${m.label}: Adelantar`}
                          >
                            <span className="text-[9px] leading-tight">{m.label}</span>
                            <span className="text-[10px] leading-none text-outline-variant">·</span>
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
                        onClick={() => onEditarAfiliado(afiliado)}
                        className="h-8 w-8 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
                        title="Editar Afiliado"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-outline-variant text-[11px] font-label-caps text-on-surface-variant uppercase tracking-wider h-8 select-none">
                <th className="px-4 py-2 w-28 text-left font-semibold">N° Afiliado</th>
                <th className="px-4 py-2 min-w-[280px] font-semibold">Afiliado / Titular & Domicilio</th>
                <th className="px-4 py-2 w-32 font-semibold">Cuota Base</th>
                <th className="px-4 py-2 min-w-[500px] text-center font-semibold">
                  <span>Estado Cuotas 2026 (Ene · Feb · Mar · Abr · May · Jun · Jul · Ago · Sep · Oct · Nov · Dic)</span>
                </th>
                <th className="px-4 py-2 w-32 text-right font-semibold">Saldo Deuda</th>
                <th className="px-4 py-2 w-44 text-right font-semibold">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
              {filtered.map((afiliado) => {
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

                return (
                  <tr key={afiliado.id} className="hover:bg-surface-container-low/60 transition-colors">
                    {/* Col 1: N° Afiliado */}
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-primary font-code-cadastral text-code-cadastral font-bold border border-outline-variant">
                        #{afiliado.numero_afiliado}
                      </span>
                      <span className="block text-[10px] text-on-surface-variant/70 font-code-cadastral mt-0.5">
                        ALTA: 2018
                      </span>
                    </td>

                    {/* Col 2: Info Afiliado */}
                    <td className="px-4 py-3 align-middle">
                      <div className="font-semibold text-primary text-body-lg">
                        {afiliado.nombre_completo}
                      </div>
                      <div className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
                        <span className="font-code-cadastral font-medium">
                          DNI {afiliado.dni || '14.882.109'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs" data-icon="location_on">
                            location_on
                          </span>
                          <span>{afiliado.direccion_cobro || 'Chamical, La Rioja'}</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary bg-secondary-fixed/50 px-1.5 py-0.2 rounded">
                          <span className="material-symbols-outlined text-xs" data-icon="two_wheeler">
                            two_wheeler
                          </span>
                          <span>{afiliado.zona_cobro || 'Zona 1 - Ruta 1 / B° Tiro'}</span>
                        </span>
                        {moraInfo.enStandby && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            <span>Stand-by (+3 meses)</span>
                          </span>
                        )}
                      </div>
                      {moraInfo.enStandby && (
                        <div className="text-[11px] text-rose-800 font-semibold mt-1">
                          Últ. cuota: <strong>{moraInfo.ultimaCuotaPagada}</strong>
                        </div>
                      )}
                    </td>

                    {/* Col 3: Cuota Mensual */}
                    <td className="px-4 py-3 align-middle">
                      <div className="font-code-cadastral font-bold text-on-surface text-body-md">
                        {formatCurrency(afiliado.monto_cuota_mensual)}
                      </div>
                      <span className="text-[10px] text-on-surface-variant block uppercase">
                        Mensual Fijo
                      </span>
                    </td>

                    {/* Col 4: Matriz 12 Cuotas (Stitch Verbatim Cells) */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        {meses.map((m) => {
                          const isPagada = cuotasPagadas.includes(m.num)
                          const isVencida = !isPagada && m.num <= mesActual

                          if (isPagada) {
                            return (
                              <button
                                key={m.num}
                                type="button"
                                onClick={() => handleVerDetalleCuota(afiliado, m.num)}
                                className="w-8 h-8 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center shadow-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                title={`${m.label} 2026: Pagada (${formatCurrency(
                                  afiliado.monto_cuota_mensual
                                )}) - Clic para ver recibo y comprobante`}
                              >
                                <span className="text-[9px] leading-none font-bold">{m.num}</span>
                                <span className="text-[10px] leading-none font-black">✓</span>
                              </button>
                            )
                          }

                          if (isVencida) {
                            return (
                              <button
                                key={m.num}
                                type="button"
                                onClick={() => onCobrarCuota(afiliado, m.num)}
                                className="w-8 h-8 rounded-md bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center shadow-xs border-2 border-red-300 animate-pulse transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                title={`${m.label} 2026: VENCIDA - Clic para cobrar con QR`}
                              >
                                <span className="text-[9px] leading-none font-bold">{m.num}</span>
                                <span className="text-[10px] leading-none font-bold">!</span>
                              </button>
                            )
                          }

                          return (
                            <button
                              key={m.num}
                              type="button"
                              onClick={() => onCobrarCuota(afiliado, m.num)}
                              className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-900 flex items-center justify-center text-[11px] font-code-cadastral transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              title={`${m.label} 2026: A vencer - Clic para adelantar cobro`}
                            >
                              {m.num}
                            </button>
                          )
                        })}
                      </div>
                    </td>

                    {/* Col 5: Saldo Total Deuda */}
                    <td className="px-4 py-3 align-middle text-right">
                      {saldoDeuda > 0 ? (
                        <>
                          <div className="font-code-cadastral font-bold text-red-700 text-body-lg">
                            {formatCurrency(saldoDeuda)}
                          </div>
                          <span className="inline-flex items-center text-[10px] font-bold text-red-800 bg-red-100 px-1.5 py-0.2 rounded border border-red-200">
                            {mesesVencidos.length} cuota{mesesVencidos.length > 1 ? 's' : ''} en mora
                          </span>
                        </>
                      ) : (
                        <div className="font-code-cadastral font-semibold text-emerald-700 text-body-md">
                          Al día
                        </div>
                      )}
                    </td>

                    {/* Col 6: Acciones Rápidas */}
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {mesesVencidos.length > 1 && onCobrarMultiplesCuotas ? (
                          <button
                            type="button"
                            onClick={() => onCobrarMultiplesCuotas(afiliado, mesesVencidos)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-title-md text-xs shadow-xs flex items-center gap-1 active:scale-[0.98]"
                            title={`Cobrar ${mesesVencidos.length} cuotas vencidas juntas (${formatCurrency(saldoDeuda)})`}
                          >
                            <span className="material-symbols-outlined text-xs">payments</span>
                            <span>Mora ({mesesVencidos.length})</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCobrarCuota(afiliado, siguienteCuotaCobrar)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-title-md text-body-sm shadow-xs flex items-center gap-1 active:scale-[0.98]"
                          >
                            <span className="material-symbols-outlined text-sm" data-icon="qr_code_2">
                              qr_code_2
                            </span>
                            <span>Cobrar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditarAfiliado(afiliado)}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container-low text-on-surface-variant transition-colors"
                          title="Editar Afiliado y Grupo Familiar"
                        >
                          <span className="material-symbols-outlined text-base" data-icon="family_restroom">
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
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-red-50 text-outline hover:text-red-700 transition-colors"
                            title="Dar de baja afiliado"
                          >
                            <span className="material-symbols-outlined text-base" data-icon="delete">
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
    </div>
  )
}

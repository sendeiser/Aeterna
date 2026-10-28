import React, { useState, useMemo, useRef } from 'react'
import { Parcela } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeudorCobranza {
  parcelaId: string
  nomenclatura: string
  sector: string
  titularNombre: string
  domicilio: string
  telefono: string
  diaPago: string          // "Cuota 2024" / fecha
  saldo: number
  estado: string
  // Full Parcela for payment modal
  parcela: Parcela
}

interface CobranzasViewProps {
  parcelas: Parcela[]
  onCobrarQR: (parcela: Parcela) => void
  onEnviarCobro: (parcela: Parcela) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sectorFromNomenclatura(nom: string): string {
  // e.g. "A-25-96" → "A"
  return nom?.split('-')[0]?.toUpperCase() || 'N/A'
}

function buildDeudores(parcelas: Parcela[]): DeudorCobranza[] {
  return parcelas
    .filter((p) => (p.saldo_mantenimiento || 0) > 0)
    .map((p) => ({
      parcelaId: p.id,
      nomenclatura: p.nomenclatura,
      sector: p.sector_id || sectorFromNomenclatura(p.nomenclatura),
      titularNombre: p.titular?.nombre_completo || 'Sin titular',
      domicilio: p.titular?.direccion || 'S/D',
      telefono: p.titular?.telefono || 'S/D',
      diaPago: p.fecha_ultimo_pago
        ? new Date(p.fecha_ultimo_pago).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'S/D',
      saldo: p.saldo_mantenimiento || 0,
      estado: p.estado,
      parcela: p,
    }))
    .sort((a, b) => b.saldo - a.saldo)
}

// ─── Print Modal ─────────────────────────────────────────────────────────────

interface PrintModalProps {
  deudores: DeudorCobranza[]
  sectores: string[]
  onClose: () => void
}

function PrintModal({ deudores, sectores, onClose }: PrintModalProps) {
  const [selectedSectores, setSelectedSectores] = useState<Set<string>>(new Set(sectores))
  const [minSaldo, setMinSaldo] = useState('')
  const [maxSaldo, setMaxSaldo] = useState('')
  const [soloEnMora, setSoloEnMora] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const filteredForPrint = useMemo(() => {
    return deudores.filter((d) => {
      if (!selectedSectores.has(d.sector)) return false
      if (soloEnMora && d.estado !== 'en_mora') return false
      if (minSaldo && d.saldo < Number(minSaldo)) return false
      if (maxSaldo && d.saldo > Number(maxSaldo)) return false
      return true
    })
  }, [deudores, selectedSectores, soloEnMora, minSaldo, maxSaldo])

  const totalDeuda = filteredForPrint.reduce((s, d) => s + d.saldo, 0)

  const handleToggleSector = (s: string) => {
    setSelectedSectores((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Planilla de Cobranzas — Aeterna Parque</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
          .header { border-bottom: 2px solid #1e293b; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .header h1 { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
          .header .sub { font-size: 9px; color: #64748b; margin-top: 3px; }
          .header .meta { text-align: right; font-size: 10px; }
          .badge-count { display: inline-block; background: #e2e8f0; border: 1px solid #94a3b8; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: bold; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead th { background: #1e293b; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          tbody tr { border-bottom: 1px solid #e2e8f0; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody td { padding: 5px 8px; vertical-align: middle; font-size: 10px; }
          .saldo { font-weight: bold; text-align: right; font-family: monospace; }
          .parcela-badge { background: #dbeafe; border: 1px solid #93c5fd; border-radius: 3px; padding: 1px 5px; font-size: 9px; font-weight: bold; }
          .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #94a3b8; padding-top: 16px; }
          .firma { text-align: center; width: 180px; }
          .firma .linea { border-top: 1px solid #1e293b; padding-top: 4px; font-size: 10px; font-weight: bold; }
          .total-row { background: #1e293b !important; color: #fff; }
          .total-row td { font-weight: bold; font-size: 11px; }
          @page { margin: 15mm; size: A4; }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      win.close()
    }, 300)
  }

  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-surface-container">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">print</span>
            <div>
              <h2 className="text-sm font-bold text-on-surface">Imprimir Planilla de Cobranzas</h2>
              <p className="text-xs text-on-surface-variant">Seleccione los filtros antes de imprimir</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-3">Filtros de Impresión</p>
          <div className="flex flex-wrap gap-4">
            {/* Sector filter */}
            <div>
              <p className="text-xs text-on-surface-variant mb-1.5 font-medium">Sector</p>
              <div className="flex gap-2 flex-wrap">
                {sectores.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleSector(s)}
                    className={`h-7 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedSectores.has(s)
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    Sector {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Saldo range */}
            <div>
              <p className="text-xs text-on-surface-variant mb-1.5 font-medium">Saldo Mínimo</p>
              <input
                type="number"
                value={minSaldo}
                onChange={(e) => setMinSaldo(e.target.value)}
                placeholder="$ 0"
                className="h-7 w-28 px-2 text-xs border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1.5 font-medium">Saldo Máximo</p>
              <input
                type="number"
                value={maxSaldo}
                onChange={(e) => setMaxSaldo(e.target.value)}
                placeholder="Sin límite"
                className="h-7 w-28 px-2 text-xs border border-outline-variant rounded bg-surface text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* Solo en mora */}
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloEnMora}
                  onChange={(e) => setSoloEnMora(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
                <span className="text-xs text-on-surface font-medium">Solo "En Mora"</span>
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-on-surface-variant">
              Mostrando <strong className="text-on-surface">{filteredForPrint.length}</strong> deudores ·
              Total deuda: <strong className="text-rose-600">{formatCurrency(totalDeuda)}</strong>
            </span>
          </div>
        </div>

        {/* Preview (hidden, for print) */}
        <div className="flex-1 overflow-y-auto custom-scroll px-5 py-3">
          <div ref={printRef}>
            {/* Print layout */}
            <div className="header">
              <div>
                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  MUNICIPALIDAD DEL DEPARTAMENTO GENERAL BELGRANO · LA RIOJA
                </div>
                <h1 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Planilla de Cobranzas — Deudores de Mantenimiento
                </h1>
                <div className="sub">Cementerio Parque Municipal Aeterna · Sistema de Gestión y Fiscalización Mortuoria</div>
              </div>
              <div className="meta">
                <div style={{ fontWeight: 'bold' }}>Fecha: {fecha}</div>
                <div style={{ color: '#64748b' }}>Hora: {hora} hs</div>
                <div style={{ marginTop: '4px', fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', border: '1px solid #94a3b8', borderRadius: '3px', padding: '1px 6px', display: 'inline-block' }}>
                  PLANILLA OFICIAL
                </div>
              </div>
            </div>

            <div className="badge-count">
              {filteredForPrint.length} Deudores · Total Deuda: {formatCurrency(totalDeuda)}
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Titular</th>
                  <th>Parcela</th>
                  <th>Domicilio</th>
                  <th>Teléfono</th>
                  <th>Último Pago</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filteredForPrint.map((d, i) => (
                  <tr key={d.parcelaId}>
                    <td style={{ color: '#64748b', fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{d.titularNombre}</td>
                    <td><span className="parcela-badge">{d.nomenclatura}</span></td>
                    <td style={{ color: '#475569' }}>{d.domicilio}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '9px' }}>{d.telefono}</td>
                    <td style={{ color: '#64748b' }}>{d.diaPago}</td>
                    <td className="saldo" style={{ color: '#dc2626' }}>{formatCurrency(d.saldo)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={6} style={{ padding: '6px 8px', fontWeight: 'bold' }}>
                    TOTAL GENERAL ({filteredForPrint.length} deudores)
                  </td>
                  <td className="saldo" style={{ padding: '6px 8px', color: '#fca5a5' }}>{formatCurrency(totalDeuda)}</td>
                </tr>
              </tbody>
            </table>

            <div className="footer">
              <div className="firma">
                <div className="linea">________________________</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>Firma y Sello de Operador</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Mesa de Entrada / Tesorería</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', maxWidth: '260px' }}>
                Documento emitido bajo Ordenanza Municipal N° 842/2024. Datos con carácter de declaración jurada oficial.
              </div>
              <div className="firma">
                <div className="linea">________________________</div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px' }}>Dirección de Servicios Públicos</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Municipio de Chamical</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-outline-variant flex items-center justify-between bg-surface-container">
          <span className="text-xs text-on-surface-variant">
            {filteredForPrint.length === 0 && (
              <span className="text-amber-600 font-semibold">⚠ Sin deudores para imprimir con los filtros seleccionados</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredForPrint.length === 0}
              className="h-8 px-4 rounded bg-primary text-on-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Imprimir Planilla
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Estado badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    en_mora: { label: 'En Mora', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    ocupada: { label: 'Ocupada c/Deuda', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    standby: { label: 'Stand-by', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  }
  const info = map[estado] || { label: estado, cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${info.cls}`}>
      {info.label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const CobranzasView: React.FC<CobranzasViewProps> = ({
  parcelas,
  onCobrarQR,
  onEnviarCobro,
  onRefresh,
  isRefreshing = false,
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [sectorFiltro, setSectorFiltro] = useState<string>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState<string>('todos')
  const [ordenarPor, setOrdenarPor] = useState<'saldo_desc' | 'saldo_asc' | 'nombre' | 'parcela'>('saldo_desc')
  const [printModalOpen, setPrintModalOpen] = useState(false)

  // Build deudores from parcelas
  const deudores = useMemo(() => buildDeudores(parcelas), [parcelas])

  // Available sectors
  const sectores = useMemo(() => {
    const s = new Set(deudores.map((d) => d.sector))
    return Array.from(s).sort()
  }, [deudores])

  // Filtered and sorted list
  const deudoresFiltrados = useMemo(() => {
    let list = [...deudores]

    // Sector filter
    if (sectorFiltro !== 'todos') {
      list = list.filter((d) => d.sector === sectorFiltro)
    }

    // Estado filter
    if (estadoFiltro !== 'todos') {
      list = list.filter((d) => d.estado === estadoFiltro)
    }

    // Search
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(
        (d) =>
          d.titularNombre.toLowerCase().includes(q) ||
          d.nomenclatura.toLowerCase().includes(q) ||
          d.domicilio.toLowerCase().includes(q) ||
          d.telefono.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (ordenarPor) {
      case 'saldo_desc':
        list.sort((a, b) => b.saldo - a.saldo)
        break
      case 'saldo_asc':
        list.sort((a, b) => a.saldo - b.saldo)
        break
      case 'nombre':
        list.sort((a, b) => a.titularNombre.localeCompare(b.titularNombre))
        break
      case 'parcela':
        list.sort((a, b) => a.nomenclatura.localeCompare(b.nomenclatura))
        break
    }

    return list
  }, [deudores, sectorFiltro, estadoFiltro, busqueda, ordenarPor])

  // Summary stats
  const totalDeuda = deudoresFiltrados.reduce((s, d) => s + d.saldo, 0)
  const totalDeudaGlobal = deudores.reduce((s, d) => s + d.saldo, 0)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ──── Header ──── */}
      <div className="flex-shrink-0 flex flex-col gap-3 pb-3 print:hidden">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-200 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-600 text-[22px]">account_balance_wallet</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-on-surface leading-tight">Cobranzas</h1>
              <p className="text-xs text-on-surface-variant">Gestión de Deudores de Mantenimiento</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              {deudores.length} deudores
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 px-2.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
                title="Actualizar datos"
              >
                <span className={`material-symbols-outlined text-[16px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
                <span className="hidden sm:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="h-8 px-3 rounded bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden sm:inline">Imprimir Lista</span>
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-surface-container rounded-xl border border-outline-variant px-3 py-2.5">
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wide">Total Deudores</p>
            <p className="text-xl font-black text-on-surface font-mono mt-0.5">{deudores.length}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-rose-600 font-medium uppercase tracking-wide">Deuda Total</p>
            <p className="text-lg font-black text-rose-700 font-mono mt-0.5">{formatCurrency(totalDeudaGlobal)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">En Mora</p>
            <p className="text-xl font-black text-amber-700 font-mono mt-0.5">{deudores.filter((d) => d.estado === 'en_mora').length}</p>
          </div>
          <div className="bg-surface-container rounded-xl border border-outline-variant px-3 py-2.5">
            <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wide">Filtrado</p>
            <p className="text-xl font-black text-on-surface font-mono mt-0.5">{deudoresFiltrados.length}</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[15px]">search</span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar titular, parcela..."
              className="w-full h-8 pl-8 pr-3 text-xs border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:border-primary placeholder:text-outline"
            />
          </div>

          {/* Sector */}
          <select
            value={sectorFiltro}
            onChange={(e) => setSectorFiltro(e.target.value)}
            className="h-8 pl-2.5 pr-7 text-xs border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none"
          >
            <option value="todos">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s} value={s}>
                Sector {s}
              </option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="h-8 pl-2.5 pr-7 text-xs border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="en_mora">En Mora</option>
            <option value="ocupada">Ocupada c/Deuda</option>
            <option value="standby">Stand-by</option>
          </select>

          {/* Sort */}
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value as typeof ordenarPor)}
            className="h-8 pl-2.5 pr-7 text-xs border border-outline-variant rounded-lg bg-surface text-on-surface focus:outline-none focus:border-primary cursor-pointer appearance-none"
          >
            <option value="saldo_desc">Mayor deuda primero</option>
            <option value="saldo_asc">Menor deuda primero</option>
            <option value="nombre">Por nombre A-Z</option>
            <option value="parcela">Por parcela</option>
          </select>

          {/* Clear filters */}
          {(busqueda || sectorFiltro !== 'todos' || estadoFiltro !== 'todos') && (
            <button
              type="button"
              onClick={() => { setBusqueda(''); setSectorFiltro('todos'); setEstadoFiltro('todos') }}
              className="h-8 px-2.5 rounded border border-outline-variant text-xs text-on-surface-variant hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ──── Table ──── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm print:hidden">
        {deudoresFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-outline">sentiment_satisfied</span>
            <div className="text-center">
              <p className="font-semibold text-sm">Sin deudores encontrados</p>
              <p className="text-xs mt-1">
                {deudores.length === 0
                  ? 'No hay parcelas con saldo pendiente registradas.'
                  : 'Pruebe ajustando los filtros de búsqueda.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-10">#</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Titular</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-24">Parcela</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Domicilio</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-32">Teléfono</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-28">Fecha Pago</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-32">Saldo</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide w-36">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {deudoresFiltrados.map((d, i) => (
                    <tr
                      key={d.parcelaId}
                      className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors group"
                    >
                      <td className="px-4 py-3 text-[11px] font-mono text-outline">{String(i + 1).padStart(2, '0')}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                            {d.titularNombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-on-surface leading-tight">{d.titularNombre}</p>
                            <EstadoBadge estado={d.estado} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-bold font-mono">
                          {d.nomenclatura}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant max-w-[160px] truncate">{d.domicilio}</td>
                      <td className="px-3 py-3 text-xs font-mono text-on-surface-variant">{d.telefono}</td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant">{d.diaPago}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-black text-rose-600 font-mono">{formatCurrency(d.saldo)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Cobrar QR */}
                          <button
                            type="button"
                            onClick={() => onCobrarQR(d.parcela)}
                            className="h-7 px-2 rounded bg-primary text-on-primary text-[10px] font-semibold flex items-center gap-1 hover:bg-secondary transition-colors cursor-pointer shadow-sm"
                            title="Cobrar con QR"
                          >
                            <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                            <span>Cobrar</span>
                          </button>
                          {/* Enviar cobro */}
                          <button
                            type="button"
                            onClick={() => onEnviarCobro(d.parcela)}
                            className="h-7 w-7 rounded border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                            title="Enviar Cobro Remoto (WhatsApp)"
                          >
                            <span className="material-symbols-outlined text-[14px]">send</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-outline-variant/50">
              {deudoresFiltrados.map((d, i) => (
                <div key={d.parcelaId} className="px-4 py-3 hover:bg-surface-container/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-outline">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-semibold text-xs text-on-surface">{d.titularNombre}</span>
                    </div>
                    <span className="text-sm font-black text-rose-600 font-mono">{formatCurrency(d.saldo)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold font-mono">{d.nomenclatura}</span>
                    <EstadoBadge estado={d.estado} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-on-surface-variant mb-3">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">home</span>
                      {d.domicilio}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">phone</span>
                      {d.telefono}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onCobrarQR(d.parcela)}
                      className="flex-1 h-7 rounded bg-primary text-on-primary text-[11px] font-semibold flex items-center justify-center gap-1 hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                      Cobrar
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnviarCobro(d.parcela)}
                      className="h-7 px-3 rounded border border-outline-variant text-[11px] font-semibold flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">send</span>
                      Enviar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table footer with totals */}
            <div className="sticky bottom-0 border-t border-outline-variant bg-surface-container flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-on-surface-variant">
                Mostrando <strong className="text-on-surface">{deudoresFiltrados.length}</strong> de {deudores.length} deudores
              </span>
              <span className="text-xs font-black text-rose-600 font-mono">
                Total: {formatCurrency(totalDeuda)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ──── Print modal ──── */}
      {printModalOpen && (
        <PrintModal
          deudores={deudoresFiltrados.length > 0 ? deudoresFiltrados : deudores}
          sectores={sectores}
          onClose={() => setPrintModalOpen(false)}
        />
      )}
    </div>
  )
}

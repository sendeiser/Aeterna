import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Parcela } from '../../types/database'
import { formatCurrency, formatDateHour } from '../../lib/formatters'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeudorCobranza {
  parcelaId: string
  nomenclatura: string
  sector: string
  titularNombre: string
  dni: string
  domicilio: string
  barrio: string
  telefono: string
  diaPago: string
  fechaPagoRaw: string
  ultimaCuota: string
  saldo: number
  estado: string
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

function compareNaturalParcela(a: string, b: string): number {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' })
}

function sectorFromNomenclatura(nom: string): string {
  return nom?.split('-')[0]?.toUpperCase() || 'A'
}

function formatDiaFechaPago(p: Parcela): string {
  const rawDate = p.fecha_ultimo_pago || p.fecha_adquisicion || p.created_at
  if (!rawDate) return 'Sin registro'
  const datePart = rawDate.slice(0, 10)
  const parts = datePart.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]} (Día ${parts[2]})`
  }
  return formatDateHour(rawDate)
}

function buildDeudores(parcelas: Parcela[]): DeudorCobranza[] {
  return parcelas
    .filter((p) => p.estado !== 'disponible' && p.estado !== 'baja' && ((p.saldo_mantenimiento || 0) > 0 || p.estado === 'en_mora'))
    .map((p) => {
      const rawDate = p.fecha_ultimo_pago || p.fecha_adquisicion || p.created_at || ''
      const cleanNom = (p.nomenclatura || '').toUpperCase()
      const cleanSector = (p.sector_id || sectorFromNomenclatura(cleanNom)).toUpperCase()
      return {
        parcelaId: p.id,
        nomenclatura: cleanNom,
        sector: ['A', 'B', 'E'].includes(cleanSector) ? cleanSector : sectorFromNomenclatura(cleanNom),
        titularNombre: p.titular?.nombre_completo || '(Sin titular asignado)',
        dni: p.titular?.dni || '',
        domicilio: p.titular?.direccion || 'S/D',
        barrio: p.titular?.barrio || '',
        telefono: p.titular?.telefono || 'S/D',
        diaPago: formatDiaFechaPago(p),
        fechaPagoRaw: rawDate.slice(0, 10),
        ultimaCuota: p.ultima_cuota_pagada || (p.fecha_ultimo_pago ? 'Último pago reg.' : 'Pendiente'),
        saldo: p.saldo_mantenimiento || 0,
        estado: p.estado,
        parcela: p,
      }
    })
}

// ─── Estado Badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado === 'standby'
      ? 'bg-rose-100 text-rose-900 border-rose-300'
      : estado === 'en_mora'
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : estado === 'ocupada'
      ? 'bg-blue-50 text-blue-900 border-blue-200'
      : 'bg-slate-100 text-slate-700 border-slate-300'

  const label =
    estado === 'standby'
      ? 'Stand-by'
      : estado === 'en_mora'
      ? 'En Mora'
      : estado === 'ocupada'
      ? 'Ocupada c/Deuda'
      : estado.toUpperCase()

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  )
}

// ─── Styles shared between A4 Preview and Print Popup ────────────────────────

export const A4_SHEET_STYLES = `
  .a4-sheet, .a4-sheet * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .a4-sheet {
    width: 100%;
    color: #0f172a;
    background: #ffffff;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
    font-size: 10px;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 2px solid #0f172a;
    gap: 16px;
  }
  .brand-box {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-logo {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #00236f;
    background: #0f172a;
    flex-shrink: 0;
  }
  .brand-title {
    font-size: 17px;
    font-weight: 900;
    color: #00236f;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1.15;
    margin: 0;
  }
  .brand-subtitle {
    font-size: 11px;
    font-weight: 800;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin: 2px 0 0 0;
  }
  .brand-caption {
    font-size: 9.5px;
    color: #475569;
    margin: 2px 0 0 0;
    font-weight: 500;
  }
  .meta-box {
    text-align: right;
    flex-shrink: 0;
  }
  .meta-badge {
    display: inline-block;
    background-color: #f1f5f9 !important;
    color: #0f172a !important;
    border: 2px solid #0f172a !important;
    font-family: 'Courier New', monospace;
    font-weight: 900;
    font-size: 9.5px;
    padding: 3px 9px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  .meta-line {
    font-size: 10px;
    color: #1e293b;
    margin-top: 4px;
    font-weight: 600;
  }
  .meta-sub {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
    font-weight: 600;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .kpi-card {
    background-color: #f8fafc !important;
    border: 1px solid #94a3b8;
    border-left: 4px solid #00236f;
    border-radius: 5px;
    padding: 7px 10px;
  }
  .kpi-card-danger {
    background-color: #fff1f2 !important;
    border: 1px solid #fda4af;
    border-left: 4px solid #be123c;
    border-radius: 5px;
    padding: 7px 10px;
    text-align: right;
  }
  .kpi-label {
    font-size: 8.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.4px;
    display: block;
  }
  .kpi-val {
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 3px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .kpi-val-danger {
    font-size: 13px;
    font-weight: 900;
    color: #be123c !important;
    font-family: 'Courier New', monospace;
    margin-top: 2px;
    display: block;
    white-space: nowrap;
  }
  .report-table {
    width: 100%;
    border-collapse: collapse !important;
    border-spacing: 0 !important;
    border: 2px solid #0f172a !important;
    font-variant-numeric: tabular-nums;
  }
  .report-table thead tr {
    background-color: #e2e8f0 !important;
    border-top: 2px solid #0f172a !important;
    border-bottom: 2px solid #0f172a !important;
  }
  .report-table thead th {
    background-color: #e2e8f0 !important;
    color: #0f172a !important;
    padding: 7px 8px;
    font-size: 9.5px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-top: 2px solid #0f172a !important;
    border-bottom: 2px solid #0f172a !important;
    border-left: 1px solid #475569 !important;
    border-right: 1px solid #475569 !important;
    white-space: nowrap;
  }
  .report-table thead th:first-child {
    border-left: 2px solid #0f172a !important;
  }
  .report-table tbody tr {
    border-top: 1px solid #475569 !important;
    border-bottom: 1px solid #475569 !important;
    page-break-inside: avoid;
  }
  .report-table tbody tr.row-even {
    background-color: #ffffff !important;
  }
  .report-table tbody tr.row-odd {
    background-color: #f8fafc !important;
  }
  .report-table tbody td {
    padding: 6px 8px;
    vertical-align: middle;
    font-size: 10px;
    line-height: 1.3;
    border: 1px solid #475569 !important;
    border-left: 1px solid #475569 !important;
    border-right: 1px solid #475569 !important;
    color: #0f172a;
  }
  .report-table tbody td:first-child {
    border-left: 2px solid #0f172a !important;
  }
  .col-num {
    width: 30px;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-weight: 700;
    color: #334155 !important;
  }
  .col-titular {
    text-align: left;
  }
  .titular-name {
    font-weight: 700;
    color: #0f172a;
    font-size: 10.5px;
    line-height: 1.2;
  }
  .titular-dni {
    font-family: 'Courier New', monospace;
    font-size: 8.5px;
    color: #475569;
    margin-top: 1px;
  }
  .col-parcela {
    width: 82px;
    text-align: center;
    white-space: nowrap !important;
  }
  .parcela-pill {
    display: inline-block;
    white-space: nowrap !important;
    background-color: #eff6ff !important;
    border: 1px solid #60a5fa;
    color: #1e3a8a !important;
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: 9.5px;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .col-domicilio {
    text-align: left;
    color: #0f172a;
    font-weight: 500;
  }
  .domicilio-barrio {
    font-size: 8.5px;
    color: #475569;
    margin-top: 1px;
  }
  .col-telefono {
    width: 98px;
    text-align: left;
    white-space: nowrap !important;
    font-family: 'Courier New', monospace;
    font-size: 9.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .col-fecha {
    width: 112px;
    text-align: center;
    white-space: nowrap !important;
    font-size: 9.5px;
    font-weight: 600;
    color: #1e293b;
  }
  .col-saldo {
    width: 105px;
    text-align: right !important;
    white-space: nowrap !important;
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: 10.5px;
    color: #b91c1c !important;
    background-color: #fff1f2 !important;
  }
  .col-recibo {
    width: 76px;
    text-align: center;
  }
  .col-firma {
    width: 100px;
    text-align: center;
  }
  .field-guide-line {
    border-bottom: 1px dashed #64748b;
    width: 100%;
    height: 14px;
    display: block;
  }
  .total-row {
    background-color: #e2e8f0 !important;
    color: #0f172a !important;
    page-break-inside: avoid;
  }
  .total-row td {
    background-color: #e2e8f0 !important;
    color: #0f172a !important;
    padding: 8px 8px;
    font-weight: 900;
    font-size: 10.5px;
    border-top: 2px solid #0f172a !important;
    border-bottom: 2px solid #0f172a !important;
    border-left: 1px solid #475569 !important;
    border-right: 1px solid #475569 !important;
  }
  .total-row td:first-child {
    border-left: 2px solid #0f172a !important;
  }
  .total-amount {
    text-align: right !important;
    white-space: nowrap !important;
    font-family: 'Courier New', monospace;
    font-size: 12px !important;
    font-weight: 900 !important;
    color: #b91c1c !important;
    background-color: #ffe4e6 !important;
  }
  .footer-firmas {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #64748b;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    page-break-inside: avoid;
  }
  .firma-block {
    width: 200px;
    text-align: center;
  }
  .firma-line {
    border-top: 2px solid #0f172a;
    padding-top: 5px;
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
  }
  .firma-sub {
    font-size: 8.5px;
    color: #475569;
    margin-top: 2px;
  }
  .footer-note {
    text-align: center;
    font-size: 8.5px;
    color: #475569;
    max-width: 260px;
    line-height: 1.35;
  }
  @media print {
    .no-print {
      display: none !important;
    }
  }
`

export const PRINT_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
    font-size: 10px;
    color: #0f172a;
    background: #ffffff;
    padding: 8mm;
  }
  .no-print {
    display: none !important;
  }
  ${A4_SHEET_STYLES}
  @page {
    margin: 10mm;
    size: A4 portrait;
  }
`

// ─── Customizable PDF / Print Modal ──────────────────────────────────────────

interface PrintModalProps {
  allDeudores: DeudorCobranza[]
  initialSelectedIds: Set<string>
  sectores: string[]
  onClose: () => void
}

function PrintModal({ allDeudores, initialSelectedIds, sectores, onClose }: PrintModalProps) {
  const [selectedSectores, setSelectedSectores] = useState<Set<string>>(() => new Set(sectores))
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'en_mora' | 'standby' | 'ocupada'>('todos')
  const [telefonoFiltro, setTelefonoFiltro] = useState<'todos' | 'con_telefono' | 'sin_telefono'>('todos')
  const [domicilioFiltro, setDomicilioFiltro] = useState('')
  const [busquedaModal, setBusquedaModal] = useState('')
  const [minSaldo, setMinSaldo] = useState('')
  const [maxSaldo, setMaxSaldo] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'parcela' | 'saldo_desc' | 'domicilio' | 'nombre' | 'fecha'>('parcela')

  // Personalización del documento PDF
  const [tituloReporte, setTituloReporte] = useState('PLANILLA DE COBRANZAS Y GESTIÓN DE DEUDORES')
  const [responsableCobro, setResponsableCobro] = useState('Administración Central')
  const [fechaEmision, setFechaEmision] = useState(
    new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  )
  const [colDomicilio, setColDomicilio] = useState(true)
  const [colTelefono, setColTelefono] = useState(true)
  const [colDiaPago, setColDiaPago] = useState(true)
  const [colCasillerosTerreno, setColCasillerosTerreno] = useState(false)
  const [showManualSelector, setShowManualSelector] = useState(false)

  // Candidatos según filtros del modal
  const candidatosFiltrados = useMemo(() => {
    const list = allDeudores.filter((d) => {
      if (!selectedSectores.has(d.sector)) return false
      if (estadoFiltro !== 'todos' && d.estado !== estadoFiltro) return false
      if (telefonoFiltro === 'con_telefono' && (d.telefono === 'S/D' || !d.telefono.trim())) return false
      if (telefonoFiltro === 'sin_telefono' && d.telefono !== 'S/D' && Boolean(d.telefono.trim())) return false
      if (domicilioFiltro.trim()) {
        const qDom = domicilioFiltro.toLowerCase()
        if (!d.domicilio.toLowerCase().includes(qDom) && !d.barrio.toLowerCase().includes(qDom)) return false
      }
      if (busquedaModal.trim()) {
        const q = busquedaModal.toLowerCase()
        if (
          !d.titularNombre.toLowerCase().includes(q) &&
          !d.nomenclatura.toLowerCase().includes(q) &&
          !d.dni.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      if (minSaldo && d.saldo < Number(minSaldo)) return false
      if (maxSaldo && d.saldo > Number(maxSaldo)) return false
      return true
    })

    return list.sort((a, b) => {
      if (ordenarPor === 'saldo_desc') return b.saldo - a.saldo
      if (ordenarPor === 'domicilio') return a.domicilio.localeCompare(b.domicilio, 'es', { sensitivity: 'base' })
      if (ordenarPor === 'parcela') return compareNaturalParcela(a.nomenclatura, b.nomenclatura)
      if (ordenarPor === 'fecha') return (b.fechaPagoRaw || '').localeCompare(a.fechaPagoRaw || '')
      return a.titularNombre.localeCompare(b.titularNombre, 'es', { sensitivity: 'base' })
    })
  }, [
    allDeudores,
    selectedSectores,
    estadoFiltro,
    telefonoFiltro,
    domicilioFiltro,
    busquedaModal,
    minSaldo,
    maxSaldo,
    ordenarPor,
  ])

  // Selección manual de IDs a incluir en el PDF
  const [includedIds, setIncludedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds.size > 0) return new Set(initialSelectedIds)
    return new Set(allDeudores.map((d) => d.parcelaId))
  })

  const deudoresParaImprimir = useMemo(() => {
    return candidatosFiltrados.filter((d) => includedIds.has(d.parcelaId))
  }, [candidatosFiltrados, includedIds])

  const totalDeudaImprimir = deudoresParaImprimir.reduce((acc, d) => acc + d.saldo, 0)
  const printRef = useRef<HTMLDivElement>(null)

  const handleToggleSector = (s: string) => {
    setSelectedSectores((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handleToggleDeudor = (id: string) => {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllFiltered = () => {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      candidatosFiltrados.forEach((d) => next.add(d.parcelaId))
      return next
    })
  }

  const handleDeselectAllFiltered = () => {
    setIncludedIds((prev) => {
      const next = new Set(prev)
      candidatosFiltrados.forEach((d) => next.delete(d.parcelaId))
      return next
    })
  }

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const win = window.open('', '_blank')
    if (!win) {
      window.print()
      return
    }
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${tituloReporte} — Aeterna Parque San Nicolás</title>
        <style>${PRINT_STYLES}</style>
      </head>
      <body>
        <div class="a4-sheet">${printContent}</div>
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      win.close()
    }, 300)
  }

  const sectoresTexto =
    Array.from(selectedSectores)
      .sort()
      .map((s) => `Sector ${s}`)
      .join(', ') || 'Ninguno'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{A4_SHEET_STYLES}</style>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[96vh] overflow-hidden border border-outline-variant flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ──── Modal Top Bar ──── */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Reporte PDF y Planilla Personalizable de Cobranzas</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  {deudoresParaImprimir.length} seleccionados
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Aeterna Parque San Nicolás · Filtre y seleccione exactamente a quiénes cobrar e incluir en la planilla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={deudoresParaImprimir.length === 0}
              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              <span>Imprimir / Guardar PDF ({deudoresParaImprimir.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* ──── Panel de Filtros y Personalización ──── */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5 text-xs shrink-0">
          {/* Fila 1: Filtros de Selección */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Sectores */}
              <div className="flex items-center gap-1">
                <span className="text-slate-600 font-bold text-[11px]">Sectores:</span>
                {sectores.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleSector(s)}
                    className={`h-7 px-2.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                      selectedSectores.has(s)
                        ? 'bg-primary text-white border-primary shadow-2xs'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-primary/50'
                    }`}
                  >
                    Sec. {s}
                  </button>
                ))}
              </div>

              {/* Estado */}
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="todos">Estado: Todos con deuda</option>
                <option value="en_mora">Solo En Mora</option>
                <option value="standby">Solo Stand-by (+3 años)</option>
                <option value="ocupada">Ocupada c/Deuda</option>
              </select>

              {/* Teléfono */}
              <select
                value={telefonoFiltro}
                onChange={(e) => setTelefonoFiltro(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="todos">Teléfono: Todos</option>
                <option value="con_telefono">📱 Solo con Teléfono</option>
                <option value="sin_telefono">🏠 Sin Teléfono (Visita)</option>
              </select>

              {/* Domicilio / Calle */}
              <input
                type="text"
                value={domicilioFiltro}
                onChange={(e) => setDomicilioFiltro(e.target.value)}
                placeholder="Filtrar calle / barrio..."
                className="h-7 px-2 w-36 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />

              {/* Rango Saldo */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={minSaldo}
                  onChange={(e) => setMinSaldo(e.target.value)}
                  placeholder="Saldo mín $"
                  className="h-7 px-2 w-24 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  value={maxSaldo}
                  onChange={(e) => setMaxSaldo(e.target.value)}
                  placeholder="Saldo máx $"
                  className="h-7 px-2 w-24 bg-white border border-slate-300 rounded text-xs text-slate-800 font-mono"
                />
              </div>

              {/* Orden */}
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as any)}
                className="h-7 px-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="parcela">Orden: Parcela (A → Z)</option>
                <option value="saldo_desc">Orden: Mayor Deuda</option>
                <option value="domicilio">Orden: Calle / Domicilio (Ruta)</option>
                <option value="nombre">Orden: Titular (A → Z)</option>
                <option value="fecha">Orden: Fecha de Pago</option>
              </select>
            </div>

            {/* Botón Elegir individualmente */}
            <button
              type="button"
              onClick={() => setShowManualSelector(!showManualSelector)}
              className={`h-7 px-2.5 rounded border text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                showManualSelector
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-primary/40 text-primary hover:bg-primary/5'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">checklist</span>
              <span>Elegir Deudores ({deudoresParaImprimir.length}/{candidatosFiltrados.length})</span>
            </button>
          </div>

          {/* Fila 2: Personalización del PDF (Título, Cobrador, Columnas) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[11px]">Título:</span>
                <input
                  type="text"
                  value={tituloReporte}
                  onChange={(e) => setTituloReporte(e.target.value)}
                  className="h-7 px-2 w-64 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[11px]">Responsable:</span>
                <input
                  type="text"
                  value={responsableCobro}
                  onChange={(e) => setResponsableCobro(e.target.value)}
                  className="h-7 px-2 w-44 bg-white border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold text-[11px]">Fecha:</span>
                <input
                  type="text"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="h-7 px-2 w-24 bg-white border border-slate-300 rounded text-xs font-mono text-center text-slate-800"
                />
              </div>
            </div>

            {/* Checkboxes de Columnas del PDF */}
            <div className="flex flex-wrap items-center gap-3 bg-white px-2.5 py-1 rounded border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500">Columnas PDF:</span>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={colDomicilio}
                  onChange={(e) => setColDomicilio(e.target.checked)}
                  className="accent-primary cursor-pointer"
                />
                <span>Domicilio</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={colTelefono}
                  onChange={(e) => setColTelefono(e.target.checked)}
                  className="accent-primary cursor-pointer"
                />
                <span>Teléfono</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={colDiaPago}
                  onChange={(e) => setColDiaPago(e.target.checked)}
                  className="accent-primary cursor-pointer"
                />
                <span>Día/Fecha Pago</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-primary">
                <input
                  type="checkbox"
                  checked={colCasillerosTerreno}
                  onChange={(e) => setColCasillerosTerreno(e.target.checked)}
                  className="accent-primary cursor-pointer"
                />
                <span>Casilleros Recibo y Firma</span>
              </label>
            </div>
          </div>

          {/* Panel Desplegable para Marcar/Desmarcar Deudores Individualmente */}
          {showManualSelector && (
            <div className="bg-white rounded-lg border border-slate-300 p-2.5 shadow-inner flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs">
                    Selección Manual de Deudores a Cobrar:
                  </span>
                  <input
                    type="text"
                    value={busquedaModal}
                    onChange={(e) => setBusquedaModal(e.target.value)}
                    placeholder="Buscar por nombre o parcela..."
                    className="h-6 px-2 w-48 text-xs border border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold cursor-pointer"
                  >
                    ✓ Marcar todos ({candidatosFiltrados.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-semibold cursor-pointer"
                  >
                    ✕ Desmarcar todos
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scroll pr-1">
                {candidatosFiltrados.map((d) => {
                  const checked = includedIds.has(d.parcelaId)
                  return (
                    <label
                      key={d.parcelaId}
                      className={`flex items-center justify-between gap-2 px-2 py-1 rounded border text-[11px] cursor-pointer transition-colors ${
                        checked
                          ? 'bg-blue-50/70 border-primary/40 text-slate-900 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleDeudor(d.parcelaId)}
                          className="accent-primary cursor-pointer shrink-0"
                        />
                        <span className="font-mono font-bold text-primary shrink-0">{d.nomenclatura}</span>
                        <span className="truncate">{d.titularNombre}</span>
                      </div>
                      <span className="font-mono font-bold text-red-700 shrink-0">{formatCurrency(d.saldo)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ──── Vista Previa A4 Imprimible (100% fiel a la hoja impresa) ──── */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll bg-slate-200/80 flex-1">
          <div
            ref={printRef}
            className="a4-sheet bg-white shadow-lg mx-auto p-6 sm:p-8 max-w-[210mm] border border-slate-300"
          >
            {/* Encabezado Institucional Aeterna */}
            <div className="doc-header">
              <div className="brand-box">
                <img
                  src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logo_aeterna.png`}
                  alt="Aeterna Parque San Nicolás"
                  className="brand-logo"
                />
                <div>
                  <h1 className="brand-title">AETERNA PARQUE SAN NICOLÁS</h1>
                  <h2 className="brand-subtitle">
                    {tituloReporte || 'PLANILLA DE COBRANZAS Y GESTIÓN DE DEUDORES'}
                  </h2>
                  <p className="brand-caption">
                    Administración y Tesorería · Gestión y Control de Mantenimiento de Parcelas
                  </p>
                </div>
              </div>

              <div className="meta-box">
                <span className="meta-badge">REPORTE DE COBRANZA</span>
                <div className="meta-line">
                  FECHA: <strong>{fechaEmision}</strong>
                </div>
                <div className="meta-sub">
                  REGISTROS: {deudoresParaImprimir.length} TITULARES
                </div>
              </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Sectores Incluidos</span>
                <span className="kpi-val">{sectoresTexto}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Responsable / Cobrador</span>
                <span className="kpi-val">{responsableCobro || 'Administración Central'}</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Titulares a Cobrar</span>
                <span className="kpi-val">{deudoresParaImprimir.length} Deudores</span>
              </div>
              <div className="kpi-card-danger">
                <span className="kpi-label">Total a Recaudar</span>
                <span className="kpi-val-danger">{formatCurrency(totalDeudaImprimir)}</span>
              </div>
            </div>

            {/* Tabla Imprimible */}
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '30px' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Nombre de Titular</th>
                  <th style={{ textAlign: 'center', width: '82px' }}>Parcela</th>
                  {colDomicilio && <th style={{ textAlign: 'left' }}>Domicilio</th>}
                  {colTelefono && <th style={{ textAlign: 'left', width: '98px' }}>Teléfono</th>}
                  {colDiaPago && <th style={{ textAlign: 'center', width: '112px' }}>Día / Fecha Pago</th>}
                  <th style={{ textAlign: 'right', width: '105px' }}>Saldo</th>
                  {colCasillerosTerreno && (
                    <>
                      <th style={{ textAlign: 'center', width: '72px' }}>N° Recibo</th>
                      <th style={{ textAlign: 'center', width: '96px' }}>Firma / Obs.</th>
                    </>
                  )}
                  <th className="no-print" style={{ textAlign: 'center', width: '28px' }} title="Quitar de la lista">
                    ✕
                  </th>
                </tr>
              </thead>
              <tbody>
                {deudoresParaImprimir.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                      No hay deudores seleccionados para imprimir. Ajuste los filtros o marque titulares arriba.
                    </td>
                  </tr>
                ) : (
                  deudoresParaImprimir.map((d, idx) => (
                    <tr key={d.parcelaId} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="col-num">{idx + 1}</td>
                      <td className="col-titular">
                        <div className="titular-name">{d.titularNombre}</div>
                        {d.dni && <div className="titular-dni">DNI {d.dni}</div>}
                      </td>
                      <td className="col-parcela">
                        <span className="parcela-pill">{d.nomenclatura}</span>
                      </td>
                      {colDomicilio && (
                        <td className="col-domicilio">
                          <div>{d.domicilio !== 'S/D' ? d.domicilio : '—'}</div>
                          {d.barrio && <div className="domicilio-barrio">B° {d.barrio}</div>}
                        </td>
                      )}
                      {colTelefono && (
                        <td className="col-telefono">
                          {d.telefono !== 'S/D' ? d.telefono.replace('+54 9 ', '') : '—'}
                        </td>
                      )}
                      {colDiaPago && <td className="col-fecha">{d.diaPago}</td>}
                      <td className="col-saldo">{formatCurrency(d.saldo)}</td>
                      {colCasillerosTerreno && (
                        <>
                          <td className="col-recibo">
                            <span className="field-guide-line" />
                          </td>
                          <td className="col-firma">
                            <span className="field-guide-line" />
                          </td>
                        </>
                      )}
                      <td className="no-print" style={{ textAlign: 'center', padding: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleDeudor(d.parcelaId)}
                          style={{
                            color: '#94a3b8',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                          }}
                          title="Quitar este registro del PDF"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {deudoresParaImprimir.length > 0 && (
                  <tr className="total-row">
                    <td
                      colSpan={
                        3 +
                        (colDomicilio ? 1 : 0) +
                        (colTelefono ? 1 : 0) +
                        (colDiaPago ? 1 : 0)
                      }
                      style={{ textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      TOTAL GENERAL A COBRAR ({deudoresParaImprimir.length} DEUDORES):
                    </td>
                    <td className="total-amount">{formatCurrency(totalDeudaImprimir)}</td>
                    {colCasillerosTerreno && <td colSpan={2}></td>}
                    <td className="no-print"></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pie de Firmas */}
            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">Firma y Aclaración Cobrador</div>
                <div className="firma-sub">Rendición de Cobranza</div>
              </div>
              <div className="footer-note">
                Aeterna Parque San Nicolás · Planilla oficial de control y gestión de cobranza de mantenimiento.
              </div>
              <div className="firma-block">
                <div className="firma-line">Administración y Tesorería</div>
                <div className="firma-sub">Aeterna Parque San Nicolás</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
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
  // Búsqueda general y filtros superiores
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSector, setFilterSector] = useState<'todos' | 'A' | 'B' | 'E' | 'en_mora' | 'standby'>('todos')
  const [sortOption, setSortOption] = useState<string>('saldo-desc')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [showDesktopFilters, setShowDesktopFilters] = useState(true)
  const [showColumnFilters, setShowColumnFilters] = useState(true)

  // Filtros por columna específicos
  const [colFilterTitular, setColFilterTitular] = useState('')
  const [colFilterParcela, setColFilterParcela] = useState('')
  const [colFilterDomicilio, setColFilterDomicilio] = useState('')
  const [colFilterTelefono, setColFilterTelefono] = useState('')
  const [colFilterDiaPago, setColFilterDiaPago] = useState('')
  const [colFilterSaldoMin, setColFilterSaldoMin] = useState('')

  // Selección de filas para personalizar a quiénes cobrar/imprimir
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [printModalOpen, setPrintModalOpen] = useState(false)

  // Paginación (igual que ParcelasView)
  const [pageSize, setPageSize] = useState<'todas' | 50 | 100>('todas')
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Lista base de deudores
  const deudores = useMemo(() => buildDeudores(parcelas), [parcelas])

  const sectores = useMemo(() => {
    const s = new Set(deudores.map((d) => d.sector))
    return Array.from(s).sort()
  }, [deudores])

  const hasColumnFilters = Boolean(
    colFilterTitular.trim() ||
      colFilterParcela.trim() ||
      colFilterDomicilio.trim() ||
      colFilterTelefono.trim() ||
      colFilterDiaPago.trim() ||
      colFilterSaldoMin.trim()
  )

  const hasActiveFilters = filterSector !== 'todos' || Boolean(searchTerm.trim()) || hasColumnFilters

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterSector('todos')
    setColFilterTitular('')
    setColFilterParcela('')
    setColFilterDomicilio('')
    setColFilterTelefono('')
    setColFilterDiaPago('')
    setColFilterSaldoMin('')
  }

  // Filtrado por barra superior + filtros por cada columna
  const deudoresFiltrados = useMemo(() => {
    const list = deudores.filter((d) => {
      // Filtro rápido de sector/estado
      if (filterSector !== 'todos') {
        if (filterSector === 'en_mora') {
          if (d.estado !== 'en_mora') return false
        } else if (filterSector === 'standby') {
          if (d.estado !== 'standby') return false
        } else if (d.sector !== filterSector) {
          return false
        }
      }

      // Búsqueda general
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        if (
          !d.titularNombre.toLowerCase().includes(q) &&
          !d.nomenclatura.toLowerCase().includes(q) &&
          !d.domicilio.toLowerCase().includes(q) &&
          !d.telefono.toLowerCase().includes(q) &&
          !d.dni.toLowerCase().includes(q)
        ) {
          return false
        }
      }

      // Filtros por columna
      if (colFilterTitular.trim()) {
        const q = colFilterTitular.toLowerCase()
        if (!d.titularNombre.toLowerCase().includes(q) && !d.dni.toLowerCase().includes(q)) return false
      }
      if (colFilterParcela.trim()) {
        const q = colFilterParcela.toLowerCase()
        if (!d.nomenclatura.toLowerCase().includes(q) && !d.sector.toLowerCase().includes(q)) return false
      }
      if (colFilterDomicilio.trim()) {
        const q = colFilterDomicilio.toLowerCase()
        if (!d.domicilio.toLowerCase().includes(q) && !d.barrio.toLowerCase().includes(q)) return false
      }
      if (colFilterTelefono.trim()) {
        const q = colFilterTelefono.toLowerCase()
        if (!d.telefono.toLowerCase().includes(q)) return false
      }
      if (colFilterDiaPago.trim()) {
        const q = colFilterDiaPago.toLowerCase()
        if (!d.diaPago.toLowerCase().includes(q) && !d.ultimaCuota.toLowerCase().includes(q)) return false
      }
      if (colFilterSaldoMin.trim()) {
        const min = Number(colFilterSaldoMin)
        if (!isNaN(min) && d.saldo < min) return false
      }

      return true
    })

    return list.sort((a, b) => {
      if (sortOption === 'saldo-desc') return b.saldo - a.saldo
      if (sortOption === 'saldo-asc') return a.saldo - b.saldo
      if (sortOption === 'titular-asc') return a.titularNombre.localeCompare(b.titularNombre, 'es', { sensitivity: 'base' })
      if (sortOption === 'titular-desc') return b.titularNombre.localeCompare(a.titularNombre, 'es', { sensitivity: 'base' })
      if (sortOption === 'parcela-asc') return compareNaturalParcela(a.nomenclatura, b.nomenclatura)
      if (sortOption === 'parcela-desc') return compareNaturalParcela(b.nomenclatura, a.nomenclatura)
      if (sortOption === 'domicilio-asc') return a.domicilio.localeCompare(b.domicilio, 'es', { sensitivity: 'base' })
      if (sortOption === 'domicilio-desc') return b.domicilio.localeCompare(a.domicilio, 'es', { sensitivity: 'base' })
      if (sortOption === 'telefono-asc') return a.telefono.localeCompare(b.telefono)
      if (sortOption === 'telefono-desc') return b.telefono.localeCompare(a.telefono)
      if (sortOption === 'fecha-desc') return (b.fechaPagoRaw || '').localeCompare(a.fechaPagoRaw || '')
      if (sortOption === 'fecha-asc') return (a.fechaPagoRaw || '').localeCompare(b.fechaPagoRaw || '')
      return b.saldo - a.saldo
    })
  }, [
    deudores,
    filterSector,
    searchTerm,
    colFilterTitular,
    colFilterParcela,
    colFilterDomicilio,
    colFilterTelefono,
    colFilterDiaPago,
    colFilterSaldoMin,
    sortOption,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    filterSector,
    searchTerm,
    colFilterTitular,
    colFilterParcela,
    colFilterDomicilio,
    colFilterTelefono,
    colFilterDiaPago,
    colFilterSaldoMin,
    pageSize,
    sortOption,
  ])

  const effectivePageSize = isMobile ? 'todas' : pageSize
  const displayedDeudores =
    effectivePageSize === 'todas'
      ? deudoresFiltrados
      : deudoresFiltrados.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize)

  // Contadores igual que en ParcelasView
  const countSecA = deudores.filter((d) => d.sector === 'A').length
  const countSecB = deudores.filter((d) => d.sector === 'B').length
  const countSecE = deudores.filter((d) => d.sector === 'E').length
  const countEnMora = deudores.filter((d) => d.estado === 'en_mora').length
  const countStandby = deudores.filter((d) => d.estado === 'standby').length
  const totalDeudaFiltrada = deudoresFiltrados.reduce((acc, d) => acc + d.saldo, 0)

  const allFilteredSelected =
    deudoresFiltrados.length > 0 && deudoresFiltrados.every((d) => selectedIds.has(d.parcelaId))

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deudoresFiltrados.forEach((d) => next.delete(d.parcelaId))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        deudoresFiltrados.forEach((d) => next.add(d.parcelaId))
        return next
      })
    }
  }

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden space-y-1.5 sm:space-y-3">
      {/* ===================================================================== */}
      {/* TOOLBAR SUPERIOR (Mismo diseño que Padrón de Parcelas)                */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest rounded border border-outline-variant p-2 sm:p-3 shadow-sm shrink-0 flex flex-col gap-1.5 sm:gap-2.5">
        {/* MOBILE VIEW (< sm) */}
        <div className="sm:hidden flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">account_balance_wallet</span>
              <span className="font-bold text-xs text-primary whitespace-nowrap">Cobranzas</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">
                {deudoresFiltrados.length}
              </span>
            </div>

            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[14px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar titular, parcela, domicilio..."
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

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-7 w-7 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                showMobileFilters || hasActiveFilters
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'border-outline-variant bg-surface-container-low text-slate-600'
              }`}
              title="Filtros"
            >
              <span className="material-symbols-outlined text-[15px]">filter_list</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="h-7 px-2 bg-primary text-on-primary font-semibold text-[11px] rounded flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              <span>PDF</span>
            </button>
          </div>

          {showMobileFilters && (
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-outline-variant/60 text-[10px]">
              <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilterSector('todos')}
                  className={`px-2 py-0.5 rounded font-semibold whitespace-nowrap shrink-0 ${
                    filterSector === 'todos' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  Todos ({deudores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('A')}
                  className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                    filterSector === 'A' ? 'bg-primary text-white font-semibold' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  Sec. A ({countSecA})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('E')}
                  className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                    filterSector === 'E' ? 'bg-primary text-white font-semibold' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  Sec. E ({countSecE})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('B')}
                  className={`px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                    filterSector === 'B' ? 'bg-primary text-white font-semibold' : 'bg-surface-container text-on-surface'
                  }`}
                >
                  Sec. B ({countSecB})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('en_mora')}
                  className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                    filterSector === 'en_mora'
                      ? 'border-amber-600 bg-amber-600 text-white font-semibold'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                  }`}
                >
                  En Mora ({countEnMora})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('standby')}
                  className={`px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                    filterSector === 'standby'
                      ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                      : 'border-rose-300 bg-rose-50 text-rose-900'
                  }`}
                >
                  Stand-by ({countStandby})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP VIEW (>= sm): Mismo diseño de barra de herramientas que ParcelasView */}
        <div className="hidden sm:flex flex-col gap-2">
          {/* Row 1 */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-headline-sm font-semibold text-on-surface leading-tight">
                  Padrón de Cobranzas
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  {deudores.length} con deuda
                </span>
                <span className="text-xs font-code-cadastral font-bold px-2 py-0.5 rounded-full bg-surface-container text-error border border-outline-variant">
                  Total: {formatCurrency(totalDeudaFiltrada)}
                </span>
              </div>
            </div>

            {/* Buscador General */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por titular, parcela, domicilio, teléfono o DNI..."
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

            {/* Selector Ordenar */}
            <div className="flex items-center gap-1 text-xs shrink-0">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="h-8 text-xs bg-white border border-outline-variant rounded px-2 py-1 focus:border-secondary font-medium text-slate-800 cursor-pointer"
                title="Ordenar deudores"
              >
                <option value="saldo-desc">💰 Mayor deuda primero</option>
                <option value="saldo-asc">💰 Menor deuda primero</option>
                <option value="titular-asc">🔤 Titular: A → Z</option>
                <option value="titular-desc">🔤 Titular: Z → A</option>
                <option value="parcela-asc">📍 Parcela (A → Z)</option>
                <option value="parcela-desc">📍 Parcela (Z → A)</option>
                <option value="domicilio-asc">🏠 Domicilio: A → Z</option>
                <option value="domicilio-desc">🏠 Domicilio: Z → A</option>
                <option value="fecha-desc">📅 Fecha Pago: Más reciente</option>
                <option value="fecha-asc">📅 Fecha Pago: Más antiguo</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle Filtros por Columna */}
              <button
                type="button"
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showColumnFilters || hasColumnFilters
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-outline-variant text-slate-700 hover:bg-surface-container'
                }`}
                title="Mostrar u ocultar filtros en las columnas de la tabla"
              >
                <span className="material-symbols-outlined text-[16px]">view_column</span>
                <span>Filtro Columnas</span>
              </button>

              {/* Toggle Filtros de Sector */}
              <button
                type="button"
                onClick={() => setShowDesktopFilters(!showDesktopFilters)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showDesktopFilters || filterSector !== 'todos'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-outline-variant text-slate-700 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                <span>Sectores</span>
              </button>

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="h-8 px-2.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Actualizar datos"
                >
                  <span className={`material-symbols-outlined text-[16px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span className="hidden xl:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
                </button>
              )}

              {/* Botón Reporte PDF / Imprimir Planilla */}
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="h-8 px-3 bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                title="Configurar e imprimir reporte PDF de deudores"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>
                  Reporte PDF {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Row 2: Botones de Sector y Estado (idénticos a ParcelasView) */}
          {showDesktopFilters && (
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-outline-variant/60 flex-wrap">
              <div className="flex items-center gap-1 overflow-x-auto custom-scroll">
                <button
                  type="button"
                  onClick={() => setFilterSector('todos')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterSector === 'todos'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  Todos ({deudores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('A')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterSector === 'E'
                      ? 'bg-primary text-on-primary shadow-xs font-semibold'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  Sector E ({countSecE})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('B')}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterSector === 'B'
                      ? 'bg-primary text-on-primary shadow-xs font-semibold'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  Sector B ({countSecB})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('en_mora')}
                  className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterSector === 'en_mora'
                      ? 'border-amber-600 bg-amber-600 text-white font-semibold'
                      : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  En Mora ({countEnMora})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterSector('standby')}
                  className={`px-2.5 py-1 rounded text-xs font-medium border whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    filterSector === 'standby'
                      ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                      : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  ⚠️ Stand-by ({countStandby})
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer ml-1"
                  >
                    Limpiar filtros ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {selectedIds.size} marcados para cobrar/imprimir
                  </span>
                )}
                <span className="text-xs font-code-cadastral text-outline shrink-0 hidden lg:inline">
                  {deudoresFiltrados.length} deudores listados
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TABLA PRINCIPAL (Mismo diseño visual que Padrón de Parcelas)          */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest rounded border border-outline-variant shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Subheader institucional */}
        <div className="hidden sm:flex px-2.5 py-1.5 sm:px-3 sm:py-2 bg-surface-container-low border-b border-outline-variant items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-label-caps font-semibold uppercase text-outline">
              Listado de Deudores de Mantenimiento
            </span>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
              >
                (Desmarcar {selectedIds.size} seleccionados)
              </button>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] text-outline font-code-cadastral">
            {deudoresFiltrados.length} registros · Saldo acumulado: <strong className="text-error">{formatCurrency(totalDeudaFiltrada)}</strong>
          </span>
        </div>

        {/* MOBILE VIEW (< md): Cards con mismo estilo que ParcelasView */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2 space-y-2 flex-1 min-h-0 overflow-y-auto custom-scroll">
          {displayedDeudores.map((d, index) => {
            const isEven = index % 2 === 0
            const isSelected = selectedIds.has(d.parcelaId)
            return (
              <div
                key={d.parcelaId}
                className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                    : isEven
                    ? 'bg-white border-slate-200/90 shadow-xs'
                    : 'bg-[#eaf0f6] border-slate-200/90 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-on-surface text-sm">{d.titularNombre}</div>
                    <div className="text-[11px] font-code-cadastral text-outline">
                      {d.dni ? `DNI: ${d.dni}` : 'Sin DNI registrado'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-code-cadastral font-bold text-primary text-sm">
                      {d.nomenclatura}
                    </span>
                    <EstadoBadge estado={d.estado} />
                  </div>
                </div>

                <div className="text-xs text-on-surface-variant space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-outline">location_on</span>
                    <span>{d.domicilio !== 'S/D' ? d.domicilio : 'Sin domicilio'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-code-cadastral text-[11px]">
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">call</span>
                      <span>{d.telefono !== 'S/D' ? d.telefono.replace('+54 9 ', '') : 'Sin teléfono'}</span>
                    </span>
                    <span className="font-code-cadastral text-[11px] text-outline">
                      Pago: {d.diaPago}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-outline block">Saldo</span>
                    <span className="font-code-cadastral font-bold text-sm text-error">
                      {formatCurrency(d.saldo)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onCobrarQR(d.parcela)}
                      className="h-8 px-2.5 rounded bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                      <span>Cobrar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEnviarCobro(d.parcela)}
                      className="h-8 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
                      <span>Enviar cobro</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* DESKTOP VIEW (>= md): High Density Table con mismo diseño de ParcelasView */}
        <div className="hidden md:block overflow-x-auto flex-1 min-h-0 custom-scroll">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
              {/* Fila de Encabezados Ordenables */}
              <tr className="text-label-caps font-label-caps text-slate-700 uppercase bg-slate-100 select-none">
                <th className="py-2.5 px-3 bg-slate-100 w-9 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="accent-primary cursor-pointer"
                    title="Seleccionar o deseleccionar todos para el reporte PDF"
                  />
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'titular-asc' ? 'titular-desc' : 'titular-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Nombre de Titular (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre de Titular</span>
                    {sortOption === 'titular-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'titular-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'parcela-asc' ? 'parcela-desc' : 'parcela-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Parcela (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1">
                    <span>Parcela</span>
                    {sortOption === 'parcela-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'parcela-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'domicilio-asc' ? 'domicilio-desc' : 'domicilio-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Domicilio (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1">
                    <span>Domicilio</span>
                    {sortOption === 'domicilio-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'domicilio-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'telefono-asc' ? 'telefono-desc' : 'telefono-asc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Número de Teléfono"
                >
                  <div className="flex items-center gap-1">
                    <span>Número de Teléfono</span>
                    {sortOption === 'telefono-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                    {sortOption === 'telefono-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'fecha-desc' ? 'fecha-asc' : 'fecha-desc'))}
                  className="py-2.5 px-3 bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Día / Fecha de Pago"
                >
                  <div className="flex items-center gap-1">
                    <span>Día / Fecha de Pago</span>
                    {sortOption === 'fecha-desc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_downward</span>}
                    {sortOption === 'fecha-asc' && <span className="material-symbols-outlined text-[13px] text-primary">arrow_upward</span>}
                  </div>
                </th>
                <th
                  onClick={() => setSortOption((prev) => (prev === 'saldo-desc' ? 'saldo-asc' : 'saldo-desc'))}
                  className="py-2.5 px-3 bg-slate-100 text-right cursor-pointer hover:bg-slate-200 transition-colors"
                  title="Ordenar por Saldo (Mayor / Menor deuda)"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo</span>
                    {sortOption === 'saldo-desc' && <span className="material-symbols-outlined text-[13px] text-red-600">arrow_downward</span>}
                    {sortOption === 'saldo-asc' && <span className="material-symbols-outlined text-[13px] text-emerald-600">arrow_upward</span>}
                  </div>
                </th>
                <th className="py-2.5 px-3 bg-slate-100 text-center">Acción</th>
              </tr>

              {/* Fila de Filtros por Columna */}
              {showColumnFilters && (
                <tr className="bg-slate-50 border-t border-slate-200 text-xs">
                  <th className="py-1.5 px-2 text-center">
                    <span className="material-symbols-outlined text-[14px] text-slate-400" title="Filtros por columna">
                      filter_alt
                    </span>
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="text"
                      value={colFilterTitular}
                      onChange={(e) => setColFilterTitular(e.target.value)}
                      placeholder="Filtrar titular o DNI..."
                      className="w-full h-6 px-2 text-[11px] font-normal bg-white border border-slate-300 rounded focus:border-primary focus:outline-none"
                    />
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="text"
                      value={colFilterParcela}
                      onChange={(e) => setColFilterParcela(e.target.value)}
                      placeholder="Ej. A-25..."
                      className="w-full h-6 px-2 text-[11px] font-normal bg-white border border-slate-300 rounded focus:border-primary focus:outline-none font-code-cadastral"
                    />
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="text"
                      value={colFilterDomicilio}
                      onChange={(e) => setColFilterDomicilio(e.target.value)}
                      placeholder="Filtrar domicilio..."
                      className="w-full h-6 px-2 text-[11px] font-normal bg-white border border-slate-300 rounded focus:border-primary focus:outline-none"
                    />
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="text"
                      value={colFilterTelefono}
                      onChange={(e) => setColFilterTelefono(e.target.value)}
                      placeholder="Filtrar teléfono..."
                      className="w-full h-6 px-2 text-[11px] font-normal bg-white border border-slate-300 rounded focus:border-primary focus:outline-none font-code-cadastral"
                    />
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="text"
                      value={colFilterDiaPago}
                      onChange={(e) => setColFilterDiaPago(e.target.value)}
                      placeholder="Día o fecha..."
                      className="w-full h-6 px-2 text-[11px] font-normal bg-white border border-slate-300 rounded focus:border-primary focus:outline-none"
                    />
                  </th>
                  <th className="py-1.5 px-2">
                    <input
                      type="number"
                      value={colFilterSaldoMin}
                      onChange={(e) => setColFilterSaldoMin(e.target.value)}
                      placeholder="Saldo mín $..."
                      className="w-full h-6 px-2 text-[11px] font-normal text-right bg-white border border-slate-300 rounded focus:border-primary focus:outline-none font-code-cadastral"
                    />
                  </th>
                  <th className="py-1.5 px-2 text-center">
                    {hasColumnFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setColFilterTitular('')
                          setColFilterParcela('')
                          setColFilterDomicilio('')
                          setColFilterTelefono('')
                          setColFilterDiaPago('')
                          setColFilterSaldoMin('')
                        }}
                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-semibold cursor-pointer"
                        title="Limpiar filtros de columnas"
                      >
                        Limpiar ✕
                      </button>
                    )}
                  </th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-outline-variant/40 text-body-sm font-body-sm">
              {displayedDeudores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-outline">
                    No se encontraron registros con deuda para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                displayedDeudores.map((d, index) => {
                  const isEven = index % 2 === 0
                  const isSelected = selectedIds.has(d.parcelaId)

                  return (
                    <tr
                      key={d.parcelaId}
                      onClick={() => handleToggleSelectRow(d.parcelaId)}
                      className={`transition-colors cursor-pointer border-b border-slate-200/80 ${
                        isSelected
                          ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary font-medium'
                          : isEven
                          ? 'bg-white hover:bg-blue-50/80'
                          : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                      }`}
                    >
                      {/* Checkbox Selección */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(d.parcelaId)}
                          className="accent-primary cursor-pointer"
                        />
                      </td>

                      {/* 1. Nombre de Titular (SIN círculo con letra, igual a ParcelasView) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-on-surface truncate max-w-[210px]">
                            {d.titularNombre}
                          </span>
                          <EstadoBadge estado={d.estado} />
                        </div>
                        <div className="font-code-cadastral text-[11px] text-outline">
                          {d.dni ? `DNI: ${d.dni}` : 'Parcela registrada'}
                        </div>
                      </td>

                      {/* 2. Parcela */}
                      <td className="py-2.5 px-3">
                        <span className="font-code-cadastral text-code-cadastral font-bold block text-on-surface">
                          {d.nomenclatura}
                        </span>
                        <span className="text-[11px] text-outline">
                          Sec. {d.sector === 'B' ? 'Sector B' : d.sector === 'A' ? 'Tradicional' : d.sector === 'E' ? 'Parque Central' : d.sector}
                        </span>
                      </td>

                      {/* 3. Domicilio */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 text-xs text-on-surface">
                          <span className="material-symbols-outlined text-[14px] text-outline shrink-0">location_on</span>
                          <span className="truncate max-w-[200px] font-medium" title={d.domicilio}>
                            {d.domicilio !== 'S/D' ? d.domicilio : <span className="text-outline italic">Sin domicilio</span>}
                          </span>
                        </div>
                        {d.barrio && (
                          <span className="text-[10px] text-outline block pl-4 truncate max-w-[200px]">
                            {d.barrio.toLowerCase().startsWith('b°') || d.barrio.toLowerCase().startsWith('barrio')
                              ? d.barrio
                              : `B° ${d.barrio}`}
                          </span>
                        )}
                      </td>

                      {/* 4. Número de Teléfono */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {d.telefono !== 'S/D' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-code-cadastral text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">call</span>
                            <span>{d.telefono.replace('+54 9 ', '')}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-outline italic">Sin teléfono</span>
                        )}
                      </td>

                      {/* 5. Día / Fecha de Pago */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-xs text-on-surface-variant font-code-cadastral font-medium">
                          {d.diaPago}
                        </div>
                        <div className="text-[10px] text-outline">
                          {d.ultimaCuota}
                        </div>
                      </td>

                      {/* 6. Saldo */}
                      <td className="py-2.5 px-3 text-right font-code-cadastral font-semibold text-error whitespace-nowrap">
                        {formatCurrency(d.saldo)}
                      </td>

                      {/* 7. Acciones: "Cobrar" y "Enviar cobro" */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onCobrarQR(d.parcela)}
                            title="Cobrar mantenimiento en caja o con QR"
                            className="h-7 px-2.5 rounded bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                            <span>Cobrar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEnviarCobro(d.parcela)}
                            title="Enviar cobro a distancia (WhatsApp, Redes y Recibo)"
                            className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
                            <span>Enviar cobro</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de Tabla (Mismo estilo que ParcelasView) */}
        <div className="shrink-0 p-2 sm:p-2.5 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="font-medium text-on-surface text-xs sm:text-sm">
              {effectivePageSize === 'todas'
                ? `Mostrando todos los ${deudoresFiltrados.length} deudores`
                : `Mostrando ${(currentPage - 1) * (effectivePageSize as number) + 1} - ${Math.min(
                    currentPage * (effectivePageSize as number),
                    deudoresFiltrados.length
                  )} de ${deudoresFiltrados.length} deudores`}
            </span>
            <span className="text-xs font-code-cadastral font-bold text-error">
              Saldo Total: {formatCurrency(totalDeudaFiltrada)}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] text-outline">Mostrar:</span>
            <button
              type="button"
              onClick={() => setPageSize('todas')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                pageSize === 'todas'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
              }`}
            >
              Todas ({deudoresFiltrados.length})
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
          </div>
        </div>
      </div>

      {/* Modal de Impresión y Reporte PDF Personalizable */}
      {printModalOpen && (
        <PrintModal
          allDeudores={deudoresFiltrados.length > 0 ? deudoresFiltrados : deudores}
          initialSelectedIds={selectedIds}
          sectores={sectores}
          onClose={() => setPrintModalOpen(false)}
        />
      )}
    </div>
  )
}

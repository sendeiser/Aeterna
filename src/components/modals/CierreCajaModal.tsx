import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { formatCurrency, formatDateHour } from '../../lib/formatters'
import { PagoRecibo } from '../../services/dataService'
import { EgresoCajaModal } from './EgresoCajaModal'
import { openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

const CIERRE_PRINT_STYLES = `
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
  .a4-sheet {
    width: 100%;
    color: #0f172a;
    background: #ffffff;
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
  .kpi-card-ingreso {
    background-color: #ecfdf5 !important;
    border: 1px solid #6ee7b7;
    border-left: 4px solid #047857;
    border-radius: 5px;
    padding: 7px 10px;
  }
  .kpi-card-egreso {
    background-color: #fff1f2 !important;
    border: 1px solid #fda4af;
    border-left: 4px solid #be123c;
    border-radius: 5px;
    padding: 7px 10px;
  }
  .kpi-card-neto {
    background-color: #eff6ff !important;
    border: 1px solid #93c5fd;
    border-left: 4px solid #00236f;
    border-radius: 5px;
    padding: 7px 10px;
    text-align: right;
  }
  .kpi-label {
    font-size: 8.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #475569;
    letter-spacing: 0.4px;
    display: block;
  }
  .kpi-val {
    font-size: 12px;
    font-weight: 900;
    color: #0f172a;
    font-family: 'Courier New', monospace;
    margin-top: 2px;
    display: block;
    white-space: nowrap;
  }
  .kpi-sub {
    font-size: 8.5px;
    color: #475569;
    margin-top: 2px;
    display: block;
    font-weight: 600;
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
    font-size: 9.5px;
    line-height: 1.3;
    border: 1px solid #475569 !important;
    color: #0f172a;
  }
  .badge-ingreso {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 8.5px;
    font-weight: 800;
    background-color: #d1fae5 !important;
    color: #065f46 !important;
    border: 1px solid #34d399;
    text-transform: uppercase;
  }
  .badge-egreso {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 8.5px;
    font-weight: 800;
    background-color: #ffe4e6 !important;
    color: #9f1239 !important;
    border: 1px solid #fb7185;
    text-transform: uppercase;
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
  @page {
    margin: 10mm;
    size: A4 portrait;
  }
`

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function printArqueoCajaPDF(
  pagosParaImprimir: PagoRecibo[],
  options?: {
    nroCierre?: string
    titulo?: string
    cajaCerrada?: boolean
    isBW?: boolean
  }
): boolean {
  const isBW = options?.isBW ?? true
  const nroCierre =
    options?.nroCierre || `CIE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`
  const titulo = options?.titulo || 'ACTA DE BALANCE Y CIERRE DIARIO DE CAJA'
  const fechaEmision = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const horaEmision = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const ingresos = pagosParaImprimir.filter(
    (p) => p.tipo !== 'egreso' && !(p.concepto && p.concepto.includes('[EGRESO]'))
  )
  const egresos = pagosParaImprimir.filter(
    (p) => p.tipo === 'egreso' || (p.concepto && p.concepto.includes('[EGRESO]'))
  )

  const totalIngresos = ingresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEgresos = egresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const balanceNeto = totalIngresos - totalEgresos

  const totalIngresosEfectivo = ingresos
    .filter((p) => p.metodo === 'efectivo')
    .reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEgresosEfectivo = egresos
    .filter((p) => p.metodo === 'efectivo')
    .reduce((sum, p) => sum + (p.monto || 0), 0)
  const efectivoEnCaja = totalIngresosEfectivo - totalEgresosEfectivo

  const totalIngresosQR = ingresos
    .filter((p) => p.metodo !== 'efectivo')
    .reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEgresosQR = egresos
    .filter((p) => p.metodo !== 'efectivo')
    .reduce((sum, p) => sum + (p.monto || 0), 0)
  const digitalEnBanco = totalIngresosQR - totalEgresosQR

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const rowsHtml =
    pagosParaImprimir.length === 0
      ? `<tr><td colspan="8" style="text-align:center;padding:20px;color:#000000;font-style:italic;">No hay comprobantes seleccionados para el arqueo.</td></tr>`
      : pagosParaImprimir
          .map((p, idx) => {
            const isEgreso =
              p.tipo === 'egreso' || Boolean(p.concepto && p.concepto.includes('[EGRESO]'))
            const isEfectivo = p.metodo === 'efectivo'
            const amountColor = isBW ? '#000000' : isEgreso ? '#be123c' : '#047857'
            const amountBg = isBW ? (isEgreso ? '#f3f4f6' : '#ffffff') : isEgreso ? '#fff1f2' : '#ecfdf5'
            return `
              <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
                <td class="col-num">${idx + 1}</td>
                <td style="font-family:'Courier New',monospace;font-weight:900;white-space:nowrap;width:115px;">${escapeHtml(p.nroRecibo || 'S/N')}</td>
                <td style="font-family:'Courier New',monospace;white-space:nowrap;text-align:center;font-weight:700;width:95px;">${escapeHtml(formatDateHour(p.fecha))}</td>
                <td style="text-align:center;width:68px;">
                  <span class="${isEgreso ? 'badge-egreso' : 'badge-ingreso'}">${isEgreso ? 'Egreso' : 'Ingreso'}</span>
                </td>
                <td style="font-weight:800;">${escapeHtml(p.titularNombre || (isEgreso ? 'Egreso Operativo' : 'Contribuyente General'))}</td>
                <td>
                  <div style="font-weight:600;">${escapeHtml(p.concepto || '—')}</div>
                  ${p.categoria ? `<div style="font-size:8.5px;font-weight:700;text-transform:uppercase;margin-top:1px;">Cat: ${escapeHtml(p.categoria)}</div>` : ''}
                </td>
                <td style="text-align:center;white-space:nowrap;font-weight:700;width:82px;">${isEfectivo ? 'Efectivo' : 'QR / Digital'}</td>
                <td style="text-align:right;white-space:nowrap;font-family:'Courier New',monospace;font-weight:900;font-size:10.5px;width:98px;color:${amountColor};background-color:${amountBg};">
                  ${isEgreso ? '-' : '+'}${escapeHtml(formatCurrency(p.monto || 0))}
                </td>
              </tr>
            `
          })
          .join('')

  const innerContent = `
    <div class="doc-header">
      <div class="brand-box">
        <img src="${origin}/logo_aeterna.png" alt="Aeterna Parque San Nicolás" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="brand-title">AETERNA PARQUE SAN NICOLÁS</h1>
          <h2 class="brand-subtitle">${escapeHtml(titulo)}</h2>
          <p class="brand-caption">Administración y Tesorería · Rendición y Arqueo Oficial de Caja</p>
        </div>
      </div>
      <div class="meta-box">
        <span class="meta-badge">ACTA ${escapeHtml(nroCierre)}</span>
        <div class="meta-line">FECHA: <strong>${fechaEmision} ${horaEmision} hs</strong></div>
        <div class="meta-sub">COMPROBANTES: ${pagosParaImprimir.length} ASIENTOS (${options?.cajaCerrada ? 'CAJA CERRADA' : 'ARQUEO DE CONTROL'})</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card-ingreso">
        <span class="kpi-label">Total Ingresos (Cobros)</span>
        <span class="kpi-val" style="color:${isBW ? '#000000' : '#047857'};">+${escapeHtml(formatCurrency(totalIngresos))}</span>
        <span class="kpi-sub">${ingresos.length} cobranza${ingresos.length === 1 ? '' : 's'} imputada${ingresos.length === 1 ? '' : 's'}</span>
      </div>
      <div class="kpi-card-egreso">
        <span class="kpi-label">Total Egresos (Gastos)</span>
        <span class="kpi-val" style="color:${isBW ? '#000000' : '#be123c'};">-${escapeHtml(formatCurrency(totalEgresos))}</span>
        <span class="kpi-sub">${egresos.length} egreso${egresos.length === 1 ? '' : 's'} operativo${egresos.length === 1 ? '' : 's'}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Disponibilidad por Canal</span>
        <span class="kpi-sub" style="color:#000000;margin-top:3px;">Efectivo: <strong>${escapeHtml(formatCurrency(efectivoEnCaja))}</strong></span>
        <span class="kpi-sub" style="color:#000000;margin-top:2px;">QR / Banco: <strong>${escapeHtml(formatCurrency(digitalEnBanco))}</strong></span>
      </div>
      <div class="kpi-card-neto">
        <span class="kpi-label">Balance Neto de Caja</span>
        <span class="kpi-val" style="color:${isBW ? '#000000' : balanceNeto >= 0 ? '#00236f' : '#be123c'};font-size:13px;">${escapeHtml(formatCurrency(balanceNeto))}</span>
        <span class="kpi-sub">${balanceNeto >= 0 ? 'Superávit / Disponible' : 'Déficit Operativo'}</span>
      </div>
    </div>

    <table class="report-table">
      <thead>
        <tr>
          <th style="text-align:center;width:28px;">#</th>
          <th style="text-align:left;width:115px;">N° Comprobante</th>
          <th style="text-align:center;width:95px;">Fecha / Hora</th>
          <th style="text-align:center;width:68px;">Tipo</th>
          <th style="text-align:left;">Titular / Pagador</th>
          <th style="text-align:left;">Concepto Imputado</th>
          <th style="text-align:center;width:82px;">Canal</th>
          <th style="text-align:right;width:98px;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        ${
          pagosParaImprimir.length > 0
            ? `<tr class="total-row">
                <td colspan="7" style="text-align:right;text-transform:uppercase;letter-spacing:0.4px;">
                  BALANCE NETO FINAL (${pagosParaImprimir.length} COMPROBANTES · INGRESOS: +${escapeHtml(formatCurrency(totalIngresos))} | EGRESOS: -${escapeHtml(formatCurrency(totalEgresos))}):
                </td>
                <td style="text-align:right;font-family:'Courier New',monospace;font-size:12px;font-weight:900;color:${isBW ? '#000000' : balanceNeto >= 0 ? '#00236f' : '#be123c'};background-color:${isBW ? '#e5e7eb' : '#dbeafe'} !important;">
                  ${escapeHtml(formatCurrency(balanceNeto))}
                </td>
              </tr>`
            : ''
        }
      </tbody>
    </table>

    <div class="footer-firmas">
      <div class="firma-block">
        <div class="firma-line">Operador de Turno</div>
        <div class="firma-sub">Administración & Recepción Aeterna</div>
      </div>
      <div class="footer-note">
        Aeterna Parque San Nicolás · Acta oficial de arqueo, rendición y cierre diario de tesorería.
      </div>
      <div class="firma-block">
        <div class="firma-line">Tesorería y Auditoría</div>
        <div class="firma-sub">Aeterna Parque San Nicolás</div>
      </div>
    </div>
  `

  return openA4PrintWindow(`${titulo} — ${nroCierre}`, innerContent, isBW)
}

interface CierreCajaModalProps {
  isOpen: boolean
  onClose: () => void
  totalRecaudado: number
  pagos: PagoRecibo[]
  initialSelectedIds?: string[]
  onRegistrarEgreso?: (egreso: {
    concepto: string
    categoria: string
    monto: number
    comprobante: string
    metodo: 'efectivo' | 'transferencia'
  }) => void
  onAnularMultiplesPagos?: (pagos: PagoRecibo[]) => Promise<void> | void
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  pagos,
  initialSelectedIds,
  onRegistrarEgreso,
  onAnularMultiplesPagos,
}) => {
  const [cajaCerrada, setCajaCerrada] = useState(false)
  const [egresoModalOpen, setEgresoModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeletingBatch, setIsDeletingBatch] = useState(false)
  const [isBW, setIsBW] = useState(true)

  // Inicializar selección al abrir el modal o cambiar pagos/initialSelectedIds
  useEffect(() => {
    if (!isOpen) return
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedIds(new Set(initialSelectedIds))
    } else {
      setSelectedIds(new Set(pagos.map((p) => p.id || p.nroRecibo)))
    }
  }, [isOpen, initialSelectedIds, pagos])

  const pagosSeleccionados = useMemo(
    () => pagos.filter((p) => selectedIds.has(p.id || p.nroRecibo)),
    [pagos, selectedIds]
  )

  if (!isOpen) return null

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const allSelected =
    pagos.length > 0 && pagos.every((p) => selectedIds.has(p.id || p.nroRecibo))

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagos.map((p) => p.id || p.nroRecibo)))
    }
  }

  const handleSelectByFilter = (
    filterType: 'ingresos' | 'egresos' | 'efectivo' | 'digital'
  ) => {
    const filtered = pagos.filter((p) => {
      const isEgr = p.tipo === 'egreso' || (p.concepto && p.concepto.includes('[EGRESO]'))
      if (filterType === 'ingresos') return !isEgr
      if (filterType === 'egresos') return isEgr
      if (filterType === 'efectivo') return p.metodo === 'efectivo'
      if (filterType === 'digital') return p.metodo !== 'efectivo'
      return true
    })
    setSelectedIds(new Set(filtered.map((p) => p.id || p.nroRecibo)))
  }

  const handleAnularSeleccionados = async () => {
    if (!onAnularMultiplesPagos || pagosSeleccionados.length === 0) return
    if (
      !confirm(
        `¿Confirma anular y eliminar los ${pagosSeleccionados.length} comprobantes seleccionados del arqueo?`
      )
    ) {
      return
    }
    setIsDeletingBatch(true)
    try {
      await onAnularMultiplesPagos(pagosSeleccionados)
    } finally {
      setIsDeletingBatch(false)
    }
  }

  // Separación de Ingresos y Egresos sobre los comprobantes seleccionados
  const ingresos = pagosSeleccionados.filter((p) => p.tipo !== 'egreso')
  const egresos = pagosSeleccionados.filter((p) => p.tipo === 'egreso')

  const totalIngresos = ingresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const totalEgresos = egresos.reduce((sum, p) => sum + (p.monto || 0), 0)
  const balanceNeto = totalIngresos - totalEgresos

  // Desglose de ingresos
  const ingresosQR = ingresos.filter((p) => p.metodo !== 'efectivo')
  const totalIngresosQR = ingresosQR.reduce((sum, p) => sum + (p.monto || 0), 0)

  const ingresosEfectivo = ingresos.filter((p) => p.metodo === 'efectivo')
  const totalIngresosEfectivo = ingresosEfectivo.reduce((sum, p) => sum + (p.monto || 0), 0)

  // Desglose de egresos
  const egresosEfectivo = egresos.filter((p) => p.metodo === 'efectivo')
  const totalEgresosEfectivo = egresosEfectivo.reduce((sum, p) => sum + (p.monto || 0), 0)

  const egresosQR = egresos.filter((p) => p.metodo !== 'efectivo')
  const totalEgresosQR = egresosQR.reduce((sum, p) => sum + (p.monto || 0), 0)

  const efectivoEnCaja = totalIngresosEfectivo - totalEgresosEfectivo
  const digitalEnBanco = totalIngresosQR - totalEgresosQR

  const nroCierre = `CIE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`

  const handleConfirmarCierre = () => {
    setCajaCerrada(true)
    const cierreLog = {
      nroCierre,
      fecha: new Date().toISOString(),
      totalIngresos,
      totalEgresos,
      balanceNeto,
      totalQR: totalIngresosQR,
      totalEfectivo: totalIngresosEfectivo,
      cantOperaciones: pagosSeleccionados.length,
      operador: 'Administración - Parque Aeterna',
    }
    const cierresPrevios = JSON.parse(localStorage.getItem('aeterna_cierres_caja') || '[]')
    cierresPrevios.unshift(cierreLog)
    localStorage.setItem('aeterna_cierres_caja', JSON.stringify(cierresPrevios))
  }

  const handlePrint = () => {
    const opened = printArqueoCajaPDF(pagosSeleccionados, {
      nroCierre,
      titulo: 'ACTA DE BALANCE Y CIERRE DIARIO DE CAJA',
      cajaCerrada,
      isBW,
    })
    if (!opened) {
      window.print()
    }
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          data-printable-modal="true"
          className="bg-surface-container-lowest border border-outline-variant w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Oficial Imprimible */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-gradient-to-r from-primary to-primary-container text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                  Aeterna Parque San Nicolás · Tesorería
                </span>
                <h2 className="text-title-lg font-title-lg font-bold">
                  Acta de Balance & Cierre Diario de Caja
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              {onRegistrarEgreso && (
                <button
                  type="button"
                  onClick={() => setEgresoModalOpen(true)}
                  className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Registrar nuevo gasto u operativo"
                >
                  <span className="material-symbols-outlined text-[15px]">outbox</span>
                  <span>- Registrar Egreso</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 overflow-y-auto custom-scroll flex-1 print:max-h-none print:overflow-visible print:p-4">
            {/* Membrete y Fecha */}
            <div className="text-center pb-3 border-b border-dashed border-outline-variant space-y-1">
              <div className="flex items-center justify-between text-xs text-outline font-code-cadastral">
                <span>
                  N° ACTA: <strong>{nroCierre}</strong>
                </span>
                <span>TERMINAL: 01 (ADMINISTRACIÓN CENTRAL)</span>
              </div>
              <h3 className="text-lg font-bold text-primary capitalize pt-1">{fechaHoy}</h3>
              <span className="text-xs text-on-surface-variant block">
                Parque & Sepelios Aeterna · Ejercicio Fiscal 2026
              </span>
              {pagosSeleccionados.length < pagos.length && (
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                  Arqueo parcial sobre {pagosSeleccionados.length} de {pagos.length} comprobantes seleccionados
                </span>
              )}
            </div>

            {/* Metric Hero Cards: Ingresos, Egresos, Balance Neto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Total Ingresos */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Total Ingresos (Cobros)
                </span>
                <span className="text-xl font-code-cadastral font-bold text-emerald-700 block">
                  +{formatCurrency(totalIngresos)}
                </span>
                <span className="text-[11px] text-emerald-600 block">
                  {ingresos.length} cobranza{ingresos.length === 1 ? '' : 's'} seleccionada
                  {ingresos.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Card 2: Total Egresos */}
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-rose-800 block">
                  Total Egresos (Gastos)
                </span>
                <span className="text-xl font-code-cadastral font-bold text-rose-700 block">
                  -{formatCurrency(totalEgresos)}
                </span>
                <span className="text-[11px] text-rose-600 block">
                  {egresos.length} egreso{egresos.length === 1 ? '' : 's'} operativo
                  {egresos.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Card 3: Balance Neto */}
              <div
                className={`p-3.5 rounded-xl border space-y-0.5 ${
                  balanceNeto >= 0
                    ? 'bg-primary/5 border-primary/20 text-primary'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <span className="text-[10px] uppercase font-bold opacity-80 block">
                  Balance Neto de Caja
                </span>
                <span className="text-xl font-code-cadastral font-bold block">
                  {formatCurrency(balanceNeto)}
                </span>
                <span className="text-[11px] font-semibold block opacity-90">
                  {balanceNeto >= 0 ? 'Superávit / Disponible' : 'Déficit operativo'}
                </span>
              </div>
            </div>

            {/* Sub-totales por Vía de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Efectivo en Mostrador:</span>
                  <span className="text-[10px] text-on-surface-variant">
                    Ingresos: {formatCurrency(totalIngresosEfectivo)} | Egresos:{' '}
                    {formatCurrency(totalEgresosEfectivo)}
                  </span>
                </div>
                <span className="font-bold font-code-cadastral text-sm text-slate-800">
                  {formatCurrency(efectivoEnCaja)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-on-surface block">Bancos & QR BCRA:</span>
                  <span className="text-[10px] text-on-surface-variant">
                    Ingresos: {formatCurrency(totalIngresosQR)} | Egresos:{' '}
                    {formatCurrency(totalEgresosQR)}
                  </span>
                </div>
                <span className="font-bold font-code-cadastral text-sm text-emerald-700">
                  {formatCurrency(digitalEnBanco)}
                </span>
              </div>
            </div>

            {/* Estado de Caja */}
            {cajaCerrada ? (
              <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-700 text-2xl">
                  verified
                </span>
                <div>
                  <h4 className="font-bold text-sm">Caja Cerrada y Auditada con Éxito</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    El balance de la jornada ha sido archivado y registrado en Tesorería.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-on-surface">Estado: Jornada en Curso</span>
                </div>
                <span className="font-code-cadastral text-outline">
                  Sincronización Supabase: Activa
                </span>
              </div>
            )}

            {/* Listado de Operaciones con Selección Múltiple */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-outline tracking-wider">
                    Detalle de Comprobantes ({pagosSeleccionados.length} de {pagos.length}{' '}
                    seleccionados)
                  </span>
                </div>

                {/* Controles de Selección Múltiple (no se imprimen) */}
                {pagos.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 print:hidden">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {allSelected ? 'deselect' : 'select_all'}
                      </span>
                      <span>{allSelected ? 'Desmarcar todos' : 'Seleccionar todos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectByFilter('ingresos')}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                      title="Seleccionar únicamente los ingresos"
                    >
                      Solo Ingresos
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectByFilter('egresos')}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
                      title="Seleccionar únicamente los egresos"
                    >
                      Solo Egresos
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectByFilter('efectivo')}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                      title="Seleccionar únicamente pagos en efectivo"
                    >
                      Solo Efectivo
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectByFilter('digital')}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition-colors cursor-pointer"
                      title="Seleccionar únicamente pagos por QR / Transferencia"
                    >
                      Solo QR/Digital
                    </button>

                    {onAnularMultiplesPagos &&
                      pagosSeleccionados.length > 0 &&
                      !cajaCerrada && (
                        <button
                          type="button"
                          onClick={handleAnularSeleccionados}
                          disabled={isDeletingBatch}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Anular y eliminar los comprobantes seleccionados"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                          <span>
                            {isDeletingBatch
                              ? 'Anulando...'
                              : `Anular (${pagosSeleccionados.length})`}
                          </span>
                        </button>
                      )}
                  </div>
                )}
              </div>

              <div className="border border-outline-variant rounded-xl divide-y divide-outline-variant/50 max-h-64 overflow-y-auto custom-scroll shadow-xs">
                {pagos.length === 0 ? (
                  <div className="p-6 text-center text-xs text-outline">
                    No se han registrado cobros ni egresos en la jornada actual.
                  </div>
                ) : (
                  pagos.map((p) => {
                    const rowId = p.id || p.nroRecibo
                    const isChecked = selectedIds.has(rowId)
                    const isEgreso = p.tipo === 'egreso'
                    return (
                      <div
                        key={rowId}
                        onClick={() => handleToggleSelectRow(rowId)}
                        className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
                          !isChecked
                            ? 'opacity-45 bg-slate-50/70 print:hidden'
                            : isEgreso
                            ? 'bg-rose-50/40 hover:bg-rose-50/70'
                            : 'bg-white hover:bg-surface-container-low/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(rowId)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-primary cursor-pointer shrink-0 print:hidden"
                            title="Incluir u omitir comprobante en el arqueo"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isEgreso ? (
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                  EGRESO
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  INGRESO
                                </span>
                              )}
                              <span className="font-semibold text-on-surface block text-sm truncate">
                                {p.concepto}
                              </span>
                            </div>
                            <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-medium">{p.titularNombre}</span>
                              <span>•</span>
                              <span className="font-code-cadastral text-outline">
                                {p.nroRecibo}
                              </span>
                              {p.categoria && (
                                <>
                                  <span>•</span>
                                  <span className="text-[10px] italic text-outline">
                                    {p.categoria}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-code-cadastral font-bold text-sm block ${
                              isEgreso ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {isEgreso ? '-' : '+'}
                            {formatCurrency(p.monto)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                            {p.metodo === 'efectivo' ? 'Efectivo' : 'QR / Transf.'}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Firmas de Autoridad para Impresión */}
            <div className="pt-8 border-t border-dashed border-outline-variant grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="border-t border-outline-variant/80 mx-6 pt-1">
                  <span className="font-bold text-primary block">Operador de Turno</span>
                  <span className="text-[10px] text-outline">
                    Administración & Recepción Aeterna
                  </span>
                </div>
              </div>
              <div>
                <div className="border-t border-outline-variant/80 mx-6 pt-1">
                  <span className="font-bold text-primary block">Tesorería y Auditoría</span>
                  <span className="text-[10px] text-outline">Aeterna Parque San Nicolás</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-t border-outline-variant bg-surface-container-low print:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={false} />
              <button
                type="button"
                onClick={handlePrint}
                disabled={pagosSeleccionados.length === 0}
                className="px-4 h-9 rounded-xl border border-slate-400 bg-white text-slate-900 text-xs font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>
                  Imprimir Acta ({pagosSeleccionados.length})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-9 rounded-xl border border-outline-variant bg-white text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              {!cajaCerrada && (
                <button
                  type="button"
                  onClick={handleConfirmarCierre}
                  disabled={pagosSeleccionados.length === 0}
                  className="px-4 h-9 rounded-xl bg-primary hover:bg-secondary text-white text-xs font-bold shadow-md transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  Confirmar y Cerrar Caja ({pagosSeleccionados.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Registrar Egreso */}
      {onRegistrarEgreso && (
        <EgresoCajaModal
          isOpen={egresoModalOpen}
          onClose={() => setEgresoModalOpen(false)}
          onGuardarEgreso={(datos) => {
            onRegistrarEgreso(datos)
          }}
        />
      )}
    </>,
    document.body
  )
}

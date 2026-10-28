import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PagoRecibo } from '../../services/dataService'
import { formatCurrency } from '../../lib/formatters'
import { getA4ReportStyles, openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

interface ReciboDetalleModalProps {
  isOpen: boolean
  onClose: () => void
  pago: PagoRecibo | null
}

export const ReciboDetalleModal: React.FC<ReciboDetalleModalProps> = ({
  isOpen,
  onClose,
  pago,
}) => {
  const [isBW, setIsBW] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !pago) return null

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const opened = openA4PrintWindow(
      `Recibo Oficial ${pago.nroRecibo || 'S/N'} — Aeterna Parque San Nicolás`,
      printContent,
      isBW
    )
    if (!opened) {
      window.print()
    }
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*COMPROBANTE OFICIAL - AETERNA PARQUE SAN NICOLÁS*\n` +
        `Recibo N°: ${pago.nroRecibo}\n` +
        `Titular: ${pago.titularNombre}\n` +
        `Concepto: ${pago.concepto}\n` +
        `Importe: ${formatCurrency(pago.monto)} ARS\n` +
        `Fecha: ${new Date(pago.fecha).toLocaleDateString('es-AR')} ${new Date(pago.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs\n` +
        `Método: ${pago.metodo === 'efectivo' ? 'Efectivo en Caja' : 'Transferencia / QR Digital'}\n` +
        `Aeterna Parque San Nicolás`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleCopy = () => {
    const text =
      `COMPROBANTE OFICIAL - AETERNA PARQUE SAN NICOLÁS\n` +
      `Recibo: ${pago.nroRecibo}\n` +
      `Titular: ${pago.titularNombre}\n` +
      `Concepto: ${pago.concepto}\n` +
      `Monto: ${formatCurrency(pago.monto)} ARS\n` +
      `Fecha: ${new Date(pago.fecha).toLocaleDateString('es-AR')}\n` +
      `Método: ${pago.metodo === 'efectivo' ? 'Efectivo' : 'QR / Transferencia'}`
    navigator.clipboard.writeText(text)
    alert('Datos del recibo copiados al portapapeles.')
  }

  const isEgreso = pago.tipo === 'egreso'
  const fechaObj = new Date(pago.fecha)
  const fechaStr = fechaObj.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const horaStr = fechaObj.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <style>{getA4ReportStyles(isBW)}</style>
      <div
        data-printable-modal="true"
        className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header no imprimible */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-700">receipt_long</span>
            <span className="font-bold text-sm text-slate-800">
              {isEgreso ? 'Comprobante de Egreso' : 'Recibo Oficial de Caja'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={false} />
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Copiar texto"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
              <span>Copiar</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <span className="material-symbols-outlined text-[15px]">share</span>
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1 text-xs font-bold bg-primary text-white hover:bg-secondary rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">print</span>
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer ml-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Cuerpo del Recibo Oficial (Apto Impresión A4 con Bordes Marcados) */}
        <div className="p-5 overflow-y-auto bg-slate-200/70 flex-1 print:p-0 print:bg-white">
          <div
            ref={printRef}
            className="a4-sheet bg-white p-6 border border-slate-400 shadow-md mx-auto print:border-none print:shadow-none print:p-0"
          >
            {/* Encabezado Institucional */}
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
                    {isEgreso ? 'COMPROBANTE OFICIAL DE EGRESO DE CAJA' : 'RECIBO OFICIAL DE TESORERÍA Y COBRANZA'}
                  </h2>
                  <p className="brand-caption">
                    Administración y Tesorería · Comprobante de Control Interno
                  </p>
                </div>
              </div>
              <div className="meta-box">
                <span className="meta-badge">{pago.nroRecibo || 'S/N'}</span>
                <div className="meta-line">
                  FECHA: <strong>{fechaStr}</strong> - {horaStr} hs
                </div>
                <div className="meta-sub">
                  ESTADO: {isEgreso ? 'EGRESO IMPUTADO' : 'COBRO CANCELADO'}
                </div>
              </div>
            </div>

            {/* Tabla del Movimiento con Bordes Nítidos */}
            <table className="report-table" style={{ marginBottom: '14px' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ textAlign: 'left' }}>
                    DETALLE DE LA OPERACIÓN ASENTADA EN CAJA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-even">
                  <td style={{ fontWeight: 900, width: '32%' }}>TITULAR / RAZÓN SOCIAL:</td>
                  <td style={{ fontWeight: 900, fontSize: '12px' }}>
                    {pago.titularNombre || 'General'}
                  </td>
                </tr>
                <tr className="row-odd">
                  <td style={{ fontWeight: 900 }}>CONCEPTO IMPUTADO:</td>
                  <td style={{ fontWeight: 700 }}>{pago.concepto}</td>
                </tr>
                <tr className="row-even">
                  <td style={{ fontWeight: 900 }}>CANAL / MEDIO DE PAGO:</td>
                  <td style={{ fontWeight: 800 }}>
                    {pago.metodo === 'efectivo'
                      ? 'Efectivo en Caja Central'
                      : 'Transferencia Interoperable / QR Digital'}
                  </td>
                </tr>
                {pago.categoria && (
                  <tr className="row-odd">
                    <td style={{ fontWeight: 900 }}>CATEGORÍA PRESUPUESTARIA:</td>
                    <td style={{ fontWeight: 800, textTransform: 'uppercase' }}>{pago.categoria}</td>
                  </tr>
                )}
                <tr className="total-row">
                  <td style={{ textAlign: 'right', textTransform: 'uppercase' }}>
                    IMPORTE TOTAL LIQUIDADO:
                  </td>
                  <td className="total-amount" style={{ fontSize: '14px' }}>
                    {isEgreso ? '-' : '+'}
                    {formatCurrency(pago.monto)} ARS
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Firmas Original */}
            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">Firma y Sello de Tesorería</div>
                <div className="firma-sub">Operador Autorizado · Aeterna</div>
              </div>
              <div className="footer-note">
                CAE: 74192038472910 · Comprobante Oficial de Control Interno (Original Contribuyente)
              </div>
              <div className="firma-block">
                <div className="firma-line">Firma del Titular / Pagador</div>
                <div className="firma-sub">Conformidad de Operación</div>
              </div>
            </div>

            {/* Línea de Corte y Duplicado para Archivo */}
            <div
              style={{
                margin: '20px 0 14px 0',
                paddingTop: '8px',
                borderTop: '2px dashed #000000',
                textAlign: 'center',
                fontFamily: "'Courier New', monospace",
                fontSize: '9.5px',
                fontWeight: 900,
              }}
            >
              ✂️ ------------------ TALÓN DUPLICADO PARA ARCHIVO DE TESORERÍA ------------------ ✂️
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>TALÓN DUPLICADO · AETERNA PARQUE SAN NICOLÁS</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>COMPROBANTE N°</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>FECHA</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-even">
                  <td>
                    <div style={{ fontWeight: 900 }}>{pago.titularNombre || 'General'}</div>
                    <div style={{ fontSize: '9px', fontWeight: 600 }}>{pago.concepto}</div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
                    {pago.nroRecibo}
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 800 }}>
                    {fechaStr}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'Courier New', monospace", fontWeight: 900, fontSize: '11px' }}>
                    {isEgreso ? '-' : '+'}
                    {formatCurrency(pago.monto)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

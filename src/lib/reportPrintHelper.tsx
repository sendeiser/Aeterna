import React from 'react'

/**
 * Genera hojas de estilo CSS para reportes A4 (tanto para vista previa en pantalla
 * como para la ventana de impresión PDF), con soporte para Modo Blanco y Negro
 * de alto contraste (bordes negros puros #000) y Modo Color Institucional.
 */
export function getA4ReportStyles(isBW: boolean): string {
  const borderStrong = isBW ? '#000000' : '#0f172a'
  const borderCell = isBW ? '#000000' : '#334155'
  const headerBg = isBW ? '#f3f4f6' : '#e2e8f0'
  const brandColor = isBW ? '#000000' : '#00236f'
  const dangerColor = isBW ? '#000000' : '#b91c1c'
  const dangerBg = isBW ? '#f3f4f6' : '#fff1f2'
  const successColor = isBW ? '#000000' : '#047857'
  const successBg = isBW ? '#ffffff' : '#ecfdf5'
  const mutedText = isBW ? '#111827' : '#334155'
  const oddRowBg = isBW ? '#fafafa' : '#f8fafc'

  return `
    .a4-sheet, .a4-sheet * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .a4-sheet {
      width: 100%;
      color: #000000;
      background: #ffffff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.35;
      ${isBW ? 'filter: grayscale(100%);' : ''}
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 12px;
      border: 2px solid ${borderStrong} !important;
      border-radius: 4px;
      background-color: #ffffff !important;
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
      border: 2px solid ${brandColor};
      background: #0f172a;
      flex-shrink: 0;
      ${isBW ? 'filter: grayscale(100%) contrast(120%);' : ''}
    }
    .brand-title {
      font-size: 16px;
      font-weight: 900;
      color: ${brandColor} !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1.15;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 800;
      color: #000000 !important;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin: 2px 0 0 0;
    }
    .brand-caption {
      font-size: 9.5px;
      color: ${mutedText} !important;
      margin: 2px 0 0 0;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
      flex-shrink: 0;
    }
    .meta-badge {
      display: inline-block;
      background-color: ${headerBg} !important;
      color: #000000 !important;
      border: 2px solid ${borderStrong} !important;
      font-family: 'Courier New', monospace;
      font-weight: 900;
      font-size: 10px;
      padding: 3px 10px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .meta-line {
      font-size: 10px;
      color: #000000 !important;
      margin-top: 4px;
      font-weight: 700;
    }
    .meta-sub {
      font-size: 9px;
      color: ${mutedText} !important;
      margin-top: 1px;
      font-weight: 700;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-card, .kpi-card-ingreso, .kpi-card-egreso, .kpi-card-danger, .kpi-card-neto {
      background-color: #ffffff !important;
      border: 1.5px solid ${borderStrong} !important;
      border-left: 4px solid ${brandColor} !important;
      border-radius: 4px;
      padding: 7px 10px;
    }
    .kpi-card-ingreso {
      background-color: ${successBg} !important;
      border-left: 4px solid ${successColor} !important;
    }
    .kpi-card-egreso, .kpi-card-danger {
      background-color: ${dangerBg} !important;
      border-left: 4px solid ${dangerColor} !important;
    }
    .kpi-card-danger, .kpi-card-neto {
      text-align: right;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: ${mutedText} !important;
      letter-spacing: 0.4px;
      display: block;
    }
    .kpi-val {
      font-size: 12px;
      font-weight: 900;
      color: #000000 !important;
      margin-top: 2px;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kpi-val-danger {
      font-size: 13px;
      font-weight: 900;
      color: ${dangerColor} !important;
      font-family: 'Courier New', monospace;
      margin-top: 2px;
      display: block;
      white-space: nowrap;
    }
    .kpi-sub {
      font-size: 8.5px;
      color: ${mutedText} !important;
      margin-top: 2px;
      display: block;
      font-weight: 700;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse !important;
      border-spacing: 0 !important;
      border: 2px solid ${borderStrong} !important;
      font-variant-numeric: tabular-nums;
    }
    .report-table thead tr {
      background-color: ${headerBg} !important;
      border-top: 2px solid ${borderStrong} !important;
      border-bottom: 2px solid ${borderStrong} !important;
    }
    .report-table thead th {
      background-color: ${headerBg} !important;
      color: #000000 !important;
      padding: 7px 8px;
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1.5px solid ${borderStrong} !important;
      white-space: nowrap;
    }
    .report-table tbody tr {
      border-top: 1px solid ${borderCell} !important;
      border-bottom: 1px solid ${borderCell} !important;
      page-break-inside: avoid;
    }
    .report-table tbody tr.row-even {
      background-color: #ffffff !important;
    }
    .report-table tbody tr.row-odd {
      background-color: ${oddRowBg} !important;
    }
    .report-table tbody td {
      padding: 6px 8px;
      vertical-align: middle;
      font-size: 10px;
      line-height: 1.3;
      border: 1px solid ${borderCell} !important;
      color: #000000 !important;
    }
    .report-table tbody td:first-child {
      border-left: 2px solid ${borderStrong} !important;
    }
    .report-table tbody td:last-child {
      border-right: 2px solid ${borderStrong} !important;
    }
    .col-num {
      width: 30px;
      text-align: center;
      font-family: 'Courier New', monospace;
      font-weight: 800;
      color: #000000 !important;
    }
    .col-titular {
      text-align: left;
    }
    .titular-name {
      font-weight: 800;
      color: #000000 !important;
      font-size: 10.5px;
      line-height: 1.2;
    }
    .titular-dni {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      font-weight: 700;
      color: ${mutedText} !important;
      margin-top: 1px;
    }
    .col-parcela {
      width: 84px;
      text-align: center;
      white-space: nowrap !important;
    }
    .parcela-pill {
      display: inline-block;
      white-space: nowrap !important;
      background-color: ${isBW ? '#ffffff' : '#eff6ff'} !important;
      border: 1.5px solid ${isBW ? '#000000' : '#2563eb'} !important;
      color: ${isBW ? '#000000' : '#1e3a8a'} !important;
      font-family: 'Courier New', monospace;
      font-weight: 900;
      font-size: 9.5px;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .badge-ingreso {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 900;
      background-color: ${isBW ? '#ffffff' : '#d1fae5'} !important;
      color: ${isBW ? '#000000' : '#065f46'} !important;
      border: 1.5px solid ${isBW ? '#000000' : '#059669'} !important;
      text-transform: uppercase;
    }
    .badge-egreso {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 8.5px;
      font-weight: 900;
      background-color: ${isBW ? '#f3f4f6' : '#ffe4e6'} !important;
      color: ${isBW ? '#000000' : '#9f1239'} !important;
      border: 1.5px solid ${isBW ? '#000000' : '#e11d48'} !important;
      text-transform: uppercase;
    }
    .col-domicilio {
      text-align: left;
      color: #000000 !important;
      font-weight: 600;
    }
    .domicilio-barrio {
      font-size: 8.5px;
      font-weight: 700;
      color: ${mutedText} !important;
      margin-top: 1px;
    }
    .col-telefono {
      width: 98px;
      text-align: left;
      white-space: nowrap !important;
      font-family: 'Courier New', monospace;
      font-size: 9.5px;
      font-weight: 800;
      color: #000000 !important;
    }
    .col-fecha {
      width: 112px;
      text-align: center;
      white-space: nowrap !important;
      font-size: 9.5px;
      font-weight: 700;
      color: #000000 !important;
    }
    .col-saldo {
      width: 105px;
      text-align: right !important;
      white-space: nowrap !important;
      font-family: 'Courier New', monospace;
      font-weight: 900;
      font-size: 10.5px;
      color: ${dangerColor} !important;
      background-color: ${dangerBg} !important;
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
      border-bottom: 1.5px dashed #000000;
      width: 100%;
      height: 14px;
      display: block;
    }
    .total-row {
      background-color: ${headerBg} !important;
      color: #000000 !important;
      page-break-inside: avoid;
    }
    .total-row td {
      background-color: ${headerBg} !important;
      color: #000000 !important;
      padding: 8px 8px;
      font-weight: 900;
      font-size: 10.5px;
      border: 2px solid ${borderStrong} !important;
    }
    .total-amount {
      text-align: right !important;
      white-space: nowrap !important;
      font-family: 'Courier New', monospace;
      font-size: 12px !important;
      font-weight: 900 !important;
      color: ${dangerColor} !important;
      background-color: ${isBW ? '#e5e7eb' : '#ffe4e6'} !important;
    }
    .footer-firmas {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid ${borderStrong};
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
      border-top: 2px solid #000000;
      padding-top: 5px;
      font-size: 9.5px;
      font-weight: 900;
      color: #000000 !important;
    }
    .firma-sub {
      font-size: 8.5px;
      font-weight: 700;
      color: ${mutedText} !important;
      margin-top: 2px;
    }
    .footer-note {
      text-align: center;
      font-size: 8.5px;
      font-weight: 600;
      color: ${mutedText} !important;
      max-width: 260px;
      line-height: 1.35;
    }
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `
}

export function getPopupPrintStyles(isBW: boolean): string {
  return `
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
      font-size: 10.5px;
      color: #000000;
      background: #ffffff;
      padding: 8mm;
    }
    .no-print {
      display: none !important;
    }
    ${getA4ReportStyles(isBW)}
    @page {
      margin: 10mm;
      size: A4 portrait;
    }
  `
}

export function openA4PrintWindow(title: string, innerContentHtml: string, isBW = true): boolean {
  const win = window.open('', '_blank')
  if (!win) {
    return false
  }
  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${getPopupPrintStyles(isBW)}</style>
    </head>
    <body>
      <div class="a4-sheet">${innerContentHtml}</div>
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
  return true
}

interface ReportModeToggleProps {
  isBW: boolean
  onChange: (isBW: boolean) => void
  darkBg?: boolean
}

export const ReportModeToggle: React.FC<ReportModeToggleProps> = ({
  isBW,
  onChange,
  darkBg = true,
}) => {
  return (
    <div
      className={`inline-flex items-center rounded-lg p-0.5 border text-xs font-bold print:hidden ${
        darkBg
          ? 'bg-slate-800 border-slate-700 text-slate-200'
          : 'bg-slate-100 border-slate-300 text-slate-700'
      }`}
      title="Cambiar entre Versión Blanco y Negro (alto contraste con bordes marcados) y Versión Color"
    >
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          isBW
            ? 'bg-white text-black shadow-xs font-black'
            : darkBg
            ? 'text-slate-300 hover:text-white'
            : 'text-slate-600 hover:text-black'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">contrast</span>
        <span>Blanco y Negro</span>
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
          !isBW
            ? 'bg-primary text-white shadow-xs font-bold'
            : darkBg
            ? 'text-slate-300 hover:text-white'
            : 'text-slate-600 hover:text-black'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">palette</span>
        <span>Color</span>
      </button>
    </div>
  )
}


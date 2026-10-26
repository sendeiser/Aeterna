import React from 'react'
import { PagoRecibo } from '../../services/dataService'
import { formatCurrency } from '../../lib/formatters'

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
  if (!isOpen || !pago) return null

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*COMPROBANTE OFICIAL - AETERNA PARQUE*\n` +
        `Recibo N°: ${pago.nroRecibo}\n` +
        `Titular: ${pago.titularNombre}\n` +
        `Concepto: ${pago.concepto}\n` +
        `Importe: ${formatCurrency(pago.monto)} ARS\n` +
        `Fecha: ${new Date(pago.fecha).toLocaleDateString('es-AR')} ${new Date(pago.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs\n` +
        `Método: ${pago.metodo === 'efectivo' ? 'Efectivo en Caja' : 'Transferencia / QR Digital'}\n` +
        `Cementerio Parque Municipal Aeterna · Chamical, La Rioja`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleCopy = () => {
    const text =
      `COMPROBANTE OFICIAL - AETERNA PARQUE\n` +
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

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        data-printable-modal="true"
        className="bg-white border border-slate-300 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none print:m-0 print:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header no imprimible */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-700">receipt_long</span>
            <span className="font-bold text-sm text-slate-800">
              {isEgreso ? 'Comprobante de Egreso' : 'Recibo Oficial de Caja'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
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

        {/* Cuerpo del Recibo Oficial (Apto Impresión A4) */}
        <div className="p-6 overflow-y-auto space-y-5 print:p-8">
          {/* Encabezado Institucional */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block">
                MUNICIPALIDAD DE GENERAL BELGRANO · LA RIOJA
              </span>
              <h2 className="text-lg font-black uppercase text-slate-950 tracking-tight">
                CEMENTERIO PARQUE AETERNA
              </h2>
              <p className="text-xs text-slate-600">
                Oficina de Tesorería & Administración Funeraria
              </p>
              <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-500 font-semibold">
                AFIP RG 1415 · CUIT: 30-67123910-4
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {isEgreso ? 'Comprobante de Egreso N°' : 'Recibo Oficial N°'}
              </span>
              <span className="text-base font-black font-mono text-primary block">
                {pago.nroRecibo || 'S/N'}
              </span>
              <span className="text-[11px] text-slate-600 block mt-1">
                Fecha: <strong>{fechaStr}</strong> - {horaStr} hs
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase">
                {isEgreso ? 'Egreso Registrado' : 'Cobro Cancelado'}
              </span>
            </div>
          </div>

          {/* Datos del Pago / Movimiento */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs text-slate-800 print:bg-white print:border-slate-300">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">Titular / Razón Social:</span>
              <span className="font-bold text-slate-950 text-sm">{pago.titularNombre || 'General'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">Concepto Imputado:</span>
              <span className="font-medium text-slate-900">{pago.concepto}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-semibold">Canal / Medio de Pago:</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-slate-600 print:hidden">
                  {pago.metodo === 'efectivo' ? 'payments' : 'qr_code_2'}
                </span>
                <span>
                  {pago.metodo === 'efectivo'
                    ? 'Efectivo en Caja Central'
                    : 'Transferencia Interoperable / QR Digital'}
                </span>
              </span>
            </div>
            {pago.categoria && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Categoría Presupuestaria:</span>
                <span className="font-semibold text-slate-800 uppercase">{pago.categoria}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 text-base font-black text-slate-950">
              <span className="text-sm font-bold text-slate-700">Monto Liquidado:</span>
              <span className="font-mono text-lg text-emerald-800 print:text-slate-950">
                {isEgreso ? '-' : '+'}
                {formatCurrency(pago.monto)} ARS
              </span>
            </div>
          </div>

          {/* Código de barras AFIP simulado */}
          <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center space-y-1 print:bg-white">
            <div className="flex items-center justify-center gap-1 h-6 text-slate-800">
              <span className="w-1 h-5 bg-slate-900 inline-block"></span>
              <span className="w-0.5 h-5 bg-slate-900 inline-block"></span>
              <span className="w-2 h-5 bg-slate-900 inline-block"></span>
              <span className="w-1 h-5 bg-slate-900 inline-block"></span>
              <span className="w-0.5 h-5 bg-slate-900 inline-block"></span>
              <span className="w-1.5 h-5 bg-slate-900 inline-block"></span>
              <span className="w-0.5 h-5 bg-slate-900 inline-block"></span>
              <span className="w-2 h-5 bg-slate-900 inline-block"></span>
              <span className="w-1 h-5 bg-slate-900 inline-block"></span>
              <span className="w-1.5 h-5 bg-slate-900 inline-block"></span>
            </div>
            <div className="text-[9px] font-mono text-slate-500 font-semibold">
              CAE: 74192038472910 | VTO: 31/12/2026 | COMPROBANTE NO FISCAL DE CONTROL INTERNO
            </div>
          </div>

          {/* Firmas Original */}
          <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs">
            <div className="border-t border-slate-800 pt-1">
              <span className="font-bold block text-slate-900">Firma y Sello de Tesorería</span>
              <span className="text-[10px] text-slate-500">Operador Autorizado</span>
            </div>
            <div className="border-t border-slate-800 pt-1">
              <span className="font-bold block text-slate-900">Firma del Titular / Pagador</span>
              <span className="text-[10px] text-slate-500">ORIGINAL CONTRIBUYENTE</span>
            </div>
          </div>

          {/* Duplicado Municipal para Impresión */}
          <div className="hidden print:block pt-6">
            <div className="flex items-center justify-center my-4 py-1 border-t-2 border-dashed border-slate-700 text-[10px] text-slate-500 font-mono">
              ✂️ ------------------ CORTE PARA ARCHIVO MUNICIPAL ------------------ ✂️
            </div>

            <div className="p-4 border-2 border-slate-800 rounded bg-white text-slate-900 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-600 block">
                    MUNICIPALIDAD DE GENERAL BELGRANO · TESORERÍA
                  </span>
                  <span className="font-bold text-xs uppercase">
                    TALÓN DUPLICADO DE COBRANZA
                  </span>
                </div>
                <div className="text-right font-mono text-xs font-bold text-slate-900">
                  {pago.nroRecibo}
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Contribuyente: {pago.titularNombre}</span>
                <span>Fecha: {fechaStr}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Concepto: {pago.concepto}</span>
                <span className="font-bold font-mono text-slate-950">
                  {formatCurrency(pago.monto)} ARS
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

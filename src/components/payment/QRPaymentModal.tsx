import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatCurrency, copyToClipboard } from '../../lib/formatters'
import { ConfiguracionCobro } from '../../types/database'

interface QRPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  concepto: string
  monto: number
  identificador: string // ej: 'Parcela A-25-96' o 'Afiliado #14'
  titularNombre: string
  config: ConfiguracionCobro
  onConfirmarPago: (datos: {
    metodo: 'efectivo' | 'transferencia_qr'
    comprobante: string
    nroRecibo: string
  }) => void
}

export const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  concepto,
  monto,
  identificador,
  titularNombre,
  config,
  onConfirmarPago,
}) => {
  const [metodo, setMetodo] = useState<'transferencia_qr' | 'efectivo'>('transferencia_qr')
  const [comprobante, setComprobante] = useState('7849')
  const [copiedField, setCopiedField] = useState<'alias' | 'cbu' | null>(null)
  const [pagoConfirmado, setPagoConfirmado] = useState(false)
  const [reciboNro, setReciboNro] = useState(`REC-2026-${Math.floor(1000 + Math.random() * 9000)}`)

  if (!isOpen) return null

  // CBU / Alias interoperable payload
  const qrTransferPayload = `00020101021243650014ar.gob.bcra.cbu0122${config.cbu}0214${config.alias_cbu}520400005303032540${monto.toFixed(2)}5802AR5920${config.titular_cuenta}6008Chamical62070503***6304`

  const handleCopy = async (field: 'alias' | 'cbu', text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const handleConfirmar = () => {
    const nro = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`
    setReciboNro(nro)
    setPagoConfirmado(true)
    onConfirmarPago({
      metodo,
      comprobante,
      nroRecibo: nro,
    })
  }

  const handleWhatsApp = () => {
    const msg = `*COMPROBANTE OFICIAL - AETERNA PARQUE*\nRecibo: ${reciboNro}\nTitular: ${titularNombre}\nIdentificador: ${identificador}\nConcepto: ${concepto}\nMonto: ${formatCurrency(monto)}\nMétodo: ${metodo === 'transferencia_qr' ? 'Transferencia QR Interoperable' : 'Efectivo en Caja'}\nOficina Central de Catastro & Sepelios · Chamical, La Rioja`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/50 backdrop-blur-sm overflow-y-auto custom-scroll animate-fade-in font-body-md text-body-md text-on-surface">
      {/* MODAL WRAPPER (2 Panels: Payment Card + Live Receipt Panel) */}
      <div className="relative w-full max-w-5xl my-auto flex flex-col lg:flex-row items-stretch justify-center gap-5 transition-all">
        {/* ======================================================================= */}
        {/* PANEL PRINCIPAL: REGISTRAR COBRANZA INMEDIATA (Stitch Verbatim)        */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[560px] bg-surface-container-lowest rounded-xl border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden">
          {/* Top Institutional Accent Strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-secondary to-emerald-600"></div>

          {/* Encabezado */}
          <div className="p-5 pb-4 border-b border-outline-variant bg-surface-bright/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                  </span>
                  <h3 className="text-headline-md font-headline-md text-primary tracking-tight font-semibold">
                    Registrar Cobranza Inmediata
                  </h3>
                </div>
                <p className="mt-1 text-body-md font-body-md text-on-surface">
                  <span className="font-code-cadastral font-semibold text-primary">{identificador}</span>
                  <span className="text-outline mx-1.5">/</span>
                  Titular: <strong className="font-semibold text-on-surface">{titularNombre}</strong>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-outline hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors"
                title="Cerrar ventana"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {/* Badge de Servicio */}
            <div className="mt-2.5 flex items-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-label-caps font-label-caps bg-surface-container text-primary border border-outline-variant">
                <span className="material-symbols-outlined text-[14px]">security</span>
                <span>{concepto}</span>
              </span>
            </div>
          </div>

          {/* Monto Destacado */}
          <div className="px-5 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
            <div>
              <span className="text-label-caps font-label-caps uppercase text-outline tracking-wider font-semibold">
                Monto Total a Regularizar
              </span>
              <div className="text-display font-display text-primary tracking-tight font-bold flex items-baseline gap-1 mt-0.5">
                <span>{formatCurrency(monto)}</span>
                <span className="text-title-md font-title-md font-medium text-outline">ARS</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-caps font-label-caps bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Al Día / Sin Mora</span>
              </span>
              <div className="text-body-sm font-code-cadastral text-outline mt-1">Terminal Oficial Chamical</div>
            </div>
          </div>

          {/* Selector de Método de Pago (Segmented Control) */}
          <div className="p-5 pb-3">
            <div className="grid grid-cols-2 p-1 bg-surface-container rounded-lg border border-outline-variant text-center">
              <button
                type="button"
                onClick={() => setMetodo('efectivo')}
                className={`py-2 px-3 rounded text-body-md font-title-md transition-all flex items-center justify-center gap-2 ${
                  metodo === 'efectivo'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border border-outline-variant'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span>Efectivo en Caja</span>
              </button>
              <button
                type="button"
                onClick={() => setMetodo('transferencia_qr')}
                className={`py-2 px-3 rounded text-body-md font-title-md transition-all flex items-center justify-center gap-2 ${
                  metodo === 'transferencia_qr'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border border-outline-variant'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">qr_code_2</span>
                <span>Transferencia QR / Bancaria</span>
              </button>
            </div>
          </div>

          {/* Contenido Central: QR y Datos Bancarios */}
          <div className="px-5 pb-4 space-y-4 flex-1">
            {metodo === 'transferencia_qr' ? (
              <>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant">
                  {/* QR Box with Interoperable Badge */}
                  <div className="relative w-[180px] h-[180px] bg-white p-2.5 rounded-lg border border-[#CBD5E1] shadow-sm flex items-center justify-center shrink-0">
                    <QRCodeSVG
                      value={qrTransferPayload}
                      size={160}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                    <span className="absolute -bottom-2 bg-primary text-on-primary text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase shadow-sm">
                      Interoperable
                    </span>
                  </div>
                  {/* Instructions */}
                  <div className="flex-1 space-y-2 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">sync</span>
                      <span className="text-body-sm font-semibold">Listo para recibir acreditación</span>
                    </div>
                    <p className="text-body-md text-on-surface font-medium leading-snug">
                      Escaneá desde cualquier billetera virtual o app bancaria:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">Mercado Pago</span>
                      <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">BNA+</span>
                      <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">MODO</span>
                      <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-on-surface-variant border border-outline-variant">+ Todas</span>
                    </div>
                    <p className="text-[11px] text-outline pt-0.5">Transferencia directa e inmediata con acreditación en línea.</p>
                  </div>
                </div>

                {/* Tarjetas de Copiado Rápido (Alias / CBU) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 bg-surface-bright rounded-lg border border-outline-variant flex items-center justify-between hover:border-secondary transition-colors">
                    <div className="overflow-hidden mr-2">
                      <span className="text-[10px] font-label-caps uppercase text-outline font-semibold block">Alias CBU</span>
                      <span className="font-code-cadastral text-title-md font-bold text-primary truncate block">
                        {config.alias_cbu}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('alias', config.alias_cbu)}
                      className="shrink-0 h-8 px-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-primary font-semibold text-body-sm rounded flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedField === 'alias' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 bg-surface-bright rounded-lg border border-outline-variant flex items-center justify-between hover:border-secondary transition-colors">
                    <div className="overflow-hidden mr-2">
                      <span className="text-[10px] font-label-caps uppercase text-outline font-semibold block">CBU Institucional</span>
                      <span className="font-code-cadastral text-[12px] font-bold text-primary tracking-tight truncate block">
                        {config.cbu}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('cbu', config.cbu)}
                      className="shrink-0 h-8 px-2.5 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-primary font-semibold text-body-sm rounded flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedField === 'cbu' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedField === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 bg-surface-container-low rounded-lg border border-outline-variant text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-primary">local_atm</span>
                <h4 className="font-semibold text-base text-primary">Cobro en Efectivo por Ventanilla</h4>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Ingrese el dinero recibido en la caja registradora municipal y emita el recibo físico y digital.
                </p>
              </div>
            )}

            {/* Información Fiscal */}
            <div className="p-2.5 bg-surface-container-low rounded border border-outline-variant text-[11px] text-on-surface-variant leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-on-surface mb-0.5">
                <span className="material-symbols-outlined text-[14px] text-primary">account_balance</span>
                <span>{config.banco} - Cuenta Corriente Oficial en Pesos</span>
              </div>
              <div>
                Titular: <strong className="text-on-surface">{config.titular_cuenta}</strong> | CUIT:{' '}
                <span className="font-code-cadastral text-on-surface">{config.cuit}</span>
              </div>
            </div>

            {/* Input Comprobante */}
            <div>
              <label className="block text-body-sm font-semibold text-on-surface mb-1">
                N° de Comprobante / Últimos 4 dígitos <span className="text-outline font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-[16px]">tag</span>
                </div>
                <input
                  type="text"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  placeholder="Ej: 7849 ó #TR-9942"
                  className="w-full h-9 pl-8 pr-3 text-body-md font-code-cadastral uppercase bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary-fixed text-on-surface placeholder:text-outline"
                />
              </div>
            </div>
          </div>

          {/* Pie de Acciones */}
          <div className="p-4 bg-surface-bright border-t border-outline-variant flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 bg-surface-container-lowest border border-outline-variant text-on-surface font-title-md text-body-md rounded-lg hover:bg-surface-container-low transition-colors"
            >
              Cancelar / Volver
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              className="h-10 px-5 bg-[#059669] hover:bg-[#047857] text-white font-title-md text-body-md font-semibold rounded-lg shadow-sm flex items-center gap-2 active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Confirmar Cobro y Emitir Recibo</span>
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL DERECHO: EMISIÓN DE RECIBO DIGITAL OFICIAL (Stitch Verbatim)     */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[400px] bg-surface-container-lowest rounded-xl border border-[#CBD5E1] shadow-2xl flex flex-col justify-between overflow-hidden relative">
          <div className="h-1.5 w-full bg-emerald-600"></div>

          <div>
            {/* Header Recibo */}
            <div className="p-5 pb-3 border-b border-outline-variant bg-emerald-50/50">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-caps font-label-caps font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="material-symbols-outlined text-[15px] text-emerald-700">check_circle</span>
                  <span>{pagoConfirmado ? 'Cobro Acreditado en Línea' : 'Listo para Emisión'}</span>
                </span>
                <span className="font-code-cadastral text-[11px] text-outline font-semibold">AFIP RG 1415</span>
              </div>
              <div className="mt-3">
                <span className="text-label-caps font-label-caps uppercase text-outline block">N° Recibo Oficial</span>
                <div className="text-headline-md font-code-cadastral font-bold text-primary tracking-tight flex items-center gap-2">
                  <span>{reciboNro}</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-code-cadastral mt-0.5">
                  Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} hs · Terminal Chamical
                </p>
              </div>
            </div>

            {/* Rubros Liquidados */}
            <div className="p-4 space-y-3">
              <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant space-y-2 text-body-sm">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Titular Contribuyente:</span>
                  <span className="font-semibold text-on-surface">{titularNombre}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Catastro / Referencia:</span>
                  <span className="font-code-cadastral font-bold text-primary">{identificador}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Canal de Ingreso:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                    <span className="material-symbols-outlined text-[14px]">
                      {metodo === 'transferencia_qr' ? 'qr_code' : 'payments'}
                    </span>
                    <span>{metodo === 'transferencia_qr' ? 'Transf. QR Interoperable' : 'Efectivo en Caja'}</span>
                  </span>
                </div>
                {comprobante && (
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Ref. Operación:</span>
                    <span className="font-code-cadastral text-on-surface">#{comprobante}</span>
                  </div>
                )}
                <div className="border-t border-outline-variant pt-2 flex justify-between items-baseline font-bold">
                  <span className="text-primary text-body-md">Total Cancelado:</span>
                  <span className="text-headline-sm font-code-cadastral text-emerald-800">
                    {formatCurrency(monto)} ARS
                  </span>
                </div>
              </div>

              {/* Simulación gráfica de código de barras denso AFIP */}
              <div className="p-2.5 bg-surface-bright rounded border border-dashed border-outline-variant text-center space-y-1">
                <div className="flex items-center justify-center gap-1 h-7 text-outline">
                  <span className="w-1 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-0.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-2 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-1 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-0.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-1.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-0.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-2 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-1 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-0.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-1.5 h-6 bg-slate-800 inline-block"></span>
                  <span className="w-2 h-6 bg-slate-800 inline-block"></span>
                </div>
                <div className="text-[10px] font-code-cadastral text-outline">
                  CAE: 74192038472910 | Vto CAE: 06/03/2026
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Salida */}
          <div className="p-4 bg-surface-container-low border-t border-outline-variant space-y-2">
            <div className="text-label-caps font-label-caps uppercase text-outline font-semibold mb-1">
              Formatos de Impresión y Entrega
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full h-9 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-primary font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">receipt_long</span>
              <span>Imprimir Ticket Térmico 80mm</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full h-9 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[17px] text-outline">description</span>
              <span>Imprimir Factura / Recibo A4</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full h-9 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 text-[#075E54] font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[17px] text-[#25D366]">chat</span>
              <span>Compartir Comprobante por WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatCurrency, copyToClipboard } from '../../lib/formatters'
import {
  generateBCRAEMVCoQR,
  generateUniversalPaymentPayload,
  generateWebPaymentUrl,
} from '../../lib/qrHelper'
import {
  formatPaymentShareMessage,
  getWhatsAppShareUrl,
  getInstagramShareData,
  getFacebookShareData,
  getEmailShareUrl,
} from '../../lib/paymentShareHelper'
import { ConfiguracionCobro } from '../../types/database'

interface QRPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  concepto: string
  monto: number
  identificador: string // ej: 'Parcela A-25-96' o 'Afiliado #14'
  titularNombre: string
  telefono?: string | null
  email?: string | null
  facebook?: string | null
  instagram?: string | null
  config: ConfiguracionCobro
  onConfirmarPago: (datos: {
    metodo: 'efectivo' | 'transferencia_qr'
    comprobante: string
    nroRecibo: string
    monto: number
  }) => void
}

export const QRPaymentModal: React.FC<QRPaymentModalProps> = ({
  isOpen,
  onClose,
  concepto,
  monto,
  identificador,
  titularNombre,
  telefono,
  email,
  facebook,
  instagram,
  config,
  onConfirmarPago,
}) => {
  const [metodo, setMetodo] = useState<'transferencia_qr' | 'efectivo'>('transferencia_qr')
  const [qrMode, setQrMode] = useState<'web' | 'bcra' | 'universal'>('web')
  const [comprobante, setComprobante] = useState('7849')
  const [copiedField, setCopiedField] = useState<'alias' | 'cbu' | 'link' | null>(null)
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null)
  const [pagoConfirmado, setPagoConfirmado] = useState(false)
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('a4')

  const cleanId = useMemo(() => {
    return (identificador || '').replace(/^Parcela\s+/i, '').trim().replace(/\s+/g, '-')
  }, [identificador])

  const defaultRecibo = useMemo(() => {
    return cleanId
      ? `REC-${cleanId}-${Date.now().toString().slice(-6)}`
      : `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`
  }, [cleanId])

  const [reciboNro, setReciboNro] = useState(defaultRecibo)
  const [montoCobrar, setMontoCobrar] = useState<number>(monto)

  React.useEffect(() => {
    setMontoCobrar(monto)
    setReciboNro(
      cleanId
        ? `REC-${cleanId}-${Date.now().toString().slice(-6)}`
        : `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`
    )
  }, [monto, cleanId])

  // Enlace oficial de pago web (abre portal con datos bancarios y botones para copiar Alias/CBU)
  const webPaymentUrl = useMemo(() => {
    return generateWebPaymentUrl({
      monto: montoCobrar,
      concepto,
      identificador,
      titularNombre,
    })
  }, [montoCobrar, concepto, identificador, titularNombre])

  // Generación de payload EMVCo interoperable oficial (BCRA Transferencias 3.0 con CRC-16)
  const bcraPayload = useMemo(() => {
    return generateBCRAEMVCoQR({
      cbu: config.cbu,
      alias: config.alias_cbu,
      titular: config.titular_cuenta,
      monto: montoCobrar,
      referencia: identificador,
      concepto,
    })
  }, [config, montoCobrar, identificador, concepto])

  // Payload universal legible por cámaras estándar de celulares
  const universalPayload = useMemo(() => {
    return generateUniversalPaymentPayload({
      cbu: config.cbu,
      alias: config.alias_cbu,
      titular: config.titular_cuenta,
      monto: montoCobrar,
      referencia: identificador,
      concepto,
    })
  }, [config, montoCobrar, identificador, concepto])

  if (!isOpen) return null

  const activeQRPayload =
    qrMode === 'web'
      ? webPaymentUrl
      : qrMode === 'bcra'
      ? bcraPayload
      : universalPayload

  const handleCopy = async (field: 'alias' | 'cbu', text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const handleConfirmar = () => {
    setPagoConfirmado(true)
    onConfirmarPago({
      metodo,
      comprobante,
      nroRecibo: reciboNro,
      monto: montoCobrar,
    })
  }

  const handleWhatsApp = () => {
    const msg = `*COMPROBANTE OFICIAL - AETERNA PARQUE*\nRecibo: ${reciboNro}\nTitular: ${titularNombre}\nIdentificador: ${identificador}\nConcepto: ${concepto}\nMonto: ${formatCurrency(montoCobrar)}\nMétodo: ${metodo === 'transferencia_qr' ? 'Transferencia QR Interoperable' : 'Efectivo en Caja'}\nOficina Central de Gestión & Sepelios · Chamical, La Rioja`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleShareWhatsApp = () => {
    const url = getWhatsAppShareUrl({
      titularNombre,
      identificador,
      concepto,
      monto: montoCobrar,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      telefono,
    })
    window.open(url, '_blank')
  }

  const handleShareInstagram = async () => {
    const data = getInstagramShareData({
      titularNombre,
      identificador,
      concepto,
      monto: montoCobrar,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      instagram,
    })
    await copyToClipboard(data.message)
    setCopiedNotice('¡Datos de cobro y link QR copiados! Abre Instagram para pegar en el chat.')
    setTimeout(() => setCopiedNotice(null), 4500)
    const targetUrl = data.profileUrl || 'https://www.instagram.com/direct/inbox/'
    window.open(targetUrl, '_blank')
  }

  const handleShareFacebook = async () => {
    const data = getFacebookShareData({
      titularNombre,
      identificador,
      concepto,
      monto: montoCobrar,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      facebook,
    })
    await copyToClipboard(data.message)
    setCopiedNotice('¡Datos de cobro y link QR copiados! Abre Messenger para pegar en el chat.')
    setTimeout(() => setCopiedNotice(null), 4500)
    const targetUrl = data.messengerUrl || 'https://www.messenger.com/'
    window.open(targetUrl, '_blank')
  }

  const handleShareEmail = () => {
    const url = getEmailShareUrl({
      titularNombre,
      identificador,
      concepto,
      monto: montoCobrar,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      email,
    })
    window.open(url, '_blank')
  }

  const handleCopyPaymentMessage = async () => {
    const msg = formatPaymentShareMessage({
      titularNombre,
      identificador,
      concepto,
      monto: montoCobrar,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
    })
    await copyToClipboard(msg)
    setCopiedNotice('¡Mensaje oficial con Alias, CBU y Link QR copiado!')
    setTimeout(() => setCopiedNotice(null), 3500)
  }

  return (
    <div
      data-printable-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/50 backdrop-blur-sm overflow-y-auto custom-scroll animate-fade-in font-body-md text-body-md text-on-surface"
    >
      {/* MODAL WRAPPER (2 Panels: Payment Card + Live Receipt Panel) */}
      <div className="relative w-full max-w-5xl my-auto flex flex-col lg:flex-row items-stretch justify-center gap-5 transition-all">
        {/* ======================================================================= */}
        {/* PANEL PRINCIPAL: REGISTRAR COBRANZA INMEDIATA (Oculto en Impresión)    */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[560px] bg-surface-container-lowest rounded-xl border border-[#CBD5E1] shadow-2xl flex flex-col overflow-hidden print:hidden">
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

          {/* Monto Destacado y editable para Cancelación de Deuda */}
          <div className="px-5 py-3.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-label-caps uppercase text-outline tracking-wider font-semibold block">
                Monto a Cancelar / Cobrar ($ ARS)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-primary font-code-cadastral">$</span>
                <input
                  id="input-monto-cobrar-qr"
                  type="number"
                  value={montoCobrar}
                  onChange={(e) => setMontoCobrar(Math.max(0, Number(e.target.value) || 0))}
                  className="w-36 text-lg font-bold font-code-cadastral text-primary bg-white border border-outline-variant rounded px-2 py-0.5 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                  title="Ingrese el importe exacto para cancelar deuda o registrar pago parcial"
                />
                {monto !== montoCobrar && (
                  <button
                    type="button"
                    onClick={() => setMontoCobrar(monto)}
                    className="text-[11px] text-outline underline hover:text-primary whitespace-nowrap cursor-pointer"
                    title="Restablecer monto original"
                  >
                    Restablecer ({formatCurrency(monto)})
                  </button>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-code-cadastral font-bold bg-primary/10 text-primary border border-primary/20">
                <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                <span>{reciboNro}</span>
              </span>
              <div className="text-[10px] font-code-cadastral text-outline mt-1">Terminal Chamical</div>
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
                {/* Selector de Modo de QR */}
                <div className="flex items-center justify-between bg-surface-container p-1 rounded-lg border border-outline-variant text-[11px] font-semibold">
                  <span className="text-outline px-2">Modo QR:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setQrMode('web')}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        qrMode === 'web'
                          ? 'bg-primary text-white shadow-xs font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Web Móvil (Cámara Celular)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrMode('bcra')}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        qrMode === 'bcra'
                          ? 'bg-primary text-white shadow-xs font-bold'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Billeteras BCRA 3.0
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-surface-container-lowest rounded-lg border border-outline-variant">
                  {/* QR Box with Badge */}
                  <div className="relative w-[180px] h-[180px] bg-white p-2.5 rounded-lg border border-[#CBD5E1] shadow-sm flex items-center justify-center shrink-0">
                    <QRCodeSVG
                      value={activeQRPayload}
                      size={160}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                    <span className="absolute -bottom-2 bg-primary text-on-primary text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide uppercase shadow-sm">
                      {qrMode === 'web' ? 'Web Pago Fácil' : 'BCRA 3.0'}
                    </span>
                  </div>
                  {/* Instructions */}
                  <div className="flex-1 space-y-2 text-left">
                    <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">
                        {qrMode === 'web' ? 'touch_app' : 'sync'}
                      </span>
                      <span className="text-body-sm font-semibold">
                        {qrMode === 'web' ? 'Abre portal con 1-clic para copiar CBU/Alias' : 'Interoperable con Billeteras'}
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface font-medium leading-snug">
                      {qrMode === 'web'
                        ? 'Escaneá con la cámara de tu celular para abrir el portal web con botones rápidos para copiar:'
                        : 'Escaneá desde la app de tu banco o billetera virtual favorita:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {qrMode === 'web' ? (
                        <>
                          <a
                            href={webPaymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/30 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            <span>Probar portal en pestaña</span>
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              await copyToClipboard(webPaymentUrl)
                              setCopiedField('link')
                              setTimeout(() => setCopiedField(null), 2000)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-lg border border-outline-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedField === 'link' ? 'check' : 'link'}
                            </span>
                            <span>{copiedField === 'link' ? '¡Enlace copiado!' : 'Copiar link'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">Mercado Pago</span>
                          <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">BNA+</span>
                          <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-primary border border-outline-variant">MODO</span>
                          <span className="px-2 py-0.5 bg-surface-container rounded text-label-caps font-semibold text-on-surface-variant border border-outline-variant">+ Todas</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-outline pt-0.5">
                      {qrMode === 'web'
                        ? 'Ideal para que el contribuyente no tenga que tipear CBU ni Alias.'
                        : 'Transferencia directa e inmediata con acreditación en línea.'}
                    </p>
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

                {/* ================================================================ */}
                {/* ENVIAR ALIAS Y QR DE COBRO AL CLIENTE (OMNICANAL)               */}
                {/* ================================================================ */}
                <div className="p-3 bg-gradient-to-r from-primary/5 via-slate-50 to-emerald-50 rounded-xl border border-primary/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                      <span className="material-symbols-outlined text-[17px] text-primary">send</span>
                      <span>Enviar Alias y QR de Pago al Cliente</span>
                    </div>
                    <span className="text-[10px] text-outline font-medium">WhatsApp · IG · FB · Gmail</span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant leading-snug">
                    Permite al contribuyente abonar directamente enviándole el Alias <strong className="text-primary font-mono font-bold">{config.alias_cbu}</strong> y el código QR interactivo:
                  </p>

                  {copiedNotice && (
                    <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-md font-medium flex items-center gap-1.5 animate-fade-in shadow-2xs">
                      <span className="material-symbols-outlined text-[16px] text-emerald-700">check_circle</span>
                      <span>{copiedNotice}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="h-8 px-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#075E54] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={telefono ? `Enviar por WhatsApp al +54 9 ${telefono}` : 'Enviar datos y QR por WhatsApp'}
                    >
                      <span className="material-symbols-outlined text-[15px] text-[#25D366]">chat</span>
                      <span>WhatsApp</span>
                    </button>

                    {/* Instagram */}
                    <button
                      type="button"
                      onClick={handleShareInstagram}
                      className="h-8 px-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-400/40 text-purple-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={instagram ? `Copiar datos y abrir perfil @${instagram}` : 'Copiar datos y abrir Instagram Direct'}
                    >
                      <span className="material-symbols-outlined text-[15px] text-pink-600">photo_camera</span>
                      <span>Instagram</span>
                    </button>

                    {/* Facebook */}
                    <button
                      type="button"
                      onClick={handleShareFacebook}
                      className="h-8 px-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-400/40 text-blue-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={facebook ? `Copiar datos y abrir Messenger (${facebook})` : 'Copiar datos y abrir Facebook Messenger'}
                    >
                      <span className="material-symbols-outlined text-[15px] text-blue-600">forum</span>
                      <span>Facebook</span>
                    </button>

                    {/* Gmail / Correo */}
                    <button
                      type="button"
                      onClick={handleShareEmail}
                      className="h-8 px-2 bg-red-600/10 hover:bg-red-600/20 border border-red-400/40 text-red-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      title={email ? `Enviar por Correo a ${email}` : 'Enviar por Correo Electrónico / Gmail'}
                    >
                      <span className="material-symbols-outlined text-[15px] text-red-600">mail</span>
                      <span>Gmail</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPaymentMessage}
                    className="w-full h-7 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-primary rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>Copiar texto completo con CBU, Alias y enlace</span>
                  </button>
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
              {pagoConfirmado ? 'Cerrar' : 'Cancelar / Volver'}
            </button>
            {pagoConfirmado ? (
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 bg-emerald-700 hover:bg-emerald-800 text-white font-title-md text-body-md font-semibold rounded-lg shadow-sm flex items-center gap-2 active:scale-[0.99] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                <span>¡Cobro Registrado! Finalizar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmar}
                className="h-10 px-5 bg-[#059669] hover:bg-[#047857] text-white font-title-md text-body-md font-semibold rounded-lg shadow-sm flex items-center gap-2 active:scale-[0.99] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Confirmar Cobro y Emitir Recibo</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL DERECHO: EMISIÓN DE RECIBO DIGITAL OFICIAL (Imprimible)          */}
        {/* ======================================================================= */}
        <div
          className={`w-full lg:w-[400px] bg-surface-container-lowest rounded-xl border border-[#CBD5E1] shadow-2xl flex flex-col justify-between overflow-hidden relative ${
            printFormat === 'thermal'
              ? 'thermal-receipt-mode'
              : 'print:w-full print:max-w-2xl print:mx-auto print:p-6 print:border-2 print:border-slate-800'
          }`}
        >
          <div className="h-1.5 w-full bg-emerald-600 print:hidden"></div>

          <div>
            {/* Header Oficial para Impresión */}
            <div className="hidden print:block text-center pb-3 mb-3 border-b-2 border-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 block">
                MUNICIPALIDAD DE CHAMICAL · PROVINCIA DE LA RIOJA
              </span>
              <h1 className="text-lg font-bold uppercase text-slate-900 tracking-tight">
                DIRECCIÓN DE RENTAS Y CEMENTERIO PARQUE
              </h1>
              <div className="text-[10px] font-mono text-slate-600">
                Aeterna Parque Municipal · Comprobante Oficial de Ingreso · AFIP RG 1415
              </div>
            </div>

            {/* Header Recibo UI */}
            <div className="p-5 pb-3 border-b border-outline-variant bg-emerald-50/50 print:bg-white print:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-caps font-label-caps font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 print:bg-white print:border-slate-800 print:text-slate-900">
                  <span className="material-symbols-outlined text-[15px] text-emerald-700 print:hidden">check_circle</span>
                  <span>{pagoConfirmado ? 'Cobro Acreditado en Línea' : 'Listo para Emisión'}</span>
                </span>
                <span className="font-code-cadastral text-[11px] text-outline font-semibold">AFIP RG 1415</span>
              </div>
              <div className="mt-3">
                <span className="text-label-caps font-label-caps uppercase text-outline block">N° Recibo Oficial</span>
                <div className="text-headline-md font-code-cadastral font-bold text-primary tracking-tight flex items-center gap-2">
                  <span>{reciboNro}</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] print:hidden">verified</span>
                </div>
                <p className="text-[11px] text-on-surface-variant font-code-cadastral mt-0.5">
                  Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} hs · Terminal Chamical
                </p>
              </div>
            </div>

            {/* Rubros Liquidados */}
            <div className="p-4 space-y-3">
              <div className="bg-surface-container-low rounded-lg p-3 border border-outline-variant space-y-2 text-body-sm print:bg-white print:border-slate-400">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Titular Contribuyente:</span>
                  <span className="font-semibold text-on-surface">{titularNombre}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Parcela / Referencia:</span>
                  <span className="font-code-cadastral font-bold text-primary">{identificador}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Concepto:</span>
                  <span className="font-medium text-on-surface">{concepto}</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Canal de Ingreso:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 print:text-slate-900">
                    <span className="material-symbols-outlined text-[14px] print:hidden">
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
                <div className="border-t border-outline-variant pt-2 flex justify-between items-baseline font-bold print:border-slate-800">
                  <span className="text-primary text-body-md">Total Cancelado:</span>
                  <span className="text-headline-sm font-code-cadastral text-emerald-800 print:text-slate-950">
                    {formatCurrency(montoCobrar)} ARS
                  </span>
                </div>
              </div>

              {/* Simulación gráfica de código de barras denso AFIP */}
              <div className="p-2.5 bg-surface-bright rounded border border-dashed border-outline-variant text-center space-y-1 print:border-slate-400">
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

              {/* Bloque de Firmas para Impresión (Original Contribuyente) */}
              <div className="hidden print:grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-slate-300 text-center text-xs">
                <div className="border-t border-slate-700 pt-1">
                  <span className="font-semibold block text-slate-900">Firma y Sello de Caja</span>
                  <span className="text-[10px] text-slate-500">Operador Registro Civil Chamical</span>
                </div>
                <div className="border-t border-slate-700 pt-1">
                  <span className="font-semibold block text-slate-900">Firma del Contribuyente</span>
                  <span className="text-[10px] text-slate-500">ORIGINAL: CONTRIBUYENTE</span>
                </div>
              </div>

              {/* Duplicado para Administración Municipal en Impresión */}
              <div className="hidden print:block pt-6">
                <div className="flex items-center justify-center my-4 py-1 border-t-2 border-dashed border-slate-700 text-[10px] text-slate-500 font-mono">
                  ✂️ ------------------ CORTE PARA ARCHIVO MUNICIPAL ------------------ ✂️
                </div>

                <div className="p-4 border-2 border-slate-800 rounded bg-white text-slate-900 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 block">
                        MUNICIPALIDAD DE CHAMICAL · DIRECCIÓN DE RENTAS
                      </span>
                      <h3 className="text-sm font-black uppercase text-slate-900">
                        COMPROBANTE OFICIAL DE INGRESO
                      </h3>
                      <span className="text-[10px] text-slate-600 font-bold">
                        DUPLICADO: TALÓN PARA ADMINISTRACIÓN Y TESORERÍA MUNICIPAL
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">N° Recibo</span>
                      <span className="font-mono font-bold text-sm text-slate-900">{reciboNro}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Titular:</span>
                      <span className="font-bold">{titularNombre}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Parcela / Ref:</span>
                      <span className="font-mono font-bold">{identificador}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Concepto:</span>
                      <span>{concepto}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Total Cancelado:</span>
                      <span className="font-bold font-mono text-emerald-800">{formatCurrency(montoCobrar)} ARS</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Fecha y Hora:</span>
                      <span className="font-mono">
                        {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR').slice(0, 5)} hs
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Forma de Pago:</span>
                      <span>{metodo === 'transferencia_qr' ? 'Transf. QR Interoperable' : 'Efectivo en Caja'}</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-6 border-t border-slate-300 text-xs">
                    <div className="text-center w-36">
                      <div className="border-b border-slate-700 pb-1 mb-1 font-mono">____________________</div>
                      <span className="font-bold block text-[10px]">Firma y Sello de Caja</span>
                    </div>
                    <div className="text-center w-36">
                      <div className="border-b border-slate-700 pb-1 mb-1 font-mono">____________________</div>
                      <span className="font-bold block text-[10px]">Firma del Contribuyente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Salida (Ocultos al imprimir) */}
          <div className="p-4 bg-surface-container-low border-t border-outline-variant space-y-2 print:hidden">
            <div className="text-label-caps font-label-caps uppercase text-outline font-semibold mb-1">
              Recibos Físicos Oficiales y Entrega
            </div>
            <button
              type="button"
              onClick={() => {
                setPrintFormat('a4')
                setTimeout(() => window.print(), 80)
              }}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Imprimir Recibo Físico Oficial (Doble Talón)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPrintFormat('thermal')
                setTimeout(() => window.print(), 80)
              }}
              className="w-full h-9 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-outline">receipt_long</span>
              <span>Imprimir Ticket Térmico 80mm</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full h-9 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 text-[#075E54] font-title-md text-body-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
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

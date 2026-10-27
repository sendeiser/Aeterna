import React, { useState, useMemo, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { formatCurrency, copyToClipboard } from '../../lib/formatters'
import { generateBCRAEMVCoQR, generateWebPaymentUrl } from '../../lib/qrHelper'
import {
  formatPaymentShareMessage,
  formatReciboShareMessage,
  getWhatsAppShareUrl,
  getWhatsAppReciboShareUrl,
  getInstagramShareData,
  getInstagramReciboShareData,
  getFacebookShareData,
  getFacebookReciboShareData,
  getEmailShareUrl,
  getEmailReciboShareUrl,
} from '../../lib/paymentShareHelper'
import { ConfiguracionCobro, Parcela, AfiliadoSeguro } from '../../types/database'
import { PagoRecibo } from '../../services/dataService'

export interface EnviarCobroModalProps {
  isOpen: boolean
  onClose: () => void
  tipo: 'parcela' | 'seguro'
  item: Parcela | AfiliadoSeguro | null
  config: ConfiguracionCobro
  ultimoPago?: PagoRecibo | null
  onConfirmarCobro: (datos: {
    monto: number
    nroRecibo: string
    comprobante: string
    nrosCuotas?: number[]
    metodo: 'transferencia_qr' | 'efectivo'
    concepto: string
  }) => Promise<void> | void
}

type ModalStep = 'solicitud' | 'registro' | 'recibo_emitido' | 'al_dia'

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export const EnviarCobroModal: React.FC<EnviarCobroModalProps> = ({
  isOpen,
  onClose,
  tipo,
  item,
  config,
  ultimoPago,
  onConfirmarCobro,
}) => {
  if (!isOpen || !item) return null

  const qrContainerRef = useRef<HTMLDivElement>(null)
  const isParcela = tipo === 'parcela'
  const parcela = isParcela ? (item as Parcela) : null
  const afiliado = !isParcela ? (item as AfiliadoSeguro) : null

  const isParcelaAlDia = isParcela && (parcela?.saldo_mantenimiento ?? 0) <= 0

  const [step, setStep] = useState<ModalStep>(isParcelaAlDia ? 'al_dia' : 'solicitud')
  const [copiandoAviso, setCopiandoAviso] = useState<string | null>(null)
  const [copiadoCampo, setCopiadoCampo] = useState<'alias' | 'cbu' | 'qr' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Identificador & Titular
  const identificador = useMemo(() => {
    if (isParcela && parcela) return `Parcela ${parcela.nomenclatura}`
    if (afiliado) return `Afiliado #${afiliado.numero_afiliado}`
    return ''
  }, [isParcela, parcela, afiliado])

  const titularNombre = useMemo(() => {
    if (isParcela && parcela) return parcela.titular?.nombre_completo || 'Sin Titular Asignado'
    if (afiliado) return afiliado.nombre_completo
    return ''
  }, [isParcela, parcela, afiliado])

  const contacto = useMemo(() => {
    if (isParcela && parcela) {
      return {
        telefono: parcela.titular?.telefono,
        email: parcela.titular?.email,
        facebook: parcela.titular?.facebook,
        instagram: parcela.titular?.instagram,
      }
    }
    if (afiliado) {
      return {
        telefono: afiliado.telefono,
        email: afiliado.email,
        facebook: afiliado.facebook,
        instagram: afiliado.instagram,
      }
    }
    return {}
  }, [isParcela, parcela, afiliado])

  // Selección de cuotas para Afiliados
  const cuotasPagadas = useMemo(() => afiliado?.cuotasPagadas || [], [afiliado])
  const [selectedCuotas, setSelectedCuotas] = useState<number[]>(() => {
    if (!afiliado) return []
    // Preseleccionar cuotas impagas
    const impagas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => !cuotasPagadas.includes(m))
    return impagas.length > 0 ? impagas.slice(0, 3) : [1]
  })

  // Valor unitario de cuota
  const valorCuotaSeguro = afiliado?.monto_cuota_mensual || 18000

  // Cálculo de monto a cobrar
  const defaultMonto = useMemo(() => {
    if (isParcela && parcela) {
      return parcela.saldo_mantenimiento > 0 ? parcela.saldo_mantenimiento : 36000
    }
    if (afiliado) {
      return valorCuotaSeguro * selectedCuotas.length
    }
    return 0
  }, [isParcela, parcela, afiliado, valorCuotaSeguro, selectedCuotas])

  const [montoCustom, setMontoCustom] = useState<number>(defaultMonto)

  useEffect(() => {
    setMontoCustom(defaultMonto)
  }, [defaultMonto])

  // Concepto dinámico
  const concepto = useMemo(() => {
    const anioActual = new Date().getFullYear()
    if (isParcela && parcela) {
      if (isParcelaAlDia && step === 'solicitud') {
        return `Mantenimiento Anual ${anioActual + 1} (Adelantado) - Parcela ${parcela.nomenclatura}`
      }
      return `Mantenimiento Anual - Parcela ${parcela.nomenclatura}`
    }
    if (afiliado) {
      const nombresStr = selectedCuotas
        .map((n) => MESES_CORTOS[n - 1] || `M${n}`)
        .join(', ')
      return `Plan Seguro Integral - Cuotas (${nombresStr} ${anioActual}) (#${afiliado.numero_afiliado})`
    }
    return 'Cobro de Servicio Aeterna'
  }, [isParcela, parcela, afiliado, selectedCuotas, isParcelaAlDia, step])

  // Número de recibo y comprobante bancario
  const [nroRecibo, setNroRecibo] = useState(() => {
    const anio = new Date().getFullYear()
    return isParcela && parcela
      ? `REC-${parcela.nomenclatura.replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`
      : `REC-${anio}-${Math.floor(1000 + Math.random() * 9000)}`
  })

  const [comprobante, setComprobante] = useState('7849')
  const [metodo, setMetodo] = useState<'transferencia_qr' | 'efectivo'>('transferencia_qr')

  // Datos del recibo final emitido para compartir
  const [reciboEmitido, setReciboEmitido] = useState<{
    nroRecibo: string
    monto: number
    concepto: string
    comprobante: string
    fecha: string
  } | null>(null)

  // Enlace web oficial de pago
  const webPaymentUrl = useMemo(() => {
    return generateWebPaymentUrl({
      monto: montoCustom,
      concepto,
      identificador,
      titularNombre,
    })
  }, [montoCustom, concepto, identificador, titularNombre])

  // Payload BCRA EMVCo
  const bcraPayload = useMemo(() => {
    return generateBCRAEMVCoQR({
      cbu: config.cbu,
      alias: config.alias_cbu,
      titular: config.titular_cuenta,
      monto: montoCustom,
      referencia: identificador,
      concepto,
    })
  }, [config, montoCustom, identificador, concepto])

  // Copia rápida al portapapeles
  const handleCopyText = async (field: 'alias' | 'cbu', text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiadoCampo(field)
      setCopiandoAviso(`¡${field.toUpperCase()} copiado al portapapeles!`)
      setTimeout(() => {
        setCopiadoCampo(null)
        setCopiandoAviso(null)
      }, 3000)
    }
  }

  // Copiar o Descargar Imagen del QR
  const handleCopyOrDownloadQR = async () => {
    const svgEl = qrContainerRef.current?.querySelector('svg')
    if (!svgEl) return

    try {
      const svgData = new XMLSerializer().serializeToString(svgEl)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = async () => {
        canvas.width = 400
        canvas.height = 400
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 20, 20, 360, 360)
        }
        URL.revokeObjectURL(url)

        canvas.toBlob(async (blob) => {
          if (!blob) return

          // Intento de copiar imagen directa al portapapeles
          if (navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])
              setCopiadoCampo('qr')
              setCopiandoAviso('¡Imagen del QR copiada! Lista para pegar en WhatsApp o Instagram.')
              setTimeout(() => {
                setCopiadoCampo(null)
                setCopiandoAviso(null)
              }, 4000)
              return
            } catch (err) {
              console.warn('Portapapeles no admitió imagen directa, descargando PNG...', err)
            }
          }

          // Fallback a descarga directa del archivo PNG
          const a = document.createElement('a')
          a.download = `QR-Cobro-${identificador.replace(/\s+/g, '-')}.png`
          a.href = canvas.toDataURL('image/png')
          a.click()
          setCopiadoCampo('qr')
          setCopiandoAviso('¡Imagen QR descargada en tu dispositivo!')
          setTimeout(() => {
            setCopiadoCampo(null)
            setCopiandoAviso(null)
          }, 4000)
        }, 'image/png')
      }
      img.src = url
    } catch (e) {
      console.error('Error al exportar QR:', e)
    }
  }

  // Compartir Solicitud (Paso 1)
  const handleShareSolicitudWhatsApp = () => {
    const url = getWhatsAppShareUrl({
      titularNombre,
      identificador,
      concepto,
      monto: montoCustom,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      telefono: contacto.telefono,
    })
    window.open(url, '_blank')
  }

  const handleShareSolicitudInstagram = async () => {
    const data = getInstagramShareData({
      titularNombre,
      identificador,
      concepto,
      monto: montoCustom,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      instagram: contacto.instagram,
    })
    await copyToClipboard(data.message)
    setCopiandoAviso('¡Datos de cobro copiados! Abre Instagram para pegarlos en el chat.')
    setTimeout(() => setCopiandoAviso(null), 4500)
    window.open(data.profileUrl || 'https://www.instagram.com/direct/inbox/', '_blank')
  }

  const handleShareSolicitudFacebook = async () => {
    const data = getFacebookShareData({
      titularNombre,
      identificador,
      concepto,
      monto: montoCustom,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      facebook: contacto.facebook,
    })
    await copyToClipboard(data.message)
    setCopiandoAviso('¡Datos de cobro copiados! Abre Messenger para pegarlos en el chat.')
    setTimeout(() => setCopiandoAviso(null), 4500)
    window.open(data.messengerUrl || 'https://www.messenger.com/', '_blank')
  }

  const handleShareSolicitudEmail = () => {
    const url = getEmailShareUrl({
      titularNombre,
      identificador,
      concepto,
      monto: montoCustom,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
      email: contacto.email,
    })
    window.open(url, '_blank')
  }

  const handleCopySolicitudCompleta = async () => {
    const msg = formatPaymentShareMessage({
      titularNombre,
      identificador,
      concepto,
      monto: montoCustom,
      alias: config.alias_cbu,
      cbu: config.cbu,
      banco: config.banco,
      titularCuenta: config.titular_cuenta,
      cuit: config.cuit,
      paymentUrl: webPaymentUrl,
    })
    await copyToClipboard(msg)
    setCopiandoAviso('¡Mensaje oficial con Alias, CBU y Datos de Cobro copiado!')
    setTimeout(() => setCopiandoAviso(null), 3500)
  }

  // Confirmar Cobro (Paso 2 -> Paso 3)
  const handleConfirmarPago = async () => {
    setIsSubmitting(true)
    try {
      const fechaActual = new Date().toLocaleDateString('es-AR')
      await onConfirmarCobro({
        monto: montoCustom,
        nroRecibo,
        comprobante,
        nrosCuotas: !isParcela ? selectedCuotas : undefined,
        metodo,
        concepto,
      })

      setReciboEmitido({
        nroRecibo,
        monto: montoCustom,
        concepto,
        comprobante,
        fecha: fechaActual,
      })
      setStep('recibo_emitido')
    } catch (error) {
      console.error('Error al registrar cobro:', error)
      setCopiandoAviso('Error al registrar el cobro en el sistema.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Compartir Recibo Oficial (Paso 3 o Parcela Al Día)
  const activeReciboData = useMemo(() => {
    if (reciboEmitido) {
      return {
        nroRecibo: reciboEmitido.nroRecibo,
        monto: reciboEmitido.monto,
        concepto: reciboEmitido.concepto,
        comprobante: reciboEmitido.comprobante,
        fecha: reciboEmitido.fecha,
      }
    }
    if (ultimoPago) {
      return {
        nroRecibo: ultimoPago.nroRecibo,
        monto: ultimoPago.monto,
        concepto: ultimoPago.concepto,
        comprobante: ultimoPago.comprobante || '7849',
        fecha: new Date(ultimoPago.fecha).toLocaleDateString('es-AR'),
      }
    }
    return {
      nroRecibo,
      monto: montoCustom,
      concepto,
      comprobante,
      fecha: new Date().toLocaleDateString('es-AR'),
    }
  }, [reciboEmitido, ultimoPago, nroRecibo, montoCustom, concepto, comprobante])

  const handleShareReciboWhatsApp = () => {
    const url = getWhatsAppReciboShareUrl({
      nroRecibo: activeReciboData.nroRecibo,
      titularNombre,
      identificador,
      concepto: activeReciboData.concepto,
      monto: activeReciboData.monto,
      metodo: 'transferencia_qr',
      comprobante: activeReciboData.comprobante,
      fecha: activeReciboData.fecha,
      telefono: contacto.telefono,
    })
    window.open(url, '_blank')
  }

  const handleShareReciboInstagram = async () => {
    const data = getInstagramReciboShareData({
      nroRecibo: activeReciboData.nroRecibo,
      titularNombre,
      identificador,
      concepto: activeReciboData.concepto,
      monto: activeReciboData.monto,
      metodo: 'transferencia_qr',
      comprobante: activeReciboData.comprobante,
      fecha: activeReciboData.fecha,
      instagram: contacto.instagram,
    })
    await copyToClipboard(data.message)
    setCopiandoAviso('¡Texto del Recibo Oficial copiado! Abre Instagram para enviarlo.')
    setTimeout(() => setCopiandoAviso(null), 4000)
    window.open(data.profileUrl || 'https://www.instagram.com/direct/inbox/', '_blank')
  }

  const handleShareReciboFacebook = async () => {
    const data = getFacebookReciboShareData({
      nroRecibo: activeReciboData.nroRecibo,
      titularNombre,
      identificador,
      concepto: activeReciboData.concepto,
      monto: activeReciboData.monto,
      metodo: 'transferencia_qr',
      comprobante: activeReciboData.comprobante,
      fecha: activeReciboData.fecha,
      facebook: contacto.facebook,
    })
    await copyToClipboard(data.message)
    setCopiandoAviso('¡Texto del Recibo Oficial copiado! Abre Messenger para enviarlo.')
    setTimeout(() => setCopiandoAviso(null), 4000)
    window.open(data.messengerUrl || 'https://www.messenger.com/', '_blank')
  }

  const handleShareReciboEmail = () => {
    const url = getEmailReciboShareUrl({
      nroRecibo: activeReciboData.nroRecibo,
      titularNombre,
      identificador,
      concepto: activeReciboData.concepto,
      monto: activeReciboData.monto,
      metodo: 'transferencia_qr',
      comprobante: activeReciboData.comprobante,
      fecha: activeReciboData.fecha,
      email: contacto.email,
    })
    window.open(url, '_blank')
  }

  const handleCopyReciboTexto = async () => {
    const msg = formatReciboShareMessage({
      nroRecibo: activeReciboData.nroRecibo,
      titularNombre,
      identificador,
      concepto: activeReciboData.concepto,
      monto: activeReciboData.monto,
      metodo: 'transferencia_qr',
      comprobante: activeReciboData.comprobante,
      fecha: activeReciboData.fecha,
    })
    await copyToClipboard(msg)
    setCopiandoAviso('¡Texto completo del Comprobante Oficial copiado!')
    setTimeout(() => setCopiandoAviso(null), 3500)
  }

  return (
    <div
      data-enviar-cobro-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/70 backdrop-blur-sm overflow-y-auto custom-scroll animate-fade-in font-body-md text-on-surface"
    >
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Franja Superior Institucional */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>

        {/* Encabezado */}
        <div className="p-5 pb-4 border-b border-outline-variant bg-surface-bright/80 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
              </span>
              <h3 className="text-lg font-semibold text-slate-100 tracking-tight">
                Enviar Cobro a Distancia & Recibo
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              <span className="font-semibold text-emerald-400 font-mono">{identificador}</span>
              <span className="text-slate-500 mx-2">·</span>
              Titular: <strong className="text-slate-100 font-medium">{titularNombre}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Notificación Toast Flotante */}
        {copiandoAviso && (
          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 mx-5 mt-3 rounded-lg text-xs font-medium flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{copiandoAviso}</span>
          </div>
        )}

        {/* ======================================================================= */}
        {/* VISTA 1: PARCELA AL DÍA                                                */}
        {/* ======================================================================= */}
        {step === 'al_dia' && (
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </span>
              <div>
                <h4 className="text-base font-semibold text-emerald-300">
                  Mantenimiento Anual al Día
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Esta parcela no registra deudas pendientes. Su saldo actual es{' '}
                  <strong className="text-white">$0.00</strong> correspondiente al período anual
                  vigente.
                </p>
              </div>
            </div>

            {/* Opciones disponibles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                      receipt_long
                    </span>
                    <span>Enviar Comprobante</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Enviar al titular la constancia del último pago registrado por WhatsApp o redes.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2">
                  <button
                    onClick={handleShareReciboWhatsApp}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Enviar Recibo por WhatsApp</span>
                  </button>
                  <button
                    onClick={handleCopyReciboTexto}
                    className="w-full py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Texto Oficial</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                    <span className="material-symbols-outlined text-teal-400 text-[18px]">
                      calendar_month
                    </span>
                    <span>Cobrar Adelantado</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Generar una nueva solicitud de cobro para el siguiente ciclo de mantenimiento
                    anual.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60">
                  <button
                    onClick={() => setStep('solicitud')}
                    className="w-full py-2.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/30"
                  >
                    <span className="material-symbols-outlined text-[16px]">forward</span>
                    <span>Cobrar Período Próximo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* PASO 1: SOLICITUD DE COBRO (QR + DATOS BANCARIOS + CANALES)             */}
        {/* ======================================================================= */}
        {step === 'solicitud' && (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Si es Afiliado: Selector de Cuotas Mensuales */}
            {!isParcela && afiliado && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Meses a Solicitar / Cobrar:
                  </span>
                  <span className="text-xs text-slate-400">
                    Valor mensual: <strong className="text-slate-200">{formatCurrency(valorCuotaSeguro)}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {MESES_CORTOS.map((mes, idx) => {
                    const nro = idx + 1
                    const yaPagada = cuotasPagadas.includes(nro)
                    const isSelected = selectedCuotas.includes(nro)

                    return (
                      <button
                        key={nro}
                        disabled={yaPagada}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCuotas(selectedCuotas.filter((m) => m !== nro))
                          } else {
                            setSelectedCuotas([...selectedCuotas, nro].sort((a, b) => a - b))
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center border transition ${
                          yaPagada
                            ? 'bg-emerald-950/30 text-emerald-500/60 border-emerald-900/40 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                        title={yaPagada ? 'Cuota ya pagada' : `Seleccionar ${mes}`}
                      >
                        {mes}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fila de Monto y Concepto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/70">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Concepto Institucional
                </span>
                <p className="text-sm font-medium text-slate-200 truncate">{concepto}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                  Importe a Solicitar
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-emerald-400">$</span>
                  <input
                    type="number"
                    min="1"
                    value={montoCustom}
                    onChange={(e) => setMontoCustom(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-lg font-bold text-white focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Visualización del Código QR y Datos Bancarios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Contenedor del QR con botón para exportar/copiar imagen */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-300 shadow-inner">
                <div ref={qrContainerRef} className="p-1 bg-white rounded-lg">
                  <QRCodeSVG
                    id="enviar-cobro-qr-svg"
                    value={bcraPayload}
                    size={170}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">
                  Interoperable BCRA / Billeteras
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrDownloadQR}
                  className={`mt-2.5 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    copiadoCampo === 'qr'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  title="Copiar imagen del código QR para pegarla en WhatsApp o descargar archivo"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiadoCampo === 'qr' ? 'check' : 'image'}
                  </span>
                  <span>{copiadoCampo === 'qr' ? '¡Imagen Copiada!' : 'Copiar Imagen QR'}</span>
                </button>
              </div>

              {/* Alias y CBU con botones para copiar individualmente */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Alias CBU (Transferencias)
                    </span>
                    <button
                      onClick={() => handleCopyText('alias', config.alias_cbu)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiadoCampo === 'alias' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiadoCampo === 'alias' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-sm font-mono font-bold text-white tracking-wider mt-1 select-all">
                    {config.alias_cbu}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      CBU Bancario
                    </span>
                    <button
                      onClick={() => handleCopyText('cbu', config.cbu)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiadoCampo === 'cbu' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiadoCampo === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <p className="text-xs font-mono font-medium text-slate-300 mt-1 select-all break-all">
                    {config.cbu}
                  </p>
                </div>

                <div className="px-3 py-2 rounded-lg bg-slate-800/30 text-[11px] text-slate-400">
                  Banco: <span className="text-slate-200">{config.banco}</span> · Titular:{' '}
                  <span className="text-slate-200">{config.titular_cuenta}</span>
                </div>
              </div>
            </div>

            {/* Botonera de Envío Omnicanal de la Solicitud */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                1. Enviar Solicitud por Redes / Mensajería:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleShareSolicitudWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  title="Abrir WhatsApp con mensaje formateado"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareSolicitudInstagram}
                  className="py-2.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  title="Copiar datos y abrir Instagram Direct"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  <span>Instagram</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareSolicitudFacebook}
                  className="py-2.5 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  title="Copiar datos y abrir Messenger"
                >
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                  <span>Messenger</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareSolicitudEmail}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  title="Enviar por correo electrónico"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Gmail / Correo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopySolicitudCompleta}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Copiar Mensaje Completo (Alias, CBU, Importe y Concepto)</span>
              </button>
            </div>

            {/* Acción para pasar a registrar pago */}
            <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                ¿El cliente ya envió el comprobante o transfirió?
              </span>
              <button
                type="button"
                onClick={() => setStep('registro')}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/30"
              >
                <span>Registrar Pago Recibido</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* PASO 2: REGISTRO DEL PAGO (MONTO, RECIBO Y COMPROBANTE)                */}
        {/* ======================================================================= */}
        {step === 'registro' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400">
                  Concepto del Recibo
                </span>
                <p className="text-sm font-semibold text-slate-100">{concepto}</p>
              </div>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {formatCurrency(montoCustom)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Monto Cobrado Final ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={montoCustom}
                  onChange={(e) => setMontoCustom(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nro. de Recibo Oficial
                </label>
                <input
                  type="text"
                  value={nroRecibo}
                  onChange={(e) => setNroRecibo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nro. Operación / Comprobante Bancario
                </label>
                <input
                  type="text"
                  placeholder="Ej: 7849 o ID de transferencia"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="transferencia_qr">Transferencia QR / Bancaria</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('solicitud')}
                className="py-2 px-3 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Volver a la Solicitud</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting || montoCustom <= 0}
                onClick={handleConfirmarPago}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/30"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>{isSubmitting ? 'Registrando...' : 'Confirmar y Emitir Recibo'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* PASO 3: RECIBO OFICIAL EMITIDO (ENVÍO DIRECTO AL CONTRIBUYENTE)        */}
        {/* ======================================================================= */}
        {step === 'recibo_emitido' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 inline-flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-[24px]">check</span>
              </span>
              <h4 className="text-base font-bold text-white">¡Cobranza Registrada con Éxito!</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                El pago ha sido acreditado en caja contable y asentado en el sistema oficial.
              </p>
            </div>

            {/* Vista Previa del Comprobante */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 font-mono text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400 font-semibold">
                <span>RECIBO OFICIAL: {activeReciboData.nroRecibo}</span>
                <span>FECHA: {activeReciboData.fecha}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400">Titular:</span>{' '}
                <strong className="text-white">{titularNombre}</strong>
              </div>
              <div>
                <span className="text-slate-400">Identificador:</span>{' '}
                <strong className="text-emerald-400">{identificador}</strong>
              </div>
              <div>
                <span className="text-slate-400">Concepto:</span> {activeReciboData.concepto}
              </div>
              <div>
                <span className="text-slate-400">Importe Abonado:</span>{' '}
                <strong className="text-white">{formatCurrency(activeReciboData.monto)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Nro. Operación:</span>{' '}
                {activeReciboData.comprobante}
              </div>
            </div>

            {/* Botonera de Envío del Recibo */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Enviar Comprobante Oficial al Cliente:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleShareReciboWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareReciboInstagram}
                  className="py-2.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  <span>Instagram</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareReciboFacebook}
                  className="py-2.5 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                  <span>Messenger</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareReciboEmail}
                  className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Gmail / Correo</span>
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyReciboTexto}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>Copiar Texto del Recibo</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

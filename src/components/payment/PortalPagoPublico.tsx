import React, { useState } from 'react'
import { formatCurrency, copyToClipboard } from '../../lib/formatters'
import { ConfiguracionCobro } from '../../types/database'

interface PortalPagoPublicoProps {
  monto: number
  concepto: string
  identificador: string
  titularNombre: string
  config: ConfiguracionCobro
  onVolver?: () => void
}

export const PortalPagoPublico: React.FC<PortalPagoPublicoProps> = ({
  monto,
  concepto,
  identificador,
  titularNombre,
  config,
  onVolver,
}) => {
  const [copiedField, setCopiedField] = useState<'alias' | 'cbu' | null>(null)
  const [comprobanteEnviado, setComprobanteEnviado] = useState(false)

  const handleCopy = async (field: 'alias' | 'cbu', text: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2500)
    }
  }

  const handleWhatsApp = () => {
    const msg = `*AVISO DE PAGO - AETERNA PARQUE MUNICIPAL*\n\nHola, adjunto comprobante de transferencia:\n• *Titular:* ${titularNombre}\n• *Referencia/Parcela:* ${identificador}\n• *Concepto:* ${concepto}\n• *Monto transferido:* ${formatCurrency(monto)} ARS\n• *Cuenta destino:* ${config.banco} (${config.alias_cbu})\n\nPor favor confirmar recepción y emitir recibo oficial. Muchas gracias.`
    window.open(`https://wa.me/5493826401234?text=${encodeURIComponent(msg)}`, '_blank')
    setComprobanteEnviado(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between antialiased selection:bg-primary/20">
      {/* Top Brand Bar */}
      <header className="bg-primary text-white border-b border-primary-container px-4 py-3.5 shadow-sm sticky top-0 z-30">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block leading-tight">
                Chamical · La Rioja
              </span>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                Portal de Cobranza Oficial
              </h1>
            </div>
          </div>
          {onVolver && (
            <button
              type="button"
              onClick={onVolver}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white font-medium transition-colors"
            >
              Volver al Sistema
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Card: Detalle del Cobro */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>Orden de Cobro Municipal</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              {identificador || 'Aeterna'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Contribuyente / Titular:</span>
            <p className="text-base font-bold text-slate-900">{titularNombre || 'Titular Responsable'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Concepto a Cancelar:</span>
            <p className="text-sm font-semibold text-slate-800">{concepto || 'Servicios Generales de Catastro'}</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <span className="text-sm font-bold text-slate-600">Total a Transferir:</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight font-mono">
              {formatCurrency(monto)} <span className="text-xs text-slate-500 font-sans font-medium">ARS</span>
            </span>
          </div>
        </div>

        {/* Card: Datos Bancarios con Botones de Copiado Rápido */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-md p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="material-symbols-outlined text-primary text-[22px]">account_balance</span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Datos de la Cuenta para Transferencia
              </h2>
              <span className="text-xs text-slate-500">
                {config.banco} · Cuenta Oficial en Pesos
              </span>
            </div>
          </div>

          {/* Información de Titularidad */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1 text-slate-600">
            <div>
              Titular: <strong className="text-slate-900">{config.titular_cuenta}</strong>
            </div>
            <div>
              CUIT: <strong className="font-mono text-slate-900">{config.cuit}</strong>
            </div>
            <div>
              Entidad: <strong className="text-slate-900">{config.banco}</strong>
            </div>
          </div>

          {/* 1. Botón Copiar ALIAS (El método más fácil) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Opción 1: Transferir por Alias (Recomendado)</span>
              </span>
              {copiedField === 'alias' && (
                <span className="text-emerald-700 font-bold animate-in fade-in">
                  ¡Alias copiado!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 text-sm tracking-wider select-all overflow-hidden truncate">
                {config.alias_cbu}
              </div>
              <button
                type="button"
                onClick={() => handleCopy('alias', config.alias_cbu)}
                className={`h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer ${
                  copiedField === 'alias'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-primary hover:bg-secondary text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copiedField === 'alias' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedField === 'alias' ? '¡Copiado!' : 'Copiar Alias'}</span>
              </button>
            </div>
          </div>

          {/* 2. Botón Copiar CBU (22 Dígitos) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1 text-slate-700">
                <span className="material-symbols-outlined text-[16px]">pin</span>
                <span>Opción 2: Transferir por CBU</span>
              </span>
              {copiedField === 'cbu' && (
                <span className="text-emerald-700 font-bold animate-in fade-in">
                  ¡CBU copiado!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs text-slate-900 select-all overflow-hidden truncate">
                {config.cbu}
              </div>
              <button
                type="button"
                onClick={() => handleCopy('cbu', config.cbu)}
                className={`h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all active:scale-95 shrink-0 cursor-pointer ${
                  copiedField === 'cbu'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copiedField === 'cbu' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedField === 'cbu' ? '¡Copiado!' : 'Copiar CBU'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Guía Rápida de Pago en 3 Pasos */}
        <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
          <span className="font-bold text-slate-800 uppercase tracking-wide block">
            ¿Cómo realizar el pago?
          </span>
          <div className="space-y-1.5 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <span>Toca arriba <strong>"Copiar Alias"</strong> o <strong>"Copiar CBU"</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <span>Abre tu app bancaria o billetera virtual (Mercado Pago, BNA+, Ualá, Banco Rioja, Santander, Galicia, etc.).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <span>Pega el dato copiado y transfiere el monto exacto de <strong>{formatCurrency(monto)}</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                4
              </span>
              <span>Toca el botón verde inferior para enviar el comprobante por WhatsApp y registrar tu pago.</span>
            </div>
          </div>
        </div>

        {/* Botón WhatsApp Comprobante */}
        <button
          type="button"
          onClick={handleWhatsApp}
          className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">chat</span>
          <span>{comprobanteEnviado ? 'Enviar otro comprobante por WhatsApp' : 'Avisar y Enviar Comprobante por WhatsApp'}</span>
        </button>
      </main>

      {/* Footer Institucional */}
      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-200 mt-6 bg-white">
        <div className="max-w-xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Municipalidad de Chamical · Dirección de Rentas & Catastro
          </p>
          <p className="text-[11px] text-slate-400">
            Aeterna Parque Memorial y Seguro de Sepelio · Mesa de Ayuda: (03826) 44-8900
          </p>
        </div>
      </footer>
    </div>
  )
}

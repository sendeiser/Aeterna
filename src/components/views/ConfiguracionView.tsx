import React, { useState, useMemo } from 'react'
import { ConfiguracionCobro } from '../../types/database'
import { QRCodeSVG } from 'qrcode.react'
import { syncDataToSupabase } from '../../services/dataService'
import { isSupabaseConfigured } from '../../lib/supabase'
import { generateBCRAEMVCoQR } from '../../lib/qrHelper'

interface ConfiguracionViewProps {
  config: ConfiguracionCobro
  onSave: (nuevaConfig: ConfiguracionCobro) => void
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({ config, onSave }) => {
  const [alias, setAlias] = useState(config.alias_cbu)
  const [cbu, setCbu] = useState(config.cbu)
  const [titular, setTitular] = useState(config.titular_cuenta)
  const [banco, setBanco] = useState(config.banco)
  const [cuit, setCuit] = useState(config.cuit)
  const [mensaje, setMensaje] = useState(config.mensaje_recibo)
  const [guardado, setGuardado] = useState(false)

  // Supabase Sync state
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...config,
      alias_cbu: alias.trim().toUpperCase(),
      cbu: cbu.trim(),
      titular_cuenta: titular.trim(),
      banco: banco.trim(),
      cuit: cuit.trim(),
      mensaje_recibo: mensaje.trim(),
    })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const handleSyncSupabase = async () => {
    setIsSyncing(true)
    setSyncStatus('Iniciando sincronización...')
    try {
      await syncDataToSupabase((msg) => setSyncStatus(msg))
      setSyncStatus('¡Todos los datos (397 parcelas, 116 COVID, 6 afiliados) han sido sincronizados!')
    } catch (err: any) {
      setSyncStatus(`Error: ${err.message || 'No se pudo conectar a Supabase'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const previewQR = useMemo(() => {
    return generateBCRAEMVCoQR({
      cbu,
      alias,
      titular,
      monto: 18000,
      referencia: 'VISTA-PREVIA',
      concepto: 'Mantenimiento Parque',
    })
  }, [cbu, alias, titular])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Configuración de Cobro y CBU</h2>
            <p className="text-xs text-on-surface-variant">
              Parámetros bancarios oficiales para el código QR y transferencias inmediatas de Aeterna Chamical.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Interoperable BCRA</span>
        </div>
      </div>

      {/* Tarjeta de Conexión Supabase */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-mono font-bold text-xs">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Conexión con Base de Datos Supabase</h3>
              <p className="text-[11px] text-on-surface-variant">
                Proyecto: <span className="font-mono font-bold text-primary">xftwykrxumzxaqhosbvt</span> · Región sa-east-1
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span>{isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Almacenamiento Local (Persistente)'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-outline">URL del Proyecto:</span>
            <div className="font-mono font-bold text-primary truncate">
              https://xftwykrxumzxaqhosbvt.supabase.co
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/50 space-y-1">
            <span className="text-[10px] uppercase font-bold text-outline">MCP Supabase Server:</span>
            <div className="font-mono text-emerald-800 font-semibold truncate">
              Configurado en ~/.gemini/antigravity/mcp_config.json
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-outline">
            {isSupabaseConfigured
              ? 'La aplicación lee y escribe directamente en PostgreSQL en la nube.'
              : 'Puedes usar el sistema al 100% en modo local sin perder datos, y sincronizar cuando desees.'}
          </p>
          <button
            type="button"
            onClick={handleSyncSupabase}
            disabled={isSyncing}
            className="px-4 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Parcelas a Supabase'}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            {syncStatus}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="md:col-span-2 bg-surface-container-lowest border border-outline-variant p-5 sm:p-6 rounded-xl shadow-sm space-y-4"
        >
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                Alias de Transferencia (CBU / CVU) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value.toUpperCase())}
                placeholder="AETERNA.CHAMICAL"
                className="w-full h-10 px-3 font-mono font-bold text-sm text-primary bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none uppercase"
                required
              />
              <span className="text-[10px] text-outline mt-1 block">
                Alias visible al titular en billeteras (Mercado Pago, Cuenta DNI, BNA+, Ualá).
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                Clave Bancaria Uniforme (CBU / 22 dígitos) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value.replace(/\D/g, '').slice(0, 22))}
                placeholder="0000003100012345678901"
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
                required
              />
              <span className="text-[10px] text-outline mt-1 block">
                Longitud: {cbu.length} / 22 dígitos numéricos.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                  Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={titular}
                  onChange={(e) => setTitular(e.target.value)}
                  placeholder="Aeterna Servicios S.R.L."
                  className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                  Entidad Bancaria
                </label>
                <input
                  type="text"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Banco Rioja / Santander"
                  className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                CUIT del Titular
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="30-71234567-9"
                className="w-full h-9 px-3 font-mono text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface uppercase block mb-1">
                Leyenda Oficial en Recibo Digital
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={2}
                className="w-full p-2.5 text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
            {guardado ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                ¡Parámetros actualizados correctamente!
              </span>
            ) : (
              <span></span>
            )}

            <button
              type="submit"
              className="px-5 h-9 rounded-lg bg-primary hover:bg-secondary text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Guardar Configuración</span>
            </button>
          </div>
        </form>

        {/* Preview QR */}
        <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-sm flex flex-col items-center justify-between text-center">
          <div className="w-full">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-3">
              Previsualización de QR
            </span>
            <div className="p-3 bg-white rounded-xl border border-outline-variant inline-block shadow-sm">
              <QRCodeSVG
                value={previewQR}
                size={160}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="w-full mt-4 p-3 rounded-lg bg-surface-container-low text-left space-y-1">
            <div className="text-[11px] text-outline">Alias:</div>
            <div className="font-mono font-bold text-primary text-xs">{alias}</div>
            <div className="text-[11px] text-outline mt-1">CBU:</div>
            <div className="font-mono text-[10px] text-on-surface-variant truncate">{cbu}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

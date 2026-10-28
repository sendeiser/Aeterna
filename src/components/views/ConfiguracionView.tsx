import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ConfiguracionCobro } from '../../types/database'
import { QRCodeSVG } from 'qrcode.react'
import { generateBCRAEMVCoQR } from '../../lib/qrHelper'
import { fetchSectores, upsertSector, deleteSector, SectorParque } from '../../services/dataService'

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

  // ── Sectores del Parque ──
  const [sectores, setSectores] = useState<SectorParque[]>([])
  const [loadingSectores, setLoadingSectores] = useState(false)
  const [editingSector, setEditingSector] = useState<SectorParque | null>(null)
  const [newSector, setNewSector] = useState<SectorParque>({ codigo: '', nombre: '', descripcion: '' })
  const [sectorMsg, setSectorMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const showSectorMsg = (type: 'ok' | 'err', text: string) => {
    setSectorMsg({ type, text })
    setTimeout(() => setSectorMsg(null), 3500)
  }

  const loadSectores = useCallback(async () => {
    setLoadingSectores(true)
    const data = await fetchSectores()
    setSectores(data)
    setLoadingSectores(false)
  }, [])

  useEffect(() => { loadSectores() }, [loadSectores])

  const handleSaveSector = async (s: SectorParque) => {
    const ok = await upsertSector(s)
    if (ok) {
      showSectorMsg('ok', `Sector "${s.codigo}" guardado correctamente.`)
      setEditingSector(null)
      setNewSector({ codigo: '', nombre: '', descripcion: '' })
      loadSectores()
    } else {
      showSectorMsg('err', 'No se pudo guardar el sector. Verificá la conexión.')
    }
  }

  const handleDeleteSector = async (codigo: string) => {
    const res = await deleteSector(codigo)
    if (res.ok) {
      showSectorMsg('ok', `Sector "${codigo}" eliminado.`)
      loadSectores()
    } else {
      showSectorMsg('err', res.msg || 'Error al eliminar.')
    }
  }

  // Single-User Admin Credentials State
  const [adminUsername, setAdminUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aeterna_admin_credentials')
      if (stored) {
        try {
          return JSON.parse(stored).username || 'admin'
        } catch (e) {}
      }
    }
    return 'admin'
  })
  const [adminPassword, setAdminPassword] = useState('')
  const [credGuardado, setCredGuardado] = useState(false)

  const handleSaveCredentials = () => {
    if (!adminUsername.trim()) {
      alert('El nombre de usuario no puede estar vacío.')
      return
    }
    const currentStored = typeof window !== 'undefined' ? localStorage.getItem('aeterna_admin_credentials') : null
    let currentPass = 'admin'
    if (currentStored) {
      try {
        currentPass = JSON.parse(currentStored).password || 'admin'
      } catch (e) {}
    }
    const finalPass = adminPassword.trim() ? adminPassword.trim() : currentPass
    const newCreds = {
      username: adminUsername.trim(),
      password: finalPass,
      updatedAt: new Date().toISOString(),
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('aeterna_admin_credentials', JSON.stringify(newCreds))
    }
    setAdminPassword('')
    setCredGuardado(true)
    setTimeout(() => setCredGuardado(false), 2500)
  }

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

      {/* Sección Seguridad de Usuario Único */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 sm:p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">admin_panel_settings</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">Credenciales del Usuario Administrador</h3>
              <p className="text-xs text-on-surface-variant">Acceso único protegido para la gestión oficial del cementerio y seguros.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Usuario Activo: <strong className="font-mono">{adminUsername}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-on-surface uppercase block mb-1">
              Nombre de Usuario
            </label>
            <input
              type="text"
              id="cfg-admin-username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-on-surface uppercase block mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="cfg-admin-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Dejar en blanco para mantener la actual"
              className="w-full h-9 px-3 text-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {credGuardado ? (
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 animate-in fade-in">
              ✓ Credenciales actualizadas correctamente
            </span>
          ) : (
            <span className="text-[11px] text-outline">Por defecto: usuario <strong>admin</strong> / clave <strong>admin</strong></span>
          )}
          <button
            type="button"
            id="btn-guardar-credenciales"
            onClick={handleSaveCredentials}
            className="px-4 h-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            <span>Actualizar Credenciales</span>
          </button>
        </div>
      </div>

      {/* Sección Aplicación Móvil Web App (PWA) */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 sm:p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">phone_iphone</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">Aplicación Móvil Web App (PWA)</h3>
              <p className="text-xs text-on-surface-variant">Instalación nativa directa en teléfonos Android o iPhone sin pasar por tiendas.</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PWA Activa & Service Worker Listo</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card Android */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-[20px]">android</span>
              <h4 className="font-bold text-sm text-slate-900">En Celulares Android (Chrome)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. Abre el enlace del sistema en <strong>Google Chrome</strong>.<br />
              2. Aparecerá el botón <em>"Instalar Aplicación Móvil"</em> en la parte inferior, o toca los tres puntos (⋮) arriba a la derecha y selecciona <strong>"Instalar aplicación"</strong>.<br />
              3. Se creará el ícono institucional de Aeterna en tu pantalla de inicio y se abrirá en pantalla completa nativa.
            </p>
          </div>

          {/* Card iPhone */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sky-700 text-[20px]">ios</span>
              <h4 className="font-bold text-sm text-slate-900">En iPhone (Safari)</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              1. Abre el sistema en <strong>Safari</strong> de tu iPhone.<br />
              2. Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba 📤 en la barra inferior).<br />
              3. Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio" ➕</strong>.<br />
              4. Pulsa <strong>"Agregar"</strong> y el sistema funcionará como una app instalada sin la barra de direcciones de Safari.
            </p>
          </div>
        </div>
      </div>
      {/* ─── Panel de Gestión de Sectores del Parque ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant p-5 sm:p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[22px]">grid_4x4</span>
            <div>
              <h3 className="text-base font-bold text-on-surface">Sectores del Parque</h3>
              <p className="text-xs text-on-surface-variant">Añadí, editá o eliminá sectores. No podés eliminar sectores con parcelas asignadas.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSectores}
            disabled={loadingSectores}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[15px] ${loadingSectores ? 'animate-spin' : ''}`}>sync</span>
            Actualizar
          </button>
        </div>

        {/* Mensaje de estado */}
        {sectorMsg && (
          <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${
            sectorMsg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {sectorMsg.type === 'ok' ? '✓ ' : '✕ '}{sectorMsg.text}
          </div>
        )}

        {/* Lista de sectores existentes */}
        <div className="space-y-2">
          {loadingSectores ? (
            <div className="py-4 text-center text-xs text-outline">Cargando sectores...</div>
          ) : sectores.length === 0 ? (
            <div className="py-4 text-center text-xs text-outline">No hay sectores registrados.</div>
          ) : sectores.map((s) => (
            <div key={s.codigo} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container border border-outline-variant">
              {editingSector?.codigo === s.codigo ? (
                /* Modo edición inline */
                <>
                  <span className="font-mono font-bold text-primary text-sm w-12 shrink-0">{s.codigo}</span>
                  <input
                    type="text"
                    value={editingSector.nombre}
                    onChange={(e) => setEditingSector({ ...editingSector, nombre: e.target.value })}
                    placeholder="Nombre"
                    className="flex-1 h-8 px-2 text-xs border border-outline-variant rounded focus:border-secondary focus:outline-none bg-white"
                  />
                  <input
                    type="text"
                    value={editingSector.descripcion || ''}
                    onChange={(e) => setEditingSector({ ...editingSector, descripcion: e.target.value })}
                    placeholder="Descripción (opcional)"
                    className="flex-1 h-8 px-2 text-xs border border-outline-variant rounded focus:border-secondary focus:outline-none bg-white hidden sm:block"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveSector(editingSector)}
                    className="h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">check</span>
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSector(null)}
                    className="h-8 px-2 rounded border border-outline-variant text-xs text-outline hover:text-on-surface cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </>
              ) : (
                /* Vista normal */
                <>
                  <span className="font-mono font-bold text-primary text-sm w-12 shrink-0">{s.codigo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-on-surface">{s.nombre}</div>
                    {s.descripcion && <div className="text-xs text-outline truncate">{s.descripcion}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSector({ ...s })}
                    title="Editar sector"
                    className="h-8 w-8 flex items-center justify-center rounded border border-outline-variant text-outline hover:text-primary hover:border-primary cursor-pointer shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el sector "${s.codigo} - ${s.nombre}"? Esta acción es irreversible.`)) {
                        handleDeleteSector(s.codigo)
                      }
                    }}
                    title="Eliminar sector"
                    className="h-8 w-8 flex items-center justify-center rounded border border-rose-200 text-rose-400 hover:text-rose-700 hover:border-rose-400 cursor-pointer shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Formulario para añadir nuevo sector */}
        <div className="pt-3 border-t border-outline-variant">
          <h4 className="text-xs font-bold text-on-surface uppercase mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-primary">add_circle</span>
            Añadir Nuevo Sector
          </h4>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] font-bold text-outline uppercase block mb-1">Código</label>
              <input
                type="text"
                value={newSector.codigo}
                onChange={(e) => setNewSector({ ...newSector, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                placeholder="Ej: C"
                maxLength={10}
                className="h-9 w-24 px-3 font-mono font-bold text-sm text-primary bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none uppercase text-center"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] font-bold text-outline uppercase block mb-1">Nombre</label>
              <input
                type="text"
                value={newSector.nombre}
                onChange={(e) => setNewSector({ ...newSector, nombre: e.target.value })}
                placeholder="Ej: Sector C"
                className="w-full h-9 px-3 text-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
              />
            </div>
            <div className="flex-1 min-w-[160px] hidden sm:block">
              <label className="text-[10px] font-bold text-outline uppercase block mb-1">Descripción</label>
              <input
                type="text"
                value={newSector.descripcion || ''}
                onChange={(e) => setNewSector({ ...newSector, descripcion: e.target.value })}
                placeholder="Opcional"
                className="w-full h-9 px-3 text-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newSector.codigo.trim() || !newSector.nombre.trim()) {
                  showSectorMsg('err', 'El código y el nombre son obligatorios.')
                  return
                }
                if (sectores.some((s) => s.codigo === newSector.codigo)) {
                  showSectorMsg('err', `El código "${newSector.codigo}" ya existe.`)
                  return
                }
                handleSaveSector(newSector)
              }}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Añadir
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

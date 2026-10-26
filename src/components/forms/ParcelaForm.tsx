import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Parcela, Inhumacion, EstadoParcela, EstadoTitular } from '../../types/database'
import { formatNomenclatura } from '../../lib/formatters'

interface ParcelaFormProps {
  initialData?: Parcela | null
  inhumaciones?: Inhumacion[]
  onSave: (parcela: Partial<Parcela>) => void
  onCancel: () => void
  onNuevaInhumacionParaParcela?: (nomenclatura: string) => void
}

export const ParcelaForm: React.FC<ParcelaFormProps> = ({
  initialData,
  inhumaciones = [],
  onSave,
  onCancel,
  onNuevaInhumacionParaParcela,
}) => {
  const [sector, setSector] = useState(initialData?.sector_id || 'A')
  const [manzana, setManzana] = useState(initialData?.manzana_fila || '25')
  const [numero, setNumero] = useState(initialData?.numero_parcela?.toString() || '96')
  const [titularNombre, setTitularNombre] = useState(initialData?.titular?.nombre_completo || '')
  const [titularDni, setTitularDni] = useState(initialData?.titular?.dni || '')
  const [titularTel, setTitularTel] = useState((initialData?.titular?.telefono || '').replace('+54 9 ', ''))
  const [direccion, setDireccion] = useState(initialData?.titular?.direccion || '')
  const [titularEstadoVital, setTitularEstadoVital] = useState<'vivo' | 'fallecido'>(
    initialData?.titular?.estado_vital ||
    (initialData?.titular?.estado_titular === 'fallecido' ? 'fallecido' : 'vivo')
  )
  const [capacidad, setCapacidad] = useState(initialData?.capacidad_total || 3)
  const [estado, setEstado] = useState<EstadoParcela>(initialData?.estado || 'disponible')
  const [saldo, setSaldo] = useState(initialData?.saldo_mantenimiento?.toString() || '0')
  const [notas, setNotas] = useState(initialData?.notas || '')

  const previewNomenclatura = formatNomenclatura(sector, manzana || '00', numero || '00')
  const nomActual = initialData?.nomenclatura || previewNomenclatura

  const difuntosEnParcela = useMemo(() => {
    if (!inhumaciones || !nomActual) return []
    const normTarget = nomActual.toUpperCase().replace(/[\s-]/g, '')
    return inhumaciones
      .filter((inh) => {
        const inhParc = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
        if (!inhParc) return false
        const normInh = inhParc.toUpperCase().replace(/[\s-]/g, '')
        return normInh === normTarget
      })
      .sort((a, b) => (a.nivel_posicion || 1) - (b.nivel_posicion || 1))
  }, [inhumaciones, nomActual])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: initialData?.id || `parc-${Date.now()}`,
      nomenclatura: previewNomenclatura,
      sector_id: sector,
      manzana_fila: manzana,
      numero_parcela: numero ? String(numero) : '1',
      capacidad_total: Number(capacidad),
      espacios_ocupados: initialData?.espacios_ocupados || 0,
      estado,
      saldo_mantenimiento: parseFloat(saldo) || 0,
      notas,
      titular: titularNombre.trim()
        ? {
            id: initialData?.titular?.id || `tit-${Date.now()}`,
            nombre_completo: titularNombre.trim(),
            dni: titularDni.trim() || null,
            telefono: titularTel.trim() ? `+54 9 ${titularTel.trim()}` : null,
            direccion: direccion.trim() || null,
            estado_titular: (titularEstadoVital === 'fallecido' ? 'fallecido' : 'activo') as EstadoTitular,
            estado_vital: titularEstadoVital,
          }
        : null,
    })
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-5 sm:p-6 text-on-surface shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scroll"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                {initialData ? 'edit_note' : 'add_location_alt'}
              </span>
            </div>
            <div>
              <h3 className="text-title-lg font-bold text-primary leading-tight">
                {initialData ? `Editar Parcela ${initialData.nomenclatura}` : 'Registrar Nueva Parcela'}
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-tight">
                Cementerio Parque San Nicolás · Padrón Oficial y Catastro
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Sección: Datos del Titular Responsable */}
        <fieldset className="border border-outline-variant/70 rounded-xl p-4 bg-surface/50 space-y-3">
          <legend className="text-label-caps font-label-caps text-primary uppercase px-2 font-bold flex items-center gap-1.5 bg-surface-container-low rounded py-0.5">
            <span className="material-symbols-outlined text-[15px]">person</span>
            <span>Datos del Titular Responsable</span>
          </legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                Nombre y Apellido del Titular
              </label>
              <input
                type="text"
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                placeholder="Ej. Fernández, Héctor Osvaldo (o dejar vacío para Parcela Municipal)"
                className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                DNI / CUIT
              </label>
              <input
                type="text"
                value={titularDni}
                onChange={(e) => setTitularDni(e.target.value)}
                placeholder="20-18452981-4"
                className="w-full h-9 px-3 font-code-cadastral text-body-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-2.5 h-9 rounded-l-lg border border-r-0 border-outline-variant bg-surface-container-low text-body-sm font-code-cadastral text-outline select-none">
                  +54 9
                </span>
                <input
                  type="tel"
                  value={titularTel}
                  onChange={(e) => setTitularTel(e.target.value)}
                  placeholder="3826 44-8921"
                  className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-r-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                Domicilio en Chamical
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. San Martín 452, Chamical"
                className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>

            {/* Selector Condición Vital del Titular (Vivo / Fallecido) */}
            <div className="md:col-span-2 pt-1 border-t border-outline-variant/40 flex flex-wrap items-center justify-between gap-2">
              <span className="text-body-sm font-semibold text-on-surface-variant">
                Condición de Vida del Titular:
              </span>
              <div className="inline-flex rounded-lg border border-outline-variant p-0.5 bg-surface-container">
                <button
                  type="button"
                  onClick={() => setTitularEstadoVital('vivo')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    titularEstadoVital === 'vivo'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">favorite</span>
                  <span>Vivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTitularEstadoVital('fallecido')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    titularEstadoVital === 'fallecido'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">sentiment_very_dissatisfied</span>
                  <span>Fallecido</span>
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Sección: Ubicación y Capacidad de la Parcela */}
        <fieldset className="border border-outline-variant/70 rounded-xl p-4 bg-surface/50 space-y-3">
          <legend className="text-label-caps font-label-caps text-primary uppercase px-2 font-bold flex items-center gap-1.5 bg-surface-container-low rounded py-0.5">
            <span className="material-symbols-outlined text-[15px]">grid_4x4</span>
            <span>Ubicación de Parcela y Coordenadas</span>
          </legend>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                Sector del Parque
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              >
                <option value="A">Sector A (Tradicional)</option>
                <option value="E">Sector E (Parque Central)</option>
                <option value="SALINAS">Sector Salinas (Panteón)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                Fila / Manzana
              </label>
              <input
                type="text"
                value={manzana}
                onChange={(e) => setManzana(e.target.value)}
                placeholder="25"
                className="w-full h-9 px-3 font-code-cadastral text-center bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
                N° Parcela
              </label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="96"
                className="w-full h-9 px-3 font-code-cadastral text-center bg-white border border-outline-variant rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                required
              />
            </div>

            {/* Vista Previa Parcela */}
            <div className="sm:col-span-12 bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase">
                Parcela Resultante:
              </span>
              <span className="font-code-cadastral text-base font-bold text-primary">
                {previewNomenclatura}
              </span>
            </div>

            {/* Capacidad en Niveles */}
            <div className="sm:col-span-12">
              <label className="block text-body-sm font-semibold text-on-surface-variant mb-1.5">
                Capacidad Total de la Fosa (Niveles)
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container rounded-lg border border-outline-variant">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCapacidad(lvl)}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      capacidad === lvl
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {lvl === 3 ? '3 Niveles (Familiar)' : `${lvl} Nivel${lvl > 1 ? 'es' : ''}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Sección: Ocupación de Niveles de la Fosa (Difuntos Inhumados) */}
        <fieldset className="border border-outline-variant/70 rounded-xl p-4 bg-surface/50 space-y-3">
          <legend className="text-label-caps font-label-caps text-primary uppercase px-2 font-bold flex items-center gap-1.5 bg-surface-container-low rounded py-0.5">
            <span className="material-symbols-outlined text-[15px]">layers</span>
            <span>Ocupación de Niveles de la Fosa (Difuntos Inhumados)</span>
          </legend>

          <div className="flex items-center justify-between text-xs text-on-surface-variant pb-2 border-b border-outline-variant/50">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Parcela:</span>
              <span className="font-bold text-primary font-code-cadastral">{nomActual}</span>
              <span className="text-slate-400">·</span>
              <span>Capacidad: {capacidad} niveles</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className={difuntosEnParcela.length > 0 ? 'text-primary' : 'text-emerald-700'}>
                {difuntosEnParcela.length} de {capacidad} niveles ocupados
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: Math.max(Number(capacidad) || 1, difuntosEnParcela.length) }, (_, i) => i + 1).map((lvl) => {
              const difunto = difuntosEnParcela.find((d) => (d.nivel_posicion || 1) === lvl)
              const isOccupied = !!difunto

              return (
                <div
                  key={lvl}
                  className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isOccupied ? 'bg-white border-slate-300 shadow-2xs' : 'bg-emerald-50/50 border-emerald-200/80'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isOccupied ? 'bg-primary text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      N{lvl}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isOccupied
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isOccupied ? 'Ocupado' : 'Disponible / Libre'}
                        </span>

                        {isOccupied && (
                          <span className="font-semibold text-sm text-slate-900">
                            {difunto.nombre_difunto}
                          </span>
                        )}
                      </div>

                      {isOccupied ? (
                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 font-code-cadastral">
                          {difunto.dni_difunto && (
                            <span className="font-medium text-slate-700">DNI: {difunto.dni_difunto}</span>
                          )}
                          {difunto.fecha_inhumacion && (
                            <span>Fecha Inhumación: {difunto.fecha_inhumacion.slice(0, 10)}</span>
                          )}
                          {difunto.empresa_funebrera && (
                            <span className="font-sans text-slate-500">Empresa: {difunto.empresa_funebrera}</span>
                          )}
                          {difunto.es_covid && (
                            <span className="font-sans px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Protocolo Sanitario COVID
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Espacio libre en la fosa disponible para futura inhumación.
                        </p>
                      )}
                    </div>
                  </div>

                  {!isOccupied && onNuevaInhumacionParaParcela && initialData && (
                    <button
                      type="button"
                      onClick={() => {
                        onCancel()
                        onNuevaInhumacionParaParcela(nomActual)
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md flex items-center gap-1 shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
                      title="Asentar nueva inhumación en este nivel"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>Asentar Inhumación</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </fieldset>

        {/* Sección: Estado Administrativo, Saldo y Observaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
              Estado Administrativo
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoParcela)}
              className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
            >
              <option value="disponible">🟢 Disponible</option>
              <option value="ocupada">🔵 Ocupada</option>
              <option value="en_mora">🟡 En Mora</option>
              <option value="standby">🔴 Stand-by (+3 años en mora)</option>
              <option value="baja">⚪ Baja / En litigio</option>
            </select>
          </div>

          <div>
            <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
              Saldo de Mantenimiento ($ ARS)
            </label>
            <input
              type="number"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
              className="w-full h-9 px-3 font-code-cadastral text-base font-bold text-primary bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-body-sm font-semibold text-on-surface-variant mb-1">
              Notas u Observaciones del Registro
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles sobre escrituras, autorizaciones o historial administrativo..."
              className="w-full px-3 py-2 text-body-sm bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-lg text-body-sm font-semibold bg-white border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded-lg bg-primary hover:bg-secondary text-white font-semibold text-body-sm transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{initialData ? 'Guardar Cambios de la Parcela' : 'Registrar Parcela'}</span>
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

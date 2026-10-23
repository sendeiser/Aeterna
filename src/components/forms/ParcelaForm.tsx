import React, { useState } from 'react'
import { Parcela, EstadoParcela } from '../../types/database'
import { formatNomenclatura } from '../../lib/formatters'

interface ParcelaFormProps {
  initialData?: Parcela | null
  onSave: (parcela: Partial<Parcela>) => void
  onCancel: () => void
}

export const ParcelaForm: React.FC<ParcelaFormProps> = ({ initialData, onSave, onCancel }) => {
  const [sector, setSector] = useState(initialData?.sector_id || 'A')
  const [manzana, setManzana] = useState(initialData?.manzana_fila || '25')
  const [numero, setNumero] = useState(initialData?.numero_parcela?.toString() || '96')
  const [titularNombre, setTitularNombre] = useState(initialData?.titular?.nombre_completo || '')
  const [titularDni, setTitularDni] = useState(initialData?.titular?.dni || '')
  const [titularTel, setTitularTel] = useState((initialData?.titular?.telefono || '').replace('+54 9 ', ''))
  const [direccion, setDireccion] = useState(initialData?.titular?.direccion || '')
  const [capacidad, setCapacidad] = useState(initialData?.capacidad_total || 3)
  const [estado, setEstado] = useState<EstadoParcela>(initialData?.estado || 'disponible')
  const [saldo, setSaldo] = useState(initialData?.saldo_mantenimiento?.toString() || '0')
  const [notas, setNotas] = useState(initialData?.notas || '')

  const previewNomenclatura = formatNomenclatura(sector, manzana || '00', numero || '00')

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
            nombre_completo: titularNombre,
            dni: titularDni || null,
            telefono: titularTel ? `+54 9 ${titularTel}` : null,
            direccion: direccion || null,
            estado_titular: 'activo',
          }
        : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded p-5 text-on-surface shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto custom-scroll"
      >
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]" data-icon="domain">
                domain
              </span>
            </div>
            <div>
              <h3 className="text-headline-sm font-headline-sm font-semibold text-primary">
                {initialData ? 'Edición de Parcela' : 'Registro de Nueva Parcela'}
              </h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Registro Oficial Parque Municipal · Chamical, La Rioja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Datos del Titular */}
        <fieldset className="border border-outline-variant/70 rounded p-3 bg-surface/50">
          <legend className="text-label-caps font-label-caps text-outline uppercase px-1.5 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" data-icon="person">
              person
            </span>
            <span>Datos del Titular Responsable</span>
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-1">
            <div className="md:col-span-2">
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                Nombre y Apellido del Titular
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={titularNombre}
                  onChange={(e) => setTitularNombre(e.target.value)}
                  placeholder="Ej. Fernández, Héctor Osvaldo"
                  className="w-full h-9 px-3 pr-8 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                  person_search
                </span>
              </div>
            </div>
            <div>
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                DNI / CUIT
              </label>
              <input
                type="text"
                value={titularDni}
                onChange={(e) => setTitularDni(e.target.value)}
                placeholder="20-18452981-4"
                className="w-full h-9 px-3 font-code-cadastral text-code-cadastral bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                Teléfono / WhatsApp
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-2.5 h-9 rounded-l border border-r-0 border-outline-variant bg-surface-container-low text-body-sm font-code-cadastral text-outline select-none">
                  +54 9
                </span>
                <input
                  type="tel"
                  value={titularTel}
                  onChange={(e) => setTitularTel(e.target.value)}
                  placeholder="3826 44-8921"
                  className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-r focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                Domicilio en Chamical
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. San Martín 452, Chamical"
                className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              />
            </div>
          </div>
        </fieldset>

        {/* Ubicación de Parcela */}
        <fieldset className="border border-outline-variant/70 rounded p-3 bg-surface/50">
          <legend className="text-label-caps font-label-caps text-outline uppercase px-1.5 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" data-icon="grid_4x4">
              grid_4x4
            </span>
            <span>Ubicación de Parcela y Coordenadas</span>
          </legend>
          <div className="space-y-3 mt-1">
            <div>
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                Sector del Parque
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
              >
                <option value="A">Sector A (Tradicional)</option>
                <option value="E">Sector E (Parque Central)</option>
                <option value="SALINAS">Sector Salinas (Panteón)</option>
              </select>
            </div>

            <div className="grid grid-cols-12 gap-2.5 items-end">
              <div className="col-span-3">
                <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                  Fila / Manz.
                </label>
                <input
                  type="text"
                  value={manzana}
                  onChange={(e) => setManzana(e.target.value)}
                  placeholder="25"
                  className="w-full h-9 px-3 font-code-cadastral text-code-cadastral text-center bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>
              <div className="col-span-3">
                <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                  N° Parcela
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="96"
                  className="w-full h-9 px-3 font-code-cadastral text-code-cadastral text-center bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                  required
                />
              </div>
              {/* Nomenclature box */}
              <div className="col-span-6 bg-surface-container border border-primary/20 rounded p-1.5 flex flex-col justify-center items-center h-9">
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider leading-none">
                  Nomenclatura Oficial
                </span>
                <span className="font-code-cadastral text-[14px] font-bold text-primary tracking-wide">
                  {previewNomenclatura}
                </span>
              </div>
            </div>

            {/* Capacidad */}
            <div>
              <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1.5">
                Capacidad Total de la Fosa
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-high rounded border border-outline-variant">
                {[1, 2, 3].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCapacidad(lvl)}
                    className={`flex items-center justify-center py-1.5 px-2 rounded cursor-pointer transition-all text-body-sm ${
                      capacidad === lvl
                        ? 'bg-white text-primary font-semibold shadow-sm'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    <span>{lvl === 3 ? '3 Niv. (Familiar)' : `${lvl} Nivel${lvl > 1 ? 'es' : ''}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Estado y Saldo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
              Estado Administrativo
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoParcela)}
              className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:outline-none"
            >
              <option value="disponible">Disponible</option>
              <option value="ocupada">Ocupada</option>
              <option value="en_mora">En Mora</option>
              <option value="baja">Baja / En litigio</option>
            </select>
          </div>
          <div>
            <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
              Saldo de Mantenimiento ($ ARS)
            </label>
            <input
              type="number"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
              className="w-full h-9 px-3 font-code-cadastral text-headline-sm font-semibold text-primary bg-white border border-outline-variant rounded focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded text-body-md font-medium bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded bg-primary hover:bg-secondary text-white font-semibold text-body-md transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Parcela</span>
          </button>
        </div>
      </form>
    </div>
  )
}

import React, { useState } from 'react'
import { Inhumacion, Parcela } from '../../types/database'

interface InhumacionFormProps {
  parcelasDisponibles: Parcela[]
  initialData?: Inhumacion | null
  onSave: (inhumacion: Partial<Inhumacion>) => void
  onCancel: () => void
}

export const InhumacionForm: React.FC<InhumacionFormProps> = ({
  parcelasDisponibles,
  initialData,
  onSave,
  onCancel,
}) => {
  // Resolver parcela inicial o existente
  const existingParcNom = typeof initialData?.parcela === 'object'
    ? initialData?.parcela?.nomenclatura
    : (typeof initialData?.parcela === 'string' ? initialData.parcela : '')

  const initialMatchedParcela = parcelasDisponibles.find(
    (p) => p.id === initialData?.parcela_id || (existingParcNom && p.nomenclatura === existingParcNom)
  )

  const [parcelaId, setParcelaId] = useState(
    initialMatchedParcela?.id || initialData?.parcela_id || parcelasDisponibles[0]?.id || ''
  )
  const [nombreDifunto, setNombreDifunto] = useState(initialData?.nombre_difunto || '')
  const [dniDifunto, setDniDifunto] = useState(initialData?.dni_difunto || '')
  const [fechaFallecimiento, setFechaFallecimiento] = useState(initialData?.fecha_fallecimiento || '')
  const [fechaInhumacion, setFechaInhumacion] = useState(
    initialData?.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().split('T')[0]
  )
  const [nivelPosicion, setNivelPosicion] = useState(initialData?.nivel_posicion || 1)
  const [esCovid, setEsCovid] = useState(initialData?.es_covid || false)
  const [causaDefuncion, setCausaDefuncion] = useState(initialData?.causa_defuncion || '')
  const [empresaFunebrera, setEmpresaFunebrera] = useState(
    initialData?.empresa_funebrera || 'Aeterna Sepelios'
  )
  const [observaciones, setObservaciones] = useState(initialData?.observaciones || '')

  const parcelaSeleccionada = parcelasDisponibles.find((p) => p.id === parcelaId)

  // Opciones combinadas para que no se pierda la parcela asignada actualmente
  const parcelasOptions = [...parcelasDisponibles]
  if (
    existingParcNom &&
    !parcelasOptions.some((p) => p.nomenclatura === existingParcNom || p.id === parcelaId)
  ) {
    parcelasOptions.unshift({
      id: parcelaId || `parc-custom-${Date.now()}`,
      nomenclatura: existingParcNom,
      capacidad_total: 3,
      espacios_ocupados: nivelPosicion,
      estado: 'ocupada',
      saldo_mantenimiento: 0,
    } as Parcela)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: initialData?.id || `inh-${Date.now()}`,
      parcela_id: parcelaId,
      nombre_difunto: nombreDifunto.trim(),
      dni_difunto: dniDifunto.trim(),
      fecha_fallecimiento: fechaFallecimiento || null,
      fecha_inhumacion: fechaInhumacion,
      nivel_posicion: Number(nivelPosicion),
      es_covid: esCovid,
      causa_defuncion: causaDefuncion.trim() || 'Causa Natural',
      empresa_funebrera: empresaFunebrera.trim() || 'Servicios Sociales Chamical',
      observaciones: observaciones.trim() || null,
      parcela: parcelaSeleccionada || (typeof initialData?.parcela === 'object' ? initialData.parcela : null),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-on-surface shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-primary">
              {initialData ? 'Editar Inhumación' : 'Registrar Inhumación / Sepelio'}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Libro Digital Oficial · Ley Sanitaria 4.120 Chamical
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Parcela Destino <span className="text-error">*</span>
          </label>
          <select
            value={parcelaId}
            onChange={(e) => setParcelaId(e.target.value)}
            className="w-full h-9 px-2 text-xs font-mono font-bold text-primary bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            required
          >
            {parcelasOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nomenclatura} - {p.titular?.nombre_completo || 'Sin titular'} ({p.espacios_ocupados}/{p.capacidad_total} niveles)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">
              Nombre Completo del Difunto <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={nombreDifunto}
              onChange={(e) => setNombreDifunto(e.target.value)}
              placeholder="Ej. Gómez Miranda, Roberto"
              className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">DNI del Difunto</label>
            <input
              type="text"
              value={dniDifunto}
              onChange={(e) => setDniDifunto(e.target.value)}
              placeholder="14.882.341"
              className="w-full h-9 px-3 font-mono text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">Fecha Defunción</label>
            <input
              type="date"
              value={fechaFallecimiento}
              onChange={(e) => setFechaFallecimiento(e.target.value)}
              className="w-full h-9 px-2 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">
              Fecha Inhumación <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={fechaInhumacion}
              onChange={(e) => setFechaInhumacion(e.target.value)}
              className="w-full h-9 px-2 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">Nivel en Fosa</label>
            <select
              value={nivelPosicion}
              onChange={(e) => setNivelPosicion(Number(e.target.value))}
              className="w-full h-9 px-2 text-xs font-bold bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            >
              <option value={1}>Nivel 1 (Fondo)</option>
              <option value={2}>Nivel 2 (Medio)</option>
              <option value={3}>Nivel 3 (Superior)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">Causa de Defunción</label>
            <input
              type="text"
              value={causaDefuncion}
              onChange={(e) => setCausaDefuncion(e.target.value)}
              placeholder="Paro cardiorrespiratorio..."
              className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-on-surface block mb-1">Empresa Funebrera</label>
            <input
              type="text"
              value={empresaFunebrera}
              onChange={(e) => setEmpresaFunebrera(e.target.value)}
              placeholder="Aeterna Sepelios"
              className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">Observaciones / Notas Sanitarias</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            placeholder="Anotaciones adicionales sobre el sepelio, ataúd especial, etc."
            className="w-full p-2.5 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none resize-none"
          />
        </div>

        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/60 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={esCovid}
              onChange={(e) => setEsCovid(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-outline-variant"
            />
            <span className="text-xs font-semibold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-amber-700 text-[16px]">warning</span>
              Inhumación bajo Protocolo Sanitario COVID-19 (Cofre Sellado)
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 rounded-lg text-xs font-medium bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="h-9 px-5 rounded-lg bg-primary hover:bg-secondary text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>{initialData ? 'Guardar Cambios' : 'Asentar Inhumación'}</span>
        </button>
      </div>
    </form>
  )
}

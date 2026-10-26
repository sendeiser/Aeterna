import React, { useState, useMemo, useEffect } from 'react'
import { Inhumacion, Parcela } from '../../types/database'

interface InhumacionFormProps {
  parcelasDisponibles: Parcela[]
  inhumaciones?: Inhumacion[]
  initialData?: Inhumacion | null
  onSave: (inhumacion: Partial<Inhumacion>) => void
  onCancel: () => void
}

export const InhumacionForm: React.FC<InhumacionFormProps> = ({
  parcelasDisponibles,
  inhumaciones = [],
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
  const [busquedaParcela, setBusquedaParcela] = useState(
    initialMatchedParcela?.nomenclatura || existingParcNom || ''
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
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

  const parcelaSeleccionada = useMemo(() => {
    return (
      parcelasDisponibles.find((p) => p.id === parcelaId) ||
      parcelasDisponibles.find(
        (p) => (p.nomenclatura || '').toUpperCase() === busquedaParcela.trim().toUpperCase()
      ) ||
      parcelasDisponibles.find(
        (p) =>
          (p.nomenclatura || '').replace(/[\s-]/g, '').toUpperCase() ===
          busquedaParcela.replace(/[\s-]/g, '').trim().toUpperCase()
      )
    )
  }, [parcelasDisponibles, parcelaId, busquedaParcela])

  // Difuntos actualmente registrados en la parcela seleccionada
  const difuntosEnParcela = useMemo(() => {
    const targetNom = (parcelaSeleccionada?.nomenclatura || busquedaParcela || '').trim().toUpperCase()
    const targetId = parcelaSeleccionada?.id || parcelaId

    if (!targetNom && !targetId) return []

    return (inhumaciones || []).filter((inh) => {
      // Ignorar el registro que se está editando para no auto-bloquearse
      if (initialData?.id && inh.id === initialData.id) return false

      const inhNom = (
        typeof inh.parcela === 'object'
          ? inh.parcela?.nomenclatura
          : (typeof inh.parcela === 'string' ? inh.parcela : (inh as any).parcela_nomenclatura) || ''
      ).trim().toUpperCase()

      const matchesNom = Boolean(
        targetNom &&
          (inhNom === targetNom ||
            inhNom.replace(/[\s-]/g, '') === targetNom.replace(/[\s-]/g, ''))
      )

      const matchesId = Boolean(
        targetId &&
          (inh.parcela_id === targetId ||
            (typeof inh.parcela === 'object' && inh.parcela?.id === targetId))
      )

      return matchesNom || matchesId
    })
  }, [inhumaciones, parcelaSeleccionada, busquedaParcela, parcelaId, initialData?.id])

  const capacidadFosa = parcelaSeleccionada?.capacidad_total || 3

  // Mapa de ocupación por nivel: nivel -> Inhumacion
  const ocupacionPorNivel = useMemo(() => {
    const map = new Map<number, Inhumacion>()
    for (const d of difuntosEnParcela) {
      const lvl = Number(d.nivel_posicion) || 1
      map.set(lvl, d)
    }
    return map
  }, [difuntosEnParcela])

  // Auto-seleccionar primer nivel disponible cuando cambia la parcela
  useEffect(() => {
    if (!initialData) {
      const nivelesPosibles = Array.from({ length: capacidadFosa }, (_, i) => i + 1)
      const primerLibre = nivelesPosibles.find((lvl) => !ocupacionPorNivel.has(lvl))
      if (primerLibre) {
        setNivelPosicion(primerLibre)
      }
    }
  }, [difuntosEnParcela, capacidadFosa, initialData, ocupacionPorNivel])

  // Opciones combinadas para que no se pierda la parcela asignada actualmente
  const parcelasOptions = useMemo(() => {
    const opts = [...parcelasDisponibles]
    if (
      existingParcNom &&
      !opts.some((p) => p.nomenclatura === existingParcNom || p.id === parcelaId)
    ) {
      opts.unshift({
        id: parcelaId || `parc-custom-${Date.now()}`,
        nomenclatura: existingParcNom,
        capacidad_total: 3,
        espacios_ocupados: nivelPosicion,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
      } as Parcela)
    }
    return opts
  }, [parcelasDisponibles, existingParcNom, parcelaId, nivelPosicion])

  // Parcelas filtradas interactivamente para el buscador de parcela
  const parcelasFiltradas = useMemo(() => {
    const q = busquedaParcela.trim().toLowerCase()
    if (!q) return parcelasOptions.slice(0, 60)
    return parcelasOptions
      .filter((p) => {
        const nom = (p.nomenclatura || '').toLowerCase()
        const nro = String(p.numero_parcela || '').toLowerCase()
        const sec = (p.sector_id || '').toLowerCase()
        const tit = (p.titular?.nombre_completo || '').toLowerCase()
        const dni = (p.titular?.dni || '').toLowerCase()
        return (
          nom.includes(q) ||
          nro.includes(q) ||
          sec.includes(q) ||
          tit.includes(q) ||
          dni.includes(q)
        )
      })
      .slice(0, 60)
  }, [parcelasOptions, busquedaParcela])

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
        {/* Buscador Interactivo de Parcela Destino */}
        <div className="relative">
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Parcela Destino (Buscar por Nomenclatura, N° Parcela o Titular) <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
              search
            </span>
            <input
              id="input-buscar-parcela-inhumacion"
              type="text"
              value={busquedaParcela}
              onChange={(e) => {
                setBusquedaParcela(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Escriba para buscar parcela (ej. A-01-05, Salinas, Gómez)..."
              className="w-full h-9 pl-8 pr-24 text-xs font-medium bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
              autoComplete="off"
            />
            {parcelaSeleccionada && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {parcelaSeleccionada.nomenclatura}
              </span>
            )}
          </div>

          {/* Menú desplegable flotante de parcelas encontradas */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl divide-y divide-outline-variant/40 custom-scroll">
                {parcelasFiltradas.length > 0 ? (
                  parcelasFiltradas.map((p) => {
                    const isSelected = p.id === parcelaId
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setParcelaId(p.id)
                          setBusquedaParcela(p.nomenclatura)
                          setDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 font-semibold text-primary'
                            : 'hover:bg-surface-container-low text-on-surface'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-code-cadastral font-bold text-xs text-primary">
                            {p.nomenclatura}
                          </span>
                          <span className="text-[11px] text-outline">
                            Titular: {p.titular?.nombre_completo || 'Sin titular'} {p.titular?.dni ? `(DNI: ${p.titular.dni})` : ''}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-outline-variant text-on-surface-variant font-mono">
                            {p.espacios_ocupados || 0}/{p.capacidad_total || 3} niveles
                          </span>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-outline">
                    No se encontraron parcelas que coincidan con "{busquedaParcela}".
                  </div>
                )}
              </div>
            </>
          )}

          {/* Tarjeta de Confirmación de Parcela Elegida & Difuntos Existentes */}
          {parcelaSeleccionada && (
            <div className="mt-2 p-3 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {parcelaSeleccionada.nomenclatura}
                  </span>
                  <span className="text-outline">·</span>
                  <span className="font-semibold text-on-surface truncate max-w-[200px]">
                    {parcelaSeleccionada.titular?.nombre_completo || 'Sin titular asignado'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="px-2 py-0.5 bg-white rounded border border-outline-variant font-bold text-slate-700">
                    Ocupación: {difuntosEnParcela.length}/{capacidadFosa} niveles
                  </span>
                  {difuntosEnParcela.length >= capacidadFosa ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">
                      Fosa Llena
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      {capacidadFosa - difuntosEnParcela.length} Libre{capacidadFosa - difuntosEnParcela.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Lista compacta de difuntos que ya descansan en esta fosa */}
              {difuntosEnParcela.length > 0 && (
                <div className="pt-2 border-t border-outline-variant/60 text-[11px] text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Cuerpos / Difuntos actualmente en esta fosa:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {difuntosEnParcela.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-rose-700 font-mono text-[10px]">
                            [Nivel {d.nivel_posicion || 1}]
                          </span>
                          <span className="font-medium text-slate-900 truncate">
                            {d.nombre_difunto}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px] shrink-0 ml-1">
                          {d.fecha_inhumacion?.slice(0, 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        {/* ========================================================================= */}
        {/* SELECTOR VISUAL DE NIVELES EN FOSA SUBTERRÁNEA                            */}
        {/* ========================================================================= */}
        <div className="p-3.5 rounded-xl border border-outline-variant bg-surface-container-low space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-primary">layers</span>
              <span>Disponibilidad de Niveles en Fosa Subterránea (*)</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              Nivel Asignado: <strong className="text-primary font-bold">Nivel {nivelPosicion}</strong>
            </span>
          </div>

          <p className="text-[11px] text-on-surface-variant">
            Haga clic en un nivel disponible para ocuparlo. Los niveles ocupados muestran quién descansa allí.
          </p>

          {/* Tarjetas Interactivas de Niveles (Nivel 3 Superior, Nivel 2 Medio, Nivel 1 Fondo) */}
          <div className="space-y-1.5">
            {Array.from({ length: capacidadFosa }, (_, i) => capacidadFosa - i).map((lvl) => {
              const ocupante = ocupacionPorNivel.get(lvl)
              const isOccupied = Boolean(ocupante)
              const isSelected = nivelPosicion === lvl
              const labelNivel =
                lvl === 1
                  ? 'Nivel 1 (Fondo de fosa)'
                  : lvl === 2
                  ? 'Nivel 2 (Nivel medio)'
                  : 'Nivel 3 (Nivel superior / Superficie)'

              return (
                <div
                  key={lvl}
                  onClick={() => setNivelPosicion(lvl)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isOccupied
                      ? isSelected
                        ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400'
                        : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                      : isSelected
                      ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500 shadow-xs'
                      : 'bg-white border-outline-variant hover:border-emerald-400 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? isOccupied
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                          : 'border border-outline-variant bg-surface'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]">check</span>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-on-surface">
                          {labelNivel}
                        </span>
                        {isOccupied ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="material-symbols-outlined text-[11px]">lock</span>
                            <span>OCUPADO</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>
                            <span>DISPONIBLE</span>
                          </span>
                        )}
                        {isSelected && !isOccupied && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-700 text-white">
                            NIVEL ELEGIDO
                          </span>
                        )}
                        {isSelected && isOccupied && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-700 text-white">
                            SOBRESCRIBIR / REDUCCIÓN
                          </span>
                        )}
                      </div>

                      {isOccupied && ocupante ? (
                        <div className="text-[11px] text-slate-700 font-medium truncate">
                          <span className="font-semibold text-slate-900">
                            Difunto: {ocupante.nombre_difunto}
                          </span>
                          {ocupante.dni_difunto && (
                            <span className="text-slate-500 font-mono text-[10px] ml-1.5">
                              (DNI {ocupante.dni_difunto})
                            </span>
                          )}
                          <span className="text-slate-500 text-[10px] ml-1.5">
                            · Inhumado: {ocupante.fecha_inhumacion?.slice(0, 10)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800">
                          Espacio libre. Clic para asignar féretro en este nivel.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      Nivel {lvl}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Aviso si todos los niveles están ocupados */}
          {difuntosEnParcela.length >= capacidadFosa && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
              <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
                warning
              </span>
              <div>
                <span className="font-bold block">Fosa con capacidad completa</span>
                <span>
                  Todos los niveles tienen difuntos registrados. Solo asigne un nivel ocupado en caso de reducción de restos previa.
                </span>
              </div>
            </div>
          )}
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

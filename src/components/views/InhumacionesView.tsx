import React, { useState } from 'react'
import { Inhumacion, Parcela } from '../../types/database'
import { ActaInhumacionModal } from '../modals/ActaInhumacionModal'

interface InhumacionesViewProps {
  inhumaciones: Inhumacion[]
  parcelasDisponibles: Parcela[]
  onRegistrarInhumacion: (datos: Partial<Inhumacion>) => void
  onEliminarInhumacion?: (id: string) => void
  onVerParcelaEnCatastro?: (nomenclatura: string) => void
}

export const InhumacionesView: React.FC<InhumacionesViewProps> = ({
  inhumaciones,
  parcelasDisponibles,
  onRegistrarInhumacion,
  onEliminarInhumacion,
  onVerParcelaEnCatastro,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProtocol, setFilterProtocol] = useState<'all' | 'covid' | 'standard' | 'judicial'>('all')
  const [yearFilter, setYearFilter] = useState<string>('2026')
  const [actaModal, setActaModal] = useState<{
    isOpen: boolean
    inhumacion: Inhumacion | null
    folio: number
  }>({
    isOpen: false,
    inhumacion: null,
    folio: 148,
  })

  // Form State
  const [formParcela, setFormParcela] = useState('A-25-96')
  const [formDifunto, setFormDifunto] = useState('Vázquez Donoso, Marcelo Ignacio')
  const [formDni, setFormDni] = useState('17.432.890')
  const [formFechaDefuncion, setFormFechaDefuncion] = useState('2026-03-28')
  const [formFechaInhumacion, setFormFechaInhumacion] = useState('2026-03-30T10:30')
  const [formNivel, setFormNivel] = useState(2)
  const [formEsCovid, setFormEsCovid] = useState(true)
  const [formFunebrera, setFormFunebrera] = useState('Servicios Sociales Chamical - Mat. Fun. 104-A')
  const [formNotas, setFormNotas] = useState(
    'Acta médica certifica COVID-19 confirmado. Féretro metálico estanco de 1.2mm con faja judicial de sellado.'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDifunto.trim()) {
      alert('Por favor ingrese el nombre completo del difunto.')
      return
    }

    const nuevaInh: Partial<Inhumacion> = {
      nombre_difunto: formDifunto,
      fecha_fallecimiento: formFechaDefuncion,
      fecha_inhumacion: formFechaInhumacion,
      nivel_posicion: formNivel,
      es_covid: formEsCovid,
      causa_defuncion: formEsCovid ? 'COVID-19 / Falla Multiorgánica' : 'Paro Cardiorrespiratorio',
      empresa_funebrera: formFunebrera,
      parcela: {
        id: `parc-${Date.now()}`,
        nomenclatura: formParcela,
        capacidad_total: 3,
        espacios_ocupados: formNivel,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
      },
    }

    onRegistrarInhumacion(nuevaInh)
    alert(`Inhumación de ${formDifunto} registrada con éxito en el Libro Digital Oficial.`)
    setActaModal({
      isOpen: true,
      inhumacion: nuevaInh as Inhumacion,
      folio: inhumaciones.length + 148,
    })
  }

  // Filtrado
  const filtered = inhumaciones.filter((i) => {
    if (filterProtocol === 'covid' && !i.es_covid) return false
    if (filterProtocol === 'standard' && i.es_covid) return false

    if (yearFilter !== 'all') {
      if (yearFilter === 'covid_era') {
        const year = i.fecha_inhumacion?.slice(0, 4)
        if (year !== '2020' && year !== '2021' && year !== '2022' && !i.es_covid) return false
      } else {
        const year = i.fecha_inhumacion?.slice(0, 4)
        if (year !== yearFilter) return false
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const nom = i.nombre_difunto.toLowerCase()
      const parc = (typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || ''
      const causa = (i.causa_defuncion || '').toLowerCase()
      return nom.includes(q) || parc.toLowerCase().includes(q) || causa.includes(q)
    }
    return true
  })

  const totalCovid = inhumaciones.filter((i) => i.es_covid).length

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BREADCRUMBS & CONTEXT BANNER (Stitch Verbatim)                       */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-outline-variant/40">
        <div className="flex items-center gap-2 text-body-sm text-outline">
          <span className="hover:text-primary cursor-pointer flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">home</span> Registro Central
          </span>
          <span>/</span>
          <span className="text-on-surface font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">history_edu</span> Libro Digital de Inhumaciones
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>Libro Abierto Tomo XXXII - Folio {inhumaciones.length + 148}</span>
          </span>
          <span className="text-label-caps font-label-caps text-outline bg-surface-container px-2 py-0.5 rounded">
            Jurisdicción: Parque Municipal Este · Chamical
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* REGISTRATION CARD (Stitch Verbatim)                                   */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 shadow-[0_1px_2px_0_rgba(15,23,42,0.04)]">
        {/* Header of Form */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-outline-variant/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                note_add
              </span>
            </div>
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-bold tracking-tight">
                Registro de Nueva Inhumación en Fosa / Parcela
              </h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Completar los recaudos de defunción conforme a Ley Sanitaria 4.120 y Ordenanza Funeraria Municipal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label-caps font-label-caps text-outline uppercase bg-surface-container-low px-2 py-1 rounded">
              Expediente: #INH-2026-0891
            </span>
          </div>
        </div>

        {/* Form Layout aligned with schema.sql */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Parcela, Difunto, DNI */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Parcela Destino con autocompletado y validación */}
            <div className="md:col-span-4 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface flex items-center justify-between">
                <span>
                  Parcela Destino (Predictivo Catastral) <span className="text-error">*</span>
                </span>
                <span className="text-emerald-700 font-code-cadastral text-[11px] font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span> DISPONIBLE
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formParcela}
                  onChange={(e) => setFormParcela(e.target.value)}
                  className="w-full h-[36px] px-3 font-code-cadastral text-code-cadastral bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none uppercase font-semibold text-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onVerParcelaEnCatastro) onVerParcelaEnCatastro(formParcela)
                  }}
                  title="Seleccionar en plano catastral"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-[11px] font-label-caps bg-surface-container-low text-primary rounded hover:bg-surface-container flex items-center gap-1 border border-outline-variant/60"
                >
                  <span className="material-symbols-outlined text-[14px]">map</span> Plano
                </button>
              </div>
              <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 mt-0.5">
                Capacidad: <strong>Nivel {formNivel} libre</strong> de 3 niveles en fosa común/familiar.
              </p>
            </div>

            {/* Nombre Completo del Difunto */}
            <div className="md:col-span-5 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Nombre Completo del Difunto (nombre_difunto) <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formDifunto}
                onChange={(e) => setFormDifunto(e.target.value)}
                placeholder="Ej. Gómez Miranda, Roberto Carlos"
                className="w-full h-[36px] px-3 text-body-md font-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
              />
              <span className="text-[10px] text-outline">Identidad cotejada con acta RENAPER / Registro Civil.</span>
            </div>

            {/* DNI del Fallecido */}
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                DNI del Fallecido <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formDni}
                onChange={(e) => setFormDni(e.target.value)}
                placeholder="Ej. 17.432.890"
                className="w-full h-[36px] px-3 font-code-cadastral text-code-cadastral bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
              />
              <span className="text-[10px] text-outline">Cédula de Identidad / Matrícula</span>
            </div>
          </div>

          {/* Row 2: Fechas, Nivel en Fosa */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Fecha de Defunción */}
            <div className="md:col-span-3 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Fecha de Defunción <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formFechaDefuncion}
                  onChange={(e) => setFormFechaDefuncion(e.target.value)}
                  className="w-full h-[36px] px-3 text-body-md font-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
                />
              </div>
            </div>

            {/* Fecha y Hora de Inhumación */}
            <div className="md:col-span-4 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Fecha y Hora de Inhumación (fecha_inhumacion) <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={formFechaInhumacion}
                  onChange={(e) => setFormFechaInhumacion(e.target.value)}
                  className="w-full h-[36px] px-3 text-body-md font-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
                />
              </div>
            </div>

            {/* Selector de Nivel Ocupado en la Fosa (Stitch Verbatim) */}
            <div className="md:col-span-5 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Nivel Asignado en Fosa / Panteón <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 h-[36px]">
                <button
                  type="button"
                  onClick={() => setFormNivel(1)}
                  className={`rounded flex items-center justify-center px-1 text-[11px] font-medium transition-all ${
                    formNivel === 1
                      ? 'border-2 border-primary bg-primary/5 text-primary font-semibold shadow-xs'
                      : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Nivel 1 (Base)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormNivel(2)}
                  className={`rounded flex items-center justify-center px-1 text-[11px] font-semibold transition-all ${
                    formNivel === 2
                      ? 'border-2 border-primary bg-primary/5 text-primary shadow-xs'
                      : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_box
                    </span>
                    <span>Niv. 2 (Libre)</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormNivel(3)}
                  className={`rounded flex items-center justify-center px-1 text-[11px] font-medium transition-all ${
                    formNivel === 3
                      ? 'border-2 border-primary bg-primary/5 text-primary font-semibold shadow-xs'
                      : 'border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Niv. 3 (Superior)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Biosecurity Banner & COVID Switch (Prominent Violet Badge Stitch Verbatim) */}
          <div className="p-3 bg-[#F5F3FF] border-2 border-[#7C3AED] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded bg-[#7C3AED] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  biotech
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded bg-[#7C3AED] text-white uppercase font-label-caps">
                    Alerta Sanitaria Biosegura
                  </span>
                  <label
                    htmlFor="check-covid"
                    className="text-body-md font-bold text-[#5B21B6] cursor-pointer select-none"
                  >
                    [X] Fallecido por COVID-19 / Protocolo Especial Sanitario (es_covid)
                  </label>
                </div>
                <p className="text-body-sm text-[#5B21B6] mt-0.5">
                  Obligatoriedad: Féretro herméticamente sellado de fábrica con soldadura de plomo/cinc, desinfección
                  Nivel IV y no apertura de tapa mortuoria.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                id="check-covid"
                type="checkbox"
                checked={formEsCovid}
                onChange={(e) => setFormEsCovid(e.target.checked)}
                className="w-5 h-5 rounded text-[#7C3AED] border-[#7C3AED] focus:ring-[#7C3AED] focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="check-covid" className="text-label-caps font-label-caps text-[#5B21B6] font-semibold cursor-pointer">
                Protocolo Activado
              </label>
            </div>
          </div>

          {/* Row 4: Empresa Fúnebre y Notas Sanitarias */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Empresa Fúnebre Interviniente */}
            <div className="md:col-span-5 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Empresa Fúnebre Interviniente <span className="text-error">*</span>
              </label>
              <select
                value={formFunebrera}
                onChange={(e) => setFormFunebrera(e.target.value)}
                className="w-full h-[36px] px-3 text-body-md font-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
              >
                <option value="Servicios Sociales Chamical - Mat. Fun. 104-A">
                  Servicios Sociales Chamical - Mat. Fun. 104-A
                </option>
                <option value="Cochería La Rioja Integral - Mat. Fun. 042-C">
                  Cochería La Rioja Integral - Mat. Fun. 042-C
                </option>
                <option value="Empresa Fúnebre San Pedro - Mat. Fun. 018-B">
                  Empresa Fúnebre San Pedro - Mat. Fun. 018-B
                </option>
                <option value="Traslado de Oficio Municipal de Salud">
                  Traslado de Oficio Municipal de Salud
                </option>
              </select>
              <span className="text-[10px] text-outline">
                Vehículo fúnebre habilitado con cabina estanca de desinfección.
              </span>
            </div>

            {/* Notas Sanitarias / Disposiciones Funerarias */}
            <div className="md:col-span-7 flex flex-col gap-1">
              <label className="text-label-caps font-label-caps text-on-surface">
                Notas Sanitarias / Disposiciones Funerarias
              </label>
              <input
                type="text"
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                placeholder="Ej. Certificado de defunción N° 8491-B con aislamiento preventivo"
                className="w-full h-[36px] px-3 text-body-md font-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-on-surface"
              />
              <span className="text-[10px] text-outline">
                Anotaciones legibles y transferibles a la orden de exhumación o traslado.
              </span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="pt-3 border-t border-outline-variant/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-body-sm text-outline">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
              <span>Validación de firma digital del Registro Civil habilitada.</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActaModal({
                    isOpen: true,
                    inhumacion: {
                      id: 'demo',
                      nombre_difunto: formDifunto,
                      fecha_fallecimiento: formFechaDefuncion,
                      fecha_inhumacion: formFechaInhumacion,
                      nivel_posicion: formNivel,
                      es_covid: formEsCovid,
                      causa_defuncion: formEsCovid ? 'COVID-19' : 'Causa Natural',
                      empresa_funebrera: formFunebrera,
                      parcela: {
                        id: 'demo-p',
                        nomenclatura: formParcela,
                        capacidad_total: 3,
                        espacios_ocupados: formNivel,
                        estado: 'ocupada',
                        saldo_mantenimiento: 0,
                      },
                    } as Inhumacion,
                    folio: 148,
                  })
                }}
                className="h-[36px] px-3 bg-surface-container-lowest border border-outline-variant text-on-surface font-title-md text-body-sm rounded hover:bg-surface-container-low transition-colors active:scale-[0.99] flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Emitir Acta / Constancia de Sepelio</span>
              </button>
              <button
                type="submit"
                className="h-[36px] px-4 bg-primary text-surface-container-lowest font-title-md text-body-sm rounded hover:bg-secondary transition-colors active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm font-semibold w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Registrar Inhumación en Parcela</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ===================================================================== */}
      {/* HISTORICAL RECORD & SEARCH (Bottom Region Stitch Verbatim)             */}
      {/* ===================================================================== */}
      <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0_1px_2px_0_rgba(15,23,42,0.04)] overflow-hidden">
        {/* Tabbed Year Selector & Header Filters */}
        <div className="border-b border-outline-variant bg-surface-container-low/40 px-3 sm:px-4 pt-3 pb-0 flex flex-wrap items-end justify-between gap-3 overflow-hidden">
          {/* Year Tabs - Scrollable on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setYearFilter('2026')}
              className={`px-3 py-2 text-body-sm font-semibold rounded-t flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2026'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>Recientes / 2026</span>
              <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-[10px] rounded-full font-label-numeric">
                {inhumaciones.filter((i) => i.fecha_inhumacion?.startsWith('2026')).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('2025')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2025'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              2025
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('2024')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === '2024'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              2024
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('covid_era')}
              className={`px-3 py-2 text-body-sm font-semibold rounded-t transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                yearFilter === 'covid_era'
                  ? 'border-b-2 border-[#7C3AED] text-[#7C3AED] bg-surface-container-lowest'
                  : 'text-[#7C3AED] hover:bg-[#F5F3FF]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">coronavirus</span>
              <span>2020-2022 (Etapa COVID)</span>
            </button>
            <button
              type="button"
              onClick={() => setYearFilter('all')}
              className={`px-3 py-2 text-body-sm rounded-t transition-colors whitespace-nowrap shrink-0 ${
                yearFilter === 'all'
                  ? 'border-b-2 border-primary text-primary bg-surface-container-lowest font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Ver Archivo Completo
            </button>
          </div>

          {/* Total Metrics Counter */}
          <div className="flex items-center gap-3 pb-2 text-[12px] text-outline font-label-caps shrink-0">
            <span>
              Registradas:{' '}
              <strong className="text-on-surface font-label-numeric font-bold">{inhumaciones.length}</strong>
            </span>
            <span className="h-3 w-[1px] bg-outline-variant"></span>
            <span>
              COVID-19:{' '}
              <strong className="text-[#7C3AED] font-label-numeric font-bold">{totalCovid}</strong>
            </span>
          </div>
        </div>

        {/* Filter Sub-Toolbar */}
        <div className="p-3 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl w-full">
            {/* Search bar */}
            <div className="relative flex-1 min-w-0">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre de difunto o parcela..."
                className="w-full h-[34px] pl-8 pr-3 text-body-sm font-body-sm bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary/30 outline-none"
              />
            </div>
            {/* Sanity Filter Quick Select */}
            <select
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value as any)}
              className="h-[34px] px-2.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded text-on-surface-variant focus:border-secondary outline-none shrink-0"
            >
              <option value="all">Todos los Protocolos</option>
              <option value="covid">Solo Protocolo COVID-19</option>
              <option value="standard">Inhumación Estándar</option>
              <option value="judicial">Intervención Judicial / Morgue</option>
            </select>
          </div>

          {/* Quick export tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              title="Exportar Libro en PDF Oficial"
              className="h-[32px] px-2.5 bg-surface-container-lowest border border-outline-variant rounded text-body-sm text-on-surface-variant hover:bg-surface-container-low flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Exportar Folio</span>
            </button>
          </div>
        </div>

        {/* MOBILE VIEW (< md): Responsive Inhumaciones Cards */}
        <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-outline text-sm">No se encontraron actas de inhumación.</div>
          ) : (
            filtered.map((inh, index) => {
              const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
              const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
              const hora = inh.fecha_inhumacion?.includes('T')
                ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                : '10:30 hs'

              return (
                <div
                  key={inh.id}
                  className={`p-3 rounded-lg border flex flex-col gap-2.5 ${
                    inh.es_covid
                      ? 'bg-[#F5F3FF]/40 border-[#DDD6FE]'
                      : 'bg-surface-container-low/40 border-outline-variant/70'
                  }`}
                >
                  {/* Card Header: Fecha, Hora, Protocolo Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-code-cadastral font-bold text-on-surface text-sm">
                        {fechaInh}
                      </span>
                      <span className="text-[11px] text-outline ml-1.5">{hora}</span>
                      <div className="text-[11px] font-code-cadastral text-outline">Acta #84{90 + index}-B</div>
                    </div>
                    {inh.es_covid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]">
                        <span className="material-symbols-outlined text-[12px]">coronavirus</span>
                        <span>COVID-19</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="material-symbols-outlined text-[12px]">check_circle</span>
                        <span>Estándar</span>
                      </span>
                    )}
                  </div>

                  {/* Difunto */}
                  <div>
                    <div className="font-bold text-on-surface text-base">
                      {inh.nombre_difunto}
                    </div>
                    <div className="text-[12px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                      <span>Fosa:</span>
                      <span className="font-code-cadastral font-bold text-primary bg-surface px-1.5 py-0.5 rounded border border-outline-variant">
                        {parcNom || 'A-25-96'}
                      </span>
                      <span className="text-secondary font-semibold text-xs">[Nivel {inh.nivel_posicion || 1}]</span>
                    </div>
                  </div>

                  {/* Empresa fúnebre */}
                  <div className="text-xs text-outline flex items-center justify-between pt-1 border-t border-outline-variant/30">
                    <span className="truncate">{inh.empresa_funebrera || 'Servicios Sociales Chamical'}</span>
                    <span className="text-on-surface-variant shrink-0">Oficial: Lic. Albarracín</span>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-outline-variant/40 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActaModal({
                          isOpen: true,
                          inhumacion: inh,
                          folio: 148 + index,
                        })
                      }}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[15px]">print</span>
                      <span>Acta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onVerParcelaEnCatastro && parcNom) {
                          onVerParcelaEnCatastro(parcNom)
                        }
                      }}
                      className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-secondary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                    >
                      <span className="material-symbols-outlined text-[15px]">domain</span>
                      <span>Catastro</span>
                    </button>

                    {onEliminarInhumacion && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Confirma anular o eliminar el acta de ${inh.nombre_difunto}?`)) {
                            onEliminarInhumacion(inh.id)
                          }
                        }}
                        className="h-8 w-8 rounded bg-red-50 hover:bg-red-100 text-error inline-flex items-center justify-center border border-red-200"
                        title="Eliminar Registro"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* DESKTOP VIEW (>= md): Institutional Data Grid */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-outline-variant text-[11px] font-label-caps uppercase text-outline tracking-wider select-none">
                <th className="py-2 px-3">Fecha Inhumación</th>
                <th className="py-2 px-3">Difunto / DNI</th>
                <th className="py-2 px-3">Parcela y Nivel</th>
                <th className="py-2 px-3">Empresa Fúnebre</th>
                <th className="py-2 px-3">Indicador Sanitario</th>
                <th className="py-2 px-3">Oficial de Registro</th>
                <th className="py-2 px-3 text-right">Acciones Registrales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-body-md font-body-md">
              {filtered.map((inh, index) => {
                const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
                const fechaInh = inh.fecha_inhumacion?.slice(0, 10) || '2026-03-30'
                const hora = inh.fecha_inhumacion?.includes('T')
                  ? `${inh.fecha_inhumacion.split('T')[1].slice(0, 5)} hs`
                  : '10:30 hs'

                return (
                  <tr key={inh.id} className="hover:bg-surface-container-low transition-colors h-[40px]">
                    {/* Fecha */}
                    <td className="py-1 px-3 font-code-cadastral text-code-cadastral whitespace-nowrap text-on-surface">
                      <div className="font-semibold">{fechaInh}</div>
                      <div className="text-[10px] text-outline">{hora}</div>
                    </td>

                    {/* Difunto / DNI */}
                    <td className="py-1 px-3">
                      <div className={`font-semibold ${inh.es_covid ? 'text-primary' : 'text-on-surface'}`}>
                        {inh.nombre_difunto}
                      </div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        Acta #84{90 + index}-B
                      </div>
                    </td>

                    {/* Parcela y Nivel */}
                    <td className="py-1 px-3 whitespace-nowrap">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-on-surface bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/60">
                        {parcNom || 'A-25-96'}
                      </span>
                      <span className="text-[11px] text-secondary font-medium ml-1">
                        [Nivel {inh.nivel_posicion || 1}]
                      </span>
                    </td>

                    {/* Empresa Fúnebre */}
                    <td className="py-1 px-3 text-body-sm text-on-surface-variant">
                      {inh.empresa_funebrera || 'Servicios Sociales Chamical'}
                    </td>

                    {/* Indicador Sanitario (Violet COVID vs Emerald Standard) */}
                    <td className="py-1 px-3 whitespace-nowrap">
                      {inh.es_covid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE]">
                          <span
                            className="material-symbols-outlined text-[13px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            coronavirus
                          </span>
                          <span>Protocolo COVID-19</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Inhumación Estándar</span>
                        </span>
                      )}
                    </td>

                    {/* Oficial de Registro */}
                    <td className="py-1 px-3 text-body-sm text-on-surface-variant whitespace-nowrap">
                      Lic. R. Albarracín
                    </td>

                    {/* Acciones */}
                    <td className="py-1 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActaModal({
                              isOpen: true,
                              inhumacion: inh,
                              folio: 148 + index,
                            })
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
                          title="Imprimir Constancia de Sepelio"
                        >
                          <span className="material-symbols-outlined text-[16px]">print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onVerParcelaEnCatastro && parcNom) {
                              onVerParcelaEnCatastro(parcNom)
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-secondary hover:bg-surface-container transition-colors"
                          title="Ver Parcela en Catastro"
                        >
                          <span className="material-symbols-outlined text-[16px]">domain</span>
                        </button>
                        {onEliminarInhumacion && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Confirma anular o eliminar el acta de ${inh.nombre_difunto}?`)) {
                                onEliminarInhumacion(inh.id)
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded text-outline hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Eliminar Registro"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Acta Oficial */}
      {actaModal.inhumacion && (
        <ActaInhumacionModal
          isOpen={actaModal.isOpen}
          onClose={() => setActaModal({ ...actaModal, isOpen: false })}
          inhumacion={actaModal.inhumacion}
          folioNumber={actaModal.folio}
        />
      )}
    </div>
  )
}

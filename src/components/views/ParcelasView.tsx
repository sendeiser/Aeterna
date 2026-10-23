import React, { useState, useEffect } from 'react'
import { Parcela, Inhumacion } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { reactivarParcelaStandby, liberarParcelaStandby } from '../../services/dataService'

interface ParcelasViewProps {
  parcelas: Parcela[]
  inhumaciones?: Inhumacion[]
  onCobrarQR: (parcela: Parcela) => void
  onSaveParcela: (parcela: Partial<Parcela>) => void
  onDeleteParcela?: (id: string) => void
  onNuevaInhumacionParaParcela?: (nomenclatura: string) => void
  onReactivarParcela?: (parcela: Parcela) => void
  onLiberarParcela?: (parcela: Parcela) => void
  isOnline: boolean
}

export const ParcelasView: React.FC<ParcelasViewProps> = ({
  parcelas,
  inhumaciones = [],
  onCobrarQR,
  onSaveParcela,
  onDeleteParcela,
  onNuevaInhumacionParaParcela,
  onReactivarParcela,
  onLiberarParcela,
  isOnline,
}) => {
  const [filterSector, setFilterSector] = useState<'todos' | 'A' | 'E' | 'SALINAS' | 'mora' | 'standby'>('todos')
  const [filterTitularVital, setFilterTitularVital] = useState<'todos' | 'vivo' | 'fallecido'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileView, setMobileView] = useState<'lista' | 'formulario'>('lista')
  const [pageSize, setPageSize] = useState<'todas' | 50 | 100>('todas')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(
    parcelas.length > 0 ? parcelas[0].id : null
  )

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    sector: 'A',
    manzana: '25',
    numero: '96',
    titularNombre: 'Fernández, Héctor Osvaldo',
    titularDni: '20-18452981-4',
    titularTelefono: '3826 44-8921',
    titularDireccion: 'Av. San Martín 452, B° Centro, Chamical',
    titularEstadoVital: 'vivo' as 'vivo' | 'fallecido',
    capacidad: 3,
    estado: 'ocupada' as 'disponible' | 'ocupada' | 'en_mora' | 'baja' | 'standby',
    saldo: 36000,
    notas: 'Registro regularizado Parcelas Chamical',
  })

  // Cargar parcela seleccionada en el formulario
  const handleSelectParcela = (p: Parcela) => {
    setSelectedParcelaId(p.id)
    setFormData({
      id: p.id,
      sector: p.sector_id || 'A',
      manzana: p.manzana_fila || '',
      numero: p.numero_parcela ? String(p.numero_parcela) : '',
      titularNombre: p.titular?.nombre_completo || '',
      titularDni: p.titular?.dni || '',
      titularTelefono: (p.titular?.telefono || '').replace('+54 9 ', ''),
      titularDireccion: p.titular?.direccion || '',
      titularEstadoVital: p.titular?.estado_vital || (p.titular?.estado_titular === 'fallecido' ? 'fallecido' : 'vivo'),
      capacidad: p.capacidad_total || 3,
      estado: (p.estado === 'reservada' ? 'disponible' : p.estado) as any,
      saldo: p.saldo_mantenimiento || 0,
      notas: p.notas || '',
    })
  }

  const handleResetForm = () => {
    setSelectedParcelaId(null)
    setFormData({
      id: '',
      sector: 'A',
      manzana: '01',
      numero: '01',
      titularNombre: '',
      titularDni: '',
      titularTelefono: '',
      titularDireccion: 'Av. San Martín, Chamical',
      titularEstadoVital: 'vivo',
      capacidad: 3,
      estado: 'disponible',
      saldo: 0,
      notas: '',
    })
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.manzana || !formData.numero) {
      alert('Por favor complete sector, manzana y número de parcela.')
      return
    }

    const nomenclatura = `${formData.sector}-${formData.manzana}-${formData.numero}`
    onSaveParcela({
      id: formData.id || undefined,
      nomenclatura,
      sector_id: formData.sector,
      manzana_fila: formData.manzana,
      numero_parcela: String(formData.numero),
      capacidad_total: formData.capacidad,
      espacios_ocupados: formData.estado === 'ocupada' || formData.estado === 'en_mora' ? 1 : 0,
      estado: formData.estado as any,
      saldo_mantenimiento: formData.saldo,
      notas: formData.notas,
      titular: formData.titularNombre
        ? {
            id: `tit-${Date.now()}`,
            nombre_completo: formData.titularNombre,
            dni: formData.titularDni || null,
            telefono: formData.titularTelefono ? `+54 9 ${formData.titularTelefono}` : null,
            direccion: formData.titularDireccion || null,
            estado_titular: formData.titularEstadoVital === 'fallecido' ? 'fallecido' : 'activo',
            estado_vital: formData.titularEstadoVital,
          }
        : undefined,
    })

    alert(`Parcela ${nomenclatura} guardada con éxito en Registro Municipal de Parcelas.`)
  }

  // Acciones administrativas de stand-by
  const handleReactivar = async (parcela: Parcela) => {
    if (confirm(`¿Confirma reactivar la parcela ${parcela.nomenclatura} (${parcela.titular?.nombre_completo || 'Titular'}) tras regularizar el pago?`)) {
      try {
        const updated = await reactivarParcelaStandby(parcela.id)
        onSaveParcela(updated)
        if (onReactivarParcela) onReactivarParcela(updated)
        alert(`Parcela ${parcela.nomenclatura} reactivada con éxito. Titularidad restablecida.`)
      } catch (e: any) {
        alert(`Error al reactivar: ${e.message}`)
      }
    }
  }

  const handleLiberar = async (parcela: Parcela) => {
    if (
      confirm(
        `⚠️ ATENCIÓN: ¿Confirma dar de baja y liberar la titularidad de la parcela ${parcela.nomenclatura}?\n\nEl titular actual (${parcela.titular?.nombre_completo || 'Titular'}) será archivado al registro histórico y la parcela quedará Disponible para nueva asignación municipal.`
      )
    ) {
      try {
        const updated = await liberarParcelaStandby(
          parcela.id,
          'Caducidad administrativa municipal por mora superior a 3 años'
        )
        onSaveParcela(updated)
        if (onLiberarParcela) onLiberarParcela(updated)
        alert(`Parcela ${parcela.nomenclatura} liberada. Estado actual: Disponible.`)
      } catch (e: any) {
        alert(`Error al liberar: ${e.message}`)
      }
    }
  }

  // Filtrado de parcelas
  const filteredParcelas = parcelas.filter((p) => {
    if (filterSector !== 'todos') {
      if (filterSector === 'mora') {
        if (p.estado !== 'en_mora' && (p.saldo_mantenimiento || 0) <= 0) return false
      } else if (filterSector === 'standby') {
        if (p.estado !== 'standby') return false
      } else {
        if (p.sector_id !== filterSector) return false
      }
    }

    if (filterTitularVital !== 'todos') {
      if (!p.titular) return false
      const esFallecido = p.titular.estado_vital === 'fallecido' || p.titular.estado_titular === 'fallecido'
      if (filterTitularVital === 'fallecido' && !esFallecido) return false
      if (filterTitularVital === 'vivo' && esFallecido) return false
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const nom = p.nomenclatura.toLowerCase()
      const titular = (p.titular?.nombre_completo || '').toLowerCase()
      const dni = (p.titular?.dni || '').toLowerCase()
      const dir = (p.titular?.direccion || '').toLowerCase()
      return nom.includes(q) || titular.includes(q) || dni.includes(q) || dir.includes(q)
    }

    return true
  })

  // Reset de página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSector, filterTitularVital, searchTerm, pageSize])

  const totalPages = pageSize === 'todas' ? 1 : Math.ceil(filteredParcelas.length / pageSize)
  const displayedParcelas =
    pageSize === 'todas'
      ? filteredParcelas
      : filteredParcelas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Selected Parcela Object
  const selectedParcela = parcelas.find((p) => p.id === selectedParcelaId) || filteredParcelas[0] || parcelas[0]

  // Difuntos asociados a la parcela seleccionada
  const difuntosEnParcela = inhumaciones.filter((inh) => {
    if (!selectedParcela) return false
    const inhParc = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
    return inhParc === selectedParcela.nomenclatura
  })

  // Counters
  const countSecA = parcelas.filter((p) => p.sector_id === 'A').length
  const countSecE = parcelas.filter((p) => p.sector_id === 'E').length
  const countSalinas = parcelas.filter((p) => p.sector_id === 'SALINAS').length
  const countMora = parcelas.filter((p) => p.estado === 'en_mora' || (p.saldo_mantenimiento || 0) > 0).length
  const countStandby = parcelas.filter((p) => p.estado === 'standby').length

  const previewNomenclatura = `${formData.sector}-${formData.manzana || '00'}-${formData.numero || '00'}`

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Mobile Switcher Banner (<lg) */}
      <div className="col-span-12 lg:hidden flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant shadow-xs">
        <button
          type="button"
          onClick={() => setMobileView('lista')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mobileView === 'lista'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">list_alt</span>
          <span>Padrón Parcelas ({filteredParcelas.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('formulario')}
          className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mobileView === 'formulario'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{formData.id ? 'edit_note' : 'add_circle'}</span>
          <span>{formData.id ? 'Ficha / Editar' : 'Nueva Parcela'}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* LEFT COLUMN: Formulario de Carga Ágil de Parcela (Cols 5 en Stitch)       */}
      {/* ========================================================================= */}
      <section className={`col-span-12 lg:col-span-5 flex-col gap-3 ${mobileView === 'formulario' ? 'flex' : 'hidden lg:flex'}`}>
        <div className="bg-surface-container-lowest rounded border border-outline-variant p-4 shadow-sm flex flex-col justify-between">
          {/* Card Header with Supabase Live Sync Indicator */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]" data-icon="edit_note">
                edit_note
              </span>
              <h2 className="text-headline-sm font-headline-sm text-on-surface font-semibold">
                {formData.id ? 'Edición de Parcela Catastral' : 'Registro / Nueva Parcela'}
              </h2>
            </div>
            {/* Supabase Synced Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium tracking-wide">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span>{isOnline ? 'Supabase Conectado' : 'Almacenamiento Local'}</span>
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5 mt-3">
            {/* SECCIÓN: GRUPO TITULAR */}
            <fieldset className="border border-outline-variant/70 rounded p-3 bg-surface/50">
              <legend className="text-label-caps font-label-caps text-outline uppercase px-1.5 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" data-icon="person">
                  person
                </span>
                <span>Datos del Titular Responsable</span>
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-1">
                {/* Nombre y Apellido con autocompletado */}
                <div className="md:col-span-2">
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                    Nombre y Apellido del Titular <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-titular"
                      type="text"
                      value={formData.titularNombre}
                      onChange={(e) => setFormData({ ...formData, titularNombre: e.target.value })}
                      placeholder="Buscar por apellido o ingresar nuevo..."
                      className="w-full h-9 px-3 pr-8 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                    <span
                      className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]"
                      data-icon="person_search"
                    >
                      person_search
                    </span>
                  </div>
                </div>

                {/* DNI / CUIT */}
                <div>
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                    DNI / CUIT <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.titularDni}
                    onChange={(e) => setFormData({ ...formData, titularDni: e.target.value })}
                    placeholder="20-18452981-4"
                    className="w-full h-9 px-3 font-code-cadastral text-code-cadastral bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                  />
                </div>

                {/* Teléfono / WhatsApp con prefijo +54 9 */}
                <div>
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 h-9 rounded-l border border-r-0 border-outline-variant bg-surface-container-low text-body-sm font-code-cadastral text-outline select-none whitespace-nowrap flex-shrink-0">
                      +54 9
                    </span>
                    <input
                      type="tel"
                      value={formData.titularTelefono}
                      onChange={(e) => setFormData({ ...formData, titularTelefono: e.target.value })}
                      placeholder="3826 44-8921"
                      className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded-r focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Domicilio en Chamical */}
                <div className="md:col-span-2">
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                    Domicilio en Chamical / Localidad
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.titularDireccion}
                      onChange={(e) => setFormData({ ...formData, titularDireccion: e.target.value })}
                      placeholder="Av. San Martín 452, B° Centro, Chamical"
                      className="w-full h-9 pl-8 pr-3 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                    <span
                      className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]"
                      data-icon="location_on"
                    >
                      location_on
                    </span>
                  </div>
                </div>

                {/* Condición Vital del Titular */}
                <div className="md:col-span-2 pt-1 flex items-center justify-between bg-surface-container-low p-2 rounded border border-outline-variant/60">
                  <span className="text-body-sm font-medium text-on-surface">
                    Condición Vital del Titular:
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-body-sm cursor-pointer text-on-surface">
                      <input
                        type="radio"
                        name="titularVital"
                        value="vivo"
                        checked={formData.titularEstadoVital === 'vivo'}
                        onChange={() => setFormData({ ...formData, titularEstadoVital: 'vivo' })}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-emerald-800 font-semibold text-xs">Vivo</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-body-sm cursor-pointer text-on-surface">
                      <input
                        type="radio"
                        name="titularVital"
                        value="fallecido"
                        checked={formData.titularEstadoVital === 'fallecido'}
                        onChange={() => setFormData({ ...formData, titularEstadoVital: 'fallecido' })}
                        className="text-slate-700 focus:ring-slate-700"
                      />
                      <span className="text-slate-700 font-semibold text-xs">Fallecido</span>
                    </label>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* SECCIÓN: GRUPO PARCELA Y CATASTRO */}
            <fieldset className="border border-outline-variant/70 rounded p-3 bg-surface/50">
              <legend className="text-label-caps font-label-caps text-outline uppercase px-1.5 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" data-icon="grid_4x4">
                  grid_4x4
                </span>
                <span>Catastro y Fosa (schema.sql)</span>
              </legend>
              <div className="space-y-3 mt-1">
                {/* Selector desplegable de Sector */}
                <div>
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                    Sector del Parque <span className="text-error">*</span>
                  </label>
                  <select
                    id="select-sector"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full h-9 px-3 text-body-md bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                  >
                    <option value="A">Sector A (Tradicional)</option>
                    <option value="E">Sector E (Parque Central)</option>
                    <option value="SALINAS">Sector Salinas (Panteón)</option>
                  </select>
                </div>

                {/* Fila/Manzana + Parcela + Nomenclatura Preview */}
                <div className="grid grid-cols-12 gap-2.5 items-end">
                  <div className="col-span-3">
                    <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                      Fila / Manz.
                    </label>
                    <input
                      id="input-fila"
                      type="text"
                      value={formData.manzana}
                      onChange={(e) => setFormData({ ...formData, manzana: e.target.value })}
                      placeholder="25"
                      className="w-full h-9 px-3 font-code-cadastral text-code-cadastral text-center bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                      N° Parcela
                    </label>
                    <input
                      id="input-parcela"
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="96"
                      className="w-full h-9 px-3 font-code-cadastral text-code-cadastral text-center bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                    />
                  </div>
                  {/* Dynamic Nomenclature Box (Stitch Verbatim) */}
                  <div className="col-span-6 bg-surface-container border border-primary/20 rounded p-1.5 flex flex-col justify-center items-center h-9">
                    <span className="text-[10px] text-primary uppercase font-bold tracking-wider leading-none">
                      Parcela Oficial
                    </span>
                    <span
                      id="preview-nomenclatura"
                      className="font-code-cadastral text-[14px] font-bold text-primary tracking-wide"
                    >
                      {previewNomenclatura}
                    </span>
                  </div>
                </div>

                {/* Capacidad Total de la Fosa (Segmented Control Stitch Verbatim) */}
                <div>
                  <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1.5">
                    Capacidad Total de la Fosa (Niveles Superpuestos)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-high rounded border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, capacidad: 1 })}
                      className={`flex items-center justify-center py-1.5 px-2 rounded cursor-pointer transition-all text-body-sm ${
                        formData.capacidad === 1
                          ? 'bg-white text-primary font-semibold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span>1 Nivel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, capacidad: 2 })}
                      className={`flex items-center justify-center py-1.5 px-2 rounded cursor-pointer transition-all text-body-sm ${
                        formData.capacidad === 2
                          ? 'bg-white text-primary font-semibold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span>2 Niveles</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, capacidad: 3 })}
                      className={`flex items-center justify-center py-1.5 px-2 rounded cursor-pointer transition-all text-body-sm ${
                        formData.capacidad === 3
                          ? 'bg-white text-primary font-semibold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="truncate">3 Niv. (Familiar)</span>
                    </button>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* SECCIÓN: ESTADO DE LA PARCELA & SALDO */}
            <fieldset className="border border-outline-variant/70 rounded p-3 bg-surface/50">
              <legend className="text-label-caps font-label-caps text-outline uppercase px-1.5 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" data-icon="flag">
                  flag
                </span>
                <span>Estado Administrativo & Aranceles</span>
              </legend>
              {/* Badges de Estado Seleccionables */}
              <div className="mb-3">
                <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1.5">
                  Estado Operativo Actual
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, estado: 'disponible' })}
                    className={`py-1 px-2 rounded text-body-sm font-medium transition-all text-center ${
                      formData.estado === 'disponible'
                        ? 'border-2 border-emerald-600 bg-emerald-600 text-white shadow-sm font-semibold'
                        : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary'
                    }`}
                  >
                    Disponible
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, estado: 'ocupada' })}
                    className={`py-1 px-2 rounded text-body-sm font-medium transition-all text-center ${
                      formData.estado === 'ocupada'
                        ? 'border-2 border-primary bg-primary text-on-primary shadow-sm font-semibold'
                        : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary'
                    }`}
                  >
                    Ocupada
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, estado: 'en_mora' })}
                    className={`py-1 px-2 rounded text-body-sm font-medium transition-all text-center ${
                      formData.estado === 'en_mora'
                        ? 'border-2 border-amber-600 bg-amber-600 text-white shadow-sm font-semibold'
                        : 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    En Mora
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, estado: 'baja' })}
                    className={`py-1 px-2 rounded text-body-sm font-medium transition-all text-center ${
                      formData.estado === 'baja'
                        ? 'border-2 border-red-600 bg-red-600 text-white shadow-sm font-semibold'
                        : 'border border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
                    }`}
                  >
                    Baja / Litigio
                  </button>
                </div>
              </div>

              {/* Saldo de Mantenimiento ($ ARS) */}
              <div>
                <label className="block text-body-sm font-body-sm font-medium text-on-surface-variant mb-1">
                  Saldo de Mantenimiento Cuatrimestral ($ ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-code-cadastral text-outline font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.saldo}
                    onChange={(e) => setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 pl-7 pr-20 font-code-cadastral text-headline-sm font-semibold text-primary bg-white border border-outline-variant rounded focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none"
                  />
                  <span
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-body-sm px-1.5 py-0.5 rounded border ${
                      formData.saldo <= 0
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-amber-700 bg-amber-50 border-amber-200'
                    }`}
                  >
                    {formData.saldo <= 0 ? 'Al día' : 'En Mora'}
                  </span>
                </div>
              </div>
            </fieldset>

            {/* Bottom Actions Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-outline-variant">
              {formData.id && onDeleteParcela ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Confirma eliminar o dar de baja la parcela ${formData.sector}-${formData.manzana}-${formData.numero}?`
                      )
                    ) {
                      onDeleteParcela(formData.id)
                      handleResetForm()
                    }
                  }}
                  className="h-9 px-3 rounded text-body-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]" data-icon="delete">
                    delete
                  </span>
                  <span>Dar de Baja</span>
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="h-9 px-4 rounded text-body-md font-medium bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors active:scale-[0.99]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded text-body-md font-semibold bg-primary hover:bg-secondary text-on-primary transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]" data-icon="save">
                    save
                  </span>
                  <span>{formData.id ? 'Actualizar Parcela' : 'Guardar Parcela'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Listado y Catastro con Vista Rápida (Cols 7 en Stitch)      */}
      {/* ========================================================================= */}
      <section className={`col-span-12 lg:col-span-7 flex-col gap-3 ${mobileView === 'lista' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Search & Filter Toolbar */}
        <div className="bg-surface-container-lowest rounded border border-outline-variant p-3 shadow-sm flex flex-col gap-2.5">
          {/* Filter Tabs / Sector Chips - Scrollable on mobile */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 overflow-x-auto custom-scroll pb-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterSector('todos')}
                className={`px-3 py-1 rounded text-body-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'todos'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Todos ({parcelas.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('A')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'A'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Sector A ({countSecA})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('E')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'E'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Sector E ({countSecE})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('SALINAS')}
                className={`px-3 py-1 rounded text-body-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'SALINAS'
                    ? 'bg-primary text-on-primary shadow-xs font-semibold'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                Salinas ({countSalinas})
              </button>
              <button
                type="button"
                onClick={() => setFilterSector('mora')}
                className={`px-3 py-1 rounded text-body-sm font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'mora'
                    ? 'border-amber-600 bg-amber-600 text-white font-semibold'
                    : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                En Mora ({countMora})
              </button>
              <button
                id="btn-filtro-sector-standby"
                type="button"
                onClick={() => setFilterSector('standby')}
                className={`px-3 py-1 rounded text-body-sm font-medium border whitespace-nowrap transition-colors shrink-0 ${
                  filterSector === 'standby'
                    ? 'border-rose-600 bg-rose-600 text-white font-semibold'
                    : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
                }`}
              >
                ⚠️ Stand-by (+3 años) ({countStandby})
              </button>
            </div>
            {/* Quick Counter Metric */}
            <span className="text-body-sm font-code-cadastral text-outline shrink-0">
              Total reg: {filteredParcelas.length} parcelas
            </span>
          </div>

          {/* Quick Search Cadastral Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline"
                data-icon="search"
              >
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por parcela (ej. A-25), apellido titular o DNI..."
                className="w-full h-9 pl-9 pr-3 text-body-md bg-surface-container-low border border-outline-variant rounded focus:border-secondary focus:bg-white focus:outline-none"
              />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="h-9 px-3 rounded border border-outline-variant bg-surface text-on-surface hover:bg-surface-container flex items-center gap-1 text-body-sm font-medium shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* Titular Vital Condition Filter */}
          <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/40 flex-wrap">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Condición Titular:
            </span>
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-outline-variant">
              <button
                id="btn-filtro-vital-todos"
                type="button"
                onClick={() => setFilterTitularVital('todos')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  filterTitularVital === 'todos'
                    ? 'bg-primary text-white shadow-xs font-semibold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                Todos
              </button>
              <button
                id="btn-filtro-vital-vivo"
                type="button"
                onClick={() => setFilterTitularVital('vivo')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  filterTitularVital === 'vivo'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Vivos</span>
              </button>
              <button
                id="btn-filtro-vital-fallecido"
                type="button"
                onClick={() => setFilterTitularVital('fallecido')}
                className={`px-2.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  filterTitularVital === 'fallecido'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Fallecidos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Parcel List / Interactive Data Grid & Mobile Cards */}
        <div className="bg-surface-container-lowest rounded border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
            <span className="text-label-caps font-label-caps text-outline uppercase font-semibold">
              Listado Catastral Dinámico
            </span>
            <span className="text-[11px] text-outline">
              {filteredParcelas.length} parcelas listadas
            </span>
          </div>

          {/* MOBILE VIEW (< md): Responsive Interactive Cards */}
          <div className="md:hidden divide-y divide-outline-variant/40 p-2.5 space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
            {displayedParcelas.map((p) => {
              const isSelected = p.id === selectedParcela?.id
              const ocupados = p.espacios_ocupados || (p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0)
              const totalNiveles = p.capacidad_total || 3

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectParcela(p)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2.5 ${
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-surface-container-low/40 border-outline-variant/70 hover:border-secondary/50'
                  }`}
                >
                  {/* Card Header: Nomenclatura, Sector, Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-code-cadastral font-bold text-primary text-base">
                          {p.nomenclatura}
                        </span>
                        <span className="text-[10px] text-outline font-medium px-1.5 py-0.5 rounded bg-surface border border-outline-variant">
                          Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id === 'A' ? 'A (Trad.)' : 'E (Parque)'}
                        </span>
                      </div>
                      <div className="text-[11px] text-outline">
                        Fila {p.manzana_fila || '0'} • Parcela #{p.numero_parcela || '1'}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        p.estado === 'standby'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : p.estado === 'ocupada'
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : p.estado === 'en_mora'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : p.estado === 'disponible'
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}
                    >
                      {p.estado === 'standby'
                        ? '⚠️ Stand-by (+3 años)'
                        : p.estado === 'en_mora'
                        ? 'En Mora'
                        : p.estado.toUpperCase()}
                    </span>
                  </div>

                  {/* Titular info */}
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-on-surface text-sm">
                        {p.titular?.nombre_completo || '(Sin titular asignado)'}
                      </span>
                      {p.titular?.estado_vital === 'fallecido' || p.titular?.estado_titular === 'fallecido' ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                          Fallecido
                        </span>
                      ) : p.titular ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Vivo
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] font-code-cadastral text-outline">
                      {p.titular?.dni ? `DNI: ${p.titular.dni}` : 'Parcela Municipal / Sin DNI'}
                    </div>
                    {p.estado === 'standby' && (
                      <div className="text-[11px] text-rose-700 font-medium bg-rose-50 p-1.5 rounded border border-rose-200 mt-1">
                        <span className="font-bold">⚠️ Pérdida de titularidad:</span> +3 años sin pago.<br />
                        <span className="font-semibold text-on-surface">Última cuota pagada:</span> {p.ultima_cuota_pagada || (p.fecha_ultimo_pago ? `Abonada el ${p.fecha_ultimo_pago}` : 'Sin pagos registrados')}
                      </div>
                    )}
                  </div>

                  {/* Visual 3-level bars */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-surface rounded border border-outline-variant/60">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Capacidad: {ocupados}/{totalNiveles} niveles
                    </span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalNiveles }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-2 rounded-xs ${
                            idx < ocupados ? 'bg-primary' : 'bg-outline-variant/60'
                          }`}
                          title={`Nivel ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Footer: Saldo + Actions */}
                  <div
                    className="flex flex-wrap items-center justify-between pt-2 border-t border-outline-variant/40 mt-0.5 gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-outline block">Saldo</span>
                      <span
                        className={`font-code-cadastral font-bold text-sm ${
                          (p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.estado === 'standby' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReactivar(p)}
                            className="h-8 px-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Reactivar Parcela tras regularización"
                          >
                            <span className="material-symbols-outlined text-[15px]">restore</span>
                            <span>Reactivar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLiberar(p)}
                            className="h-8 px-2.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Liberar Parcela y pasar a Disponible"
                          >
                            <span className="material-symbols-outlined text-[15px]">lock_open</span>
                            <span>Liberar</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectParcela(p)
                              setMobileView('formulario')
                            }}
                            className="h-8 px-2.5 rounded bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold inline-flex items-center gap-1 border border-outline-variant"
                            title="Ver y editar ficha"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onCobrarQR(p)}
                            className="h-8 px-2.5 rounded bg-secondary hover:bg-primary text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                            title="Cobrar mantenimiento con QR"
                          >
                            <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                            <span>Cobrar</span>
                          </button>
                        </>
                      )}

                      {onDeleteParcela && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Confirma eliminar la parcela ${p.nomenclatura}?`)) {
                              onDeleteParcela(p.id)
                            }
                          }}
                          className="h-8 w-8 rounded bg-red-50 hover:bg-red-100 text-error inline-flex items-center justify-center border border-red-200"
                          title="Eliminar Parcela"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP VIEW (>= md): High Density Table */}
          <div className="hidden md:block overflow-x-auto flex-1 max-h-[460px] custom-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-surface-container">
                <tr className="border-b border-outline-variant text-label-caps font-label-caps text-outline uppercase bg-surface-container">
                  <th className="py-2.5 px-3 bg-surface-container">Parcela</th>
                  <th className="py-2.5 px-3 bg-surface-container">Titular Actual</th>
                  <th className="py-2.5 px-3 bg-surface-container text-center">Ocupación / Niveles</th>
                  <th className="py-2.5 px-3 bg-surface-container">Estado</th>
                  <th className="py-2.5 px-3 bg-surface-container text-right">Saldo</th>
                  <th className="py-2.5 px-2 bg-surface-container text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-body-sm font-body-sm">
                {displayedParcelas.map((p) => {
                  const isSelected = p.id === selectedParcela?.id
                  const ocupados =
                    p.espacios_ocupados || (p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0)
                  const totalNiveles = p.capacidad_total || 3

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectParcela(p)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      {/* Nomenclatura */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-code-cadastral text-code-cadastral font-bold block ${
                            isSelected ? 'text-primary' : 'text-on-surface'
                          }`}
                        >
                          {p.nomenclatura}
                        </span>
                        <span className="text-[11px] text-outline">
                          Sec. {p.sector_id === 'SALINAS' ? 'Salinas (Panteón)' : p.sector_id === 'A' ? 'Tradicional' : 'Parque Central'}
                        </span>
                      </td>

                      {/* Titular */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-on-surface truncate max-w-[170px]">
                            {p.titular?.nombre_completo || '(Sin titular asignado)'}
                          </span>
                          {p.titular?.estado_vital === 'fallecido' || p.titular?.estado_titular === 'fallecido' ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                              Fallecido
                            </span>
                          ) : p.titular ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Vivo
                            </span>
                          ) : null}
                        </div>
                        <div className="font-code-cadastral text-[11px] text-outline">
                          {p.titular?.dni ? `DNI: ${p.titular.dni}` : 'Parcela Municipal'}
                        </div>
                        {p.estado === 'standby' && (
                          <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                            Últ. cuota: {p.ultima_cuota_pagada || (p.fecha_ultimo_pago ? p.fecha_ultimo_pago : 'S/D')}
                          </div>
                        )}
                      </td>

                      {/* Ocupación / Niveles with 3 bars */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-medium text-on-surface text-[12px]">
                            {ocupados} de {totalNiveles} ocupados
                          </span>
                          <div className="flex gap-1 mt-1">
                            {Array.from({ length: totalNiveles }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-4 h-1.5 rounded-sm ${
                                  idx < ocupados ? 'bg-primary' : 'bg-outline-variant/60'
                                }`}
                                title={`Nivel ${idx + 1} ${idx < ocupados ? 'Ocupado' : 'Disponible'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            p.estado === 'standby'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : p.estado === 'ocupada'
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : p.estado === 'en_mora'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : p.estado === 'disponible'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-red-50 text-red-900 border-red-200'
                          }`}
                        >
                          {p.estado === 'standby'
                            ? '⚠️ Stand-by (+3 años)'
                            : p.estado === 'en_mora'
                            ? 'En Mora'
                            : p.estado === 'ocupada'
                            ? 'Ocupada'
                            : p.estado === 'disponible'
                            ? 'Disponible'
                            : 'Baja'}
                        </span>
                      </td>

                      {/* Saldo */}
                      <td
                        className={`py-2.5 px-3 text-right font-code-cadastral font-semibold ${
                          (p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'
                        }`}
                      >
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {p.estado === 'standby' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReactivar(p)}
                                title="Reactivar Parcela (Restablecer titularidad)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-0.5 shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[13px]">restore</span>
                                <span>Reactivar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLiberar(p)}
                                title="Liberar Parcela (Caducidad de titularidad y pase a Disponible)"
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-0.5 shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                <span>Liberar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onCobrarQR(p)}
                                title="Cobrar mantenimiento con QR"
                                className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-primary"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="qr_code_2">
                                  qr_code_2
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectParcela(p)}
                                title="Cargar y editar ficha"
                                className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-surface-container text-outline"
                              >
                                <span className="material-symbols-outlined text-[18px]" data-icon="visibility">
                                  visibility
                                </span>
                              </button>
                            </>
                          )}
                          {onDeleteParcela && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`¿Confirma eliminar la parcela ${p.nomenclatura}?`)) {
                                  onDeleteParcela(p.id)
                                }
                              }}
                              title="Eliminar Parcela"
                              className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-red-50 text-error"
                            >
                              <span className="material-symbols-outlined text-[18px]" data-icon="delete">
                                delete
                              </span>
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

          {/* Table Footer: Totals & Pagination Controls */}
          <div className="p-2.5 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="font-medium text-on-surface text-xs sm:text-sm">
                {pageSize === 'todas'
                  ? `Mostrando todas las ${filteredParcelas.length} parcelas`
                  : `Mostrando ${(currentPage - 1) * (pageSize as number) + 1} - ${Math.min(
                      currentPage * (pageSize as number),
                      filteredParcelas.length
                    )} de ${filteredParcelas.length} parcelas`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[11px] text-outline hidden sm:inline">Mostrar:</span>
              <button
                type="button"
                onClick={() => setPageSize('todas')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 'todas'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                Todas ({filteredParcelas.length})
              </button>
              <button
                type="button"
                onClick={() => setPageSize(100)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 100
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                100
              </button>
              <button
                type="button"
                onClick={() => setPageSize(50)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  pageSize === 50
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface hover:bg-surface-container border border-outline-variant text-on-surface'
                }`}
              >
                50
              </button>

              {pageSize !== 'todas' && totalPages > 1 && (
                <div className="flex items-center gap-1 ml-2 border-l border-outline-variant pl-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Página Anterior"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="text-xs font-mono px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Página Siguiente"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FICHA RÁPIDA INFERIOR (Stitch Verbatim: Detalle de parcela y difuntos)    */}
        {/* ========================================================================= */}
        {selectedParcela && (
          <div className="bg-surface-container-lowest rounded border border-outline-variant p-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-2.5 mb-2.5 border-b border-outline-variant">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]" data-icon="inventory_2">
                  inventory_2
                </span>
                <h3 className="text-title-md font-title-md text-on-surface font-semibold">
                  Ficha Rápida: Parcela{' '}
                  <span className="font-code-cadastral text-primary">{selectedParcela.nomenclatura}</span>
                </h3>
                <span className="text-body-sm text-outline">
                  ({selectedParcela.espacios_ocupados || (selectedParcela.estado === 'ocupada' ? 1 : 0)}/
                  {selectedParcela.capacidad_total || 3} Ocupados)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onNuevaInhumacionParaParcela) {
                    onNuevaInhumacionParaParcela(selectedParcela.nomenclatura)
                  }
                }}
                className="h-8 px-3 rounded text-body-sm font-semibold bg-secondary hover:bg-primary text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]" data-icon="add_circle">
                  add_circle
                </span>
                <span className="hidden sm:inline">Registrar Nueva Inhumación en esta Parcela</span>
                <span className="sm:hidden">Nueva Inhumación</span>
              </button>
            </div>

            {/* Alerta Destacada de Stand-by en Ficha Rápida */}
            {selectedParcela.estado === 'standby' && (
              <div className="mb-3.5 p-3 bg-rose-50 border border-rose-300 rounded-md text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-600 text-[24px] mt-0.5 shrink-0">
                    warning
                  </span>
                  <div>
                    <h4 className="text-body-md font-bold text-rose-900 flex items-center gap-2 flex-wrap">
                      <span>Parcela en Stand-by por Deuda de Mantenimiento (+3 Años)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                        Titularidad Suspendida
                      </span>
                    </h4>
                    <p className="text-body-sm text-rose-800 mt-0.5">
                      Esta parcela ha entrado en suspensión preventiva tras acumular más de 3 años de mora en tasas de mantenimiento.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-rose-900 font-medium">
                      <span className="bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                        <strong>Última cuota pagada:</strong> {selectedParcela.ultima_cuota_pagada || (selectedParcela.fecha_ultimo_pago ? selectedParcela.fecha_ultimo_pago : 'Sin pagos registrados')}
                      </span>
                      {selectedParcela.saldo_mantenimiento && selectedParcela.saldo_mantenimiento > 0 ? (
                        <span className="bg-rose-100/80 px-2 py-0.5 rounded border border-rose-200">
                          <strong>Deuda estimada:</strong> ${selectedParcela.saldo_mantenimiento.toLocaleString('es-AR')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleReactivar(selectedParcela)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">restore</span>
                    <span>Reactivar Parcela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLiberar(selectedParcela)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">lock_open</span>
                    <span>Liberar Parcela</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Deceased in this plot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {difuntosEnParcela.length > 0 ? (
                difuntosEnParcela.map((dif, idx) => (
                  <div
                    key={dif.id}
                    className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N{dif.nivel_posicion || idx + 1}
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">{dif.nombre_difunto}</h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: {dif.fecha_inhumacion?.slice(0, 10)}</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">{dif.causa_defuncion || 'Causa Natural'}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${
                        dif.es_covid
                          ? 'text-[#5B21B6] bg-[#F5F3FF] border-[#DDD6FE]'
                          : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {dif.es_covid ? 'COVID-19' : 'Regular'}
                    </span>
                  </div>
                ))
              ) : (
                /* Fallback Stitch Mock Data si no hay difunto registrado para ver la estructura */
                <>
                  <div className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N1
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">
                          {selectedParcela.titular?.nombre_completo || 'Fernández Morales, Ernesto'}
                        </h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: 14/06/1998</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">Acta #451-B</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Regular
                    </span>
                  </div>

                  <div className="p-2.5 rounded border border-outline-variant/80 bg-surface flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded bg-surface-container text-primary font-bold flex items-center justify-center font-code-cadastral text-[12px] flex-shrink-0">
                        N2
                      </div>
                      <div>
                        <h4 className="text-body-md font-semibold text-on-surface">
                          Morales de Fernández, Carmen Rosa
                        </h4>
                        <div className="flex items-center gap-2 text-body-sm text-outline mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]" data-icon="event">
                              event
                            </span>
                            <span>Inhumado: 09/11/2017</span>
                          </span>
                          <span>•</span>
                          <span className="font-code-cadastral text-[11px]">Acta #882-C</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Regular
                    </span>
                  </div>
                </>
              )}

              {/* Nivel 3 (Disponible) Stitch Card */}
              <div className="md:col-span-2 p-2 rounded border border-dashed border-outline-variant bg-surface-bright flex items-center justify-between text-body-sm text-outline">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded border border-dashed border-outline-variant flex items-center justify-center font-code-cadastral text-[12px] font-medium text-outline">
                    N3
                  </span>
                  <span className="font-medium text-on-surface-variant">
                    Nivel Superior Disponible para futura asignación familiar
                  </span>
                </div>
                <span className="font-code-cadastral text-[12px] text-primary font-semibold">
                  Espacio Apto
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

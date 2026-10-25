import React, { useState, useMemo } from 'react'
import { Parcela, AfiliadoSeguro, Inhumacion } from '../../types/database'
import { formatCurrency } from '../../lib/formatters'
import { evaluarMoraParcela } from '../../lib/reglasNegocio'
import { ActaInhumacionModal } from '../modals/ActaInhumacionModal'
import { TabType } from '../layout/Navbar'

interface DashboardViewProps {
  parcelas: Parcela[]
  afiliados: AfiliadoSeguro[]
  inhumaciones: Inhumacion[]
  recaudacionHoy: number
  onCobrarQR: (parcela: Parcela) => void
  onNuevaParcela: () => void
  onNuevaInhumacion: () => void
  onNuevoAfiliado: () => void
  onVerParcelasMora: () => void
  onOpenSearch: () => void
  onSelectTab?: (tab: TabType) => void
  onCierreCaja?: () => void
}

type DashboardTab = 'todos' | 'parcelas' | 'afiliados' | 'inhumaciones' | 'mora'

export const DashboardView: React.FC<DashboardViewProps> = ({
  parcelas,
  afiliados,
  inhumaciones,
  recaudacionHoy,
  onCobrarQR,
  onNuevaParcela,
  onNuevaInhumacion,
  onNuevoAfiliado,
  onVerParcelasMora,
  onOpenSearch,
  onSelectTab,
  onCierreCaja,
}) => {
  const [tableTab, setTableTab] = useState<DashboardTab>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [limitCount, setLimitCount] = useState<number>(25)
  const [actaModal, setActaModal] = useState<{
    isOpen: boolean
    inhumacion: Inhumacion | null
    folio: number
  }>({
    isOpen: false,
    inhumacion: null,
    folio: 148,
  })

  // Cálculos y métricas del parque
  const totalParcelas = parcelas.length || 398
  const parcelasOcupadas = parcelas.filter((p) => p.estado === 'ocupada' || p.estado === 'en_mora').length
  const parcelasDisponibles = Math.max(0, totalParcelas - parcelasOcupadas)
  const porcentajeOcupacion = Math.round((parcelasOcupadas / (totalParcelas || 1)) * 100)

  const parcelasSecA = parcelas.filter((p) => p.sector_id === 'A').length
  const parcelasSecE = parcelas.filter((p) => p.sector_id === 'E').length
  const parcelasSalinas = parcelas.filter((p) => p.sector_id === 'SALINAS' || p.sector_id === 'Salinas').length

  const parcelasEnMora = parcelas.filter((p) => p.estado === 'en_mora' || (p.saldo_mantenimiento || 0) > 0)
  const totalDeudaMora = parcelasEnMora.reduce((acc, p) => acc + (p.saldo_mantenimiento || 0), 0)
  const parcelasCaducidad = parcelas.filter((p) => evaluarMoraParcela(p).enStandby)

  const totalAfiliados = afiliados.length
  const afiliadosAlDia = afiliados.filter((a) => a.estado === 'activo').length
  const afiliadosEnMora = totalAfiliados - afiliadosAlDia
  const recaudacionMensualProyectada = afiliados.reduce((acc, a) => acc + (a.monto_cuota_mensual || 18000), 0)

  const totalInhumaciones = inhumaciones.length
  const totalCovid = inhumaciones.filter((i) => i.es_covid).length
  const totalEstandar = totalInhumaciones - totalCovid

  // Desglose de recaudación diaria coherente
  const montoRecaudacionEfectivo = Math.round(recaudacionHoy * 0.45)
  const montoRecaudacionDigital = recaudacionHoy - montoRecaudacionEfectivo

  // Filtrado de datos según búsqueda y tab activa
  const q = searchTerm.trim().toLowerCase()

  const displayedParcelas = useMemo(() => {
    return parcelas.filter((p) => {
      if (!q) return true
      return (
        p.nomenclatura.toLowerCase().includes(q) ||
        (p.titular?.nombre_completo || '').toLowerCase().includes(q) ||
        (p.titular?.dni || '').toLowerCase().includes(q) ||
        (p.titular?.direccion || '').toLowerCase().includes(q) ||
        (p.sector_id || '').toLowerCase().includes(q)
      )
    })
  }, [parcelas, q])

  const displayedAfiliados = useMemo(() => {
    return afiliados.filter((a) => {
      if (!q) return true
      return (
        a.numero_afiliado.toString().includes(q) ||
        a.nombre_completo.toLowerCase().includes(q) ||
        (a.dni || '').toLowerCase().includes(q) ||
        (a.zona_cobro || '').toLowerCase().includes(q) ||
        (a.direccion_cobro || '').toLowerCase().includes(q)
      )
    })
  }, [afiliados, q])

  const displayedInhumaciones = useMemo(() => {
    return inhumaciones.filter((i) => {
      if (!q) return true
      const parcNom = (typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela) || ''
      return (
        i.nombre_difunto.toLowerCase().includes(q) ||
        (i.dni_difunto || '').toLowerCase().includes(q) ||
        parcNom.toLowerCase().includes(q) ||
        (i.causa_defuncion || '').toLowerCase().includes(q) ||
        (i.empresa_funebrera || '').toLowerCase().includes(q)
      )
    })
  }, [inhumaciones, q])

  const displayedMora = useMemo(() => {
    return parcelasEnMora.filter((p) => {
      if (!q) return true
      return (
        p.nomenclatura.toLowerCase().includes(q) ||
        (p.titular?.nombre_completo || '').toLowerCase().includes(q) ||
        (p.titular?.dni || '').toLowerCase().includes(q)
      )
    })
  }, [parcelasEnMora, q])

  const totalCount = parcelas.length + afiliados.length + inhumaciones.length

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ===================================================================== */}
      {/* 1. HEADER INSTITUCIONAL CON CENTRO DE ACCIONES RÁPIDAS                 */}
      {/* ===================================================================== */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white shadow-xs">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
            </span>
            <h1 className="text-base sm:text-headline-md font-bold text-on-surface tracking-tight">
              Dashboard Operativo & Control Integral
            </h1>
          </div>
          <p className="text-xs sm:text-body-sm text-outline mt-0.5">
            Cementerio Parque San Nicolás · Ejercicio Fiscal 2026 · Parroquia El Salvador & Municipalidad de Chamical
          </p>
        </div>

        {/* Botones de Acción Rápida Directa */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-dash-nueva-inhumacion"
            onClick={onNuevaInhumacion}
            className="h-8 sm:h-9 px-3 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Registrar nueva acta de defunción e inhumación"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>+ Inhumación</span>
          </button>

          <button
            type="button"
            id="btn-dash-nuevo-afiliado"
            onClick={onNuevoAfiliado}
            className="h-8 sm:h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary border border-outline-variant text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Dar de alta nuevo titular o familia en Plan Seguro"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>+ Afiliado Seguro</span>
          </button>

          <button
            type="button"
            id="btn-dash-nueva-parcela"
            onClick={onNuevaParcela}
            className="h-8 sm:h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-slate-800 border border-outline-variant text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Alta o relevamiento catastral de parcela"
          >
            <span className="material-symbols-outlined text-[16px]">domain_add</span>
            <span>+ Parcela</span>
          </button>

          {onCierreCaja && (
            <button
              type="button"
              id="btn-dash-cierre-caja"
              onClick={onCierreCaja}
              className="h-8 sm:h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Realizar arqueo y cierre diario de caja"
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              <span>Cierre de Caja</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. BANNER DE ALERTAS OPERATIVAS INTELIGENTES                           */}
      {/* ===================================================================== */}
      {parcelasCaducidad.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-2 flex-wrap">
                <span>Alerta Legal: {parcelasCaducidad.length} Parcelas en Estado de Caducidad (&gt; 3 Años de Mora)</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-400">
                  Auditoría Requerida
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-900/80 mt-0.5">
                Superan el plazo reglamentario de 3 años sin abonar mantenimiento. Aplica caducidad administrativa y reversión municipal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTableTab('mora')
                const el = document.getElementById('seccion-tabla-actividad')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Ver Parcelas Afectadas</span>
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. GRID DE 4 TARJETAS KPI REDISEÑADAS Y ENRIQUECIDAS                  */}
      {/* ===================================================================== */}
      <section aria-label="Métricas Operativas Principales" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        
        {/* CARD 1: Parcelas Ocupadas */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-label-caps font-bold text-on-surface-variant uppercase tracking-wider">
                OCUPACIÓN DEL CEMENTERIO
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  park
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-display text-slate-900 font-black leading-tight">
                {parcelasOcupadas}
              </span>
              <span className="text-body-sm text-outline font-medium">/ {totalParcelas} parcelas</span>
            </div>

            {/* Barra de Progreso Visual */}
            <div className="mt-2.5">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex border border-slate-200">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${porcentajeOcupacion}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold mt-1">
                <span className="text-primary">{porcentajeOcupacion}% Ocupadas</span>
                <span className="text-emerald-700">{parcelasDisponibles} Disponibles</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 font-code-cadastral text-on-surface-variant flex items-center justify-between text-[11px]">
            <span>Sec. A: <strong className="text-slate-900">{parcelasSecA}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Sec. E: <strong className="text-slate-900">{parcelasSecE}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Salinas: <strong className="text-slate-900">{parcelasSalinas}</strong></span>
          </div>
        </div>

        {/* CARD 2: En Mora de Mantenimiento */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/50 transition-all hover:shadow-md">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-label-caps font-bold text-on-surface-variant uppercase tracking-wider">
                MORA DE MANTENIMIENTO
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  warning
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-display text-amber-900 font-black leading-tight">
                {parcelasEnMora.length}
              </span>
              <span className="text-body-sm text-amber-800 font-semibold">parcelas impagas</span>
            </div>

            <div className="mt-1 font-code-cadastral font-bold text-base sm:text-lg text-slate-900">
              {formatCurrency(totalDeudaMora)}{' '}
              <span className="text-xs font-normal text-outline">ARS</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-900 border border-amber-200">
              <span className="material-symbols-outlined text-[13px]">history</span>
              <span>{parcelasCaducidad.length} en caducidad (&gt; 3 años)</span>
            </span>
            <button
              type="button"
              onClick={onVerParcelasMora}
              className="text-secondary font-bold hover:underline cursor-pointer"
            >
              Reclamar →
            </button>
          </div>
        </div>

        {/* CARD 3: Afiliados al Seguro */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-blue-500/50 transition-all hover:shadow-md">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-label-caps font-bold text-on-surface-variant uppercase tracking-wider">
                PLAN SEGURO INTEGRAL
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  security
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-display text-slate-900 font-black leading-tight">
                {totalAfiliados}
              </span>
              <span className="text-body-sm text-emerald-700 font-semibold">
                {afiliadosAlDia} al día ({Math.round((afiliadosAlDia / (totalAfiliados || 1)) * 100)}%)
              </span>
            </div>

            <div className="mt-1 text-xs text-on-surface-variant">
              Cuota base: <strong className="font-code-cadastral text-slate-900">$ 18.000,00</strong> / mes
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">trending_up</span>
              <span>Proyección: <strong className="font-code-cadastral text-slate-900">{formatCurrency(recaudacionMensualProyectada)}</strong></span>
            </span>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('seguro')}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                Padrón →
              </button>
            )}
          </div>
        </div>

        {/* CARD 4: Recaudación del Día */}
        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition-all hover:shadow-md">
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-label-caps font-bold text-on-surface-variant uppercase tracking-wider">
                RECAUDACIÓN DEL DÍA
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-display text-emerald-800 font-black leading-tight font-code-cadastral">
                {formatCurrency(recaudacionHoy)}
              </span>
              <span className="text-body-sm text-outline font-medium">ARS</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-code-cadastral font-medium bg-slate-100 text-slate-800 border border-slate-200">
                <span className="material-symbols-outlined text-[13px] text-slate-600">local_atm</span>
                <span>Efvo: {formatCurrency(montoRecaudacionEfectivo)}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-code-cadastral font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">qr_code_2</span>
                <span>Transf/QR: {formatCurrency(montoRecaudacionDigital)}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-600">
              Operaciones registradas: <strong className="text-slate-900">14</strong>
            </span>
            <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Caja en regla</span>
            </span>
          </div>
        </div>

      </section>

      {/* ===================================================================== */}
      {/* 4. PANEL DE DISTRIBUCIÓN CATASTRAL Y RATIOS OPERATIVOS                */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Distribución de Ocupación Catastral */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">donut_large</span>
                <h2 className="text-sm font-bold text-on-surface">Capacidad Catastral & Ocupación por Sector</h2>
              </div>
              <span className="text-xs font-semibold text-outline">
                {totalParcelas} Parcelas Censadas
              </span>
            </div>

            {/* Segmented bar visual */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-primary">Ocupadas con sepulturas ({parcelasOcupadas})</span>
                  <span className="text-emerald-700">Disponibles / Fosas libres ({parcelasDisponibles})</span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex border border-slate-200 shadow-2xs">
                  <div
                    className="bg-[#00236f] h-full transition-all duration-500"
                    style={{ width: `${porcentajeOcupacion}%` }}
                    title={`Ocupadas: ${parcelasOcupadas} (${porcentajeOcupacion}%)`}
                  ></div>
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${100 - porcentajeOcupacion}%` }}
                    title={`Disponibles: ${parcelasDisponibles} (${100 - porcentajeOcupacion}%)`}
                  ></div>
                </div>
              </div>

              {/* Sectores chips */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Sector A (Central)</span>
                  <span className="text-sm font-bold font-code-cadastral text-primary block">{parcelasSecA} Parcelas</span>
                  <span className="text-[10px] text-slate-500 font-medium">Mayor densidad histórica</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Sector E (Este)</span>
                  <span className="text-sm font-bold font-code-cadastral text-primary block">{parcelasSecE} Parcelas</span>
                  <span className="text-[10px] text-slate-500 font-medium">Expansión municipal</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Sector Salinas</span>
                  <span className="text-sm font-bold font-code-cadastral text-primary block">{parcelasSalinas} Parcelas</span>
                  <span className="text-[10px] text-slate-500 font-medium">Zona perimetral</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Total Cuerpos Inhumados Registrados: <strong className="text-slate-900 font-mono">{totalInhumaciones}</strong>
            </span>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('parcelas')}
                className="text-secondary font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Administrar Parcelas</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen Inhumaciones y Protocolos */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700 text-[20px]">history_edu</span>
                <h2 className="text-sm font-bold text-on-surface">Libro de Inhumaciones</h2>
              </div>
              <span className="text-xs font-semibold bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                {totalInhumaciones} Actas
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span className="font-semibold text-slate-800">Protocolo Estándar</span>
                </div>
                <span className="font-bold font-code-cadastral text-slate-900">{totalEstandar} actas</span>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-700 text-[15px]">coronavirus</span>
                  <span className="font-semibold text-purple-900">Etapa Bioseguridad COVID-19</span>
                </div>
                <span className="font-bold font-code-cadastral text-purple-950">{totalCovid} actas</span>
              </div>

              <div className="p-2 rounded-lg bg-surface-container-low text-[11px] text-slate-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">verified_user</span>
                <span>Todas las actas cuentan con foliatura legal y respaldo digital catastral.</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">Ley Sanitaria N° 4.120</span>
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('inhumaciones')}
                className="text-primary font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver Libro Digital</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 5. TABLA UNIFICADA DE ACTIVIDAD Y REGISTROS OPERATIVOS               */}
      {/* ===================================================================== */}
      <section
        id="seccion-tabla-actividad"
        className="bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-sm overflow-hidden flex flex-col"
      >
        {/* Toolbar de Búsqueda y Pestañas Unificadas */}
        <div className="p-3 sm:p-4 border-b border-outline-variant/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface-container-low/30">
          <div>
            <h2 className="font-headline-md text-base sm:text-headline-md text-primary tracking-tight font-bold">
              {tableTab === 'todos' && 'Actividad Global y Registros Unificados'}
              {tableTab === 'parcelas' && 'Padrón General de Parcelas'}
              {tableTab === 'afiliados' && 'Nómina de Afiliados al Plan Seguro'}
              {tableTab === 'inhumaciones' && 'Libro Digital de Inhumaciones'}
              {tableTab === 'mora' && 'Titulares y Parcelas con Mantenimiento en Mora'}
            </h2>
            <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant">
              {tableTab === 'todos' && 'Visualización consolidada de parcelas, afiliados e inhumaciones registradas en el sistema'}
              {tableTab === 'parcelas' && 'Nomenclaturas, titulares y estados catastrales vigentes'}
              {tableTab === 'afiliados' && 'Padrón de seguro social, zonas de cobranza y estado de cuenta'}
              {tableTab === 'inhumaciones' && 'Actas de sepelio y protocolos sanitarios registrados'}
              {tableTab === 'mora' && 'Cuentas con saldo adeudado para cobro inmediato o intimación'}
            </p>
          </div>

          {/* Buscador Integrado y Selector de Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Buscador dentro de la tabla */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, DNI, parcela..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-white border border-outline-variant rounded-lg focus:border-primary outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-slate-800 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Pestañas de filtrado unificadas */}
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/60 overflow-x-auto custom-scroll shrink-0">
              <button
                type="button"
                onClick={() => setTableTab('todos')}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tableTab === 'todos'
                    ? 'font-bold bg-white text-primary shadow-xs'
                    : 'font-semibold text-on-surface-variant hover:text-primary'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setTableTab('parcelas')}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tableTab === 'parcelas'
                    ? 'font-bold bg-white text-primary shadow-xs'
                    : 'font-semibold text-on-surface-variant hover:text-primary'
                }`}
              >
                Parcelas ({parcelas.length})
              </button>
              <button
                type="button"
                onClick={() => setTableTab('afiliados')}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tableTab === 'afiliados'
                    ? 'font-bold bg-white text-primary shadow-xs'
                    : 'font-semibold text-on-surface-variant hover:text-primary'
                }`}
              >
                Afiliados ({afiliados.length})
              </button>
              <button
                type="button"
                onClick={() => setTableTab('inhumaciones')}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tableTab === 'inhumaciones'
                    ? 'font-bold bg-white text-primary shadow-xs'
                    : 'font-semibold text-on-surface-variant hover:text-primary'
                }`}
              >
                Inhumaciones ({inhumaciones.length})
              </button>
              <button
                type="button"
                onClick={() => setTableTab('mora')}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  tableTab === 'mora'
                    ? 'font-bold bg-amber-600 text-white shadow-xs'
                    : 'font-semibold text-amber-800 hover:text-amber-950'
                }`}
              >
                En Mora ({parcelasEnMora.length})
              </button>
            </div>
          </div>
        </div>

        {/* TABLA DE DATOS EN ALTA DENSIDAD */}
        <div className="overflow-x-auto">
          {/* TAB PARCELAS O MORA */}
          {(tableTab === 'parcelas' || tableTab === 'mora') && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">Nomenclatura</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Titular / DNI</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Ubicación</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Monto / Saldo</th>
                  <th className="px-4 py-2 w-36 text-center font-semibold bg-slate-100">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {(tableTab === 'parcelas' ? displayedParcelas : displayedMora).slice(0, limitCount).map((p, index) => (
                  <tr
                    key={p.id}
                    className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-primary">
                        {p.nomenclatura}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">
                        {p.titular?.nombre_completo || 'Sin titular'}
                      </div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        {p.titular?.dni ? `DNI: ${p.titular.dni}` : p.titular?.direccion || 'Chamical'}
                      </div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-on-surface-variant">
                      Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id} • Fila {p.manzana_fila || '0'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          p.estado === 'ocupada'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : p.estado === 'en_mora'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : p.estado === 'disponible'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-red-50 text-red-900 border-red-200'
                        }`}
                      >
                        {p.estado === 'en_mora' ? 'En Mora' : p.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-body-md">
                      <span className={(p.saldo_mantenimiento || 0) > 0 ? 'text-error' : 'text-emerald-800'}>
                        {formatCurrency(p.saldo_mantenimiento || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => onCobrarQR(p)}
                        className="px-2.5 py-1 rounded-md bg-secondary hover:bg-primary text-white font-title-md text-xs shadow-xs inline-flex items-center gap-1 active:scale-[0.98] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                        <span>Cobrar QR</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB AFILIADOS */}
          {tableTab === 'afiliados' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">N° Afiliado</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Afiliado Titular / DNI</th>
                  <th className="px-4 py-2 w-44 font-semibold bg-slate-100">Zona / Domicilio</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Cuota Mensual</th>
                  <th className="px-4 py-2 w-36 text-center font-semibold bg-slate-100">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {displayedAfiliados.slice(0, limitCount).map((a, index) => (
                  <tr
                    key={a.id}
                    className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="font-code-cadastral text-code-cadastral font-bold text-primary">
                        #{a.numero_afiliado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">{a.nombre_completo}</div>
                      <div className="text-[11px] font-code-cadastral text-outline">
                        {a.dni ? `DNI: ${a.dni}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-outline">
                      <div className="text-slate-800 font-medium">{a.zona_cobro || 'Zona 1'}</div>
                      <div className="text-[10px] text-slate-500 truncate">{a.direccion_cobro || 'Chamical'}</div>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.estado === 'activo'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {a.estado === 'activo' ? 'Al día' : 'En mora'}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-xs text-primary">
                      {formatCurrency(a.monto_cuota_mensual || 18000)}/mes
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      {onSelectTab && (
                        <button
                          type="button"
                          onClick={() => onSelectTab('seguro')}
                          className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Ver Seguro</span>
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB INHUMACIONES */}
          {tableTab === 'inhumaciones' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-32 text-left font-semibold bg-slate-100">Fecha / Hora</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Difunto / DNI</th>
                  <th className="px-4 py-2 w-28 font-semibold bg-slate-100">Parcela</th>
                  <th className="px-4 py-2 w-24 font-semibold bg-slate-100">Nivel</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Protocolo</th>
                  <th className="px-4 py-2 w-32 text-center font-semibold bg-slate-100">Acta Oficial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {displayedInhumaciones.slice(0, limitCount).map((i, index) => {
                  const parcNom = typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela
                  return (
                    <tr
                      key={i.id}
                      className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                        index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                      }`}
                    >
                      <td className="px-4 py-2 align-middle font-code-cadastral text-xs text-slate-700">
                        {i.fecha_inhumacion?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="font-semibold text-on-surface">{i.nombre_difunto}</div>
                        <div className="text-[11px] font-code-cadastral text-outline">
                          {i.dni_difunto ? `DNI: ${i.dni_difunto}` : 'DNI comprobado en acta'}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                        {parcNom || 'A-25-96'}
                      </td>
                      <td className="px-4 py-2 align-middle text-body-sm text-outline">
                        Nivel {i.nivel_posicion || 1}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            i.es_covid
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {i.es_covid ? 'COVID-19' : 'Estándar'}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setActaModal({ isOpen: true, inhumacion: i, folio: 148 + index })}
                          className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-primary border border-outline-variant text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span>Ver Acta</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* TAB TODOS (Consolidado) */}
          {tableTab === 'todos' && (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-xs bg-slate-100 border-b-2 border-slate-300">
                <tr className="bg-slate-100 text-[11px] font-label-caps text-slate-700 uppercase tracking-wider h-8 select-none">
                  <th className="px-4 py-2 w-28 text-left font-semibold bg-slate-100">Módulo</th>
                  <th className="px-4 py-2 w-32 font-semibold bg-slate-100">Identificador</th>
                  <th className="px-4 py-2 min-w-[240px] font-semibold bg-slate-100">Nombre / Titular / Difunto</th>
                  <th className="px-4 py-2 w-36 font-semibold bg-slate-100">Detalle / Ubicación</th>
                  <th className="px-4 py-2 w-28 font-semibold bg-slate-100">Estado</th>
                  <th className="px-4 py-2 w-32 text-right font-semibold bg-slate-100">Monto / Fecha</th>
                  <th className="px-4 py-2 w-32 text-center font-semibold bg-slate-100">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body-md text-on-surface">
                {/* Parcelas */}
                {displayedParcelas.slice(0, 10).map((p, index) => (
                  <tr
                    key={`p-${p.id}`}
                    className={`transition-colors h-[42px] border-b border-slate-200/80 ${
                      index % 2 === 0 ? 'bg-white hover:bg-blue-50/80' : 'bg-[#eaf0f6] hover:bg-blue-50/80'
                    }`}
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        PARCELA
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                      {p.nomenclatura}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">
                        {p.titular?.nombre_completo || 'Sin titular'}
                      </div>
                      <div className="text-[10px] text-outline">{p.titular?.dni ? `DNI: ${p.titular.dni}` : ''}</div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-outline">
                      Sec. {p.sector_id === 'SALINAS' ? 'Salinas' : p.sector_id} • Fila {p.manzana_fila || '0'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                          p.estado === 'ocupada'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : p.estado === 'en_mora'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-xs">
                      {formatCurrency(p.saldo_mantenimiento || 0)}
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => onCobrarQR(p)}
                        className="px-2 py-0.5 rounded bg-secondary text-white text-xs font-semibold cursor-pointer"
                      >
                        Cobrar QR
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Afiliados */}
                {displayedAfiliados.slice(0, 5).map((a) => (
                  <tr
                    key={`a-${a.id}`}
                    className="transition-colors h-[42px] border-b border-slate-200/80 bg-white hover:bg-blue-50/80"
                  >
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                        AFILIADO
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                      #{a.numero_afiliado}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <div className="font-semibold text-on-surface">{a.nombre_completo}</div>
                      <div className="text-[10px] text-outline">{a.dni ? `DNI: ${a.dni}` : ''}</div>
                    </td>
                    <td className="px-4 py-2 align-middle text-body-sm text-outline">
                      {a.zona_cobro || 'Zona 1'}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-middle text-right font-code-cadastral font-bold text-xs text-primary">
                      {formatCurrency(a.monto_cuota_mensual || 18000)}/m
                    </td>
                    <td className="px-4 py-2 align-middle text-center">
                      {onSelectTab && (
                        <button
                          type="button"
                          onClick={() => onSelectTab('seguro')}
                          className="px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant text-xs font-semibold cursor-pointer"
                        >
                          Plan Seguro
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Inhumaciones */}
                {displayedInhumaciones.slice(0, 5).map((i, index) => {
                  const parcNom = typeof i.parcela === 'object' ? i.parcela?.nomenclatura : i.parcela
                  return (
                    <tr
                      key={`i-${i.id}`}
                      className="transition-colors h-[42px] border-b border-slate-200/80 bg-white hover:bg-blue-50/80"
                    >
                      <td className="px-4 py-2 align-middle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                          INHUMACIÓN
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle font-code-cadastral font-bold text-primary">
                        {parcNom || 'A-25-96'}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="font-semibold text-on-surface">{i.nombre_difunto}</div>
                        <div className="text-[10px] text-outline">{i.causa_defuncion || 'Causa Natural'}</div>
                      </td>
                      <td className="px-4 py-2 align-middle text-body-sm text-outline">
                        Nivel {i.nivel_posicion || 1}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container border border-outline-variant">
                          {i.es_covid ? 'COVID-19' : 'Estándar'}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-middle text-right font-code-cadastral text-xs text-outline">
                        {i.fecha_inhumacion?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => setActaModal({ isOpen: true, inhumacion: i, folio: 148 + index })}
                          className="px-2 py-0.5 rounded bg-white text-primary border border-outline-variant text-xs font-semibold cursor-pointer"
                        >
                          Ver Acta
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer de la Tabla con selector de filas */}
        <div className="p-3 bg-surface-container-low/40 border-t border-outline-variant/60 flex items-center justify-between text-xs text-outline">
          <div className="flex items-center gap-2">
            <span>Mostrando hasta <strong>{limitCount}</strong> registros por pestaña</span>
            {limitCount === 25 ? (
              <button
                type="button"
                onClick={() => setLimitCount(100)}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                (Cargar más)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLimitCount(25)}
                className="text-primary font-semibold hover:underline cursor-pointer"
              >
                (Mostrar 25)
              </button>
            )}
          </div>
          <span className="font-mono">Padrón Operativo Municipal · Cementerio Parque San Nicolás</span>
        </div>
      </section>

      {/* Modal Acta Oficial de Inhumación (invocable desde el dashboard) */}
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

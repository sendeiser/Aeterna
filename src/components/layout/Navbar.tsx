import React, { useState, useRef, useEffect, useMemo } from 'react'
import { AuditoriaModal } from '../modals/AuditoriaModal'
import { Parcela, AfiliadoSeguro } from '../../types/database'
import { evaluarMoraAfiliado, evaluarMoraParcela } from '../../lib/reglasNegocio'

export type TabType = 'dashboard' | 'parcelas' | 'inhumaciones' | 'seguro' | 'caja' | 'configuracion'

interface NavbarProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
  onOpenSearch: () => void
  onCobroRapidoQR?: () => void
  onNuevoRegistro: () => void
  onCierreCaja: () => void
  isOnline: boolean
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  currentUser?: { username: string; name: string; role: string } | null
  onLogout?: () => void
  afiliados?: (AfiliadoSeguro & { cuotasPagadas?: number[] })[]
  parcelas?: Parcela[]
  onRefresh?: () => void
  isRefreshing?: boolean
}

interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  actionTab?: TabType
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Sincronización Supabase Cloud',
    message: 'Base de datos en la nube conectada y operando en tiempo real con chamical_prod.',
    time: 'Hace 5 min',
    type: 'success',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Cobranza Plan Seguro Integral',
    message: 'Se detectaron 4 afiliados con cuotas pendientes en Zona 1. Listos para cobro por QR.',
    time: 'Hace 25 min',
    type: 'warning',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Libro Digital de Inhumaciones',
    message: 'Nueva acta oficial de inhumación registrada y foliada según Ordenanza N° 842.',
    time: 'Hace 1 hora',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Recordatorio Cierre de Caja',
    message: 'Recuerde realizar el arqueo y balance diario oficial antes de las 19:00 hs.',
    time: 'Hace 2 horas',
    type: 'info',
    read: true,
  },
]

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onCobroRapidoQR,
  onNuevoRegistro,
  onCierreCaja,
  isOnline,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
  onLogout,
  afiliados = [],
  parcelas = [],
  onRefresh,
  isRefreshing = false,
}) => {
  const [auditoriaOpen, setAuditoriaOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set())
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set())

  const notifRef = useRef<HTMLDivElement>(null)

  // Generación dinámica de notificaciones basada en datos reales
  const dynamicNotifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = []

    // 1. Detección de Afiliados con 3 o más meses de mora (Pase a Stand-by)
    const afiliadosMora3Meses = (afiliados || []).filter((a) => {
      const mora = evaluarMoraAfiliado(a, 3, 2026)
      return mora.enStandby || mora.mesesMora >= 3
    })

    if (afiliadosMora3Meses.length > 0) {
      list.push({
        id: 'notif-mora-3meses-resumen',
        title: `⚠️ Mora 3 Meses: ${afiliadosMora3Meses.length} en Stand-by`,
        message: `Afiliados (${afiliadosMora3Meses.map((a) => a.nombre_completo).slice(0, 3).join(', ')}${
          afiliadosMora3Meses.length > 3 ? '...' : ''
        }) adeudan 3+ meses. Servicios de sepelio suspendidos. Clic para regularizar.`,
        time: 'Alerta Crítica',
        type: 'error',
        read: false,
        actionTab: 'seguro',
      })

      afiliadosMora3Meses.forEach((af) => {
        list.push({
          id: `notif-af-${af.id}`,
          title: `Mora Trimestral: ${af.nombre_completo}`,
          message: `Afiliado #${af.numero_afiliado} (${af.zona_cobro || 'Zona 1'}). Adeuda cuotas 1, 2 y 3. Clic para cobrar con QR.`,
          time: 'Stand-by',
          type: 'warning',
          read: false,
          actionTab: 'seguro',
        })
      })
    }

    // 2. Detección de Parcelas con 3 o más años de mora (Caducidad de titularidad)
    const parcelasMora3Anios = (parcelas || []).filter((p) => {
      const mora = evaluarMoraParcela(p)
      return mora.enStandby || mora.aniosMora >= 3
    })

    if (parcelasMora3Anios.length > 0) {
      list.push({
        id: 'notif-mora-3anios-resumen',
        title: `🚨 Mora 3 Años: ${parcelasMora3Anios.length} Parcelas en Caducidad`,
        message: `Parcelas (${parcelasMora3Anios.map((p) => p.nomenclatura).slice(0, 4).join(', ')}${
          parcelasMora3Anios.length > 4 ? '...' : ''
        }) superan 3 años de mora en mantenimiento. Aplica caducidad municipal.`,
        time: 'Auditoría Legal',
        type: 'error',
        read: false,
        actionTab: 'parcelas',
      })

      parcelasMora3Anios.slice(0, 5).forEach((p) => {
        list.push({
          id: `notif-parc-${p.id}`,
          title: `Caducidad: Parcela ${p.nomenclatura}`,
          message: `Titular: ${p.titular?.nombre_completo || 'Sin titular'}. Deuda acumulada: $ ${(p.saldo_mantenimiento || 0).toLocaleString('es-AR')}.`,
          time: '3+ Años',
          type: 'error',
          read: false,
          actionTab: 'parcelas',
        })
      })
    }

    // Notificaciones base del sistema
    list.push({
      id: 'notif-sync',
      title: 'Sincronización Supabase Cloud',
      message: 'Base de datos en la nube conectada y operando en tiempo real con chamical_prod.',
      time: 'Hace 5 min',
      type: 'success',
      read: true,
    })

    return list
  }, [afiliados, parcelas])

  const notifications = dynamicNotifications
    .filter((n) => !dismissedNotifIds.has(n.id))
    .map((n) => ({
      ...n,
      read: n.read || readNotifIds.has(n.id),
    }))

  const unreadCount = notifications.filter((n) => !n.read).length

  // Cerrar popover al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [notifOpen])

  const handleMarkAllAsRead = () => {
    setReadNotifIds(new Set(dynamicNotifications.map((n) => n.id)))
  }

  const handleDismissNotif = (id: string) => {
    setDismissedNotifIds((prev) => new Set([...prev, id]))
  }

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'dashboard' },
    { id: 'parcelas' as TabType, label: 'Parcelas', icon: 'domain' },
    { id: 'inhumaciones' as TabType, label: 'Inhumaciones', icon: 'calendar_month' },
    { id: 'seguro' as TabType, label: 'Plan Seguro Integral', icon: 'security' },
    { id: 'caja' as TabType, label: 'Caja Diaria', icon: 'payments' },
    { id: 'configuracion' as TabType, label: 'Configuración', icon: 'settings' },
  ]

  const moduleSubtitles: Record<TabType, string> = {
    dashboard: 'Dashboard Operativo & Resumen General',
    parcelas: 'Módulo de Gestión de Parcelas',
    inhumaciones: 'Libro Digital de Inhumaciones',
    seguro: 'Padrón de Plan Seguro Integral',
    caja: 'Caja Diaria, Arqueo & Movimientos de Tesorería',
    configuracion: 'Configuración CBU / Alias de Tesorería',
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* SIDEBAR INSTITUCIONAL (Stitch SideNavBar Verbatim)                         */}
      {/* ========================================================================= */}
      <aside
        className={`fixed left-0 top-0 bottom-0 h-screen ${
          isCollapsed ? 'w-20 p-2.5' : 'w-64 p-4'
        } transition-all duration-300 hidden lg:flex flex-col justify-between z-40 bg-surface-container-lowest border-r border-outline-variant shadow-sm print:hidden`}
      >
        <div className="flex flex-col gap-3">
          {/* Institutional Logo & Header & Toggle Minimize Button */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2.5 py-1">
              <div
                onClick={() => onSelectTab('dashboard')}
                className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm ring-1 ring-amber-400/40 cursor-pointer bg-slate-900 hover:scale-105 transition-transform"
                title="Aeterna Parque San Nicolás"
              >
                <img
                  src="/logo_aeterna.png"
                  alt="Aeterna Parque San Nicolás"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                id="btn-toggle-sidebar"
                onClick={onToggleCollapse}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                title="Expandir barra lateral"
              >
                <span className="material-symbols-outlined text-[20px]">
                  menu
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 py-1">
              <div
                onClick={() => onSelectTab('dashboard')}
                className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-sm ring-1 ring-amber-400/40 flex-shrink-0 bg-slate-900 group-hover:scale-105 transition-transform">
                  <img
                    src="/logo_aeterna.png"
                    alt="Aeterna Parque San Nicolás"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col overflow-hidden leading-tight">
                  <span className="text-sm font-bold text-primary tracking-tight truncate">
                    Aeterna Parque
                  </span>
                  <span className="text-[10px] font-medium text-emerald-800 tracking-wide truncate">
                    Parque San Nicolás
                  </span>
                </div>
              </div>
              <button
                type="button"
                id="btn-toggle-sidebar"
                onClick={onToggleCollapse}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0 cursor-pointer"
                title="Minimizar barra lateral"
              >
                <span className="material-symbols-outlined text-[20px]">
                  menu_open
                </span>
              </button>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="flex flex-col gap-1 mt-1">
            {navItems.map((item) => {
              const active = currentTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2 text-left'
                  } rounded-lg transition-colors duration-150 cursor-pointer ${
                    active
                      ? isCollapsed
                        ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                        : 'bg-surface-container text-primary font-semibold border-l-4 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${active ? 'text-primary' : 'text-outline'}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="text-body-md font-body-md truncate">{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Navigation Footer */}
        <div className="flex flex-col gap-1 pt-3 border-t border-outline-variant">
          {!isCollapsed && (
            <div className="flex items-center justify-between text-[11px] text-outline px-3 py-1">
              <span>SISTEMA DE GESTIÓN v4.1</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{isOnline ? 'SUPABASE' : 'LOCAL'}</span>
              </span>
            </div>
          )}

          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full mb-1 ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`}
                title={isOnline ? 'Conectado a Supabase' : 'Modo Local'}
              ></span>
              <button
                type="button"
                className="w-10 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low text-slate-700 transition-colors cursor-pointer"
                onClick={() => setAuditoriaOpen(true)}
                title="Auditoría Fiscal & AFIP"
              >
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </button>
              <div
                onClick={onLogout}
                className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs mt-1 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                title="Usuario Administrador (Clic para salir)"
              >
                AD
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-body-sm font-body-sm transition-colors duration-150 text-left w-full cursor-pointer"
                onClick={() => setAuditoriaOpen(true)}
              >
                <span className="material-symbols-outlined text-[18px] text-slate-700" data-icon="shield">
                  shield
                </span>
                <span className="font-medium">Auditoría Fiscal & AFIP</span>
              </button>

              {/* System Operator Profile Snapshot */}
              <div className="mt-2 pt-2 px-2 flex items-center justify-between gap-2 border-t border-outline-variant/60">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    AD
                  </div>
                  <div className="flex flex-col overflow-hidden leading-tight">
                    <span className="text-body-sm font-semibold text-on-surface truncate">
                      {currentUser?.name || 'Administrador'}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-medium truncate">
                      {currentUser?.role || 'Dirección & Tesorería'}
                    </span>
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded text-outline hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                    title="Cerrar sesión"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR (Stitch TopNavBar Verbatim)                             */}
      {/* ========================================================================= */}
      <header className={`fixed top-0 right-0 left-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300 h-14 z-30 flex items-center justify-between px-3 sm:px-6 bg-surface-container-lowest border-b border-outline-variant shadow-sm print:hidden`}>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">

          <img
            src="/logo_aeterna.png"
            alt="Aeterna"
            className="w-8 h-8 rounded-full object-cover shadow-xs ring-1 ring-amber-400/40 lg:hidden shrink-0"
          />
          <span className="text-sm sm:text-headline-sm font-headline-sm font-bold text-primary tracking-wide uppercase whitespace-nowrap">
            Aeterna
          </span>
          <span className="hidden xl:inline text-sm sm:text-headline-sm font-headline-sm font-bold text-primary tracking-wide uppercase whitespace-nowrap">
            Sistema Mortuorio
          </span>
          <span className="text-outline-variant hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1.5 text-body-sm text-on-surface-variant font-medium truncate">
            <span className="material-symbols-outlined text-outline text-[16px]" data-icon="domain">
              domain
            </span>
            <span className="truncate">{moduleSubtitles[currentTab]}</span>
          </div>
        </div>

        {/* Actions & Global Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Search Shortcut */}
          <div className="relative w-36 sm:w-52 hidden md:block">
            <span
              className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]"
              data-icon="search"
            >
              search
            </span>
            <input
              type="text"
              onClick={onOpenSearch}
              readOnly
              placeholder="Buscar (Ctrl+K)..."
              className="w-full h-8 pl-8 pr-3 text-body-sm bg-surface rounded border border-outline-variant cursor-pointer hover:border-secondary focus:outline-none"
            />
          </div>

          {/* Botoncito para actualizar datos en tiempo real con Supabase */}
          {onRefresh && (
            <button
              id="btn-navbar-refresh"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 px-2 sm:px-2.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container hover:border-primary/50 text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs disabled:opacity-50"
              title="Actualizar y sincronizar datos con Supabase Cloud"
            >
              <span
                className={`material-symbols-outlined text-[16px] text-primary ${isRefreshing ? 'animate-spin' : ''}`}
              >
                sync
              </span>
              <span className="hidden sm:inline">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          )}



          {/* Notificaciones Interactivas Popover */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer"
              title="Notificaciones del Sistema"
            >
              <span className="material-symbols-outlined text-[18px]" data-icon="notifications">
                notifications
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Menu Popover Notificaciones */}
            {notifOpen && (
              <>
                {/* Backdrop oscuro en mobile para cerrar tocando afuera */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
                  onClick={() => setNotifOpen(false)}
                />

                <div
                  className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-full sm:right-0 sm:mt-2 max-w-sm sm:max-w-none w-auto sm:w-96 mx-auto sm:mx-0 bg-surface-container-lowest border border-outline-variant rounded-2xl sm:rounded-xl shadow-2xl z-50 p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        notifications_active
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-on-surface">
                        Notificaciones
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} nuevas
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Leídas todas
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="sm:hidden text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
                        title="Cerrar notificaciones"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[50vh] sm:max-h-72 overflow-y-auto space-y-2 pr-1 custom-scroll">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-outline text-xs">
                        No hay notificaciones pendientes.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.actionTab) {
                              onSelectTab(item.actionTab)
                              setNotifOpen(false)
                              setReadNotifIds((prev) => new Set([...prev, item.id]))
                            }
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                            item.actionTab ? 'cursor-pointer hover:border-primary/50 hover:shadow-xs' : ''
                          } ${
                            item.read
                              ? 'bg-surface border-outline-variant/50 opacity-75'
                              : 'bg-primary/5 border-primary/20 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.type === 'success'
                                    ? 'bg-emerald-500'
                                    : item.type === 'warning'
                                    ? 'bg-amber-500'
                                    : item.type === 'error'
                                    ? 'bg-rose-500'
                                    : 'bg-primary'
                                }`}
                              ></span>
                              <span className="truncate">{item.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDismissNotif(item.id)
                              }}
                              className="text-outline hover:text-on-surface text-[14px] leading-none shrink-0 p-0.5 rounded hover:bg-slate-200 cursor-pointer"
                              title="Descartar"
                            >
                              ×
                            </button>
                          </div>
                          <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1 leading-snug line-clamp-3 sm:line-clamp-none">
                            {item.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-outline-variant/30 text-[10px] text-outline">
                            <span>{item.time}</span>
                            {!item.read && (
                              <span className="text-primary font-bold">Pendiente</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false)
                        setAuditoriaOpen(true)
                      }}
                      className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      <span>Auditoría completa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-500 hover:text-slate-800 font-medium px-2 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-5 w-px bg-outline-variant mx-0.5"></div>

          {/* Cierre de Caja */}
          <button
            type="button"
            onClick={onCierreCaja}
            className="h-8 px-2.5 sm:px-3 rounded text-body-sm font-medium bg-surface-container text-primary hover:bg-surface-container-high transition-colors hidden sm:block whitespace-nowrap cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Cierre de Caja
          </button>

          {/* Nuevo Registro */}
          <button
            type="button"
            onClick={onNuevoRegistro}
            className="h-8 px-2.5 sm:px-3 rounded text-body-sm font-medium bg-primary text-on-primary hover:bg-secondary transition-colors flex items-center gap-1.5 shadow-sm active:scale-[0.99] whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]" data-icon="add">
              add
            </span>
            <span className="hidden sm:inline">Nuevo Registro</span>
            <span className="sm:hidden">Nuevo</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              id="btn-topbar-logout"
              onClick={onLogout}
              className="h-8 px-2 sm:px-2.5 rounded text-body-sm font-medium bg-surface-container hover:bg-rose-50 text-outline hover:text-rose-700 border border-outline-variant transition-colors flex items-center gap-1 cursor-pointer"
              title="Cerrar sesión de usuario"
            >
              <span className="material-symbols-outlined text-[17px] text-rose-600">logout</span>
              <span className="hidden md:inline text-xs font-semibold">Salir</span>
            </button>
          )}
        </div>
      </header>


      {/* Modal Auditoría Fiscal & AFIP */}
      <AuditoriaModal
        isOpen={auditoriaOpen}
        onClose={() => setAuditoriaOpen(false)}
      />

      {/* Barra de navegación móvil inferior */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-container-lowest border-t border-outline-variant z-40 flex items-center justify-around px-1">
        {navItems.map((item) => {
          const active = currentTab === item.id
          const shortLabel = item.id === 'configuracion' ? 'Config' : item.id === 'caja' ? 'Caja' : item.label.split(' ')[0]
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-1 text-[9px] sm:text-[10px] min-w-0 flex-1 truncate ${
                active ? 'text-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              <span
                className="material-symbols-outlined text-[19px] sm:text-[20px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="truncate max-w-[56px] text-center leading-tight">{shortLabel}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

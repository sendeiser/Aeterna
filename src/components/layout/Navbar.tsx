import React, { useState, useRef, useEffect } from 'react'
import { SoporteMunicipalModal } from '../modals/SoporteMunicipalModal'
import { AuditoriaModal } from '../modals/AuditoriaModal'

export type TabType = 'dashboard' | 'parcelas' | 'inhumaciones' | 'seguro' | 'configuracion'

interface NavbarProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
  onOpenSearch: () => void
  onCobroRapidoQR: () => void
  onNuevoRegistro: () => void
  onCierreCaja: () => void
  isOnline: boolean
}

interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
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
}) => {
  const [soporteOpen, setSoporteOpen] = useState(false)
  const [auditoriaOpen, setAuditoriaOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  const notifRef = useRef<HTMLDivElement>(null)

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
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleDismissNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: 'dashboard' },
    { id: 'parcelas' as TabType, label: 'Parcelas', icon: 'domain' },
    { id: 'inhumaciones' as TabType, label: 'Inhumaciones', icon: 'calendar_month' },
    { id: 'seguro' as TabType, label: 'Plan Seguro Integral', icon: 'security' },
    { id: 'configuracion' as TabType, label: 'Configuración', icon: 'settings' },
  ]

  const moduleSubtitles: Record<TabType, string> = {
    dashboard: 'Dashboard Operativo & Resumen General',
    parcelas: 'Módulo de Gestión de Parcelas',
    inhumaciones: 'Libro Digital de Inhumaciones',
    seguro: 'Padrón de Plan Seguro Integral',
    configuracion: 'Configuración CBU / Alias de Tesorería',
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* SIDEBAR INSTITUCIONAL (Stitch SideNavBar Verbatim)                         */}
      {/* ========================================================================= */}
      <aside className="fixed left-0 top-0 bottom-0 h-screen w-64 hidden lg:flex flex-col justify-between p-4 z-40 bg-surface-container-lowest border-r border-outline-variant shadow-sm print:hidden">
        <div className="flex flex-col gap-4">
          {/* Institutional Logo & Header */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 px-2 py-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-white text-[20px]" data-icon="domain">
                domain
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-title-md font-title-md font-semibold text-primary tracking-tight truncate">
                Aeterna Parque
              </span>
              <span className="text-body-sm font-body-sm text-outline truncate">
                Registro & Sepelios
              </span>
            </div>
          </div>

          {/* Quick Action CTA */}
          <button
            type="button"
            onClick={onCobroRapidoQR}
            className="w-full h-9 bg-primary hover:bg-secondary text-on-primary rounded-lg flex items-center justify-center gap-2 px-3 text-body-md font-medium transition-colors shadow-sm active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-white text-[18px]" data-icon="qr_code_scanner">
              qr_code_scanner
            </span>
            <span>Cobro Rápido QR</span>
          </button>

          {/* Main Navigation Links */}
          <nav className="flex flex-col gap-1 mt-2">
            {navItems.map((item) => {
              const active = currentTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-150 ${
                    active
                      ? 'bg-surface-container text-primary font-semibold border-l-4 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${active ? 'text-primary' : 'text-outline'}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>
                  <span className="text-body-md font-body-md">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Navigation Footer */}
        <div className="flex flex-col gap-1 pt-3 border-t border-outline-variant">
          <div className="flex items-center justify-between text-[11px] text-outline px-3 py-1">
            <span>SISTEMA DE GESTIÓN v4.1</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isOnline ? 'SUPABASE' : 'LOCAL'}</span>
            </span>
          </div>

          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-body-sm font-body-sm transition-colors duration-150 text-left w-full cursor-pointer"
            onClick={() => setSoporteOpen(true)}
          >
            <span className="material-symbols-outlined text-[18px] text-primary" data-icon="support_agent">
              support_agent
            </span>
            <span className="font-medium">Soporte Municipal</span>
          </button>
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

          {/* System Operator Profile Snapshot (Stitch Verbatim) */}
          <div className="mt-2 pt-2 px-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-semibold text-body-sm">
              RC
            </div>
            <div className="flex flex-col overflow-hidden leading-tight">
              <span className="text-body-sm font-medium text-on-surface truncate">Of. Registro Civil</span>
              <span className="text-[11px] text-outline truncate">Chamical, La Rioja</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR (Stitch TopNavBar Verbatim)                             */}
      {/* ========================================================================= */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-14 z-30 flex items-center justify-between px-3 sm:px-6 bg-surface-container-lowest border-b border-outline-variant shadow-sm print:hidden">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
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

          <div className="h-5 w-px bg-outline-variant mx-0.5 hidden md:block"></div>

          {/* Icon Actions */}
          <button
            type="button"
            onClick={onCobroRapidoQR}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-low text-on-surface-variant transition-colors"
            title="Escanear Código QR"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="qr_code_scanner">
              qr_code_scanner
            </span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-low text-on-surface-variant transition-colors hidden sm:flex"
            title="Imprimir Registro Oficial"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="print">
              print
            </span>
          </button>

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
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      notifications_active
                    </span>
                    <span className="text-body-md font-bold text-on-surface">
                      Notificaciones
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-primary/10 text-primary text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Leídas todas
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-outline text-body-sm">
                      No hay notificaciones pendientes.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          item.read
                            ? 'bg-surface border-outline-variant/50 opacity-75'
                            : 'bg-primary/5 border-primary/20 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-body-sm text-on-surface">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.type === 'success'
                                  ? 'bg-emerald-500'
                                  : item.type === 'warning'
                                  ? 'bg-amber-500'
                                  : item.type === 'error'
                                  ? 'bg-rose-500'
                                  : 'bg-primary'
                              }`}
                            ></span>
                            <span>{item.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDismissNotif(item.id)}
                            className="text-outline hover:text-on-surface text-[14px] leading-none"
                            title="Descartar"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-body-xs text-on-surface-variant mt-1 leading-snug">
                          {item.message}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-outline-variant/30 text-[10px] text-outline">
                          <span>{item.time}</span>
                          {!item.read && (
                            <span className="text-primary font-medium">Pendiente</span>
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
                    className="text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">shield</span>
                    <span>Auditoría completa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-outline hover:text-on-surface"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
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
        </div>
      </header>

      {/* Modal Soporte Municipal */}
      <SoporteMunicipalModal
        isOpen={soporteOpen}
        onClose={() => setSoporteOpen(false)}
      />

      {/* Modal Auditoría Fiscal & AFIP */}
      <AuditoriaModal
        isOpen={auditoriaOpen}
        onClose={() => setAuditoriaOpen(false)}
      />

      {/* Barra de navegación móvil inferior */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-container-lowest border-t border-outline-variant z-40 flex items-center justify-around px-1">
        {navItems.map((item) => {
          const active = currentTab === item.id
          const shortLabel = item.id === 'configuracion' ? 'Config' : item.label.split(' ')[0]
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

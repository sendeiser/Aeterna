import React, { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Detectar si ya está corriendo como app instalada (Standalone)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(isInStandaloneMode)

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream
    setIsIos(isIosDevice)

    // Si ya está instalada, no mostrar banner
    if (isInStandaloneMode) {
      return
    }

    // Verificar si el usuario ya descartó el banner en esta sesión
    const bannerDismissed = sessionStorage.getItem('aeterna_pwa_banner_dismissed')
    if (!bannerDismissed) {
      // En iOS o Android, mostrar tras 2 segundos de navegación
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 2000)
      return () => clearTimeout(timer)
    }

    // Capturar evento de instalación nativo de Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!sessionStorage.getItem('aeterna_pwa_banner_dismissed')) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true)
      return
    }

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false)
        setDeferredPrompt(null)
      }
    } else {
      // Si el navegador no disparó beforeinstallprompt aún, abrir guía explicativa
      setShowIosModal(true)
    }
  }

  const handleDismissBanner = () => {
    setShowBanner(false)
    sessionStorage.setItem('aeterna_pwa_banner_dismissed', 'true')
  }

  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* Banner flotante inferior para dispositivos móviles */}
      {showBanner && (
        <div className="fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-amber-400/30 flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-sm shrink-0 ring-1 ring-amber-400/50 bg-slate-950 flex items-center justify-center">
              <img
                src="/icon-192.png"
                alt="Aeterna PWA"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider leading-tight">
                Instalar Aplicación Móvil
              </h4>
              <p className="text-[11px] text-slate-200 leading-snug line-clamp-2 mt-0.5">
                Acceso directo rápido en tu celular Android o iPhone, pantalla completa y sin barras de navegador.
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                id="btn-instalar-pwa"
                onClick={handleInstallClick}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                <span>Instalar</span>
              </button>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="text-[10px] text-slate-400 hover:text-slate-200 text-center py-0.5 cursor-pointer"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Instructivo para iPhone (iOS Safari) o navegadores sin prompt automático */}
      {showIosModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-outline-variant shadow-2xl max-w-md w-full p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-amber-400/40 shadow-xs bg-slate-900 shrink-0">
                  <img src="/icon-192.png" alt="Aeterna" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-on-surface text-base leading-tight">
                    Instalar Aeterna en tu Celular
                  </h3>
                  <p className="text-xs text-outline">
                    {isIos ? 'Guía para iPhone (Safari)' : 'Guía de Instalación Móvil'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Pasos */}
            <div className="space-y-3 text-xs text-on-surface">
              {isIos ? (
                <>
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Toca el botón Compartir en Safari</p>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">
                        Ubica el ícono de compartir (un cuadro con flecha hacia arriba{' '}
                        <span className="inline-block px-1 bg-surface-container rounded border border-outline-variant font-bold">
                          ⎋
                        </span>{' '}
                        o{' '}
                        <span className="inline-block px-1 bg-surface-container rounded border border-outline-variant font-bold">
                          📤
                        </span>
                        ) en la barra inferior de tu iPhone.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Selecciona "Agregar a pantalla de inicio"</p>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">
                        Desplázate hacia abajo en el menú de opciones y toca en{' '}
                        <strong>"Agregar a pantalla de inicio"</strong> (con el ícono ➕).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Confirma tocando "Agregar"</p>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">
                        Toca el botón <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo! La app aparecerá en tu pantalla de inicio como una aplicación nativa.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Menú de Chrome / Navegador</p>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">
                        Toca el botón de tres puntos (⋮) en la esquina superior derecha del navegador.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/60">
                    <div className="w-6 h-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Instalar Aplicación</p>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">
                        Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
              >
                Entendido ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

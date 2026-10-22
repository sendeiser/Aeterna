import React, { useState } from 'react'

interface SoporteMunicipalModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SoporteMunicipalModal: React.FC<SoporteMunicipalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [ticketEnviado, setTicketEnviado] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [prioridad, setPrioridad] = useState<'normal' | 'alta' | 'urgente'>('normal')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!asunto.trim() || !mensaje.trim()) return

    const nuevoTicket = `TKT-${Date.now().toString().slice(-6)}`
    setTicketId(nuevoTicket)
    setTicketEnviado(true)

    // Guardar en log local
    const ticketsPrevios = JSON.parse(localStorage.getItem('aeterna_tickets_soporte') || '[]')
    ticketsPrevios.unshift({
      id: nuevoTicket,
      asunto,
      mensaje,
      prioridad,
      fecha: new Date().toISOString(),
      estado: 'Abierto - En revisión por Mesa de Ayuda Municipal',
    })
    localStorage.setItem('aeterna_tickets_soporte', JSON.stringify(ticketsPrevios))
  }

  const handleReset = () => {
    setTicketEnviado(false)
    setAsunto('')
    setMensaje('')
    setPrioridad('normal')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-outline-variant flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-5 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">support_agent</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                Municipalidad de Chamical · La Rioja
              </span>
              <h2 className="text-title-lg font-title-lg font-bold">
                Mesa de Ayuda & Soporte Técnico
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scroll">
          {/* Canales de Contacto Directo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-outline-variant/70 bg-surface-container-low/50 space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">call</span>
                <span>Guardia Cementerio</span>
              </div>
              <p className="font-code-cadastral text-base font-bold text-on-surface">
                (03826) 44-8900
              </p>
              <span className="text-[11px] text-outline block">
                Atención operativa 24 hs los 365 días
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-outline-variant/70 bg-surface-container-low/50 space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
                <span>WhatsApp Soporte Municipal</span>
              </div>
              <p className="font-code-cadastral text-base font-bold text-emerald-700">
                +54 9 3826 401234
              </p>
              <span className="text-[11px] text-outline block">
                Consultas catastrales y reclamos
              </span>
            </div>
          </div>

          {/* Formulario de Incidencia o Ticket */}
          {ticketEnviado ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto text-2xl shadow-sm">
                ✓
              </div>
              <h3 className="text-lg font-bold text-emerald-900">
                ¡Solicitud Registrada con Éxito!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Tu solicitud ha sido transmitida a la Dirección de Obras Públicas y Registro Civil Municipal de Chamical.
              </p>
              <div className="py-2 px-4 bg-white rounded-lg border border-emerald-300 inline-block font-code-cadastral font-bold text-emerald-800 text-sm">
                Ticket #{ticketId}
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Enviar otra consulta
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="border-b border-outline-variant pb-2">
                <span className="text-xs font-bold uppercase text-primary tracking-wide block">
                  Generar Solicitud de Asistencia Técnica o Reclamo
                </span>
                <span className="text-[11px] text-outline">
                  El personal de soporte municipal responderá a la brevedad.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Motivo / Asunto
                </label>
                <input
                  type="text"
                  required
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Ej: Inconsistencia en nomenclatura de parcela B-12"
                  className="w-full h-9 px-3 text-sm bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">
                    Dependencia Solicitante
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Oficina Registro Civil & Sepelios"
                    className="w-full h-9 px-3 text-xs bg-surface-container rounded-lg border border-outline-variant text-outline cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">
                    Nivel de Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e: any) => setPrioridad(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none"
                  >
                    <option value="normal">Normal (Respuesta en 24 hs)</option>
                    <option value="alta">Alta (Respuesta en 4 hs)</option>
                    <option value="urgente">Urgente (Guardia Inmediata)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  required
                  rows={3}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Detalla los datos del titular, parcela o afiliado involucrado..."
                  className="w-full p-3 text-sm bg-surface rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-4 rounded-lg border border-outline-variant bg-white text-on-surface text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-bold shadow-sm transition-transform active:scale-[0.98]"
                >
                  Transmitir Solicitud
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-outline">
          <span>Municipalidad de Chamical · Gestión Parques & Cementerios</span>
          <span>Versión Catastral 4.1</span>
        </div>
      </div>
    </div>
  )
}

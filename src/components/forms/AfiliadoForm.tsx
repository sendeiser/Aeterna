import React, { useState } from 'react'
import { AfiliadoSeguro, EstadoAfiliado } from '../../types/database'

interface AfiliadoFormProps {
  initialData?: AfiliadoSeguro | null
  onSave: (afiliado: Partial<AfiliadoSeguro>) => void
  onCancel: () => void
}

export const AfiliadoForm: React.FC<AfiliadoFormProps> = ({ initialData, onSave, onCancel }) => {
  const [numeroAfiliado, setNumeroAfiliado] = useState(initialData?.numero_afiliado || '')
  const [nombreCompleto, setNombreCompleto] = useState(initialData?.nombre_completo || '')
  const [direccion, setDireccion] = useState(initialData?.direccion_cobro || '')
  const [montoCuota, setMontoCuota] = useState(initialData?.monto_cuota_mensual || 18000)
  const [zonaCobro, setZonaCobro] = useState(initialData?.zona_cobro || 'Zona 1 - Centro')
  const [estado, setEstado] = useState<EstadoAfiliado>(initialData?.estado || 'activo')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: initialData?.id || `afi-${Date.now()}`,
      numero_afiliado: Number(numeroAfiliado),
      nombre_completo: nombreCompleto,
      direccion_cobro: direccion,
      monto_cuota_mensual: Number(montoCuota),
      zona_cobro: zonaCobro,
      estado,
      fecha_alta: initialData?.fecha_alta || new Date().toISOString().split('T')[0],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 text-on-surface shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">security</span>
          </div>
          <div>
            <h3 className="font-bold text-base text-primary">
              {initialData ? `Editar Afiliado #${initialData.numero_afiliado}` : 'Nuevo Afiliado al Seguro'}
            </h3>
            <span className="text-xs text-on-surface-variant">Póliza de Servicio de Sepelio · Chamical</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            N° de Afiliado <span className="text-error">*</span>
          </label>
          <input
            type="number"
            value={numeroAfiliado}
            onChange={(e) => setNumeroAfiliado(e.target.value)}
            placeholder="157"
            className="w-full h-9 px-3 font-mono text-xs font-bold bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Nombre y Apellido <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="Ej. Gómez Miranda, Alberto"
            className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Domicilio de Cobro
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Barrio, Calle, Número"
            className="w-full h-9 px-3 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Zona de Cobrador
          </label>
          <select
            value={zonaCobro}
            onChange={(e) => setZonaCobro(e.target.value)}
            className="w-full h-9 px-2 text-xs bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
          >
            <option value="Zona 1 - Ruta 1 / B° Tiro">Zona 1 - Ruta 1 / B° Tiro</option>
            <option value="Zona 2 - B° Loma Blanca">Zona 2 - B° Loma Blanca</option>
            <option value="Zona 3 - Centro Chamical">Zona 3 - Centro Chamical</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">
            Cuota Mensual ($)
          </label>
          <input
            type="number"
            value={montoCuota}
            onChange={(e) => setMontoCuota(parseFloat(e.target.value) || 0)}
            className="w-full h-9 px-3 font-mono font-bold text-xs text-primary bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-on-surface block mb-1">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoAfiliado)}
            className="w-full h-9 px-2 text-xs font-semibold bg-white border border-outline-variant rounded-md focus:border-secondary focus:outline-none"
          >
            <option value="activo">Al Día (Activo)</option>
            <option value="en_mora">Con Deuda (Mora)</option>
            <option value="suspendido">Suspendido</option>
            <option value="baja">Baja</option>
          </select>
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
          <span>Guardar Afiliado</span>
        </button>
      </div>
    </form>
  )
}

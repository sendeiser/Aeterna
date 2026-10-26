import React, { useState } from 'react'

interface EgresoCajaModalProps {
  isOpen: boolean
  onClose: () => void
  onGuardarEgreso: (egreso: {
    concepto: string
    categoria: string
    monto: number
    comprobante: string
    metodo: 'efectivo' | 'transferencia'
  }) => void
}

export const EgresoCajaModal: React.FC<EgresoCajaModalProps> = ({
  isOpen,
  onClose,
  onGuardarEgreso,
}) => {
  const [concepto, setConcepto] = useState('')
  const [categoria, setCategoria] = useState('mantenimiento_parque')
  const [monto, setMonto] = useState<number | ''>('')
  const [comprobante, setComprobante] = useState('')
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia'>('efectivo')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!concepto.trim()) {
      alert('Por favor ingrese el concepto del egreso.')
      return
    }
    if (!monto || Number(monto) <= 0) {
      alert('Por favor ingrese un monto válido mayor a $0.')
      return
    }

    onGuardarEgreso({
      concepto: concepto.trim(),
      categoria,
      monto: Number(monto),
      comprobante: comprobante.trim() || `EGR-${Date.now().toString().slice(-6)}`,
      metodo,
    })

    // Reset and close
    setConcepto('')
    setMonto('')
    setComprobante('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-on-surface flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-rose-700 text-white">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl">outbox</span>
            <div>
              <h3 className="font-bold text-base">Registrar Egreso / Gasto Operativo</h3>
              <p className="text-xs text-rose-100">Imputación de egreso a la caja diaria y mensual</p>
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Concepto del Gasto / Detalle (*)
            </label>
            <input
              type="text"
              required
              placeholder="ej. Combustible cortadoras de césped, Reparación bomba de agua..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/30"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Categoría de Gasto (*)
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs bg-white focus:outline-none focus:border-rose-600"
              >
                <option value="mantenimiento_parque">🌿 Mantenimiento Parque</option>
                <option value="combustible">⛽ Combustible / Nafta</option>
                <option value="servicios_sepelio">⚰️ Servicios de Sepelio</option>
                <option value="sueldos">👷 Sueldos / Jornales</option>
                <option value="materiales">🧱 Materiales e Insumos</option>
                <option value="servicios_publicos">💡 Servicios Públicos (Luz/Agua)</option>
                <option value="otros">📦 Otros Gastos Operativos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Método de Egreso (*)
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as any)}
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs bg-white focus:outline-none focus:border-rose-600"
              >
                <option value="efectivo">💵 Efectivo de Mostrador</option>
                <option value="transferencia">🏦 Transferencia / Débito Bancario</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Monto del Egreso ($) (*)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-rose-700 text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 border border-outline-variant rounded-xl text-sm font-bold text-rose-800 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                N° Factura / Comprobante
              </label>
              <input
                type="text"
                placeholder="ej. FAC-A-0001-00248"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs focus:outline-none focus:border-rose-600 font-code-cadastral"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">info</span>
            <span>
              Este monto se deducirá del total disponible en el arqueo y balance neto de caja de la administración.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Guardar Egreso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

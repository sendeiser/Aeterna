import React, { useState, useEffect } from 'react'

export interface CobroCajaData {
  titularNombre: string
  concepto: string
  monto: number
  metodo: 'efectivo' | 'transferencia_qr'
  nroRecibo: string
  identificador?: string
}

interface CobroCajaModalProps {
  isOpen: boolean
  onClose: () => void
  onGuardarCobro: (cobro: CobroCajaData) => void
}

export const CobroCajaModal: React.FC<CobroCajaModalProps> = ({
  isOpen,
  onClose,
  onGuardarCobro,
}) => {
  const [titularNombre, setTitularNombre] = useState('')
  const [concepto, setConcepto] = useState('Cobro General de Servicios')
  const [monto, setMonto] = useState<number | ''>(18000)
  const [metodo, setMetodo] = useState<'efectivo' | 'transferencia_qr'>('efectivo')
  const [nroRecibo, setNroRecibo] = useState('')
  const [identificador, setIdentificador] = useState('Caja Central')

  useEffect(() => {
    if (isOpen) {
      setNroRecibo(`REC-${Date.now().toString().slice(-6)}`)
      setTitularNombre('')
      setConcepto('Cobro General de Servicios')
      setMonto(18000)
      setMetodo('efectivo')
      setIdentificador('Caja Central')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!titularNombre.trim()) {
      alert('Por favor ingrese el nombre del titular o pagador.')
      return
    }
    if (!concepto.trim()) {
      alert('Por favor ingrese el concepto del cobro.')
      return
    }
    if (!monto || Number(monto) <= 0) {
      alert('Por favor ingrese un monto válido mayor a $0.')
      return
    }

    onGuardarCobro({
      titularNombre: titularNombre.trim(),
      concepto: concepto.trim(),
      monto: Number(monto),
      metodo,
      nroRecibo: nroRecibo.trim() || `REC-${Date.now().toString().slice(-6)}`,
      identificador: identificador.trim() || 'Caja Central',
    })

    onClose()
  }

  const quickAmounts = [10000, 15000, 18000, 25000, 50000]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-on-surface flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl">add_card</span>
            <div>
              <h3 className="font-bold text-base">Nuevo Cobro / Ingreso a Caja</h3>
              <p className="text-xs text-emerald-100">
                Registro de pago en caja diaria con emisión de recibo oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Titular / Contribuyente / Pagador (*)
            </label>
            <input
              type="text"
              required
              placeholder="ej. Familia Gómez, Carlos Alberto Páez, etc."
              value={titularNombre}
              onChange={(e) => setTitularNombre(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Concepto del Ingreso (*)
            </label>
            <input
              type="text"
              required
              placeholder="ej. Cobro de arancel de mantenimiento, derechos de inhumación..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Importe Total ($ ARS) (*)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-emerald-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Método de Cobro
              </label>
              <select
                value={metodo}
                onChange={(e) => setMetodo(e.target.value as any)}
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 bg-surface"
              >
                <option value="efectivo">💵 Efectivo en Caja</option>
                <option value="transferencia_qr">📱 QR / Transferencia Digital</option>
              </select>
            </div>
          </div>

          {/* Botones de montos sugeridos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 mr-1">Sugeridos:</span>
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setMonto(q)}
                className="px-2 py-0.5 text-xs rounded-md border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 transition-colors text-slate-700"
              >
                ${q.toLocaleString('es-AR')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                N° de Recibo Oficial
              </label>
              <input
                type="text"
                value={nroRecibo}
                onChange={(e) => setNroRecibo(e.target.value)}
                placeholder="REC-XXXXXX"
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Referencia / Identificador
              </label>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="ej. Parcela A-01-02, Seguro #14..."
                className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Confirmar y Asentar Ingreso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

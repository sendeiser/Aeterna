import React, { useState, useEffect, useRef } from 'react'

export interface SearchResultItem {
  id: string
  type: 'parcela' | 'difunto' | 'afiliado'
  title: string
  subtitle: string
  extra?: string
  badge: string
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'rose'
  item?: any
  rawItem?: any
}

interface OmniboxSearchProps {
  isOpen: boolean
  onClose: () => void
  items: SearchResultItem[]
  onSelectItem: (item: SearchResultItem) => void
}

export const OmniboxSearch: React.FC<OmniboxSearchProps> = ({
  isOpen,
  onClose,
  items,
  onSelectItem,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Manejo de atajo Ctrl+K global y Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.extra && item.extra.toLowerCase().includes(q)) ||
          item.badge.toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : items.slice(0, 6)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      onSelectItem(filtered[selectedIndex])
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden text-on-surface">
        {/* Input box */}
        <div className="flex items-center px-4 py-3 border-b border-outline-variant gap-3 bg-white">
          <span className="material-symbols-outlined text-secondary text-[22px] shrink-0">search</span>
          <input
            id="modal-omnibox-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por titular, nomenclatura (A-25-96), difunto o afiliado..."
            className="w-full bg-transparent text-sm sm:text-base text-on-surface placeholder:text-outline focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-outline hover:text-on-surface p-1">
              <span className="material-symbols-outlined text-[18px]">backspace</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[11px] font-mono font-semibold bg-surface-container border border-outline-variant/80 hover:bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant"
          >
            ESC
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/40 custom-scroll">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-outline">
              <span className="material-symbols-outlined text-[36px] mx-auto mb-2 text-outline/60">
                search_off
              </span>
              <p className="text-sm font-semibold">No se encontraron resultados para "{query}"</p>
              <p className="text-xs text-outline mt-1">Prueba buscando por apellido o número de parcela (ej. A-25-96)</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    onSelectItem(item)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 sm:px-4 sm:py-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 text-primary border-l-4 border-l-primary' : 'hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                      {item.type === 'parcela' && <span className="material-symbols-outlined text-[18px]">domain</span>}
                      {item.type === 'difunto' && <span className="material-symbols-outlined text-[18px]">calendar_month</span>}
                      {item.type === 'afiliado' && <span className="material-symbols-outlined text-[18px]">security</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{item.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                            item.type === 'parcela'
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : item.type === 'difunto'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  {item.extra && (
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-xs font-mono font-bold text-primary">{item.extra}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-surface-container-low border-t border-outline-variant text-[11px] text-outline flex items-center justify-between px-4">
          <span>Usa ↑ ↓ para navegar y Enter para seleccionar</span>
          <span className="hidden sm:inline font-mono">Chamical · Aeterna Catastro</span>
        </div>
      </div>
    </div>
  )
}

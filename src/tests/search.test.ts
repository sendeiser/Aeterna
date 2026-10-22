import { describe, it, expect } from 'vitest'

interface SearchItem {
  type: 'parcela' | 'difunto' | 'afiliado'
  id: string
  title: string
  subtitle: string
  badge: string
}

function filterSearch(items: SearchItem[], query: string): SearchItem[] {
  const cleanQ = query.trim().toLowerCase()
  if (!cleanQ) return []
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(cleanQ) ||
      item.subtitle.toLowerCase().includes(cleanQ) ||
      item.badge.toLowerCase().includes(cleanQ)
  )
}

describe('Search test', () => {
  const sampleItems: SearchItem[] = [
    { type: 'parcela', id: '1', title: 'A-25-96', subtitle: 'Aballay de Rodriguez Ester', badge: 'En Mora' },
    { type: 'parcela', id: '2', title: 'E-13-127', subtitle: 'Aguero Carlos Miguel', badge: 'Al Día' },
    { type: 'difunto', id: '3', title: 'Alsina Sixto', subtitle: 'Sector Salinas', badge: 'COVID-19' },
    { type: 'afiliado', id: '4', title: 'Moreno Luciana', subtitle: 'Loma Blanca 161', badge: 'Afiliado #1' }
  ]

  it('filters by nomenclatura case-insensitively', () => {
    const results = filterSearch(sampleItems, 'a-25')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('A-25-96')
  })

  it('filters by titular surname', () => {
    const results = filterSearch(sampleItems, 'aballay')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('A-25-96')
  })

  it('filters by badge or keyword like covid', () => {
    const results = filterSearch(sampleItems, 'covid')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Alsina Sixto')
  })
})

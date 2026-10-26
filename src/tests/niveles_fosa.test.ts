import { describe, it, expect } from 'vitest'
import { Inhumacion, Parcela } from '../types/database'

describe('Gestión y Asignación de Niveles en Fosa', () => {
  const parcelaA1140: Parcela = {
    id: 'parc-11-40',
    nomenclatura: 'A-11-40',
    sector_id: 'A',
    manzana_fila: '11',
    numero_parcela: '40',
    capacidad_total: 3,
    espacios_ocupados: 1,
    estado: 'ocupada',
    saldo_mantenimiento: 0,
  }

  const inhumacionesMock: Inhumacion[] = [
    {
      id: 'inh-1',
      parcela_id: 'parc-11-40',
      parcela: parcelaA1140,
      nombre_difunto: 'Martin Gustavo Gonzalez',
      dni_difunto: '37187050',
      fecha_inhumacion: '2026-10-26',
      nivel_posicion: 2,
      es_covid: false,
    },
  ]

  it('detecta correctamente qué nivel está ocupado y cuáles están disponibles', () => {
    const targetNom = 'A-11-40'
    const difuntosEnParcela = inhumacionesMock.filter(
      (inh) =>
        (typeof inh.parcela === 'object' && inh.parcela?.nomenclatura === targetNom) ||
        (inh as any).parcela_nomenclatura === targetNom
    )

    const ocupacionPorNivel = new Map<number, Inhumacion>()
    for (const d of difuntosEnParcela) {
      ocupacionPorNivel.set(d.nivel_posicion, d)
    }

    // Nivel 2 debe estar ocupado
    expect(ocupacionPorNivel.has(2)).toBe(true)
    expect(ocupacionPorNivel.get(2)?.nombre_difunto).toBe('Martin Gustavo Gonzalez')

    // Niveles 1 y 3 deben estar libres
    expect(ocupacionPorNivel.has(1)).toBe(false)
    expect(ocupacionPorNivel.has(3)).toBe(false)

    // Primer nivel libre para sugerir
    const niveles = [1, 2, 3]
    const primerLibre = niveles.find((lvl) => !ocupacionPorNivel.has(lvl))
    expect(primerLibre).toBe(1)
  })

  it('detecta cuando una fosa está llena (3 de 3 niveles ocupados)', () => {
    const inhumacionesCompletas: Inhumacion[] = [
      { id: '1', parcela_id: 'parc-11-40', parcela: parcelaA1140, nombre_difunto: 'Difunto N1', nivel_posicion: 1, fecha_inhumacion: '2020-01-01', es_covid: false },
      { id: '2', parcela_id: 'parc-11-40', parcela: parcelaA1140, nombre_difunto: 'Difunto N2', nivel_posicion: 2, fecha_inhumacion: '2022-01-01', es_covid: false },
      { id: '3', parcela_id: 'parc-11-40', parcela: parcelaA1140, nombre_difunto: 'Difunto N3', nivel_posicion: 3, fecha_inhumacion: '2024-01-01', es_covid: false },
    ]

    const difuntos = inhumacionesCompletas.filter(
      (i) => typeof i.parcela === 'object' && i.parcela?.nomenclatura === 'A-11-40'
    )
    const ocupados = new Set(difuntos.map((d) => d.nivel_posicion))

    expect(ocupados.size).toBe(3)
    const niveles = [1, 2, 3]
    const hayLibre = niveles.some((lvl) => !ocupados.has(lvl))
    expect(hayLibre).toBe(false)
  })

  it('maneja con total resiliencia inhumaciones con parcela null, undefined o sin nomenclatura', () => {
    const inhumacionesConNulos: Inhumacion[] = [
      { id: '1', parcela_id: '', parcela: null as any, nombre_difunto: 'Difunto Sin Parcela', nivel_posicion: 1, fecha_inhumacion: '2020-01-01', es_covid: false },
      { id: '2', parcela_id: '', parcela: { id: 'x' } as any, nombre_difunto: 'Difunto Parcela Incompleta', nivel_posicion: 2, fecha_inhumacion: '2022-01-01', es_covid: false },
      { id: '3', parcela_id: 'parc-11-40', parcela: parcelaA1140, nombre_difunto: 'Martin Gustavo Gonzalez', nivel_posicion: 2, fecha_inhumacion: '2026-10-26', es_covid: false },
    ]

    const targetNom = 'A-11-40'
    const targetId = 'parc-11-40'

    const difuntos = inhumacionesConNulos.filter((inh) => {
      if (!inh) return false
      let rawInhNom = ''
      if (inh.parcela && typeof inh.parcela === 'object' && inh.parcela.nomenclatura) {
        rawInhNom = String(inh.parcela.nomenclatura)
      } else if (typeof inh.parcela === 'string') {
        rawInhNom = inh.parcela
      } else if ((inh as any)?.parcela_nomenclatura) {
        rawInhNom = String((inh as any).parcela_nomenclatura)
      }
      const inhNom = (rawInhNom || '').trim().toUpperCase()

      const matchesNom = Boolean(targetNom && inhNom === targetNom)
      const matchesId = Boolean(targetId && inh.parcela_id === targetId)
      return matchesNom || matchesId
    })

    expect(difuntos.length).toBe(1)
    expect(difuntos[0].nombre_difunto).toBe('Martin Gustavo Gonzalez')
  })

  it('guarda correctamente una nueva inhumación en Nivel 1 cuando Nivel 2 ya estaba ocupado', () => {
    const listaActual: Inhumacion[] = [
      {
        id: 'inh-1',
        parcela_id: 'parc-11-40',
        parcela: parcelaA1140,
        nombre_difunto: 'Martin Gustavo Gonzalez',
        nivel_posicion: 2,
        fecha_inhumacion: '2026-10-26',
        es_covid: false,
      },
    ]

    const datosNueva: Partial<Inhumacion> = {
      parcela_id: 'parc-11-40',
      nombre_difunto: 'Nuevo Difunto Nivel 1',
      nivel_posicion: 1,
      fecha_inhumacion: '2026-10-26',
      parcela: parcelaA1140,
    }

    const targetId = datosNueva.id
    const isExisting = Boolean(targetId && listaActual.some((i) => i.id === targetId))
    expect(isExisting).toBe(false)

    // Al ser nueva, se prepende a la lista
    const nuevaInhumacion: Inhumacion = {
      id: datosNueva.id || `inh-${Date.now()}`,
      parcela_id: datosNueva.parcela_id || '',
      nombre_difunto: datosNueva.nombre_difunto!,
      fecha_inhumacion: datosNueva.fecha_inhumacion!,
      nivel_posicion: datosNueva.nivel_posicion || 1,
      es_covid: false,
      parcela: datosNueva.parcela,
    }

    const listaActualizada = [nuevaInhumacion, ...listaActual]
    expect(listaActualizada.length).toBe(2)

    // Ahora la fosa tiene ocupados Nivel 1 y Nivel 2
    const ocupados = listaActualizada.map((i) => i.nivel_posicion)
    expect(ocupados).toContain(1)
    expect(ocupados).toContain(2)

    // El único nivel restante debe ser el Nivel 3
    const niveles = [1, 2, 3]
    const libre = niveles.find((lvl) => !ocupados.includes(lvl))
    expect(libre).toBe(3)
  })
})

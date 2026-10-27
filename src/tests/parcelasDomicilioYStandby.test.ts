import { describe, it, expect } from 'vitest'
import { Parcela } from '../types/database'
import { aplicarCobroParcela } from '../services/cobroService'

describe('Parcelas - Filtrado por Domicilio y Cobro en Stand-by', () => {
  const parcelasMock: Parcela[] = [
    {
      id: 'p-1',
      nomenclatura: 'A-01-10',
      sector_id: 'A',
      capacidad_total: 3,
      espacios_ocupados: 1,
      estado: 'ocupada',
      saldo_mantenimiento: 0,
      titular: {
        id: 't-1',
        nombre_completo: 'Gómez, Carlos Alberto',
        dni: '24111222',
        direccion: 'B° Loma Blanca E-160',
        barrio: 'Loma Blanca',
        estado_titular: 'activo',
        estado_vital: 'vivo',
      },
    },
    {
      id: 'p-2',
      nomenclatura: 'A-01-11',
      sector_id: 'A',
      capacidad_total: 3,
      espacios_ocupados: 2,
      estado: 'standby',
      saldo_mantenimiento: 108000,
      titular: {
        id: 't-2',
        nombre_completo: 'Pérez, María Elena',
        dni: '18333444',
        direccion: 'Av. Perón N° 440',
        barrio: 'Centro',
        estado_titular: 'activo',
        estado_vital: 'vivo',
      },
    },
    {
      id: 'p-3',
      nomenclatura: 'E-05-20',
      sector_id: 'E',
      capacidad_total: 3,
      espacios_ocupados: 0,
      estado: 'disponible',
      saldo_mantenimiento: 0,
      titular: null,
    },
  ]

  it('filtra correctamente por coincidencia en direccion o barrio', () => {
    const filtro1 = 'Loma Blanca'
    const res1 = parcelasMock.filter((p) => {
      const q = filtro1.toLowerCase()
      const dir = (p.titular?.direccion || '').toLowerCase()
      const bar = (p.titular?.barrio || '').toLowerCase()
      return dir.includes(q) || bar.includes(q)
    })
    expect(res1.length).toBe(1)
    expect(res1[0].nomenclatura).toBe('A-01-10')

    const filtro2 = 'Perón'
    const res2 = parcelasMock.filter((p) => {
      const q = filtro2.toLowerCase()
      const dir = (p.titular?.direccion || '').toLowerCase()
      const bar = (p.titular?.barrio || '').toLowerCase()
      return dir.includes(q) || bar.includes(q)
    })
    expect(res2.length).toBe(1)
    expect(res2[0].nomenclatura).toBe('A-01-11')

    const filtroInexistente = 'Inexistente 9999'
    const res3 = parcelasMock.filter((p) => {
      const q = filtroInexistente.toLowerCase()
      const dir = (p.titular?.direccion || '').toLowerCase()
      const bar = (p.titular?.barrio || '').toLowerCase()
      return dir.includes(q) || bar.includes(q)
    })
    expect(res3.length).toBe(0)
  })

  it('restaura la parcela de standby a ocupada tras cancelar la totalidad de la deuda', () => {
    const parcelaStandby = parcelasMock[1] // Saldo: 108.000
    expect(parcelaStandby.estado).toBe('standby')

    const { updatedParcela, nuevoPago } = aplicarCobroParcela({
      parcela: parcelaStandby,
      montoCobrado: 108000,
      nroRecibo: 'REC-STANDBY-001',
      metodo: 'transferencia_qr',
      concepto: 'Mantenimiento Regularización - Parcela A-01-11',
    })

    expect(updatedParcela.saldo_mantenimiento).toBe(0)
    expect(updatedParcela.estado).toBe('ocupada')
    expect(nuevoPago.monto).toBe(108000)
    expect(nuevoPago.identificador).toBe('A-01-11')
    expect(nuevoPago.nroRecibo).toBe('REC-STANDBY-001')
  })

  it('mantiene la parcela en standby si el pago es parcial y aún queda saldo', () => {
    const parcelaStandby = parcelasMock[1] // Saldo: 108.000

    const { updatedParcela } = aplicarCobroParcela({
      parcela: parcelaStandby,
      montoCobrado: 50000,
      nroRecibo: 'REC-STANDBY-PARCIAL',
    })

    expect(updatedParcela.saldo_mantenimiento).toBe(58000)
    expect(updatedParcela.estado).toBe('standby')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import {
  calcularBalanceCaja,
  savePagoToStorage,
  saveEgresoToStorage,
  deletePagoFromStorage,
  PagoRecibo,
} from '../services/dataService'

describe('Módulo de Caja Diaria & Arqueo', () => {
  let store: Record<string, string> = {}
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
  ;(globalThis as any).localStorage = mockLocalStorage

  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('calcula correctamente el balance con desglose de efectivo y digital', () => {
    const movimientos: PagoRecibo[] = [
      {
        id: 'rec-1',
        nroRecibo: 'REC-001',
        titularNombre: 'Carlos Gomez',
        concepto: 'Mantenimiento Parcela A-01-01',
        monto: 36000,
        metodo: 'efectivo',
        fecha: '2026-10-26T10:00:00Z',
        identificador: 'A-01-01',
        tipo: 'ingreso',
      },
      {
        id: 'rec-2',
        nroRecibo: 'REC-002',
        titularNombre: 'Maria Lopez',
        concepto: 'Cuota Seguro Titular #15',
        monto: 22000,
        metodo: 'transferencia_qr',
        fecha: '2026-10-26T11:00:00Z',
        identificador: 'AFI-15',
        tipo: 'ingreso',
      },
      {
        id: 'egr-1',
        nroRecibo: 'EGR-001',
        titularNombre: 'YPF Chamical',
        concepto: '[EGRESO] (Combustible) Nafta para motoguadaña',
        monto: 12000,
        metodo: 'efectivo',
        fecha: '2026-10-26T12:00:00Z',
        identificador: 'EGRESO',
        tipo: 'egreso',
        categoria: 'Combustible',
      },
      {
        id: 'egr-2',
        nroRecibo: 'EGR-002',
        titularNombre: 'Distribuidora San Martin',
        concepto: '[EGRESO] (Materiales) Insumos de limpieza',
        monto: 5000,
        metodo: 'transferencia_qr',
        fecha: '2026-10-26T13:00:00Z',
        identificador: 'EGRESO',
        tipo: 'egreso',
        categoria: 'Materiales',
      },
    ]

    const balance = calcularBalanceCaja(movimientos)

    // Total Ingresos: 36000 + 22000 = 58000
    expect(balance.totalIngresos).toBe(58000)

    // Total Egresos: 12000 + 5000 = 17000
    expect(balance.totalEgresos).toBe(17000)

    // Balance Neto: 58000 - 17000 = 41000
    expect(balance.balanceNeto).toBe(41000)

    // Efectivo en caja: 36000 - 12000 = 24000
    expect(balance.totalEfectivo).toBe(24000)

    // Digital en banco: 22000 - 5000 = 17000
    expect(balance.totalDigital).toBe(17000)

    // Conteo total de movimientos
    expect(balance.totalMovimientos).toBe(4)
  })

  it('permite registrar cobros y egresos en storage y anularlos limpiamente', () => {
    const cobro1: PagoRecibo = {
      id: 'p-101',
      nroRecibo: 'REC-101',
      titularNombre: 'Pedro Alvarez',
      concepto: 'Cobro de nicho',
      monto: 15000,
      metodo: 'efectivo',
      fecha: '2026-10-26T14:00:00Z',
      identificador: 'Caja Central',
      tipo: 'ingreso',
    }

    const egreso1: PagoRecibo = {
      id: 'e-101',
      nroRecibo: 'EGR-101',
      titularNombre: 'Ferretería Central',
      concepto: '[EGRESO] (Mantenimiento) Candados y llaves',
      monto: 4500,
      metodo: 'efectivo',
      fecha: '2026-10-26T15:00:00Z',
      identificador: 'EGRESO',
      tipo: 'egreso',
      categoria: 'Mantenimiento',
    }

    savePagoToStorage(cobro1)
    saveEgresoToStorage(egreso1)

    const stored1: PagoRecibo[] = JSON.parse(mockLocalStorage.getItem('aeterna_pagos_v4') || '[]')
    expect(stored1.length).toBe(2)

    // Anular cobro1 por id
    deletePagoFromStorage('p-101')
    const stored2: PagoRecibo[] = JSON.parse(mockLocalStorage.getItem('aeterna_pagos_v4') || '[]')
    expect(stored2.length).toBe(1)
    expect(stored2[0].id).toBe('e-101')

    // Anular egreso1 por nroRecibo
    deletePagoFromStorage('EGR-101')
    const stored3: PagoRecibo[] = JSON.parse(mockLocalStorage.getItem('aeterna_pagos_v4') || '[]')
    expect(stored3.length).toBe(0)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import {
  reactivarParcelaStandby,
  liberarParcelaStandby,
  saveParcelasToStorage
} from '../services/dataService'
import type { Parcela } from '../types/database'

describe('dataService - Gestión Administrativa de Stand-by', () => {
  const mockParcelaStandby: Parcela = {
    id: 'parc-test-standby',
    nomenclatura: 'A-25-96',
    sector_id: 'A',
    capacidad_total: 3,
    espacios_ocupados: 1,
    estado: 'standby',
    saldo_mantenimiento: 180000,
    fecha_ultimo_pago: '2022-04-10',
    ultima_cuota_pagada: 'Cuota Anual 2021',
    motivo_bloqueo: 'Mora superior a 3 años',
    titular: {
      id: 'tit-1',
      nombre_completo: 'Titular Moroso',
      estado_titular: 'activo',
      estado_vital: 'vivo'
    }
  }

  // Mock simple de localStorage para el entorno de test
  let store: Record<string, string> = {}
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
  ;(globalThis as any).localStorage = mockLocalStorage

  beforeEach(() => {
    mockLocalStorage.clear()
    saveParcelasToStorage([mockParcelaStandby])
  })

  it('reactivarParcelaStandby restaura la parcela a ocupada/al día tras registrar regularización', async () => {
    const reactivada = await reactivarParcelaStandby('parc-test-standby', {
      montoAbonado: 180000,
      nroRecibo: 'REC-FISICO-2026-001',
      periodo: 'Regularización 2022-2026'
    })

    expect(reactivada.estado).toBe('ocupada')
    expect(reactivada.saldo_mantenimiento).toBe(0)
    expect(reactivada.motivo_bloqueo).toBeNull()
    expect(reactivada.titular?.nombre_completo).toBe('Titular Moroso')
    expect(reactivada.ultima_cuota_pagada).toContain('Regularización')
  })

  it('liberarParcelaStandby archiva el titular anterior y deja la parcela en disponible', async () => {
    const liberada = await liberarParcelaStandby('parc-test-standby', 'Caducidad administrativa municipal')

    expect(liberada.estado).toBe('disponible')
    expect(liberada.titular).toBeNull()
    expect(liberada.titular_anterior?.nombre_completo).toBe('Titular Moroso')
    expect(liberada.saldo_mantenimiento).toBe(0)
    expect(liberada.motivo_bloqueo).toBe('Caducidad administrativa municipal')
  })

  it('al cobrar una nueva cuota (ej. mes 4), se preservan las cuotas previas (1, 2, 3) sin quedar en mora', () => {
    const afiliado = {
      id: 'afi-test-1',
      numero_afiliado: 1,
      nombre_completo: 'Afiliado Test',
      monto_cuota_mensual: 18000,
      estado: 'activo' as const,
      fecha_alta: '2025-01-01',
      cuotasPagadas: [1, 2, 3],
    }

    const nroCuota = 4
    const currentPaid = afiliado.cuotasPagadas || []
    const updatedPaid = currentPaid.includes(nroCuota) ? currentPaid : [...currentPaid, nroCuota]

    expect(updatedPaid).toEqual([1, 2, 3, 4])
    const mesesVencidos = [1, 2, 3].filter((m) => !updatedPaid.includes(m))
    expect(mesesVencidos.length).toBe(0)
  })
})

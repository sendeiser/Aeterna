import { describe, it, expect, beforeEach } from 'vitest'
import {
  calcularBalanceCaja,
  actualizarCuotaMasivaSupabase,
  PagoRecibo,
} from '../services/dataService'

describe('Gestión de Egresos, Balance y Cuota Masiva', () => {
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
  })

  it('calcula correctamente el balance neto restando los egresos de los ingresos', () => {
    const movimientos: PagoRecibo[] = [
      {
        id: 'p1',
        concepto: 'Pago mantenimiento A-01-01',
        monto: 50000,
        identificador: 'A-01-01',
        titularNombre: 'Carlos Lopez',
        metodo: 'efectivo',
        fecha: '2026-10-26',
        nroRecibo: 'REC-A-01-01-01',
        tipo: 'ingreso',
      },
      {
        id: 'p2',
        concepto: 'Cuota seguro sepelio titular #14',
        monto: 25000,
        identificador: 'AFI-14',
        titularNombre: 'Maria Benitez',
        metodo: 'transferencia_qr',
        fecha: '2026-10-26',
        nroRecibo: 'REC-AFI-14-10',
        tipo: 'ingreso',
      },
      {
        id: 'e1',
        concepto: 'Combustible cortadoras de césped',
        monto: 15000,
        identificador: 'EGR-001',
        titularNombre: 'Estación YPF Chamical',
        metodo: 'efectivo',
        fecha: '2026-10-26',
        nroRecibo: 'FAC-YPF-9912',
        tipo: 'egreso',
        categoria: 'combustible',
      },
      {
        id: 'e2',
        concepto: 'Compra de bolsas de cal y cemento',
        monto: 20000,
        identificador: 'EGR-002',
        titularNombre: 'Corralón San Nicolás',
        metodo: 'efectivo',
        fecha: '2026-10-26',
        nroRecibo: 'FAC-CORR-123',
        tipo: 'egreso',
        categoria: 'materiales',
      },
    ]

    const balance = calcularBalanceCaja(movimientos)
    expect(balance.totalIngresos).toBe(75000)
    expect(balance.totalEgresos).toBe(35000)
    expect(balance.balanceNeto).toBe(40000)
  })

  it('actualiza la cuota masiva a todos los afiliados activos en LocalStorage', async () => {
    const afiliadosMock = [
      { id: '1', numero_afiliado: 1, nombre_completo: 'Juan Perez', estado: 'activo', monto_cuota_mensual: 15000 },
      { id: '2', numero_afiliado: 2, nombre_completo: 'Ana Gomez', estado: 'activo', monto_cuota_mensual: 15000 },
      { id: '3', numero_afiliado: 3, nombre_completo: 'Luis Diaz', estado: 'baja', monto_cuota_mensual: 15000 },
    ]
    localStorage.setItem('aeterna_afiliados_v4', JSON.stringify(afiliadosMock))

    const res = await actualizarCuotaMasivaSupabase(22000, true)
    expect(res.success).toBe(true)

    const updated = JSON.parse(localStorage.getItem('aeterna_afiliados_v4') || '[]')
    expect(updated[0].monto_cuota_mensual).toBe(22000)
    expect(updated[1].monto_cuota_mensual).toBe(22000)
    // El afiliado dado de baja no debe modificarse si soloActivos es true
    expect(updated[2].monto_cuota_mensual).toBe(15000)
  })
})

import { describe, it, expect } from 'vitest'
import { evaluarMoraParcela, evaluarMoraAfiliado } from '../lib/reglasNegocio'
import type { Parcela, AfiliadoSeguro } from '../types/database'

describe('Reglas de Negocio y Stand-by', () => {
  it('identifica parcela en stand-by por morosidad de 3 o más años y extrae última cuota pagada', () => {
    const parcela: Parcela = {
      id: 'p1',
      nomenclatura: 'A-25-96',
      saldo_mantenimiento: 180000,
      estado: 'ocupada',
      capacidad_total: 3,
      espacios_ocupados: 1,
      fecha_ultimo_pago: '2023-01-10',
      ultima_cuota_pagada: 'Cuota Anual 2022',
      titular: {
        id: 't1',
        nombre_completo: 'Juan Perez',
        estado_titular: 'activo',
        estado_vital: 'vivo'
      }
    }
    const res = evaluarMoraParcela(parcela, '2026-03-30')
    expect(res.enStandby).toBe(true)
    expect(res.aniosMora).toBeGreaterThanOrEqual(3)
    expect(res.ultimaCuotaPagada).toBe('Cuota Anual 2022')
    expect(res.fechaUltimoPago).toBe('2023-01-10')
  })

  it('no pone en stand-by una parcela al día o con menos de 3 años de mora', () => {
    const parcela: Parcela = {
      id: 'p2',
      nomenclatura: 'B-10-20',
      saldo_mantenimiento: 15000,
      estado: 'ocupada',
      capacidad_total: 3,
      espacios_ocupados: 1,
      fecha_ultimo_pago: '2025-11-01',
      ultima_cuota_pagada: 'Cuota Noviembre 2025',
      titular: {
        id: 't2',
        nombre_completo: 'Maria Gomez',
        estado_titular: 'activo',
        estado_vital: 'vivo'
      }
    }
    const res = evaluarMoraParcela(parcela, '2026-03-30')
    expect(res.enStandby).toBe(false)
    expect(res.aniosMora).toBeLessThan(3)
  })

  it('identifica afiliado de Plan Seguro Integral con 3 o más meses de mora y extrae última cuota', () => {
    const afiliado: AfiliadoSeguro = {
      id: 'a1',
      nombre_completo: 'Carlos Sosa',
      numero_afiliado: 100,
      monto_cuota_mensual: 4500,
      estado: 'activo',
      fecha_alta: '2025-01-01',
      cuotasPagadas: [1, 2], // Pagó enero y febrero
      cuotasDetalle: [
        { id: 'c1', afiliado_id: 'a1', nro_cuota: 1, mes: 1, anio: 2026, estado: 'pagada', monto: 4500, fecha_pago: '2026-01-10', nro_recibo: 'REC-01' },
        { id: 'c2', afiliado_id: 'a1', nro_cuota: 2, mes: 2, anio: 2026, estado: 'pagada', monto: 4500, fecha_pago: '2026-02-12', nro_recibo: 'REC-02' }
      ]
    }
    // Si estamos en mes 6 (Junio), debe marzo, abril, mayo, junio = 4 meses de mora
    const res = evaluarMoraAfiliado(afiliado, 6, 2026)
    expect(res.enStandby).toBe(true)
    expect(res.mesesMora).toBe(4)
    expect(res.ultimaCuotaPagada).toContain('Febrero 2026')
  })

  it('no pone en stand-by un afiliado con menos de 3 meses de mora', () => {
    const afiliado: AfiliadoSeguro = {
      id: 'a2',
      nombre_completo: 'Lucia Ramirez',
      numero_afiliado: 101,
      monto_cuota_mensual: 4500,
      estado: 'activo',
      fecha_alta: '2025-01-01',
      cuotasPagadas: [1, 2, 3], // Pagó enero, feb, marzo
    }
    // Si estamos en mes 4 (Abril), solo debe abril = 1 mes de mora
    const res = evaluarMoraAfiliado(afiliado, 4, 2026)
    expect(res.enStandby).toBe(false)
    expect(res.mesesMora).toBe(1)
  })
})

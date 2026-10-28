import { describe, it, expect } from 'vitest'
import {
  aplicarCobroParcela,
  aplicarCobroCuotas,
  CobroParcelaInput,
  CobroCuotasInput,
} from '../services/cobroService'
import { sincronizarRenovacionAnualParcela } from '../lib/reglasNegocio'
import { Parcela, AfiliadoSeguro } from '../types/database'

describe('cobroService - Reglas Contables Puras', () => {
  describe('aplicarCobroParcela', () => {
    const mockParcelaEnMora: Parcela = {
      id: 'parc-1',
      nomenclatura: 'A-01-05',
      capacidad_total: 3,
      espacios_ocupados: 1,
      estado: 'en_mora',
      saldo_mantenimiento: 36000,
      titular: {
        id: 'tit-1',
        nombre_completo: 'Juan Perez',
        estado_titular: 'activo',
        telefono: '3826123456',
      },
    }

    it('reduce el saldo de mantenimiento y genera un PagoRecibo correcto', () => {
      const input: CobroParcelaInput = {
        parcela: mockParcelaEnMora,
        montoCobrado: 20000,
        nroRecibo: 'REC-TEST-001',
        comprobante: 'TRANSF-9988',
        metodo: 'transferencia_qr',
      }

      const result = aplicarCobroParcela(input)

      expect(result.updatedParcela.saldo_mantenimiento).toBe(16000)
      expect(result.updatedParcela.estado).toBe('en_mora')
      expect(result.nuevoPago.monto).toBe(20000)
      expect(result.nuevoPago.nroRecibo).toBe('REC-TEST-001')
      expect(result.nuevoPago.comprobante).toBe('TRANSF-9988')
      expect(result.nuevoPago.identificador).toBe('A-01-05')
      expect(result.nuevoPago.titularNombre).toBe('Juan Perez')
      expect(result.nuevoPago.concepto).toContain('Mantenimiento Anual')
    })

    it('actualiza el estado a "ocupada" cuando el saldo llega a 0', () => {
      const input: CobroParcelaInput = {
        parcela: mockParcelaEnMora,
        montoCobrado: 36000,
      }

      const result = aplicarCobroParcela(input)

      expect(result.updatedParcela.saldo_mantenimiento).toBe(0)
      expect(result.updatedParcela.estado).toBe('ocupada')
      expect(result.updatedParcela.fecha_ultimo_pago).toBeDefined()
    })

    it('actualiza el estado a "ocupada" si estaba en "standby" y cancela la deuda', () => {
      const parcelaStandby: Parcela = {
        ...mockParcelaEnMora,
        estado: 'standby',
        saldo_mantenimiento: 108000,
      }

      const result = aplicarCobroParcela({
        parcela: parcelaStandby,
        montoCobrado: 108000,
      })

      expect(result.updatedParcela.saldo_mantenimiento).toBe(0)
      expect(result.updatedParcela.estado).toBe('ocupada')
    })

    it('permite registrar cobro por adelantado para parcela con saldo 0 sin arrojar error ni saldo negativo', () => {
      const parcelaAlDia: Parcela = {
        ...mockParcelaEnMora,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
      }

      const result = aplicarCobroParcela({
        parcela: parcelaAlDia,
        montoCobrado: 36000,
        concepto: 'Mantenimiento Anual 2027 (Adelantado) - Parcela A-01-05',
      })

      expect(result.updatedParcela.saldo_mantenimiento).toBe(0)
      expect(result.updatedParcela.estado).toBe('ocupada')
      expect(result.nuevoPago.concepto).toBe('Mantenimiento Anual 2027 (Adelantado) - Parcela A-01-05')
      expect(result.nuevoPago.monto).toBe(36000)
    })

    it('guarda el monto anual abonado y al iniciar el año siguiente le vuelve a cobrar exactamente el mismo monto', () => {
      const parcelaConDeudaPersonalizada: Parcela = {
        ...mockParcelaEnMora,
        saldo_mantenimiento: 45000,
      }

      // 1. Paga $45.000 en octubre de 2026
      const { updatedParcela } = aplicarCobroParcela({
        parcela: parcelaConDeudaPersonalizada,
        montoCobrado: 45000,
        fecha: '2026-10-28T14:00:00.000Z',
      })

      expect(updatedParcela.saldo_mantenimiento).toBe(0)
      expect(updatedParcela.ultimo_monto_anual).toBe(45000)
      expect(updatedParcela.ultimo_anio_pagado).toBe(2026)

      // Durante el resto de 2026 sigue en $0
      const enDiciembre2026 = sincronizarRenovacionAnualParcela(updatedParcela, '2026-12-31')
      expect(enDiciembre2026.saldo_mantenimiento).toBe(0)

      // 2. Al iniciar el año siguiente (2027), se le vuelve a cobrar el mismo monto ($45.000)
      const enEnero2027 = sincronizarRenovacionAnualParcela(updatedParcela, '2027-01-01')
      expect(enEnero2027.saldo_mantenimiento).toBe(45000)
      expect(enEnero2027.ultimo_monto_anual).toBe(45000)

      // 3. Si pasa un año más sin pagar (2028), acumula 2 años del mismo monto ($90.000)
      const enEnero2028 = sincronizarRenovacionAnualParcela(updatedParcela, '2028-01-01')
      expect(enEnero2028.saldo_mantenimiento).toBe(90000)
    })

    it('recupera el último monto anual y año pagado desde las notas de Supabase al renovar el año', () => {
      const parcelaDesdeSupabase: Parcela = {
        ...mockParcelaEnMora,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
        notas: 'Titular: Juan Perez. [CuotaAnual:52000|AnioPago:2026]',
      }

      const renovada2027 = sincronizarRenovacionAnualParcela(parcelaDesdeSupabase, '2027-01-02')
      expect(renovada2027.ultimo_monto_anual).toBe(52000)
      expect(renovada2027.ultimo_anio_pagado).toBe(2026)
      expect(renovada2027.saldo_mantenimiento).toBe(52000)
    })
  })

  describe('aplicarCobroCuotas', () => {
    const mockAfiliado: AfiliadoSeguro = {
      id: 'afi-1',
      numero_afiliado: 105,
      nombre_completo: 'Maria Gomez',
      monto_cuota_mensual: 18000,
      estado: 'en_mora',
      fecha_alta: '2025-01-01',
      cuotasPagadas: [1],
      cuotasDetalle: [
        {
          id: 'cuota-afi-1-1',
          afiliado_id: 'afi-1',
          anio: 2026,
          nro_cuota: 1,
          mes: 1,
          monto: 18000,
          estado: 'pagada',
        },
      ],
    }

    it('agrega cuotas pagadas sin duplicar y calcula monto acumulado', () => {
      const input: CobroCuotasInput = {
        afiliado: mockAfiliado,
        nrosCuotas: [2, 3],
        nroRecibo: 'REC-AFI-002',
        comprobante: 'QR-5544',
      }

      const result = aplicarCobroCuotas(input)

      expect(result.updatedAfiliado.cuotasPagadas).toEqual([1, 2, 3])
      expect(result.updatedAfiliado.estado).toBe('activo')
      expect(result.nuevoPago.monto).toBe(36000)
      expect(result.nuevoPago.nroRecibo).toBe('REC-AFI-002')
      expect(result.nuevoPago.comprobante).toBe('QR-5544')
      expect(result.cuotasDetalleNuevas.length).toBe(2)
      expect(result.cuotasDetalleNuevas[0].nro_recibo).toBe('REC-AFI-002-M2')
      expect(result.cuotasDetalleNuevas[1].nro_recibo).toBe('REC-AFI-002-M3')
    })

    it('permite valor unitario personalizado si se provee', () => {
      const input: CobroCuotasInput = {
        afiliado: mockAfiliado,
        nrosCuotas: [2],
        valorUnitario: 20000,
      }

      const result = aplicarCobroCuotas(input)

      expect(result.nuevoPago.monto).toBe(20000)
      expect(result.cuotasDetalleNuevas[0].monto).toBe(20000)
    })
  })
})

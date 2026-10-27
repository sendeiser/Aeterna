import { describe, it, expect } from 'vitest'
import {
  aplicarCobroParcela,
  aplicarCobroCuotas,
  CobroParcelaInput,
  CobroCuotasInput,
} from '../services/cobroService'
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

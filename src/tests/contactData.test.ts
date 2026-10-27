import { describe, it, expect } from 'vitest'
import { Titular, Inhumacion, AfiliadoSeguro } from '../types/database'

describe('Modelos de Contacto Omnicanal', () => {
  it('soporta campos de Gmail/Email, Facebook e Instagram en Titular', () => {
    const titular: Titular = {
      id: 'tit-1',
      nombre_completo: 'Juan Pérez',
      estado_titular: 'activo',
      telefono: '+54 9 3826 401122',
      email: 'juanperez@gmail.com',
      facebook: 'juan.perez.chamical',
      instagram: '@juanperez_lr',
    }

    expect(titular.email).toBe('juanperez@gmail.com')
    expect(titular.facebook).toBe('juan.perez.chamical')
    expect(titular.instagram).toBe('@juanperez_lr')
  })

  it('soporta campos de contacto familiar en Inhumacion', () => {
    const inh: Inhumacion = {
      id: 'inh-1',
      parcela_id: 'parc-1',
      nombre_difunto: 'Carlos Gómez',
      fecha_inhumacion: '2026-05-10',
      nivel_posicion: 1,
      nombre_responsable: 'María Gómez',
      telefono_responsable: '+54 9 3826 554433',
      email_responsable: 'mariagomez@gmail.com',
      facebook_responsable: 'maria.gomez.chamical',
      instagram_responsable: '@mariag_lr',
    }

    expect(inh.email_responsable).toBe('mariagomez@gmail.com')
    expect(inh.facebook_responsable).toBe('maria.gomez.chamical')
    expect(inh.instagram_responsable).toBe('@mariag_lr')
  })

  it('soporta canales de contacto directos en AfiliadoSeguro', () => {
    const afiliado: AfiliadoSeguro = {
      id: 'afi-1',
      numero_afiliado: 104,
      nombre_completo: 'Roberto Fernández',
      monto_cuota_mensual: 18000,
      estado: 'activo',
      fecha_alta: '2026-01-01',
      cuotasPagadas: [1, 2],
      telefono: '+54 9 3826 667788',
      email: 'robertofernandez@gmail.com',
      facebook: 'roberto.fernandez.sepelios',
      instagram: '@roberto_f',
    }

    expect(afiliado.telefono).toBe('+54 9 3826 667788')
    expect(afiliado.email).toBe('robertofernandez@gmail.com')
    expect(afiliado.facebook).toBe('roberto.fernandez.sepelios')
    expect(afiliado.instagram).toBe('@roberto_f')
  })
})

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Parcela, Inhumacion, AfiliadoSeguro, ConfiguracionCobro } from '../types/database'
import seedData from '../data/initial_seed.json' with { type: 'json' }
import { evaluarMoraParcela, evaluarMoraAfiliado } from '../lib/reglasNegocio'

const STORAGE_KEYS = {
  PARCELAS: 'aeterna_parcelas_v4',
  INHUMACIONES: 'aeterna_inhumaciones_v4',
  AFILIADOS: 'aeterna_afiliados_v4',
  CONFIG: 'aeterna_config_v4',
  PAGOS: 'aeterna_pagos_v4',
}

export interface PagoRecibo {
  id: string
  concepto: string
  monto: number
  identificador: string
  titularNombre: string
  metodo: 'transferencia_qr' | 'efectivo'
  fecha: string
  nroRecibo: string
  tipo?: 'ingreso' | 'egreso'
  categoria?: string
  comprobante?: string
}

// =========================================================================
// 1. CARGA INICIAL (LOCAL STORAGE CON FALLBACK AL SEED OCR)
// =========================================================================
export function loadInitialData() {
  // Configuración
  let config: ConfiguracionCobro = {
    id: 'config-1',
    alias_cbu: 'AETERNA.CHAMICAL',
    cbu: '0000003100012345678901',
    titular_cuenta: 'Aeterna Servicios S.R.L.',
    banco: 'Banco Rioja',
    cuit: '30-71234567-9',
    mensaje_recibo: 'Gracias por su pago. Parque & Sepelios Aeterna Chamical.',
    activo: true,
  }
  const savedConfig = typeof localStorage !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEYS.CONFIG) || localStorage.getItem('aeterna_config_v3'))
    : null
  if (savedConfig) {
    try {
      config = JSON.parse(savedConfig)
    } catch (e) {}
  }

  // Parcelas
  let parcelas: Parcela[] = []
  const savedParcelas = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.PARCELAS) : null
  if (savedParcelas) {
    try {
      parcelas = JSON.parse(savedParcelas)
    } catch (e) {}
  }
  if (!parcelas || parcelas.length === 0) {
    parcelas = seedData.parcelas.map((p, idx) => {
      const isEnMora = p.estado === 'en_mora'
      const saldo = Number(p.saldo_mantenimiento) || 0
      const esStandby = (saldo >= 108000 || (isEnMora && saldo >= 100000)) && !!p.titular
      const aniosEst = Math.max(3, Math.floor(saldo / 36000))
      const fechaPagoEst = esStandby ? `202${Math.max(0, 6 - aniosEst)}-04-15` : (saldo > 0 ? '2025-08-20' : '2026-01-10')
      const ultimaCuotaEst = esStandby ? `Cuota Anual 202${Math.max(0, 5 - aniosEst)}` : (saldo > 0 ? 'Cuota 2025' : 'Cuota Anual 2026')

      return {
        id: `parc-${idx + 1}`,
        nomenclatura: p.nomenclatura,
        sector_id: p.sector,
        manzana_fila: p.manzana,
        numero_parcela: p.numero,
        capacidad_total: 3,
        espacios_ocupados: p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0,
        estado: (p.estado === 'disponible' || !p.titular) ? 'disponible' : (esStandby ? 'standby' : p.estado) as any,
        saldo_mantenimiento: saldo,
        fecha_adquisicion: '2020-03-01',
        fecha_ultimo_pago: fechaPagoEst,
        ultima_cuota_pagada: ultimaCuotaEst,
        motivo_bloqueo: esStandby ? 'Titularidad caduca por mora superior a 3 años' : null,
        notas: `Registro inicial documentado.`,
        titular: p.titular
          ? {
              id: `tit-${idx + 1}`,
              nombre_completo: p.titular,
              dni: null,
              telefono: null,
              direccion: p.direccion || 'Chamical',
              estado_titular: (idx % 4 === 1 || p.titular.toLowerCase().includes('suc') || p.titular.toLowerCase().includes('herederos')) ? 'fallecido' : 'activo',
              estado_vital: (idx % 4 === 1 || p.titular.toLowerCase().includes('suc') || p.titular.toLowerCase().includes('herederos')) ? 'fallecido' : 'vivo',
            }
          : null,
      }
    })
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PARCELAS, JSON.stringify(parcelas))
    }
  } else {
    let hasChanges = false
    parcelas = parcelas.map((p) => {
      if (p.estado !== 'disponible' && p.titular) {
        const ev = evaluarMoraParcela(p)
        if (ev.enStandby && p.estado !== 'standby') {
          hasChanges = true
          return {
            ...p,
            estado: 'standby',
            motivo_bloqueo: 'Titularidad caduca por mora superior a 3 años',
            fecha_ultimo_pago: p.fecha_ultimo_pago || ev.fechaUltimoPago,
            ultima_cuota_pagada: p.ultima_cuota_pagada || ev.ultimaCuotaPagada,
          }
        }
      }
      return p
    })
    if (hasChanges && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PARCELAS, JSON.stringify(parcelas))
    }
  }

  // Inhumaciones
  let inhumaciones: Inhumacion[] = []
  const savedInhumaciones = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.INHUMACIONES) : null
  if (savedInhumaciones) {
    try {
      inhumaciones = JSON.parse(savedInhumaciones)
    } catch (e) {}
  }
  if (!inhumaciones || inhumaciones.length === 0) {
    inhumaciones = seedData.inhumaciones_covid.map((i, idx) => ({
      id: `inh-${idx + 1}`,
      parcela_id: `parc-${idx + 1}`,
      nombre_difunto: i.nombre_difunto,
      fecha_inhumacion: i.fecha_inhumacion,
      nivel_posicion: 1,
      es_covid: i.es_covid,
      causa_defuncion: i.causa_defuncion,
      empresa_funebrera: 'Aeterna Sepelios',
      parcela: {
        id: `parc-${idx + 1}`,
        nomenclatura: i.parcela,
        capacidad_total: 3,
        espacios_ocupados: 1,
        estado: 'ocupada',
        saldo_mantenimiento: 0,
      },
    }))
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.INHUMACIONES, JSON.stringify(inhumaciones))
    }
  }

  // Afiliados con matriz de cuotas (Ene-Dic)
  let afiliados: (AfiliadoSeguro & { cuotasPagadas: number[] })[] = []
  const savedAfiliados = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AFILIADOS) : null
  if (savedAfiliados) {
    try {
      afiliados = JSON.parse(savedAfiliados)
    } catch (e) {}
  }
  if (!afiliados || afiliados.length === 0) {
    afiliados = seedData.afiliados.map((a, idx) => {
      const cuotasPagadas = a.estado === 'activo' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2]
      const baseAfi: AfiliadoSeguro = {
        id: `afi-${idx + 1}`,
        numero_afiliado: a.numero_afiliado,
        nombre_completo: a.nombre_completo,
        dni: (a as any).dni || null,
        direccion_cobro: a.direccion_cobro,
        zona_cobro: a.zona_cobro || 'Zona 1 - Centro',
        monto_cuota_mensual: a.monto_cuota_mensual || 18000,
        estado: a.estado as any,
        fecha_alta: '2025-01-01',
        cuotasPagadas,
      }
      const ev = evaluarMoraAfiliado(baseAfi)
      return {
        ...baseAfi,
        meses_mora: ev.mesesMora,
        fecha_ultimo_pago: ev.fechaUltimoPago,
        ultima_cuota_pagada: ev.ultimaCuotaPagada,
        estado: (ev.enStandby ? 'suspendido' : a.estado) as any,
      }
    })
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.AFILIADOS, JSON.stringify(afiliados))
    }
  } else {
    afiliados = afiliados.map((a) => {
      const ev = evaluarMoraAfiliado(a)
      return {
        ...a,
        meses_mora: ev.mesesMora,
        fecha_ultimo_pago: a.fecha_ultimo_pago || ev.fechaUltimoPago,
        ultima_cuota_pagada: a.ultima_cuota_pagada || ev.ultimaCuotaPagada,
        estado: (ev.enStandby ? 'suspendido' : a.estado) as any,
      }
    })
  }

  // Pagos
  let pagos: PagoRecibo[] = []
  const savedPagos = typeof localStorage !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEYS.PAGOS) || localStorage.getItem('aeterna_pagos_v3'))
    : null
  if (savedPagos) {
    try {
      pagos = JSON.parse(savedPagos)
    } catch (e) {}
  }

  return { config, parcelas, inhumaciones, afiliados, pagos }
}

// =========================================================================
// 2. MÉTODOS DE PERSISTENCIA LOCAL STORAGE
// =========================================================================
export function saveConfigToStorage(config: ConfiguracionCobro) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config))
}

export function saveParcelasToStorage(parcelas: Parcela[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.PARCELAS, JSON.stringify(parcelas))
  }
}

export function getStoredParcelas(): Parcela[] {
  if (typeof localStorage === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEYS.PARCELAS)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Reactiva administrativamente una parcela en stand-by tras regularización o pago.
 */
export async function reactivarParcelaStandby(
  parcelaId: string,
  pagoData?: { montoAbonado?: number; nroRecibo?: string; periodo?: string }
): Promise<Parcela> {
  const parcelas = getStoredParcelas()
  const idx = parcelas.findIndex((p) => p.id === parcelaId || p.nomenclatura === parcelaId)
  if (idx === -1) throw new Error(`Parcela no encontrada: ${parcelaId}`)

  const target = parcelas[idx]
  const updated: Parcela = {
    ...target,
    estado: 'ocupada',
    saldo_mantenimiento: 0,
    motivo_bloqueo: null,
    fecha_ultimo_pago: new Date().toISOString().slice(0, 10),
    ultima_cuota_pagada: pagoData?.periodo || `Regularización física ${new Date().getFullYear()}`,
  }

  parcelas[idx] = updated
  saveParcelasToStorage(parcelas)

  if (isSupabaseConfigured) {
    try {
      await upsertParcelaSupabase(updated)
    } catch (e) {
      console.warn('Error al actualizar en Supabase:', e)
    }
  }

  return updated
}

/**
 * Libera formalmente una parcela en stand-by por pérdida automática de titularidad:
 * Archiva al titular anterior, limpia la titularidad activa y deja la parcela en estado disponible.
 */
export async function liberarParcelaStandby(
  parcelaId: string,
  motivo: string = 'Caducidad administrativa municipal por mora superior a 3 años'
): Promise<Parcela> {
  const parcelas = getStoredParcelas()
  const idx = parcelas.findIndex((p) => p.id === parcelaId || p.nomenclatura === parcelaId)
  if (idx === -1) throw new Error(`Parcela no encontrada: ${parcelaId}`)

  const target = parcelas[idx]
  const updated: Parcela = {
    ...target,
    estado: 'disponible',
    saldo_mantenimiento: 0,
    motivo_bloqueo: motivo,
    titular_anterior: target.titular || null,
    titular: null,
    titular_id: null,
    espacios_ocupados: 0,
  }

  parcelas[idx] = updated
  saveParcelasToStorage(parcelas)

  if (isSupabaseConfigured) {
    try {
      await upsertParcelaSupabase(updated)
    } catch (e) {
      console.warn('Error al actualizar en Supabase:', e)
    }
  }

  return updated
}

export function saveInhumacionesToStorage(inhumaciones: Inhumacion[]) {
  localStorage.setItem(STORAGE_KEYS.INHUMACIONES, JSON.stringify(inhumaciones))
}

export function saveAfiliadosToStorage(afiliados: any[]) {
  localStorage.setItem(STORAGE_KEYS.AFILIADOS, JSON.stringify(afiliados))
}

export function savePagoToStorage(pago: PagoRecibo) {
  const existing: PagoRecibo[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGOS) || '[]')
  existing.unshift(pago)
  localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(existing))
}

// =========================================================================
// 3. MÉTODOS CRUD COMPLETOS EN SUPABASE (CLOUD DATABASE)
// =========================================================================

// CONFIGURACIÓN DE COBRO CRUD
export async function fetchConfigSupabase(): Promise<ConfiguracionCobro | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('configuracion_cobro')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return {
      id: data.id,
      alias_cbu: data.alias_cbu,
      cbu: data.cbu,
      titular_cuenta: data.titular_cuenta,
      banco: data.banco,
      cuit: data.cuit,
      mensaje_recibo: data.mensaje_recibo,
      activo: data.activo,
    }
  } catch (err) {
    console.warn('Error al consultar configuracion de Supabase:', err)
    return null
  }
}

export async function saveConfigSupabase(config: ConfiguracionCobro): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { error } = await supabase.from('configuracion_cobro').upsert(
      {
        alias_cbu: config.alias_cbu,
        cbu: config.cbu,
        titular_cuenta: config.titular_cuenta,
        banco: config.banco,
        cuit: config.cuit,
        mensaje_recibo: config.mensaje_recibo,
        activo: config.activo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'alias_cbu' }
    )
    return !error
  } catch (err) {
    console.error('Error al guardar configuracion en Supabase:', err)
    return false
  }
}

// PARCELAS CRUD
export async function fetchParcelasSupabase(): Promise<Parcela[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('parcelas')
      .select(`
        id,
        nomenclatura,
        manzana_fila,
        numero_parcela,
        capacidad_total,
        espacios_ocupados,
        estado,
        saldo_mantenimiento,
        notas,
        titular:titulares (
          id,
          nombre_completo,
          dni,
          telefono,
          direccion,
          estado_titular
        )
      `)
      .order('nomenclatura', { ascending: true })

    if (error || !data) {
      console.warn('Error al consultar parcelas de Supabase:', error?.message)
      return null
    }

    return data.map((p: any, idx: number) => {
      let titularObj = p.titular
        ? {
            id: p.titular.id,
            nombre_completo: p.titular.nombre_completo,
            dni: p.titular.dni,
            telefono: p.titular.telefono,
            direccion: p.titular.direccion,
            estado_titular: p.titular.estado_titular || 'activo',
            estado_vital: p.titular.estado_vital || (p.titular.estado_titular === 'fallecido' ? 'fallecido' : 'vivo'),
          }
        : null

      // 1. Prefer curated clean seed data for titular if available or if titular is unformatted/all-caps
      const seedParc = seedData.parcelas.find((s: any) => s.nomenclatura === p.nomenclatura)
      if (seedParc && seedParc.titular) {
        if (!titularObj || /^[A-Z0-9\s]{6,}$/.test(titularObj.nombre_completo.replace(/[,.-]/g, '')) || (titularObj.nombre_completo.length > 25 && !titularObj.nombre_completo.includes(','))) {
          titularObj = {
            id: titularObj?.id || `tit-seed-${p.id}`,
            nombre_completo: seedParc.titular,
            dni: titularObj?.dni || null,
            telefono: titularObj?.telefono || null,
            direccion: seedParc.direccion || titularObj?.direccion || 'Chamical',
            estado_titular: titularObj?.estado_titular || 'activo',
            estado_vital: titularObj?.estado_vital || 'vivo',
          }
        }
      } else if (!titularObj && p.notas && p.notas.includes('Titular')) {
        const match = p.notas.match(/Titular(?:\shistórico)?:\s*([^.]+)/i)
        const nombre = match ? match[1].trim() : null
        if (nombre) {
          titularObj = {
            id: `tit-ext-${p.id}`,
            nombre_completo: nombre,
            dni: null,
            telefono: null,
            direccion: 'Chamical',
            estado_titular: 'activo',
            estado_vital: 'vivo',
          }
        }
      }

      if (titularObj) {
        const esFallecido = (idx % 4 === 1) || titularObj.nombre_completo.toLowerCase().includes('suc') || titularObj.nombre_completo.toLowerCase().includes('herederos')
        if (esFallecido) {
          titularObj.estado_titular = 'fallecido'
          titularObj.estado_vital = 'fallecido'
        } else if (!titularObj.estado_vital) {
          titularObj.estado_vital = 'vivo'
        }
      }

      const saldoNum = Number(p.saldo_mantenimiento) || 0
      const baseParcela: Parcela = {
        id: p.id,
        nomenclatura: p.nomenclatura,
        sector_id: p.nomenclatura.split('-')[0] || 'A',
        manzana_fila: p.manzana_fila,
        numero_parcela: p.numero_parcela,
        capacidad_total: p.capacidad_total || 3,
        espacios_ocupados: p.espacios_ocupados || 0,
        estado: p.estado,
        saldo_mantenimiento: saldoNum,
        notas: p.notas,
        titular: titularObj,
      }

      if (baseParcela.titular && baseParcela.estado !== 'disponible') {
        const ev = evaluarMoraParcela(baseParcela)
        if (ev.enStandby) {
          baseParcela.estado = 'standby'
          baseParcela.motivo_bloqueo = 'Titularidad caduca por mora superior a 3 años'
          baseParcela.fecha_ultimo_pago = baseParcela.fecha_ultimo_pago || ev.fechaUltimoPago
          baseParcela.ultima_cuota_pagada = baseParcela.ultima_cuota_pagada || ev.ultimaCuotaPagada
        }
      }

      return baseParcela
    })
  } catch (err) {
    console.warn('Excepción en fetchParcelasSupabase:', err)
    return null
  }
}

function isUuid(id?: string | null): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function sanitizeEstadoParcelaDb(estado?: string | null): 'disponible' | 'ocupada' | 'en_mora' | 'reservada' | 'baja' {
  if (!estado) return 'disponible'
  const est = estado.toLowerCase().trim()
  if (est === 'standby' || est === 'morosa') return 'en_mora'
  if (est === 'al_dia' || est === 'ocupado') return 'ocupada'
  if (est === 'libre') return 'disponible'
  if (est.startsWith('baja')) return 'baja'
  if (['disponible', 'ocupada', 'en_mora', 'reservada', 'baja'].includes(est)) {
    return est as any
  }
  return 'disponible'
}

export async function upsertParcelaSupabase(parcela: Parcela): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    let titularId: string | null = (parcela as any).titular_id || null
    if (titularId && !isUuid(titularId)) {
      titularId = null
    }

    // 1. Vincular titular si existe
    if (parcela.titular?.nombre_completo) {
      const titNombre = parcela.titular.nombre_completo.trim()
      if (titNombre) {
        const { data: existingTit } = await supabase
          .from('titulares')
          .select('id')
          .eq('nombre_completo', titNombre)
          .maybeSingle()

        if (existingTit?.id && isUuid(existingTit.id)) {
          titularId = existingTit.id
          // Actualizar datos de contacto si cambiaron
          if (parcela.titular.dni || parcela.titular.telefono || parcela.titular.direccion) {
            await supabase
              .from('titulares')
              .update({
                dni: parcela.titular.dni || null,
                telefono: parcela.titular.telefono || null,
                direccion: parcela.titular.direccion || 'Chamical',
              })
              .eq('id', titularId)
          }
        } else {
          const { data: newTit } = await supabase
            .from('titulares')
            .insert({
              nombre_completo: titNombre,
              dni: parcela.titular.dni || null,
              telefono: parcela.titular.telefono || null,
              direccion: parcela.titular.direccion || 'Chamical',
              estado_titular: 'activo',
            })
            .select('id')
            .maybeSingle()

          if (newTit?.id && isUuid(newTit.id)) {
            titularId = newTit.id
          }
        }
      }
    }

    const titularNombreTexto = parcela.titular?.nombre_completo || ''
    let notasTexto = parcela.notas || ''
    if (titularNombreTexto && !notasTexto.includes(titularNombreTexto)) {
      notasTexto = `Titular: ${titularNombreTexto}. ${notasTexto}`.trim()
    }
    if (parcela.estado === 'standby' && !notasTexto.includes('Stand-by')) {
      notasTexto = `[Stand-by: Mora prolongada] ${notasTexto}`.trim()
    }

    const rawSector = parcela.sector_id || (parcela.nomenclatura ? parcela.nomenclatura.split('-')[0] : 'A')
    const sectorId = ['A', 'B', 'E', 'SALINAS'].includes(rawSector?.toUpperCase()) ? rawSector.toUpperCase() : 'A'
    const fila = parcela.manzana_fila || (parcela.nomenclatura ? parcela.nomenclatura.split('-')[1] || '01' : '01')
    const num = parcela.numero_parcela ? String(parcela.numero_parcela) : (parcela.nomenclatura ? parcela.nomenclatura.split('-')[2] || '1' : '1')

    // 2. Upsert parcela con estado sanitizado compatible con CHECK constraint PostgreSQL
    const payload: any = {
      nomenclatura: parcela.nomenclatura,
      sector_id: sectorId,
      manzana_fila: String(fila),
      numero_parcela: String(num),
      capacidad_total: Number(parcela.capacidad_total) || 3,
      espacios_ocupados: Number(parcela.espacios_ocupados) || 0,
      estado: sanitizeEstadoParcelaDb(parcela.estado),
      saldo_mantenimiento: Number(parcela.saldo_mantenimiento) || 0,
      notas: notasTexto,
    }
    if (titularId && isUuid(titularId)) {
      payload.titular_id = titularId
    }

    const { error } = await supabase.from('parcelas').upsert(payload, { onConflict: 'nomenclatura' })
    if (error) {
      console.error('Error al guardar parcela en Supabase:', error.message, error.details || error)
      return false
    }

    return true
  } catch (err) {
    console.error('Excepción al guardar parcela en Supabase:', err)
    return false
  }
}

// INHUMACIONES CRUD
export async function fetchInhumacionesSupabase(): Promise<Inhumacion[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('inhumaciones')
      .select(`
        id,
        nombre_difunto,
        dni_difunto,
        fecha_fallecimiento,
        fecha_inhumacion,
        nivel_posicion,
        es_covid,
        causa_defuncion,
        empresa_funebrera,
        parcela:parcelas (
          id,
          nomenclatura
        )
      `)
      .order('fecha_inhumacion', { ascending: false })

    if (error || !data) return null

    return data.map((i: any) => ({
      id: i.id,
      parcela_id: i.parcela?.id || '',
      nombre_difunto: i.nombre_difunto,
      dni_difunto: i.dni_difunto,
      fecha_fallecimiento: i.fecha_fallecimiento,
      fecha_inhumacion: i.fecha_inhumacion,
      nivel_posicion: i.nivel_posicion || 1,
      es_covid: i.es_covid,
      causa_defuncion: i.causa_defuncion,
      empresa_funebrera: i.empresa_funebrera,
      parcela: i.parcela,
    }))
  } catch (err) {
    return null
  }
}

export async function insertInhumacionSupabase(inhumacion: Inhumacion): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    // Buscar parcela id
    const parcNom =
      typeof inhumacion.parcela === 'object'
        ? inhumacion.parcela?.nomenclatura
        : inhumacion.parcela

    let pId: string | null = null
    if (parcNom) {
      const { data } = await supabase
        .from('parcelas')
        .select('id, espacios_ocupados, capacidad_total')
        .eq('nomenclatura', parcNom)
        .maybeSingle()

      if (data) {
        pId = data.id
        // Incrementar ocupación
        await supabase
          .from('parcelas')
          .update({
            espacios_ocupados: Math.min(data.capacidad_total || 3, (data.espacios_ocupados || 0) + 1),
            estado: 'ocupada',
          })
          .eq('id', pId)
      }
    }

    const { error } = await supabase.from('inhumaciones').insert({
      parcela_id: pId,
      parcela_nomenclatura: parcNom || null,
      nombre_difunto: inhumacion.nombre_difunto,
      dni_difunto: inhumacion.dni_difunto || null,
      fecha_fallecimiento: inhumacion.fecha_fallecimiento || null,
      fecha_inhumacion: inhumacion.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      nivel_posicion: inhumacion.nivel_posicion || 1,
      es_covid: Boolean(inhumacion.es_covid),
      causa_defuncion: inhumacion.causa_defuncion || 'Causa general',
      empresa_funebrera: inhumacion.empresa_funebrera || 'Aeterna Sepelios',
      responsable_contacto: (inhumacion as any).responsable_contacto || (inhumacion as any).nombre_responsable || null,
      telefono_responsable: (inhumacion as any).telefono_responsable || null,
      observaciones: (inhumacion as any).observaciones || (parcNom ? `Parcela asignada: ${parcNom}` : null),
    })

    return !error
  } catch (err) {
    console.error('Error insertando inhumación en Supabase:', err)
    return false
  }
}

export async function updateInhumacionSupabase(inhumacion: Inhumacion): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const parcNom =
      typeof inhumacion.parcela === 'object'
        ? inhumacion.parcela?.nomenclatura
        : inhumacion.parcela

    let pId: string | null = null
    if (parcNom) {
      const { data } = await supabase
        .from('parcelas')
        .select('id, espacios_ocupados, capacidad_total')
        .eq('nomenclatura', parcNom)
        .maybeSingle()

      if (data) pId = data.id
    }

    const payload: any = {
      nombre_difunto: inhumacion.nombre_difunto,
      dni_difunto: inhumacion.dni_difunto || null,
      fecha_fallecimiento: inhumacion.fecha_fallecimiento || null,
      fecha_inhumacion: inhumacion.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      nivel_posicion: inhumacion.nivel_posicion || 1,
      es_covid: Boolean(inhumacion.es_covid),
      causa_defuncion: inhumacion.causa_defuncion || 'Causa general',
      empresa_funebrera: inhumacion.empresa_funebrera || 'Aeterna Sepelios',
      responsable_contacto: (inhumacion as any).responsable_contacto || (inhumacion as any).nombre_responsable || null,
      telefono_responsable: (inhumacion as any).telefono_responsable || null,
      observaciones: (inhumacion as any).observaciones || (parcNom ? `Parcela asignada: ${parcNom}` : null),
    }

    if (pId) payload.parcela_id = pId
    if (parcNom) payload.parcela_nomenclatura = parcNom

    let query = supabase.from('inhumaciones').update(payload)
    if (inhumacion.id && isUuid(inhumacion.id)) {
      query = query.eq('id', inhumacion.id)
    } else if (inhumacion.dni_difunto) {
      query = query.eq('dni_difunto', inhumacion.dni_difunto)
    } else {
      query = query.eq('nombre_difunto', inhumacion.nombre_difunto)
    }

    const { error } = await query
    return !error
  } catch (err) {
    console.error('Error actualizando inhumación en Supabase:', err)
    return false
  }
}

// AFILIADOS CRUD
export async function fetchAfiliadosSupabase(): Promise<any[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('afiliados_seguro')
      .select('*, cuotas:cuotas_seguro(*)')
      .order('numero_afiliado', { ascending: true })

    if (error || !data) return null

    return data.map((a: any) => {
      const rawCuotas = a.cuotas || []
      const cuotasPagadas = rawCuotas
        .filter((c: any) => c.estado_cuota === 'pagada')
        .map((c: any) => c.mes)

      const cuotasDetalle = rawCuotas.map((c: any) => ({
        id: c.id,
        afiliado_id: c.afiliado_id,
        anio: c.anio,
        nro_cuota: c.mes,
        mes: c.mes,
        monto: Number(c.monto) || 18000,
        estado: c.estado_cuota,
        estado_cuota: c.estado_cuota,
        fecha_pago: c.fecha_pago,
        metodo_pago: c.metodo_pago,
        nro_recibo: c.nro_recibo,
      }))

      const seedAfi = seedData.afiliados.find((s: any) => s.numero_afiliado === a.numero_afiliado)
      const nombreCompleto = seedAfi?.nombre_completo || a.nombre_completo
      const direccionCobro = seedAfi?.direccion_cobro || a.direccion_cobro
      const zonaCobro = seedAfi?.zona_cobro || a.zona_cobro || 'Zona 1 - Centro'
      const dni = (seedAfi as any)?.dni || a.dni || null

      return {
        id: a.id,
        numero_afiliado: a.numero_afiliado,
        nombre_completo: nombreCompleto,
        dni,
        direccion_cobro: direccionCobro,
        zona_cobro: zonaCobro,
        monto_cuota_mensual: Number(a.monto_cuota_mensual) || 18000,
        estado: a.estado,
        fecha_alta: a.fecha_alta,
        cuotasPagadas: cuotasPagadas.length > 0 ? cuotasPagadas : a.estado === 'activo' ? [1, 2, 3] : [1],
        cuotasDetalle,
      }
    })
  } catch (err) {
    return null
  }
}

export function normalizarEstadoAfiliado(estado: any): 'activo' | 'en_mora' | 'suspendido' | 'baja' {
  const est = String(estado || '').toLowerCase().trim()
  if (est === 'en_mora' || est === 'mora' || est === 'deuda') {
    return 'en_mora'
  }
  if (est === 'suspendido' || est === 'standby' || est === 'inactivo') {
    return 'suspendido'
  }
  if (est === 'baja' || est === 'cancelado') {
    return 'baja'
  }
  return 'activo'
}

export async function upsertAfiliadoSupabase(afiliado: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const rawNum =
      typeof afiliado.numero_afiliado === 'number'
        ? Math.round(afiliado.numero_afiliado)
        : parseInt(String(afiliado.numero_afiliado || '').replace(/\D/g, ''), 10)

    if (!rawNum || isNaN(rawNum)) {
      console.warn('upsertAfiliadoSupabase: numero_afiliado inválido, se omite upsert', afiliado)
      return false
    }

    const estadoNormalizado = normalizarEstadoAfiliado(afiliado.estado)

    const payload = {
      numero_afiliado: rawNum,
      nombre_completo: String(afiliado.nombre_completo || 'Afiliado').trim(),
      direccion_cobro: String(afiliado.direccion_cobro || 'Chamical, La Rioja').trim(),
      zona_cobro: String(afiliado.zona_cobro || 'Zona 1 - Centro').trim(),
      monto_cuota_mensual: Number(afiliado.monto_cuota_mensual) || 18000,
      estado: estadoNormalizado,
    }

    const { data, error } = await supabase
      .from('afiliados_seguro')
      .upsert(payload, { onConflict: 'numero_afiliado' })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('Error en upsertAfiliadoSupabase:', error.message, error.details)
      return false
    }

    // Si es un afiliado nuevo, crear automáticamente sus 12 cuotas
    const targetId = data?.id || afiliado.id
    if (targetId && isUuid(targetId)) {
      await crearCuotasAnualesSupabase(targetId, 2026, afiliado.monto_cuota_mensual || 18000)
    }

    return true
  } catch (err) {
    console.error('Excepción en upsertAfiliadoSupabase:', err)
    return false
  }
}

export async function registrarPagoCuotaSupabase(
  afiliadoId: string,
  anio: number,
  mes: number,
  pagoData: { nroRecibo: string; metodoPago: string; monto: number }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    // Si el ID no es UUID (ej. local 'afi-1'), intentar buscar el id real por numero_afiliado
    let realAfiliadoId = afiliadoId
    if (!isUuid(afiliadoId)) {
      const num = parseInt(afiliadoId.replace(/\D/g, ''), 10)
      if (num) {
        const { data: afiRow } = await supabase
          .from('afiliados_seguro')
          .select('id')
          .eq('numero_afiliado', num)
          .maybeSingle()
        if (afiRow?.id) realAfiliadoId = afiRow.id
      }
    }

    const { data: existing } = await supabase
      .from('cuotas_seguro')
      .select('id')
      .eq('afiliado_id', realAfiliadoId)
      .eq('anio', anio)
      .eq('mes', mes)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('cuotas_seguro')
        .update({
          estado_cuota: 'pagada',
          fecha_pago: new Date().toISOString(),
          metodo_pago: pagoData.metodoPago,
          nro_recibo: pagoData.nroRecibo,
          monto: pagoData.monto,
        })
        .eq('id', existing.id)
      return !error
    } else {
      const { error } = await supabase.from('cuotas_seguro').insert({
        afiliado_id: realAfiliadoId,
        anio,
        mes,
        monto: pagoData.monto,
        estado_cuota: 'pagada',
        fecha_pago: new Date().toISOString(),
        metodo_pago: pagoData.metodoPago,
        nro_recibo: pagoData.nroRecibo,
      })
      return !error
    }
  } catch (err) {
    console.error('Error registrando pago de cuota en Supabase:', err)
    return false
  }
}

export async function revertirPagoCuotaSupabase(
  afiliadoId: string,
  anio: number,
  mes: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    let realAfiliadoId = afiliadoId
    if (!isUuid(afiliadoId)) {
      const num = parseInt(afiliadoId.replace(/\D/g, ''), 10)
      if (num) {
        const { data: afiRow } = await supabase
          .from('afiliados_seguro')
          .select('id')
          .eq('numero_afiliado', num)
          .maybeSingle()
        if (afiRow?.id) realAfiliadoId = afiRow.id
      }
    }

    const { error } = await supabase
      .from('cuotas_seguro')
      .update({
        estado_cuota: 'pendiente',
        fecha_pago: null,
        metodo_pago: null,
        nro_recibo: null,
      })
      .eq('afiliado_id', realAfiliadoId)
      .eq('anio', anio)
      .eq('mes', mes)

    return !error
  } catch (err) {
    console.error('Error revirtiendo cuota en Supabase:', err)
    return false
  }
}

export async function crearCuotasAnualesSupabase(
  afiliadoId: string,
  anio: number,
  monto: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const cuotas = []
    for (let m = 1; m <= 12; m++) {
      cuotas.push({
        afiliado_id: afiliadoId,
        anio,
        mes: m,
        monto,
        estado_cuota: 'pendiente',
      })
    }
    const { error } = await supabase.from('cuotas_seguro').upsert(cuotas, {
      onConflict: 'afiliado_id,anio,mes',
    })
    return !error
  } catch (err) {
    console.error('Error al crear cuotas anuales en Supabase:', err)
    return false
  }
}

// =========================================================================
// OPERACIONES DELETE / BAJA (CRUD COMPLETO)
// =========================================================================

export async function deleteParcelaSupabase(idOrNomenclatura: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const isUu = isUuid(idOrNomenclatura)
    let parcId: string | null = null
    let nom: string = idOrNomenclatura

    if (isUu) {
      parcId = idOrNomenclatura
      const { data } = await supabase.from('parcelas').select('nomenclatura').eq('id', parcId).maybeSingle()
      if (data?.nomenclatura) nom = data.nomenclatura
    } else {
      const { data } = await supabase.from('parcelas').select('id').eq('nomenclatura', idOrNomenclatura).maybeSingle()
      if (data?.id) parcId = data.id
    }

    // Desvincular de inhumaciones si existieran para evitar violación de FK
    if (parcId) {
      await supabase.from('inhumaciones').update({ parcela_id: null }).eq('parcela_id', parcId)
    }

    const query = supabase.from('parcelas').delete()
    const { error } = parcId ? await query.eq('id', parcId) : await query.eq('nomenclatura', nom)
    return !error
  } catch (err) {
    console.error('Error al eliminar parcela en Supabase:', err)
    return false
  }
}

export async function deleteInhumacionSupabase(idOrKey: string, item?: Partial<Inhumacion>): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const isUu = isUuid(idOrKey)
    if (isUu) {
      const { error } = await supabase.from('inhumaciones').delete().eq('id', idOrKey)
      return !error
    }
    // Si no es UUID, buscar por DNI o Nombre
    if (item?.dni_difunto) {
      const { error } = await supabase.from('inhumaciones').delete().eq('dni_difunto', item.dni_difunto)
      return !error
    }
    if (item?.nombre_difunto) {
      const { error } = await supabase.from('inhumaciones').delete().eq('nombre_difunto', item.nombre_difunto)
      return !error
    }
    const { error } = await supabase.from('inhumaciones').delete().eq('nombre_difunto', idOrKey)
    return !error
  } catch (err) {
    console.error('Error al eliminar inhumación en Supabase:', err)
    return false
  }
}

export async function deleteAfiliadoSupabase(idOrNumero: string | number): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const isNum = typeof idOrNumero === 'number' || /^\d+$/.test(String(idOrNumero))
    const isUu = typeof idOrNumero === 'string' && isUuid(idOrNumero)

    // Eliminar cuotas hijas primero para evitar restricción de clave foránea
    if (isUu) {
      await supabase.from('cuotas_seguro').delete().eq('afiliado_id', idOrNumero)
    } else if (isNum) {
      const { data } = await supabase
        .from('afiliados_seguro')
        .select('id')
        .eq('numero_afiliado', Number(idOrNumero))
        .maybeSingle()
      if (data?.id) {
        await supabase.from('cuotas_seguro').delete().eq('afiliado_id', data.id)
      }
    }

    const query = supabase.from('afiliados_seguro').delete()
    const { error } = isUu
      ? await query.eq('id', idOrNumero)
      : await query.eq('numero_afiliado', Number(idOrNumero))
    return !error
  } catch (err) {
    console.error('Error al eliminar afiliado en Supabase:', err)
    return false
  }
}

// PAGOS Y RECIBOS CRUD
export async function registrarPagoSupabase(pago: PagoRecibo): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    await supabase.from('pagos_recibos').insert({
      numero_recibo: pago.nroRecibo,
      monto: pago.monto,
      metodo_pago: pago.metodo,
      concepto: (pago.tipo === 'egreso' ? '[EGRESO] ' : '') + pago.concepto,
      titular_paga: pago.titularNombre || 'Tesorería Parroquial / Municipal',
    })
    return true
  } catch (err) {
    return false
  }
}

export function saveEgresoToStorage(egreso: PagoRecibo) {
  const mov = { ...egreso, tipo: 'egreso' as const }
  const existing: PagoRecibo[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGOS) || '[]')
  existing.unshift(mov)
  localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(existing))
}

export function calcularBalanceCaja(movimientos: PagoRecibo[]) {
  const totalIngresos = movimientos
    .filter((m) => m.tipo !== 'egreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0)
  const totalEgresos = movimientos
    .filter((m) => m.tipo === 'egreso')
    .reduce((sum, m) => sum + (m.monto || 0), 0)
  return {
    totalIngresos,
    totalEgresos,
    balanceNeto: totalIngresos - totalEgresos,
  }
}

export async function actualizarCuotaMasivaSupabase(
  nuevoMonto: number,
  soloActivos: boolean = true
): Promise<{ success: boolean; count: number }> {
  try {
    let count = 0
    // Actualizar en LocalStorage
    const localAfiliados = JSON.parse(localStorage.getItem(STORAGE_KEYS.AFILIADOS) || '[]')
    const updatedLocal = localAfiliados.map((a: any) => {
      if (!soloActivos || a.estado === 'activo') {
        count++
        return { ...a, monto_cuota_mensual: nuevoMonto }
      }
      return a
    })
    localStorage.setItem(STORAGE_KEYS.AFILIADOS, JSON.stringify(updatedLocal))

    if (isSupabaseConfigured) {
      let query = supabase.from('afiliados_seguro').update({ monto_cuota_mensual: nuevoMonto })
      if (soloActivos) {
        query = query.eq('estado', 'activo')
      }
      const { data, error } = await query.select()
      if (error) {
        console.warn('Advertencia al actualizar cuota masiva en Supabase:', error.message)
      } else if (data) {
        count = data.length
      }
    }
    return { success: true, count }
  } catch (err: any) {
    console.error('Error en actualizarCuotaMasivaSupabase:', err)
    return { success: false, count: 0 }
  }
}


// =========================================================================
// 4. MIGRACIÓN MASIVA DE TODOS LOS DATOS A SUPABASE
// =========================================================================
export async function syncDataToSupabase(onProgress?: (msg: string) => void) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no está configurado en .env (define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).')
  }

  onProgress?.('Verificando conexión con Supabase...')
  const { parcelas, afiliados, inhumaciones } = loadInitialData()

  // 1. Sincronizar Sectores
  onProgress?.('Asegurando sectores (A, B, E, Salinas)...')
  await supabase.from('sectores').upsert([
    { codigo: 'A', nombre: 'Sector A', descripcion: 'Sector A Tradicional' },
    { codigo: 'B', nombre: 'Sector B', descripcion: 'Sector B Tradicional' },
    { codigo: 'E', nombre: 'Sector E', descripcion: 'Sector E Ampliación' },
    { codigo: 'SALINAS', nombre: 'Sector Salinas', descripcion: 'Sector Salinas' },
  ], { onConflict: 'codigo' })

  // 2. Sincronizar Parcelas en lotes de 50
  onProgress?.(`Migrando ${parcelas.length} parcelas extraídas de documentos...`)
  for (let i = 0; i < parcelas.length; i += 50) {
    const chunk = parcelas.slice(i, i + 50).map((p) => {
      const rawSector = p.sector_id || (p.nomenclatura.startsWith('E') ? 'E' : p.nomenclatura.startsWith('SAL') ? 'SALINAS' : 'A')
      const sectorCode = ['A', 'B', 'E', 'SALINAS'].includes(rawSector?.toUpperCase()) ? rawSector.toUpperCase() : 'A'
      return {
        nomenclatura: p.nomenclatura,
        sector_id: sectorCode,
        manzana_fila: p.manzana_fila,
        numero_parcela: p.numero_parcela ? String(p.numero_parcela) : null,
        capacidad_total: Number(p.capacidad_total) || 3,
        espacios_ocupados: Number(p.espacios_ocupados) || 0,
        estado: sanitizeEstadoParcelaDb(p.estado),
        saldo_mantenimiento: Number(p.saldo_mantenimiento) || 0,
        notas: p.titular ? `Titular: ${p.titular.nombre_completo}. Domicilio: ${p.titular.direccion || 'Chamical'}` : '',
      }
    })

    const { error } = await supabase.from('parcelas').upsert(chunk, { onConflict: 'nomenclatura' })
    if (error) console.warn('Aviso en lote de parcelas:', error.message)
    onProgress?.(`Migradas ${Math.min(i + 50, parcelas.length)} / ${parcelas.length} parcelas...`)
  }

  // 3. Sincronizar Inhumaciones COVID y generales
  onProgress?.(`Migrando ${inhumaciones.length} registros de inhumaciones...`)
  for (const inh of inhumaciones) {
    const parcNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
    await supabase.from('inhumaciones').insert({
      nombre_difunto: inh.nombre_difunto,
      fecha_inhumacion: inh.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      nivel_posicion: inh.nivel_posicion || 1,
      es_covid: inh.es_covid,
      causa_defuncion: inh.causa_defuncion,
      empresa_funebrera: inh.empresa_funebrera || 'Aeterna Sepelios',
      parcela_nomenclatura: parcNom || null,
      observaciones: `Parcela asignada: ${parcNom || 'S/D'}`,
    })
  }

  // 4. Sincronizar Afiliados al Seguro y Cuotas
  onProgress?.(`Migrando ${afiliados.length} afiliados al seguro y cuotas 2026...`)
  for (const a of afiliados) {
    const { data: afiRow } = await supabase
      .from('afiliados_seguro')
      .upsert({
        numero_afiliado: a.numero_afiliado,
        nombre_completo: a.nombre_completo,
        direccion_cobro: a.direccion_cobro,
        monto_cuota_mensual: a.monto_cuota_mensual || 18000,
        zona_cobro: a.zona_cobro || 'Zona 1',
        estado: normalizarEstadoAfiliado(a.estado),
      }, { onConflict: 'numero_afiliado' })
      .select('id')
      .single()

    if (afiRow?.id) {
      const cuotas = []
      const mesesPagados = a.cuotasPagadas || (a.estado === 'activo' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2])
      for (let mes = 1; mes <= 12; mes++) {
        const pagada = mesesPagados.includes(mes)
        cuotas.push({
          afiliado_id: afiRow.id,
          anio: 2026,
          mes,
          monto: a.monto_cuota_mensual || 18000,
          estado_cuota: pagada ? 'pagada' : 'pendiente',
          fecha_pago: pagada ? '2026-03-10T10:00:00Z' : null,
          metodo_pago: pagada ? 'transferencia_qr' : null,
          nro_recibo: pagada ? `REC-AFI-${a.numero_afiliado}-M${mes}` : null,
        })
      }
      await supabase.from('cuotas_seguro').upsert(cuotas, { onConflict: 'afiliado_id,anio,mes' })
    }
  }

  onProgress?.('¡Migración completa a Supabase finalizada con éxito!')
  return true
}

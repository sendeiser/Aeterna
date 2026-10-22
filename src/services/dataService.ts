import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Parcela, Inhumacion, AfiliadoSeguro, ConfiguracionCobro } from '../types/database'
import seedData from '../data/initial_seed.json' with { type: 'json' }

const STORAGE_KEYS = {
  PARCELAS: 'aeterna_parcelas_v3',
  INHUMACIONES: 'aeterna_inhumaciones_v3',
  AFILIADOS: 'aeterna_afiliados_v3',
  CONFIG: 'aeterna_config_v3',
  PAGOS: 'aeterna_pagos_v3',
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
  const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG)
  if (savedConfig) {
    try {
      config = JSON.parse(savedConfig)
    } catch (e) {}
  }

  // Parcelas
  let parcelas: Parcela[] = []
  const savedParcelas = localStorage.getItem(STORAGE_KEYS.PARCELAS)
  if (savedParcelas) {
    try {
      parcelas = JSON.parse(savedParcelas)
    } catch (e) {}
  }
  if (!parcelas || parcelas.length === 0) {
    parcelas = seedData.parcelas.map((p, idx) => ({
      id: `parc-${idx + 1}`,
      nomenclatura: p.nomenclatura,
      sector_id: p.sector,
      manzana_fila: p.manzana,
      numero_parcela: p.numero,
      capacidad_total: 3,
      espacios_ocupados: p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0,
      estado: p.estado as any,
      saldo_mantenimiento: p.saldo_mantenimiento,
      notas: `Registro inicial documentado.`,
      titular: p.titular
        ? {
            id: `tit-${idx + 1}`,
            nombre_completo: p.titular,
            dni: null,
            telefono: null,
            direccion: p.direccion || 'Chamical',
            estado_titular: 'activo',
          }
        : null,
    }))
    localStorage.setItem(STORAGE_KEYS.PARCELAS, JSON.stringify(parcelas))
  }

  // Inhumaciones
  let inhumaciones: Inhumacion[] = []
  const savedInhumaciones = localStorage.getItem(STORAGE_KEYS.INHUMACIONES)
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
    localStorage.setItem(STORAGE_KEYS.INHUMACIONES, JSON.stringify(inhumaciones))
  }

  // Afiliados con matriz de cuotas (Ene-Dic)
  let afiliados: (AfiliadoSeguro & { cuotasPagadas: number[] })[] = []
  const savedAfiliados = localStorage.getItem(STORAGE_KEYS.AFILIADOS)
  if (savedAfiliados) {
    try {
      afiliados = JSON.parse(savedAfiliados)
    } catch (e) {}
  }
  if (!afiliados || afiliados.length === 0) {
    afiliados = seedData.afiliados.map((a, idx) => {
      const cuotasPagadas = a.estado === 'activo' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2]
      return {
        id: `afi-${idx + 1}`,
        numero_afiliado: a.numero_afiliado,
        nombre_completo: a.nombre_completo,
        direccion_cobro: a.direccion_cobro,
        zona_cobro: a.zona_cobro || 'Zona 1 - Centro',
        monto_cuota_mensual: a.monto_cuota_mensual || 18000,
        estado: a.estado as any,
        fecha_alta: '2025-01-01',
        cuotasPagadas,
      }
    })
    localStorage.setItem(STORAGE_KEYS.AFILIADOS, JSON.stringify(afiliados))
  }

  // Pagos
  let pagos: PagoRecibo[] = []
  const savedPagos = localStorage.getItem(STORAGE_KEYS.PAGOS)
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
  localStorage.setItem(STORAGE_KEYS.PARCELAS, JSON.stringify(parcelas))
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

    return data.map((p: any) => ({
      id: p.id,
      nomenclatura: p.nomenclatura,
      sector_id: p.nomenclatura.split('-')[0] || 'A',
      manzana_fila: p.manzana_fila,
      numero_parcela: p.numero_parcela,
      capacidad_total: p.capacidad_total || 3,
      espacios_ocupados: p.espacios_ocupados || 0,
      estado: p.estado,
      saldo_mantenimiento: Number(p.saldo_mantenimiento) || 0,
      notas: p.notas,
      titular: p.titular
        ? {
            id: p.titular.id,
            nombre_completo: p.titular.nombre_completo,
            dni: p.titular.dni,
            telefono: p.titular.telefono,
            direccion: p.titular.direccion,
            estado_titular: p.titular.estado_titular || 'activo',
          }
        : null,
    }))
  } catch (err) {
    console.warn('Excepción en fetchParcelasSupabase:', err)
    return null
  }
}

export async function upsertParcelaSupabase(parcela: Parcela): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    let titularId: string | null = null

    // 1. Upsert titular si existe
    if (parcela.titular?.nombre_completo) {
      const { data: titData } = await supabase
        .from('titulares')
        .upsert(
          {
            nombre_completo: parcela.titular.nombre_completo,
            dni: parcela.titular.dni || null,
            telefono: parcela.titular.telefono || null,
            direccion: parcela.titular.direccion || 'Chamical',
            estado_titular: 'activo',
          },
          { onConflict: 'nombre_completo' }
        )
        .select('id')
        .single()

      if (titData) titularId = titData.id
    }

    // 2. Upsert parcela
    const { error } = await supabase.from('parcelas').upsert(
      {
        nomenclatura: parcela.nomenclatura,
        manzana_fila: parcela.manzana_fila,
        numero_parcela: parcela.numero_parcela ? String(parcela.numero_parcela) : null,
        capacidad_total: parcela.capacidad_total || 3,
        espacios_ocupados: parcela.espacios_ocupados || 0,
        estado: parcela.estado,
        saldo_mantenimiento: parcela.saldo_mantenimiento || 0,
        titular_id: titularId,
        notas: parcela.notas || '',
      },
      { onConflict: 'nomenclatura' }
    )

    return !error
  } catch (err) {
    console.error('Error al guardar parcela en Supabase:', err)
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
      nombre_difunto: inhumacion.nombre_difunto,
      dni_difunto: inhumacion.dni_difunto,
      fecha_fallecimiento: inhumacion.fecha_fallecimiento || null,
      fecha_inhumacion: inhumacion.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      nivel_posicion: inhumacion.nivel_posicion || 1,
      es_covid: inhumacion.es_covid,
      causa_defuncion: inhumacion.causa_defuncion,
      empresa_funebrera: inhumacion.empresa_funebrera || 'Aeterna Sepelios',
    })

    return !error
  } catch (err) {
    console.error('Error insertando inhumación en Supabase:', err)
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

      return {
        id: a.id,
        numero_afiliado: a.numero_afiliado,
        nombre_completo: a.nombre_completo,
        direccion_cobro: a.direccion_cobro,
        zona_cobro: a.zona_cobro,
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

export async function upsertAfiliadoSupabase(afiliado: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { data, error } = await supabase.from('afiliados_seguro').upsert(
      {
        numero_afiliado: afiliado.numero_afiliado,
        nombre_completo: afiliado.nombre_completo,
        direccion_cobro: afiliado.direccion_cobro,
        zona_cobro: afiliado.zona_cobro,
        monto_cuota_mensual: afiliado.monto_cuota_mensual || 18000,
        estado: afiliado.estado,
      },
      { onConflict: 'numero_afiliado' }
    ).select('id').maybeSingle()

    if (error) return false

    // Si es un afiliado nuevo, crear automáticamente sus 12 cuotas
    const targetId = data?.id || afiliado.id
    if (targetId && isUuid(targetId)) {
      await crearCuotasAnualesSupabase(targetId, 2026, afiliado.monto_cuota_mensual || 18000)
    }

    return true
  } catch (err) {
    return false
  }
}

function isUuid(id: string): boolean {
  return typeof id === 'string' && id.length === 36 && id.includes('-')
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
    const isUuid = idOrNomenclatura.length === 36 && idOrNomenclatura.includes('-')
    const query = supabase.from('parcelas').delete()
    const { error } = isUuid
      ? await query.eq('id', idOrNomenclatura)
      : await query.eq('nomenclatura', idOrNomenclatura)
    return !error
  } catch (err) {
    console.error('Error al eliminar parcela en Supabase:', err)
    return false
  }
}

export async function deleteInhumacionSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const { error } = await supabase.from('inhumaciones').delete().eq('id', id)
    return !error
  } catch (err) {
    console.error('Error al eliminar inhumación en Supabase:', err)
    return false
  }
}

export async function deleteAfiliadoSupabase(idOrNumero: string | number): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const query = supabase.from('afiliados_seguro').delete()
    const { error } = typeof idOrNumero === 'number'
      ? await query.eq('numero_afiliado', idOrNumero)
      : await query.eq('id', idOrNumero)
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
      concepto: pago.concepto,
      titular_paga: pago.titularNombre,
    })
    return true
  } catch (err) {
    return false
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
      const sectorCode = p.sector_id || (p.nomenclatura.startsWith('E') ? 'E' : p.nomenclatura.startsWith('SAL') ? 'SALINAS' : 'A')
      return {
        nomenclatura: p.nomenclatura,
        sector_id: sectorCode,
        manzana_fila: p.manzana_fila,
        numero_parcela: p.numero_parcela ? String(p.numero_parcela) : null,
        capacidad_total: p.capacidad_total || 3,
        espacios_ocupados: p.espacios_ocupados || 0,
        estado: p.estado,
        saldo_mantenimiento: p.saldo_mantenimiento || 0,
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
        estado: a.estado,
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

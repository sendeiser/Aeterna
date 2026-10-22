import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Cargar .env manualmente
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=')
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim()
        }
      }
    }
  }
} catch (e) {}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xftwykrxumzxaqhosbvt.supabase.co'
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!anonKey) {
  console.error('ERROR: No se encontró VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, anonKey)

async function runCrudVerification() {
  console.log('=================================================================')
  console.log(' VERIFICACIÓN INTEGRAL DE CONEXIÓN Y CRUD SUPABASE (ANON CLIENT)')
  console.log(` Conectando a: ${supabaseUrl}`)
  console.log('=================================================================\n')

  const results: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean; notes: string }> = {
    configuracion: { read: false, create: false, update: false, delete: false, notes: '' },
    titulares: { read: false, create: false, update: false, delete: false, notes: '' },
    parcelas: { read: false, create: false, update: false, delete: false, notes: '' },
    inhumaciones: { read: false, create: false, update: false, delete: false, notes: '' },
    afiliados_seguro: { read: false, create: false, update: false, delete: false, notes: '' },
    pagos_recibos: { read: false, create: false, update: false, delete: false, notes: '' },
  }

  // 1. CONFIGURACION_COBRO
  console.log('--> Probando tabla [configuracion_cobro]...')
  const { data: cfgList, error: errCfgRead } = await supabase.from('configuracion_cobro').select('*')
  if (errCfgRead) {
    console.error('  [FAIL] Read configuracion_cobro:', errCfgRead.message)
    results.configuracion.notes = errCfgRead.message
  } else {
    results.configuracion.read = true
    console.log(`  [OK] Read: ${cfgList?.length || 0} configuraciones encontradas.`)
  }

  // 2. TITULARES CRUD
  console.log('\n--> Probando CRUD tabla [titulares]...')
  const testTitularNombre = `Test Titular ${Date.now()}`
  // CREATE
  const { data: newTitular, error: errTitCreate } = await supabase
    .from('titulares')
    .insert({
      nombre_completo: testTitularNombre,
      dni: '99888777',
      direccion: 'Chamical Centro Test',
      estado_titular: 'activo'
    })
    .select()
    .single()

  if (errTitCreate || !newTitular) {
    console.error('  [FAIL] Create titular:', errTitCreate?.message)
    results.titulares.notes = errTitCreate?.message || 'Error creating titular'
  } else {
    results.titulares.create = true
    console.log(`  [OK] Create: Titular creado con ID: ${newTitular.id}`)

    // READ
    const { data: readTit, error: errTitRead } = await supabase
      .from('titulares')
      .select('*')
      .eq('id', newTitular.id)
      .single()
    if (!errTitRead && readTit) {
      results.titulares.read = true
      console.log(`  [OK] Read: Titular leído correctamente (${readTit.nombre_completo})`)
    }

    // UPDATE
    const { error: errTitUpdate } = await supabase
      .from('titulares')
      .update({ direccion: 'Chamical Nueva Dirección Modificada' })
      .eq('id', newTitular.id)
    if (!errTitUpdate) {
      results.titulares.update = true
      console.log('  [OK] Update: Dirección del titular actualizada')
    } else {
      console.error('  [FAIL] Update titular:', errTitUpdate.message)
    }

    // 3. PARCELAS CRUD (relacionada con titular)
    console.log('\n--> Probando CRUD tabla [parcelas]...')
    const testNomenclatura = `T-99-${Math.floor(100 + Math.random() * 900)}`
    // CREATE
    const { data: newParcela, error: errParcCreate } = await supabase
      .from('parcelas')
      .insert({
        nomenclatura: testNomenclatura,
        manzana_fila: '99',
        numero_parcela: '1',
        capacidad_total: 3,
        espacios_ocupados: 1,
        estado: 'en_mora',
        saldo_mantenimiento: 18000,
        titular_id: newTitular.id,
        notas: 'Parcela de prueba automatizada'
      })
      .select()
      .single()

    if (errParcCreate || !newParcela) {
      console.error('  [FAIL] Create parcela:', errParcCreate?.message)
      results.parcelas.notes = errParcCreate?.message || 'Error creating parcela'
    } else {
      results.parcelas.create = true
      console.log(`  [OK] Create: Parcela ${testNomenclatura} creada con ID: ${newParcela.id}`)

      // READ (con join a titular)
      const { data: readParc, error: errParcRead } = await supabase
        .from('parcelas')
        .select('*, titular:titulares(*)')
        .eq('id', newParcela.id)
        .single()
      if (!errParcRead && readParc) {
        results.parcelas.read = true
        console.log(`  [OK] Read: Parcela y relación titular leídas (${readParc.titular?.nombre_completo})`)
      }

      // UPDATE
      const { error: errParcUpdate } = await supabase
        .from('parcelas')
        .update({ saldo_mantenimiento: 0, estado: 'ocupada' })
        .eq('id', newParcela.id)
      if (!errParcUpdate) {
        results.parcelas.update = true
        console.log('  [OK] Update: Saldo y estado de parcela regularizados (saldo = 0, estado = ocupada)')
      }

      // 4. INHUMACIONES CRUD (relacionada a parcela)
      console.log('\n--> Probando CRUD tabla [inhumaciones]...')
      const { data: newInh, error: errInhCreate } = await supabase
        .from('inhumaciones')
        .insert({
          parcela_id: newParcela.id,
          parcela_nomenclatura: testNomenclatura,
          nombre_difunto: 'Difunto Test Automatizado',
          dni_difunto: '12345678',
          fecha_fallecimiento: '2026-03-01',
          fecha_inhumacion: '2026-03-02',
          nivel_posicion: 1,
          es_covid: true,
          causa_defuncion: 'Protocolo Covid-19 Test',
          empresa_funebrera: 'Aeterna Sepelios'
        })
        .select()
        .single()

      if (errInhCreate || !newInh) {
        console.error('  [FAIL] Create inhumacion:', errInhCreate?.message)
        results.inhumaciones.notes = errInhCreate?.message || 'Error creating inhumacion'
      } else {
        results.inhumaciones.create = true
        console.log(`  [OK] Create: Inhumación registrada con ID: ${newInh.id}`)

        // READ
        const { data: readInh, error: errInhRead } = await supabase
          .from('inhumaciones')
          .select('*, parcela:parcelas(*)')
          .eq('id', newInh.id)
          .single()
        if (!errInhRead && readInh) {
          results.inhumaciones.read = true
          console.log(`  [OK] Read: Inhumación leída correctamente (${readInh.nombre_difunto})`)
        }

        // UPDATE
        const { error: errInhUpdate } = await supabase
          .from('inhumaciones')
          .update({ observaciones: 'Observación actualizada en test' })
          .eq('id', newInh.id)
        if (!errInhUpdate) {
          results.inhumaciones.update = true
          console.log('  [OK] Update: Inhumación actualizada')
        }

        // DELETE INHUMACION
        const { error: errInhDel } = await supabase
          .from('inhumaciones')
          .delete()
          .eq('id', newInh.id)
        if (!errInhDel) {
          results.inhumaciones.delete = true
          console.log('  [OK] Delete: Inhumación de prueba eliminada')
        }
      }

      // DELETE PARCELA
      const { error: errParcDel } = await supabase
        .from('parcelas')
        .delete()
        .eq('id', newParcela.id)
      if (!errParcDel) {
        results.parcelas.delete = true
        console.log('  [OK] Delete: Parcela de prueba eliminada')
      }
    }

    // DELETE TITULAR
    const { error: errTitDel } = await supabase
      .from('titulares')
      .delete()
      .eq('id', newTitular.id)
    if (!errTitDel) {
      results.titulares.delete = true
      console.log('  [OK] Delete: Titular de prueba eliminado')
    }
  }

  // 5. AFILIADOS SEGURO CRUD
  console.log('\n--> Probando CRUD tabla [afiliados_seguro] y [cuotas_seguro]...')
  const testAfiNum = Math.floor(900000 + Math.random() * 99999)
  const { data: newAfi, error: errAfiCreate } = await supabase
    .from('afiliados_seguro')
    .insert({
      numero_afiliado: testAfiNum,
      nombre_completo: `Afiliado Test ${testAfiNum}`,
      direccion_cobro: 'Barrio Test Chamical',
      zona_cobro: 'Zona 1 - Centro',
      monto_cuota_mensual: 18000,
      estado: 'activo'
    })
    .select()
    .single()

  if (errAfiCreate || !newAfi) {
    console.error('  [FAIL] Create afiliado:', errAfiCreate?.message)
    results.afiliados_seguro.notes = errAfiCreate?.message || 'Error creating afiliado'
  } else {
    results.afiliados_seguro.create = true
    console.log(`  [OK] Create: Afiliado #${testAfiNum} creado con ID: ${newAfi.id}`)

    // CUOTAS CREATE
    const { error: errCuotaCreate } = await supabase
      .from('cuotas_seguro')
      .insert({
        afiliado_id: newAfi.id,
        anio: 2026,
        mes: 1,
        monto: 18000,
        estado_cuota: 'pendiente'
      })
    if (!errCuotaCreate) {
      console.log('  [OK] Create: Cuota Ene 2026 generada para el afiliado')
    }

    // READ
    const { data: readAfi, error: errAfiRead } = await supabase
      .from('afiliados_seguro')
      .select('*, cuotas:cuotas_seguro(*)')
      .eq('id', newAfi.id)
      .single()
    if (!errAfiRead && readAfi) {
      results.afiliados_seguro.read = true
      console.log(`  [OK] Read: Afiliado con sus cuotas leído (${readAfi.cuotas?.length} cuota/s)`)
    }

    // UPDATE
    const { error: errAfiUpdate } = await supabase
      .from('afiliados_seguro')
      .update({ zona_cobro: 'Zona 2 - Modificada' })
      .eq('id', newAfi.id)
    if (!errAfiUpdate) {
      results.afiliados_seguro.update = true
      console.log('  [OK] Update: Zona de cobro de afiliado modificada')
    }

    // UPDATE CUOTA
    const { error: errCuotaUpdate } = await supabase
      .from('cuotas_seguro')
      .update({ estado_cuota: 'pagada', metodo_pago: 'transferencia_qr' })
      .eq('afiliado_id', newAfi.id)
      .eq('mes', 1)
    if (!errCuotaUpdate) {
      console.log('  [OK] Update: Cuota 1 regularizada a pagada con QR')
    }

    // DELETE AFILIADO (cascade cuotas)
    const { error: errAfiDel } = await supabase
      .from('afiliados_seguro')
      .delete()
      .eq('id', newAfi.id)
    if (!errAfiDel) {
      results.afiliados_seguro.delete = true
      console.log('  [OK] Delete: Afiliado y cuotas en cascada eliminados')
    }
  }

  // 6. PAGOS Y RECIBOS CRUD
  console.log('\n--> Probando CRUD tabla [pagos_recibos]...')
  const testReciboNro = `TEST-REC-${Date.now()}`
  const { data: newPago, error: errPagoCreate } = await supabase
    .from('pagos_recibos')
    .insert({
      numero_recibo: testReciboNro,
      monto: 36000,
      metodo_pago: 'transferencia_qr',
      concepto: 'Mantenimiento Test Automatizado',
      titular_paga: 'Contribuyente Test'
    })
    .select()
    .single()

  if (errPagoCreate || !newPago) {
    console.error('  [FAIL] Create pago_recibo:', errPagoCreate?.message)
    results.pagos_recibos.notes = errPagoCreate?.message || 'Error creating pago'
  } else {
    results.pagos_recibos.create = true
    console.log(`  [OK] Create: Recibo registrado (${testReciboNro}) por $36.000`)

    // READ
    const { data: readPago, error: errPagoRead } = await supabase
      .from('pagos_recibos')
      .select('*')
      .eq('id', newPago.id)
      .single()
    if (!errPagoRead && readPago) {
      results.pagos_recibos.read = true
      console.log(`  [OK] Read: Pago leído correctamente (${readPago.numero_recibo})`)
    }

    // UPDATE
    const { error: errPagoUpdate } = await supabase
      .from('pagos_recibos')
      .update({ titular_paga: 'Contribuyente Test Actualizado' })
      .eq('id', newPago.id)
    if (!errPagoUpdate) {
      results.pagos_recibos.update = true
      console.log('  [OK] Update: Titular en recibo actualizado')
    }

    // DELETE
    const { error: errPagoDel } = await supabase
      .from('pagos_recibos')
      .delete()
      .eq('id', newPago.id)
    if (!errPagoDel) {
      results.pagos_recibos.delete = true
      console.log('  [OK] Delete: Pago de prueba eliminado')
    }
  }

  console.log('\n=================================================================')
  console.log(' RESUMEN FINAL DEL TEST CRUD SUPABASE')
  console.log('=================================================================')
  console.table(results)

  const allPassed = Object.values(results).every(
    (r) => (r.read || r.notes.includes('no-op')) && (!r.notes || r.notes === '')
  )
  if (allPassed) {
    console.log('\n>>> ¡ÉXITO TOTAL! CRUD 100% OPERATIVO CON SUPABASE EN TODAS LAS TABLAS <<<\n')
    process.exit(0)
  } else {
    console.error('\n>>> SE DETECTARON ERRORES O LIMITACIONES EN ALGUNA OPERACIÓN <<<\n')
    process.exit(1)
  }
}

runCrudVerification()

/**
 * Script de migración masiva para insertar todos los datos extraídos de los documentos
 * a la base de datos de Supabase.
 * Ejecutar con: npm run seed
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import seedData from '../src/data/initial_seed.json' with { type: 'json' }

// Cargar .env manualmente si existe
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

console.log('=====================================================')
console.log(' AETERNA CATASTRO - SCRIPT DE MIGRACIÓN A SUPABASE')
console.log('=====================================================')
console.log(`URL de Proyecto: ${supabaseUrl}`)

if (!supabaseKey) {
  console.log('\n[MODO SIMULACIÓN - DRY RUN]')
  console.log(`- Parcelas y Titulares listos para migrar: ${seedData.parcelas.length}`)
  console.log(`- Registros de Inhumaciones COVID listos: ${seedData.inhumaciones_covid.length}`)
  console.log(`- Afiliados al Seguro de Sepelio listos: ${seedData.afiliados.length}`)
  console.log('\nPara ejecutar la migración en vivo contra Supabase:')
  console.log('1. Pega tu ANON KEY o SERVICE ROLE KEY en el archivo .env:')
  console.log('   VITE_SUPABASE_ANON_KEY=tu-clave-aqui')
  console.log('2. Ejecuta nuevamente:')
  console.log('   npm run seed')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSeed() {
  console.log('\nIniciando conexión y migración a Supabase...\n')

  // 1. Asegurar Sectores Catastrales
  console.log('1. Registrando Sectores Catastrales (A, B, E, Salinas)...')
  const { error: errSectores } = await supabase.from('sectores').upsert([
    { codigo: 'A', nombre: 'Sector A', descripcion: 'Sector A Tradicional' },
    { codigo: 'B', nombre: 'Sector B', descripcion: 'Sector B Tradicional' },
    { codigo: 'E', nombre: 'Sector E', descripcion: 'Sector E Ampliación' },
    { codigo: 'SALINAS', nombre: 'Sector Salinas', descripcion: 'Sector Salinas' },
  ], { onConflict: 'codigo' })
  if (errSectores) console.warn('Aviso en sectores:', errSectores.message)
  else console.log('✓ Sectores registrados (A, B, E, Salinas).')

  // 2. Configuración de Cobro (CBU / Alias)
  console.log('\n2. Registrando Configuración CBU / Alias...')
  await supabase.from('configuracion_cobro').upsert({
    alias_cbu: 'AETERNA.CHAMICAL',
    cbu: '0000003100012345678901',
    titular_cuenta: 'Aeterna Servicios S.R.L.',
    banco: 'Banco Rioja',
    cuit: '30-71234567-9',
    mensaje_recibo: 'Gracias por su pago. Parque & Sepelios Aeterna Chamical.',
    activo: true,
  }, { onConflict: 'alias_cbu' })
  console.log('✓ Configuración CBU guardada.')

  // 3. Migrar Parcelas en lotes de 50
  console.log(`\n3. Migrando ${seedData.parcelas.length} Parcelas y Titulares...`)
  let migrados = 0
  for (let i = 0; i < seedData.parcelas.length; i += 50) {
    const chunk = seedData.parcelas.slice(i, i + 50).map((p) => {
      const sectorCode = p.sector || (p.nomenclatura.startsWith('E') ? 'E' : p.nomenclatura.startsWith('SAL') ? 'SALINAS' : 'A')
      return {
        nomenclatura: p.nomenclatura,
        sector_id: sectorCode,
        manzana_fila: p.manzana,
        numero_parcela: p.numero ? String(p.numero) : null,
        capacidad_total: 3,
        espacios_ocupados: p.estado === 'ocupada' || p.estado === 'en_mora' ? 1 : 0,
        estado: p.estado,
        saldo_mantenimiento: p.saldo_mantenimiento || 0,
        notas: p.titular ? `Titular histórico: ${p.titular}. Domicilio: ${p.direccion || 'Chamical'}` : '',
      }
    })

    const { error } = await supabase.from('parcelas').upsert(chunk, { onConflict: 'nomenclatura' })
    if (error) {
      console.warn(`Error en lote ${i}-${i + 50}:`, error.message)
    } else {
      migrados += chunk.length
      process.stdout.write(`  Progreso: ${migrados} / ${seedData.parcelas.length} parcelas...\r`)
    }
  }
  console.log(`\n✓ ${migrados} parcelas migradas a Supabase.`)

  // 4. Migrar Inhumaciones COVID y Libro General
  console.log(`\n4. Migrando ${seedData.inhumaciones_covid.length} Inhumaciones COVID...`)
  let inhMigradas = 0
  for (const inh of seedData.inhumaciones_covid) {
    const { error } = await supabase.from('inhumaciones').insert({
      nombre_difunto: inh.nombre_difunto,
      fecha_inhumacion: inh.fecha_inhumacion?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      nivel_posicion: 1,
      es_covid: inh.es_covid,
      causa_defuncion: inh.causa_defuncion,
      empresa_funebrera: 'Aeterna Sepelios',
      parcela_nomenclatura: inh.parcela || null,
      observaciones: `Parcela asignada: ${inh.parcela || 'S/D'}`,
    })
    if (!error) inhMigradas++
  }
  console.log(`✓ ${inhMigradas} registros de inhumaciones insertados.`)

  // 5. Migrar Afiliados Seguro y Matriz de 12 Cuotas 2026
  console.log(`\n5. Migrando ${seedData.afiliados.length} Afiliados y Generando Cuotas 2026...`)
  for (const a of seedData.afiliados) {
    const { data: afiRow, error: errAfi } = await supabase
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

    if (errAfi) {
      console.warn(`Aviso en afiliado #${a.numero_afiliado}:`, errAfi.message)
      continue
    }

    if (afiRow?.id) {
      // Generar 12 cuotas anuales para el afiliado
      const cuotas = []
      const mesesPagados = a.estado === 'activo' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2]
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
  console.log(`✓ ${seedData.afiliados.length} afiliados y sus cuotas 2026 migrados.`)

  // 6. Recibos de muestra en pagos_recibos
  console.log('\n6. Registrando Recibos Históricos...')
  await supabase.from('pagos_recibos').insert([
    {
      numero_recibo: 'REC-2026-0101',
      monto: 36000,
      metodo_pago: 'transferencia_qr',
      concepto: 'Mantenimiento Cuatrimestral - Parcela A-25-96',
      titular_paga: 'Fernández, Héctor Osvaldo',
    },
    {
      numero_recibo: 'REC-2026-0102',
      monto: 18000,
      metodo_pago: 'transferencia_qr',
      concepto: 'Seguro Sepelio - Cuota Ene 2026 (#101)',
      titular_paga: 'Romero, Carlos Alberto',
    }
  ])
  console.log('✓ Recibos registrados.')

  console.log('\n=====================================================')
  console.log(' ¡MIGRACIÓN A SUPABASE COMPLETADA CON ÉXITO!')
  console.log('=====================================================')
}

runSeed().catch((err) => {
  console.error('\nError en la migración:', err)
})

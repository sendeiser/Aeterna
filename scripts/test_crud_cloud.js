import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const ini = fs.readFileSync('aeterna-xp/bin/config.ini', 'utf-8')
const url = ini.match(/Url=(.*)/)[1].trim()
const key = ini.match(/AnonKey=(.*)/)[1].trim()
const supabase = createClient(url, key)

function isUuid(id) {
  return typeof id === 'string' && id.length === 36 && id.includes('-')
}

async function runTests() {
  console.log('=== TEST CRUD SUPABASE CLOUD ===')

  // 1. Parcela Test: Insert / Update / Delete
  const testNom = 'TEST-99-99'
  console.log('\n--- 1. PARCELAS ---')
  console.log('Creando parcela de prueba:', testNom)
  const { data: pInsert, error: pInsErr } = await supabase
    .from('parcelas')
    .upsert({
      nomenclatura: testNom,
      sector_id: 'A',
      manzana_fila: '99',
      numero_parcela: '99',
      capacidad_total: 3,
      espacios_ocupados: 0,
      estado: 'disponible',
      saldo_mantenimiento: 15000,
      notas: 'Test Automático CRUD'
    }, { onConflict: 'nomenclatura' })
    .select('id, nomenclatura')
    .single()

  if (pInsErr) {
    console.error('Error insertando parcela:', pInsErr)
  } else {
    console.log('Parcela creada OK con ID:', pInsert.id)
  }

  // Update parcela
  console.log('Actualizando saldo de parcela...')
  const { error: pUpdErr } = await supabase
    .from('parcelas')
    .update({ saldo_mantenimiento: 25000, estado: 'ocupada' })
    .eq('nomenclatura', testNom)
  if (pUpdErr) console.error('Error actualizando parcela:', pUpdErr)
  else console.log('Parcela actualizada OK')

  // 2. Inhumacion Test: Insert / Update / Delete
  console.log('\n--- 2. INHUMACIONES ---')
  const testDifunto = 'DIFUNTO PRUEBA CRUD TEST'
  console.log('Insertando acta de inhumacion...')
  const { data: inhData, error: inhErr } = await supabase
    .from('inhumaciones')
    .insert({
      parcela_id: pInsert?.id || null,
      parcela_nomenclatura: testNom,
      nombre_difunto: testDifunto,
      dni_difunto: '99999999',
      fecha_inhumacion: '2026-10-26',
      nivel_posicion: 1,
      causa_defuncion: 'Muerte Natural',
      empresa_funebrera: 'Aeterna Sepelios Test',
      responsable_contacto: 'Familiar Prueba',
      telefono_responsable: '3826-123456',
      observaciones: 'Acta de prueba CRUD'
    })
    .select('id, nombre_difunto')
    .single()

  if (inhErr) console.error('Error insertando inhumacion:', inhErr)
  else console.log('Inhumacion creada OK con ID:', inhData.id)

  // Update inhumacion
  console.log('Actualizando acta de inhumacion...')
  const { error: inhUpdErr } = await supabase
    .from('inhumaciones')
    .update({ nivel_posicion: 2, observaciones: 'Modificado por test' })
    .eq('id', inhData.id)
  if (inhUpdErr) console.error('Error actualizando inhumacion:', inhUpdErr)
  else console.log('Inhumacion actualizada OK')

  // 3. Afiliado Test: Insert / Update / Delete
  console.log('\n--- 3. AFILIADOS ---')
  const testNumAfil = 99999
  console.log('Insertando afiliado...')
  const { data: afiData, error: afiErr } = await supabase
    .from('afiliados_seguro')
    .upsert({
      numero_afiliado: testNumAfil,
      nombre_completo: 'Afiliado Test CRUD',
      direccion_cobro: 'Calle Falsa 123',
      zona_cobro: 'Zona Test',
      monto_cuota_mensual: 20000,
      estado: 'activo'
    }, { onConflict: 'numero_afiliado' })
    .select('id, numero_afiliado')
    .single()

  if (afiErr) console.error('Error insertando afiliado:', afiErr)
  else console.log('Afiliado creado OK con ID:', afiData.id)

  // Update afiliado
  console.log('Actualizando cuota de afiliado...')
  const { error: afiUpdErr } = await supabase
    .from('afiliados_seguro')
    .update({ monto_cuota_mensual: 25000, estado: 'en_mora' })
    .eq('numero_afiliado', testNumAfil)
  if (afiUpdErr) console.error('Error actualizando afiliado:', afiUpdErr)
  else console.log('Afiliado actualizado OK')

  // 4. Limpieza (DELETE)
  console.log('\n--- 4. LIMPIEZA (DELETE) ---')
  const { error: delInhErr } = await supabase
    .from('inhumaciones')
    .delete()
    .eq('id', inhData.id)
  if (delInhErr) console.error('Error eliminando inhumacion:', delInhErr)
  else console.log('Inhumacion eliminada OK')

  const { error: delAfiErr } = await supabase
    .from('afiliados_seguro')
    .delete()
    .eq('numero_afiliado', testNumAfil)
  if (delAfiErr) console.error('Error eliminando afiliado:', delAfiErr)
  else console.log('Afiliado eliminado OK')

  const { error: delParcErr } = await supabase
    .from('parcelas')
    .delete()
    .eq('nomenclatura', testNom)
  if (delParcErr) console.error('Error eliminando parcela:', delParcErr)
  else console.log('Parcela eliminada OK')

  console.log('\n=== CRUD TEST COMPLETADO CON EXITO ===')
}

runTests().catch(console.error)

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Cargar .env
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

const supabase = createClient(supabaseUrl, anonKey)

async function runCuotasTest() {
  console.log('--- Iniciando prueba de sincronización de cuotas en Supabase ---')

  // 1. Obtener afiliados
  const { data: afiliados, error: errAfi } = await supabase
    .from('afiliados_seguro')
    .select('*, cuotas:cuotas_seguro(*)')
    .order('numero_afiliado', { ascending: true })

  if (errAfi || !afiliados || afiliados.length === 0) {
    console.error('FAIL: No se encontraron afiliados:', errAfi?.message)
    process.exit(1)
  }

  const afi = afiliados[0]
  console.log(`[OK] Afiliado seleccionado: #${afi.numero_afiliado} (${afi.nombre_completo}) - ID: ${afi.id}`)

  // 2. Registrar cobro de cuota 4 (Abril) 2026
  const nroReciboTest = `TEST-REC-${Date.now()}`
  console.log(`--> Registrando pago de cuota 4 con recibo ${nroReciboTest}...`)

  const { error: errPago } = await supabase
    .from('cuotas_seguro')
    .update({
      estado_cuota: 'pagada',
      fecha_pago: new Date().toISOString(),
      metodo_pago: 'transferencia_qr',
      nro_recibo: nroReciboTest,
      monto: 18000
    })
    .eq('afiliado_id', afi.id)
    .eq('anio', 2026)
    .eq('mes', 4)

  if (errPago) {
    console.error('FAIL al registrar pago:', errPago.message)
    process.exit(1)
  }
  console.log('  [OK] Pago de cuota 4 actualizado en cuotas_seguro')

  // 3. Verificar estado
  const { data: readCuota, error: errRead } = await supabase
    .from('cuotas_seguro')
    .select('*')
    .eq('afiliado_id', afi.id)
    .eq('anio', 2026)
    .eq('mes', 4)
    .single()

  if (errRead || !readCuota || readCuota.estado_cuota !== 'pagada' || readCuota.nro_recibo !== nroReciboTest) {
    console.error('FAIL al verificar cuota 4:', errRead?.message, readCuota)
    process.exit(1)
  }
  console.log('  [OK] Cuota 4 verificada correctamente con nro_recibo:', readCuota.nro_recibo)

  // 4. Revertir cuota 4 a pendiente
  console.log('--> Revirtiendo cuota 4 a estado pendiente...')
  const { error: errRev } = await supabase
    .from('cuotas_seguro')
    .update({
      estado_cuota: 'pendiente',
      fecha_pago: null,
      metodo_pago: null,
      nro_recibo: null
    })
    .eq('afiliado_id', afi.id)
    .eq('anio', 2026)
    .eq('mes', 4)

  if (errRev) {
    console.error('FAIL al revertir cuota 4:', errRev.message)
    process.exit(1)
  }
  console.log('  [OK] Cuota 4 revertida limpiamente')

  console.log('\n>>> SUCCESS: Prueba de sincronización de cuotas completada con éxito <<<')
}

runCuotasTest().catch(e => {
  console.error('Error fatal:', e)
  process.exit(1)
})

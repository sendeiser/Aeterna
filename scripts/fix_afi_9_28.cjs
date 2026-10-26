const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAfi() {
  await supabase.from('afiliados_seguro').update({
    nombre_completo: 'Zárate, Nélida Esther',
    direccion_cobro: 'Calle 9 de Julio 384',
    zona_cobro: 'Zona 1 - Ruta 1 / B° Tiro',
    monto_cuota_mensual: 18000,
    estado: 'activo'
  }).eq('numero_afiliado', 9);

  await supabase.from('afiliados_seguro').insert({
    numero_afiliado: 28,
    nombre_completo: 'Carrizo, Waldo Benjamín',
    direccion_cobro: 'Calle Facundo Quiroga 115',
    zona_cobro: 'Zona 3 - Centro Chamical',
    monto_cuota_mensual: 18000,
    estado: 'activo',
    fecha_alta: '2025-01-01'
  });

  const { data: allAfi } = await supabase.from('afiliados_seguro').select('numero_afiliado, nombre_completo, direccion_cobro, zona_cobro').order('numero_afiliado');
  console.log('All Supabase Afiliados:', allAfi);
}

fixAfi();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('inhumaciones')
    .select('id, nombre_difunto, fecha_inhumacion, parcela_id, parcela_nomenclatura, nivel_posicion, es_covid, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Total inhumaciones in Supabase:', data.length);
  const byParcela = {};
  for (const inh of data) {
    const p = inh.parcela_nomenclatura || 'SIN_PARCELA';
    byParcela[p] = (byParcela[p] || 0) + 1;
  }
  console.log('\n--- Parcelas con mas de 3 registros ---');
  for (const [p, count] of Object.entries(byParcela)) {
    if (count > 3) {
      console.log(p + ': ' + count + ' registros');
    }
  }
  console.log('\n--- Detalle de registros ---');
  data.forEach((inh, idx) => {
    console.log(`[${idx+1}] ID: ${inh.id} | Difunto: ${inh.nombre_difunto} | Parcela: ${inh.parcela_nomenclatura} (Nivel ${inh.nivel_posicion}) | Fecha: ${inh.fecha_inhumacion} | created_at: ${inh.created_at}`);
  });
}
run();

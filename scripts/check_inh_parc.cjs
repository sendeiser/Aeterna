const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: inhs } = await supabase.from('inhumaciones').select('id, nombre_difunto, parcela_id, parcela_nomenclatura');
  const { data: parcs } = await supabase.from('parcelas').select('id, nomenclatura');
  const parcMap = Object.fromEntries(parcs.map(p => [p.id, p.nomenclatura]));
  for (const inh of inhs) {
    console.log(inh.nombre_difunto + ' -> p_id: ' + inh.parcela_id + ' (maps to: ' + parcMap[inh.parcela_id] + '), nom: ' + inh.parcela_nomenclatura);
  }
}
run();

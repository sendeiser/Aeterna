const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: parc, count: countParc, error: errP } = await supabase.from('parcelas').select('id, nomenclatura, titular_id', { count: 'exact' }).limit(5);
  console.log('parcelas in Supabase count:', countParc, 'err:', errP);

  const { data: inh, count: countInh, error: errI } = await supabase.from('inhumaciones').select('id, nombre_difunto', { count: 'exact' }).limit(5);
  console.log('inhumaciones in Supabase count:', countInh, 'err:', errI);

  const { data: tit, count: countTit, error: errT } = await supabase.from('titulares').select('id, nombre_completo', { count: 'exact' }).limit(5);
  console.log('titulares in Supabase count:', countTit, 'err:', errT);
}

check();

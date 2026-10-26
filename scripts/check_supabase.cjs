const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: titulares, error: errTit } = await supabase.from('titulares').select('id, nombre_completo').limit(5);
  console.log('Titulares in Supabase:', titulares, 'Error:', errTit);

  const { data: afiliados, error: errAfi } = await supabase.from('afiliados').select('id, nombre_completo').limit(5);
  console.log('Afiliados in Supabase:', afiliados, 'Error:', errAfi);
}

check();

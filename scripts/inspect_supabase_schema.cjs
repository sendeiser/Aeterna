const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data: colsAfi } = await supabase.from('afiliados_seguro').select('*').limit(1);
  console.log('afiliados_seguro keys:', colsAfi ? Object.keys(colsAfi[0]) : null);

  const { data: colsTit } = await supabase.from('titulares').select('*').limit(1);
  console.log('titulares sample:', colsTit);

  const { data: colsParc } = await supabase.from('parcelas').select('*').limit(1);
  console.log('parcelas keys:', colsParc ? Object.keys(colsParc[0]) : null);
}

inspect();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStates() {
  const states = ['activo', 'inactivo', 'suspendido', 'baja', 'al_dia', 'moroso', 'mora'];
  for (const s of states) {
    const { error } = await supabase.from('afiliados_seguro').update({ estado: s }).eq('numero_afiliado', 1);
    console.log(`State "${s}" allowed?`, !error, error ? error.message : '');
  }
}

testStates();

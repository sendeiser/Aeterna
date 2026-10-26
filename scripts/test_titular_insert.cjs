const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTitular() {
  const { data, error } = await supabase.from('titulares').insert({
    nombre_completo: 'Test Titular',
    dni: '12345678',
    telefono: '3826000000',
    direccion: 'Chamical',
    estado_titular: 'activo'
  }).select();
  console.log('insert test titular:', data, 'error:', error);
  if (data && data[0]) {
    await supabase.from('titulares').delete().eq('id', data[0].id);
    console.log('cleaned up test titular');
  }
}

testTitular();

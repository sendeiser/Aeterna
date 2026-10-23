const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncAll() {
  const seedPath = path.resolve(__dirname, '../src/data/initial_seed.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  console.log('1. Syncing clean Afiliados to Supabase...');
  for (const a of seed.afiliados) {
    const { data: existing } = await supabase
      .from('afiliados_seguro')
      .select('id')
      .eq('numero_afiliado', a.numero_afiliado)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('afiliados_seguro')
        .update({
          nombre_completo: a.nombre_completo,
          direccion_cobro: a.direccion_cobro,
          zona_cobro: a.zona_cobro,
          monto_cuota_mensual: a.monto_cuota_mensual,
          estado: a.estado,
        })
        .eq('id', existing.id);
      if (error) console.error(`Error updating afi #${a.numero_afiliado}:`, error);
      else console.log(`Updated afi #${a.numero_afiliado} -> ${a.nombre_completo}`);
    } else {
      const { error } = await supabase
        .from('afiliados_seguro')
        .insert({
          numero_afiliado: a.numero_afiliado,
          nombre_completo: a.nombre_completo,
          direccion_cobro: a.direccion_cobro,
          zona_cobro: a.zona_cobro,
          monto_cuota_mensual: a.monto_cuota_mensual,
          estado: a.estado,
          fecha_alta: '2025-01-01',
        });
      if (error) console.error(`Error inserting afi #${a.numero_afiliado}:`, error);
      else console.log(`Inserted afi #${a.numero_afiliado} -> ${a.nombre_completo}`);
    }
  }

  console.log('\n2. Syncing clean Parcelas and Titulares to Supabase...');
  // Query all existing parcelas in Supabase
  const { data: dbParcelas } = await supabase.from('parcelas').select('id, nomenclatura');
  const dbMap = new Map();
  if (dbParcelas) {
    dbParcelas.forEach(p => dbMap.set(p.nomenclatura, p.id));
  }

  // Create unique titulares map
  const uniqueTitulares = new Map();
  for (const p of seed.parcelas) {
    if (p.titular && p.titular !== 'Municipalidad de Chamical') {
      if (!uniqueTitulares.has(p.titular)) {
        uniqueTitulares.set(p.titular, p.direccion || 'Chamical');
      }
    }
  }

  console.log(`Found ${uniqueTitulares.size} unique titulares to upsert.`);
  const titularIdMap = new Map();

  // Batch insert/upsert titulares
  const titList = Array.from(uniqueTitulares.entries()).map(([nombre, dir]) => ({
    nombre_completo: nombre,
    direccion: dir,
    ciudad: 'Chamical',
    provincia: 'La Rioja',
    estado_titular: 'activo',
  }));

  // Upsert in batches of 50
  for (let i = 0; i < titList.length; i += 50) {
    const chunk = titList.slice(i, i + 50);
    const { data: upserted, error } = await supabase
      .from('titulares')
      .upsert(chunk, { onConflict: 'nombre_completo' })
      .select('id, nombre_completo');
    
    if (error) {
      console.warn('Upsert titulares error (may not have unique constraint):', error.message);
      // Fallback: query or insert one by one
      for (const item of chunk) {
        const { data: found } = await supabase.from('titulares').select('id').eq('nombre_completo', item.nombre_completo).maybeSingle();
        if (found) {
          titularIdMap.set(item.nombre_completo, found.id);
        } else {
          const { data: ins } = await supabase.from('titulares').insert(item).select('id').single();
          if (ins) titularIdMap.set(item.nombre_completo, ins.id);
        }
      }
    } else if (upserted) {
      upserted.forEach(t => titularIdMap.set(t.nombre_completo, t.id));
    }
  }
  console.log(`Titulares mapped: ${titularIdMap.size}`);

  // Now update parcelas in Supabase with clean notes and titular_id
  let updatedCount = 0;
  for (const p of seed.parcelas) {
    const dbId = dbMap.get(p.nomenclatura);
    const titId = p.titular ? titularIdMap.get(p.titular) || null : null;
    const cleanNotas = p.titular
      ? `Titular: ${p.titular}. Domicilio: ${p.direccion || 'Chamical'}`
      : 'Parcela disponible';

    if (dbId) {
      const { error } = await supabase
        .from('parcelas')
        .update({
          titular_id: titId,
          notas: cleanNotas,
          estado: p.estado,
          saldo_mantenimiento: p.saldo_mantenimiento || 0,
        })
        .eq('id', dbId);
      if (!error) updatedCount++;
    } else {
      // Insert if missing
      await supabase.from('parcelas').insert({
        nomenclatura: p.nomenclatura,
        manzana_fila: p.manzana,
        numero_parcela: p.numero,
        capacidad_total: 3,
        espacios_ocupados: p.estado === 'disponible' ? 0 : 1,
        titular_id: titId,
        notas: cleanNotas,
        estado: p.estado,
        saldo_mantenimiento: p.saldo_mantenimiento || 0,
      });
      updatedCount++;
    }
  }

  console.log(`Successfully synced ${updatedCount} parcelas to Supabase!`);
}

syncAll().then(() => console.log('Done syncing to Supabase!'));

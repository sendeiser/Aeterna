/**
 * Script de migración y corrección de inhumaciones
 * Corrige y reemplaza los registros duplicados / mal asignados con la lista real de COVID.pdf
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xftwykrxumzxaqhosbvt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHd5a3J4dW16eGFxaG9zYnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MjkwMjMsImV4cCI6MjEwODIwNTAyM30.sGfvd6fOpkfDJLy3S01RqIK76jv1wx5W2vtjyDSaAXA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const REAL_INHUMACIONES = [
  // --- PAGINA 1 ---
  { parcela: 'A-11-56', difunto: 'Luna, Jesús Antonio', fecha: '2004-08-27', nivel: 1, covid: false, obs: 'Incluir en listado' },
  { parcela: 'A-11-56', difunto: 'Brizuela, María Hilda', fecha: '2017-05-10', nivel: 2, covid: false, obs: 'Incluir en listado' },
  { parcela: 'A-11-56', difunto: 'Alsina, Sixto', fecha: '2017-11-22', nivel: 3, covid: false, obs: 'Incluir en listado' },
  { parcela: 'A-11-45', difunto: 'Oliva, Adán José', fecha: '2004-10-10', nivel: 1, covid: false },
  { parcela: 'A-11-39', difunto: 'Funes, Luis Alberto', fecha: '2020-08-30', nivel: 1, covid: true },
  { parcela: 'A-11-38', difunto: 'Carrera, Juan N.', fecha: '2021-09-11', nivel: 1, covid: true },
  { parcela: 'A-12-38', difunto: 'Salinas, Víctor', fecha: '2020-09-18', nivel: 1, covid: true },
  { parcela: 'A-12-42', difunto: 'Díaz, Laureano Oscar', fecha: '2021-02-17', nivel: 1, covid: true },
  { parcela: 'A-12-45', difunto: 'Valdez, Germán', fecha: '2020-08-23', nivel: 1, covid: false },
  { parcela: 'A-12-46', difunto: 'Vera, Antonio', fecha: '2020-09-22', nivel: 1, covid: false, obs: 'Chami' },
  { parcela: 'A-12-48', difunto: 'Díaz, Irma Elena', fecha: '2021-04-26', nivel: 1, covid: false },
  { parcela: 'A-12-52', difunto: 'Lozada, Miguel Ángel', fecha: '2021-01-18', nivel: 1, covid: false },
  { parcela: 'A-12-53', difunto: 'Lozada, Francisco Gabriel', fecha: '2021-10-16', nivel: 1, covid: false },
  { parcela: 'A-14-42', difunto: 'Toledo, Guillermo Federico', fecha: '2020-08-30', nivel: 1, covid: true },
  { parcela: 'A-14-44', difunto: 'Nareto, Esteban', fecha: '2020-10-05', nivel: 1, covid: true },
  { parcela: 'A-14-45', difunto: 'Vega, Irma', fecha: '2020-08-24', nivel: 1, covid: true },
  { parcela: 'A-14-46', difunto: 'Vega, Mariano Orlando', fecha: '2020-08-30', nivel: 1, covid: true },
  { parcela: 'A-14-47', difunto: 'Bazán, Felisa Juana', fecha: '2020-09-16', nivel: 1, covid: true },
  { parcela: 'A-14-54', difunto: 'Luna, Pablo G.', fecha: '2021-07-02', nivel: 1, covid: false },
  { parcela: 'A-14-56', difunto: 'Martínez, Germán F.', fecha: '2021-07-19', nivel: 1, covid: false },
  { parcela: 'A-14-57', difunto: 'Lozada, Noelia del R.', fecha: '2021-07-21', nivel: 1, covid: false },
  { parcela: 'A-13-58', difunto: 'Molina, Ángel Humberto', fecha: '2015-05-14', nivel: 1, covid: false },

  // --- PAGINA 2 ---
  { parcela: 'A-16-43', difunto: 'Arroyo, Irma Daniela', fecha: '2021-08-10', nivel: 1, covid: true },
  { parcela: 'A-16-44', difunto: 'Jofré, Manuel', fecha: '2021-07-26', nivel: 1, covid: false },
  { parcela: 'A-16-45', difunto: 'Oviedo, Mónica', fecha: '2021-04-25', nivel: 1, covid: false },
  { parcela: 'A-16-46', difunto: 'Brandalisse, Alfredo', fecha: '2012-02-17', nivel: 1, covid: false },
  { parcela: 'A-16-47', difunto: 'Rodríguez, Mónica', fecha: '2020-09-26', nivel: 1, covid: false },
  { parcela: 'A-16-49', difunto: 'Juín, Jorge Fernando', fecha: '2021-04-24', nivel: 1, covid: false },
  { parcela: 'A-16-51', difunto: 'Díaz, Víctor Hugo', fecha: '2021-01-01', nivel: 1, covid: false },
  { parcela: 'A-16-53', difunto: 'Moreno, Horacio Eugenio', fecha: '2000-08-25', nivel: 1, covid: false },
  { parcela: 'A-16-53', difunto: 'Romero, Ángela Gladys', fecha: '2005-08-21', nivel: 2, covid: false },
  { parcela: 'A-16-53', difunto: 'Mercado, Clotilde', fecha: '2010-01-31', nivel: 3, covid: false },
  { parcela: 'A-16-60', difunto: 'Moreno, Victoria A.', fecha: '2022-01-27', nivel: 1, covid: false },
  { parcela: 'A-17-40', difunto: 'Díaz, María A.', fecha: '2021-08-17', nivel: 1, covid: false },
  { parcela: 'A-17-41', difunto: 'Maldonado, Irma', fecha: '2021-01-01', nivel: 1, covid: false },
  { parcela: 'A-17-42', difunto: 'Vera, Pablo R.', fecha: '2021-07-24', nivel: 1, covid: false },
  { parcela: 'A-17-43', difunto: 'Brizuela, July', fecha: '2021-01-01', nivel: 1, covid: false },
  { parcela: 'A-17-47', difunto: 'Díaz, Delinda Antonia', fecha: '2021-07-23', nivel: 1, covid: false },
  { parcela: 'A-17-48', difunto: 'Molina, Fco. Ramón', fecha: '2021-07-17', nivel: 1, covid: false },
  { parcela: 'A-17-49', difunto: 'Herrera, Nancy', fecha: '2021-07-06', nivel: 1, covid: false },
  { parcela: 'A-17-54', difunto: 'Martínez, Juana de los Ángeles', fecha: '2021-09-17', nivel: 1, covid: false },
  { parcela: 'A-17-56', difunto: 'Romero, Juana de las Mercedes', fecha: '2021-09-11', nivel: 1, covid: false },
  { parcela: 'A-17-57', difunto: 'Godoy, Marcelina Jesús', fecha: '2021-09-09', nivel: 1, covid: false },
  { parcela: 'A-18-42', difunto: 'Reyes, Jorge', fecha: '2020-08-11', nivel: 1, covid: false },

  // --- PAGINA 3 ---
  { parcela: 'A-18-43', difunto: 'Bazán, Julio León', fecha: '2021-08-10', nivel: 1, covid: true },
  { parcela: 'A-18-45', difunto: 'Contreras, Graciela Ramona', fecha: '2021-07-26', nivel: 1, covid: false },
  { parcela: 'A-18-50', difunto: 'Ferreyra, Diego H.', fecha: '2021-07-29', nivel: 1, covid: false },
  { parcela: 'A-18-51', difunto: 'Molina, Antonio', fecha: '2021-01-01', nivel: 1, covid: false },
  { parcela: 'A-18-54', difunto: 'Páez Castro, Ma. Elisa', fecha: '2021-08-01', nivel: 1, covid: false },
  { parcela: 'A-18-56', difunto: 'Rolón, Esteban', fecha: '2021-08-07', nivel: 1, covid: false },
  { parcela: 'A-18-57', difunto: 'Quinteros, Francisco Hilario', fecha: '2021-10-04', nivel: 1, covid: false },
  { parcela: 'A-18-58', difunto: 'Silva, Teresa', fecha: '2022-01-30', nivel: 1, covid: false },
  { parcela: 'A-18-59', difunto: 'Vargas, Gerardo Héctor', fecha: '2022-02-03', nivel: 1, covid: false },
  { parcela: 'A-18-63', difunto: 'Guzmán, Mercedes', fecha: '2015-08-11', nivel: 1, covid: false },
  { parcela: 'A-18-20', difunto: 'Moreyra, Emeterio Ramón', fecha: '1993-03-04', nivel: 1, covid: false },
  { parcela: 'A-16-80', difunto: 'Gómez, Ernesto Gregorio', fecha: '2017-12-18', nivel: 1, covid: false },
  { parcela: 'A-15-90', difunto: 'Ibáñez, Armando Nicolás', fecha: '2009-11-14', nivel: 1, covid: false },
  { parcela: 'A-15-90', difunto: 'García, María Angélica', fecha: '2012-03-30', nivel: 2, covid: false },
  { parcela: 'A-14-107', difunto: 'Quintero, Roxana del Rosario', fecha: '2019-03-15', nivel: 1, covid: false },
  { parcela: 'A-14-105', difunto: 'Rivero, Silverio Cruz', fecha: '2007-03-18', nivel: 1, covid: false },
  { parcela: 'A-13-103', difunto: 'Carreño, Lorenza', fecha: '2017-11-03', nivel: 1, covid: false },
  { parcela: 'A-13-101', difunto: 'Torres, Jorge Víctor', fecha: '2019-12-13', nivel: 1, covid: false },
  { parcela: 'A-13-91', difunto: 'Piraino, Pablo Vicente', fecha: '2003-10-10', nivel: 1, covid: false },
  { parcela: 'A-12-96', difunto: 'Sedán, Alberto J.', fecha: '2021-03-18', nivel: 1, covid: false },
  { parcela: 'A-12-107', difunto: 'Molina, Fco. Hipólito', fecha: '2008-10-07', nivel: 1, covid: false },
  { parcela: 'A-16-108', difunto: 'Piviero, Primo', fecha: '2021-04-17', nivel: 1, covid: false },
  { parcela: 'A-17-108', difunto: 'Acevedo, Primo José', fecha: '2016-10-26', nivel: 1, covid: false },
  { parcela: 'A-18-90', difunto: 'Nieto de Ávila, Fca. Antonia', fecha: '2010-09-24', nivel: 1, covid: false },
  { parcela: 'A-17-90', difunto: 'Carrera, Mario Alexis', fecha: '1994-06-14', nivel: 1, covid: false },
  { parcela: 'A-19-98', difunto: 'Romero, Antonio Rubén', fecha: '2016-03-10', nivel: 1, covid: false },
  { parcela: 'A-19-92', difunto: 'Castro, Pedro I.', fecha: '1996-09-06', nivel: 1, covid: false },
  { parcela: 'A-19-92', difunto: 'Castro, Fausto', fecha: '2010-12-13', nivel: 2, covid: false },

  // --- PAGINA 4 ---
  { parcela: 'A-20-109', difunto: 'Chara, Onofre', fecha: '2018-07-13', nivel: 1, covid: false },
  { parcela: 'A-21-80', difunto: 'Sánchez, Ángel R.', fecha: '2012-03-08', nivel: 1, covid: false },
  { parcela: 'A-21-80', difunto: 'Castro, Pura A.', fecha: '2020-05-07', nivel: 2, covid: false },
  { parcela: 'A-23-70', difunto: 'Raed, H. Enzo', fecha: '2017-12-08', nivel: 1, covid: false },
  { parcela: 'A-24-76', difunto: 'Brandt, Elba Amalia', fecha: '2018-11-26', nivel: 1, covid: false },
  { parcela: 'A-24-90', difunto: 'Bértola, Ma. Eugenia', fecha: '2017-03-19', nivel: 1, covid: false },
  { parcela: 'A-25-105', difunto: 'Reynoso, Adán Ángel', fecha: '2017-01-19', nivel: 1, covid: false },
  { parcela: 'A-24-102', difunto: 'Fernández, Onésimo Martín', fecha: '2010-05-16', nivel: 1, covid: false },
  { parcela: 'A-25-77', difunto: 'Moreno, Hilda Rosario', fecha: '2021-04-01', nivel: 1, covid: false },
  { parcela: 'A-26-76', difunto: 'Centeno, Luis Héctor', fecha: '2006-01-22', nivel: 1, covid: false },
  { parcela: 'A-26-102', difunto: 'Yati, Estrella', fecha: '2001-01-31', nivel: 1, covid: false },
  { parcela: 'A-28-76', difunto: 'Báez, Romina Aldana', fecha: '2006-08-10', nivel: 1, covid: false },
  { parcela: 'A-28-86', difunto: 'Muñoz, Gilda Ema', fecha: '2008-05-07', nivel: 1, covid: false },
  { parcela: 'A-29-104', difunto: 'Díaz, Adrián A.', fecha: '2020-03-02', nivel: 1, covid: false },
  { parcela: 'A-30-89', difunto: 'Sancho, Bautista', fecha: '1989-07-07', nivel: 1, covid: false },
  { parcela: 'A-30-88', difunto: 'Bordón de Arroyo, Buchi', fecha: '2015-01-01', nivel: 1, covid: false },
  { parcela: 'A-30-78', difunto: 'Rodríguez, Raúl Gerardo', fecha: '2015-08-13', nivel: 1, covid: false },
  { parcela: 'A-31-103', difunto: 'Vidable, Elsa del Carmen', fecha: '2016-02-01', nivel: 1, covid: false },
  { parcela: 'A-32-101', difunto: 'Rigacci, Patricio', fecha: '2004-05-04', nivel: 1, covid: false },
  { parcela: 'A-37-97', difunto: 'Ferreyra de Flores, Rosa', fecha: '2016-12-08', nivel: 1, covid: false },
  { parcela: 'A-35-62', difunto: 'De la Fuente, Lucas Alcides', fecha: '2008-08-06', nivel: 1, covid: false },
  { parcela: 'A-35-62', difunto: 'Palazzi, María Luisa', fecha: '2017-04-08', nivel: 2, covid: false },
  { parcela: 'A-35-59', difunto: 'Arrieta, Ramona Antonia', fecha: '2020-11-22', nivel: 1, covid: false },
  { parcela: 'A-37-67', difunto: 'Cattaneo, Juan Carlos', fecha: '2009-03-09', nivel: 1, covid: false },
  { parcela: 'A-37-67', difunto: 'Hilal, Marta Amelia', fecha: '2015-04-25', nivel: 2, covid: false },
  { parcela: 'A-39-65', difunto: 'Maldonado, Waldo N.', fecha: '2018-01-01', nivel: 1, covid: false },
  { parcela: 'A-40-62', difunto: 'Lelli, Raúl Eduardo', fecha: '2020-06-29', nivel: 1, covid: false },

  // --- PAGINA 5 ---
  { parcela: 'A-42-72', difunto: 'Romero, Teresa', fecha: '2015-04-03', nivel: 1, covid: false },
  { parcela: 'A-42-74', difunto: 'Quevedo, Petrona Carmen', fecha: '2018-11-02', nivel: 1, covid: false },
  { parcela: 'A-42-74', difunto: 'Rodríguez, Eduardo', fecha: '2019-03-06', nivel: 2, covid: false },
  { parcela: 'A-42-82', difunto: 'Mohamed, Dipp', fecha: '2013-10-01', nivel: 1, covid: false },
  { parcela: 'A-42-77', difunto: 'Vottero, Oscar', fecha: '2018-08-24', nivel: 1, covid: false },
  { parcela: 'A-42-76', difunto: 'Escalante, Cecilia Raquel', fecha: '2019-03-02', nivel: 1, covid: false },
  { parcela: 'A-40-77', difunto: 'González de Quagliaro, Elcira', fecha: '1998-06-11', nivel: 1, covid: false },
  { parcela: 'A-40-77', difunto: 'Quagliaro, Marcelo Pablo', fecha: '2019-10-31', nivel: 2, covid: false },
  { parcela: 'A-42-87', difunto: 'Melqui, Betty Mercedes', fecha: '2019-12-11', nivel: 1, covid: false },

  // --- SECTOR E ---
  { parcela: 'E-26-115', difunto: 'Craig, Juan José', fecha: '2017-01-01', nivel: 1, covid: false },
  { parcela: 'E-25-112', difunto: 'Godoy, Marcelo Daniel', fecha: '2017-04-02', nivel: 1, covid: false },
  { parcela: 'E-12-117', difunto: 'Ortega, Aldo Saúl', fecha: '2018-08-27', nivel: 1, covid: false },
  { parcela: 'E-10-118', difunto: 'Malano, María Elsa', fecha: '2017-02-11', nivel: 1, covid: false },
  { parcela: 'E-12-123', difunto: 'Scheibengraf, Heidi Cristina', fecha: '2022-02-01', nivel: 1, covid: false },
  { parcela: 'E-08-133', difunto: 'Reynoso, Dardo David', fecha: '2019-09-13', nivel: 1, covid: false }
];

async function migrate() {
  console.log('=== INICIANDO MIGRACIÓN DE INHUMACIONES LIMPIAS ===');

  // 1. Obtener parcelas actuales
  const { data: currentParcs, error: errP } = await supabase.from('parcelas').select('id, nomenclatura');
  if (errP) throw errP;

  const parcMap = new Map();
  currentParcs.forEach(p => parcMap.set(p.nomenclatura, p.id));
  console.log(`Parcelas existentes en DB: ${parcMap.size}`);

  // 2. Crear parcelas que falten
  const requiredParcelas = [...new Set(REAL_INHUMACIONES.map(r => r.parcela))];
  const missingParcelas = requiredParcelas.filter(nom => !parcMap.has(nom));
  console.log(`Parcelas faltantes a insertar: ${missingParcelas.length}`);

  for (const nom of missingParcelas) {
    const parts = nom.split('-');
    const sector = parts[0] || 'A';
    const fila = parts[1] || '0';
    const num = parts[2] || '0';

    const { data: newP, error: errNew } = await supabase.from('parcelas').insert({
      nomenclatura: nom,
      sector_id: sector,
      manzana_fila: fila,
      numero_parcela: num,
      capacidad_total: 3,
      espacios_ocupados: 0,
      estado: 'ocupada'
    }).select('id, nomenclatura').single();

    if (errNew) {
      console.error(`Error insertando parcela ${nom}:`, errNew.message);
    } else {
      parcMap.set(newP.nomenclatura, newP.id);
    }
  }

  // 3. Eliminar los 30 registros erróneos del seed inicial (OCR basura)
  // Identificados por haber sido cargados el 2026-10-22 o por tener los nombres corruptos conocidos
  const BAD_OCR_NAMES = [
    'acele)', 'kfuuenlistee', 'TeacaAutonohona', '2年Oy cy meleirinlisted',
    'Aisina Sixto', 'Adau Tose Oliva', 'LuisAbeiteFune)', 'Jueu N Canera',
    'Sector Salinces', 'hauuvare Cscier Dicey', 'Perman Valdea', 'Hrma Elena.',
    'MiauceO Aungel', 'Rotrete', 'fuillemoFeleucHokd3', 'Maniano Orloudo Veqa',
    '020421', 'Noelial R.Looda', 'MolnaAngelHensert', 'Annoey', 'k ez z!',
    'A1e-43', 'Z042.1', 'A16-4h', 'MkoniCaOvied', 'Albed randedinse',
    'Mouica Rodic', '266720', 'A6 -49', '241.0421'
  ];

  console.log('Eliminando registros antiguos de OCR corrupto...');
  for (const badName of BAD_OCR_NAMES) {
    const { error: errDel } = await supabase.from('inhumaciones').delete().eq('nombre_difunto', badName);
    if (errDel) console.error(`Error eliminando ${badName}:`, errDel.message);
  }

  // También eliminar registros con parcela_nomenclatura 'Sector Salinas'
  await supabase.from('inhumaciones').delete().eq('parcela_nomenclatura', 'Sector Salinas');

  // Eliminar duplicado con typo en nombre
  await supabase.from('inhumaciones').delete().eq('id', '3762a610-b388-47eb-990c-da6997655003');

  // 4. Insertar las 114 inhumaciones reales vinculadas a sus parcelas
  console.log(`Insertando ${REAL_INHUMACIONES.length} inhumaciones verificadas...`);

  let insertedCount = 0;
  for (const rec of REAL_INHUMACIONES) {
    const pId = parcMap.get(rec.parcela);
    if (!pId) {
      console.warn(`[WARN] Parcela no encontrada para ${rec.difunto}: ${rec.parcela}`);
    }

    // Verificar si ya existe este difunto con esta parcela
    const { data: existing } = await supabase
      .from('inhumaciones')
      .select('id')
      .eq('nombre_difunto', rec.difunto)
      .eq('parcela_nomenclatura', rec.parcela)
      .maybeSingle();

    if (existing) {
      // Actualizar parcela_id y nivel si ya existía
      await supabase.from('inhumaciones').update({
        parcela_id: pId || null,
        nivel_posicion: rec.nivel,
        fecha_inhumacion: rec.fecha,
        es_covid: rec.covid,
        causa_defuncion: rec.covid ? 'Protocolo COVID-19 / Sanitario' : 'Inhumación Estándar'
      }).eq('id', existing.id);
    } else {
      const { error: errIns } = await supabase.from('inhumaciones').insert({
        parcela_id: pId || null,
        parcela_nomenclatura: rec.parcela,
        nombre_difunto: rec.difunto,
        fecha_inhumacion: rec.fecha,
        fecha_fallecimiento: rec.fecha,
        nivel_posicion: rec.nivel,
        es_covid: rec.covid,
        causa_defuncion: rec.covid ? 'Protocolo COVID-19 / Sanitario' : 'Inhumación Estándar',
        observaciones: rec.obs || null
      });

      if (errIns) {
        console.error(`Error insertando ${rec.difunto}:`, errIns.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`Inhumaciones nuevas insertadas: ${insertedCount}`);

  // 5. Actualizar espacios ocupados en parcelas
  console.log('Recalculando espacios_ocupados en todas las parcelas...');
  const { data: allInhs } = await supabase.from('inhumaciones').select('parcela_id, parcela_nomenclatura');
  const countByParcId = new Map();
  allInhs.forEach(inh => {
    if (inh.parcela_id) {
      countByParcId.set(inh.parcela_id, (countByParcId.get(inh.parcela_id) || 0) + 1);
    }
  });

  for (const [pId, count] of countByParcId.entries()) {
    await supabase.from('parcelas').update({
      espacios_ocupados: count,
      estado: count >= 3 ? 'ocupada' : 'ocupada'
    }).eq('id', pId);
  }

  // 6. Diagnóstico de verificación
  console.log('\n=== DIAGNÓSTICO FINAL ===');
  const { data: finalInhs } = await supabase.from('inhumaciones').select('id, nombre_difunto, parcela_nomenclatura, nivel_posicion');
  console.log(`Total inhumaciones finales en Supabase: ${finalInhs.length}`);

  const checkByParc = {};
  for (const inh of finalInhs) {
    const p = inh.parcela_nomenclatura || 'SIN_PARCELA';
    checkByParc[p] = (checkByParc[p] || 0) + 1;
  }

  const overThree = Object.entries(checkByParc).filter(([p, c]) => c > 3);
  if (overThree.length === 0) {
    console.log('✅ ÉXITO TOTAL: Ninguna parcela supera 3 inhumaciones.');
  } else {
    console.error('❌ ADVERTENCIA: Parcelas con más de 3:', overThree);
  }

  console.log('Parcela A-25-96 tiene ahora:', checkByParc['A-25-96'] || 0, 'registros (Máximo permitido: 3)');
}

migrate().catch(console.error);

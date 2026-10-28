-- ==============================================================
-- FIX: INHUMACIONES DUPLICADAS Y PARCELAS MAL ASIGNADAS
-- Sistema Aeterna — Cementerio Municipal Chamical
-- Basado en el documento oficial: COVID.pdf (Libro de Inhumaciones)
-- Ejecutar en Supabase SQL Editor si se requiere re-ejecutar manualmente
-- ==============================================================

-- PASO 1: Asegurar que los sectores oficiales existen
INSERT INTO public.sectores (codigo, nombre, descripcion)
VALUES 
  ('A', 'Sector A', 'Sector A Tradicional'),
  ('B', 'Sector B', 'Sector B Tradicional'),
  ('E', 'Sector E', 'Sector E Ampliación')
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- Eliminar sector Salinas si aún existiera
DELETE FROM public.sectores WHERE codigo = 'SALINAS';

-- PASO 2: Eliminar registros con errores de OCR antiguo o duplicados
DELETE FROM public.inhumaciones
WHERE nombre_difunto IN (
  'acele)', 'kfuuenlistee', 'TeacaAutonohona', '2年Oy cy meleirinlisted',
  'Aisina Sixto', 'Adau Tose Oliva', 'LuisAbeiteFune)', 'Jueu N Canera',
  'Sector Salinces', 'hauuvare Cscier Dicey', 'Perman Valdea', 'Hrma Elena.',
  'MiauceO Aungel', 'Rotrete', 'fuillemoFeleucHokd3', 'Maniano Orloudo Veqa',
  '020421', 'Noelial R.Looda', 'MolnaAngelHensert', 'Annoey', 'k ez z!',
  'A1e-43', 'Z042.1', 'A16-4h', 'MkoniCaOvied', 'Albed randedinse',
  'Mouica Rodic', '266720', 'A6 -49', '241.0421'
)
OR parcela_nomenclatura = 'Sector Salinas'
OR id = '3762a610-b388-47eb-990c-da6997655003';

-- PASO 3: Eliminar duplicados exactos conservando el más antiguo
DELETE FROM public.inhumaciones
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY nombre_difunto, parcela_nomenclatura
        ORDER BY created_at ASC
      ) AS rn
    FROM public.inhumaciones
  ) ranked
  WHERE rn > 1
);

-- PASO 4: Vincular parcela_id con parcela_nomenclatura
UPDATE public.inhumaciones i
SET parcela_id = p.id
FROM public.parcelas p
WHERE i.parcela_nomenclatura = p.nomenclatura
  AND (i.parcela_id IS NULL OR i.parcela_id <> p.id);

-- PASO 5: Actualizar espacios ocupados en cada parcela
UPDATE public.parcelas p
SET espacios_ocupados = sub.total_inhumaciones
FROM (
  SELECT parcela_id, COUNT(*) AS total_inhumaciones
  FROM public.inhumaciones
  WHERE parcela_id IS NOT NULL
  GROUP BY parcela_id
) sub
WHERE p.id = sub.parcela_id;

-- Resetear parcelas sin inhumaciones
UPDATE public.parcelas
SET espacios_ocupados = 0
WHERE id NOT IN (
  SELECT DISTINCT parcela_id 
  FROM public.inhumaciones 
  WHERE parcela_id IS NOT NULL
);

-- ==============================================================
-- VERIFICACIÓN: Ninguna parcela debe superar 3 inhumaciones (capacidad máx.)
-- ==============================================================
SELECT
  p.nomenclatura AS parcela,
  COUNT(i.id) AS cantidad_inhumaciones,
  array_agg(i.nombre_difunto || ' [Nivel ' || i.nivel_posicion || ']') AS difuntos
FROM public.parcelas p
JOIN public.inhumaciones i ON i.parcela_id = p.id
GROUP BY p.nomenclatura
HAVING COUNT(i.id) > 3;

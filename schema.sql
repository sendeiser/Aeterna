-- ==============================================================
-- SISTEMA AETERNA - ESQUEMA RELACIONAL SUPABASE (PostgreSQL)
-- Cementerio & Sepelios Municipal Chamical, La Rioja
-- ==============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE CONFIGURACIÓN DE COBRO (CBU / ALIAS / QR)
CREATE TABLE IF NOT EXISTS public.configuracion_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alias_cbu TEXT UNIQUE NOT NULL DEFAULT 'AETERNA.CHAMICAL',
    cbu TEXT NOT NULL DEFAULT '0000003100012345678901',
    titular_cuenta TEXT NOT NULL DEFAULT 'Aeterna Servicios S.R.L.',
    banco TEXT NOT NULL DEFAULT 'Banco Rioja',
    cuit TEXT NOT NULL DEFAULT '30-71234567-9',
    mensaje_recibo TEXT DEFAULT 'Gracias por su pago. Parque & Sepelios Aeterna Chamical.',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial por defecto
INSERT INTO public.configuracion_cobro (alias_cbu, cbu, titular_cuenta, banco, cuit)
VALUES ('AETERNA.CHAMICAL', '0000003100012345678901', 'Aeterna Servicios S.R.L.', 'Banco Rioja', '30-71234567-9')
ON CONFLICT (alias_cbu) DO UPDATE SET
    cbu = EXCLUDED.cbu,
    titular_cuenta = EXCLUDED.titular_cuenta,
    banco = EXCLUDED.banco;

-- 3. TABLA DE TITULARES / CLIENTES
CREATE TABLE IF NOT EXISTS public.titulares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo TEXT NOT NULL,
    dni TEXT,
    telefono TEXT,
    telefono_secundario TEXT,
    direccion TEXT,
    barrio TEXT,
    ciudad TEXT DEFAULT 'Chamical',
    provincia TEXT DEFAULT 'La Rioja',
    estado_titular TEXT DEFAULT 'activo' CHECK (estado_titular IN ('activo', 'inactivo', 'fallecido', 'baja')),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE SECTORES DEL PARQUE
CREATE TABLE IF NOT EXISTS public.sectores (
    codigo TEXT PRIMARY KEY, -- 'A', 'E', 'SALINAS'
    nombre TEXT NOT NULL,
    descripcion TEXT
);

INSERT INTO public.sectores (codigo, nombre, descripcion) VALUES
('A', 'Sector A', 'Sector principal parquizado A'),
('E', 'Sector E', 'Sector parquizado E'),
('SALINAS', 'Sector Salinas', 'Sector Salinas tradicional')
ON CONFLICT (codigo) DO NOTHING;

-- 5. TABLA DE PARCELAS
CREATE TABLE IF NOT EXISTS public.parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomenclatura TEXT UNIQUE NOT NULL, -- Ej: 'A-25-96', 'E-13-127'
    sector_id TEXT REFERENCES public.sectores(codigo) ON DELETE SET NULL,
    manzana_fila TEXT,
    numero_parcela TEXT,
    capacidad_total INT DEFAULT 3,
    espacios_ocupados INT DEFAULT 0,
    titular_id UUID REFERENCES public.titulares(id) ON DELETE SET NULL,
    estado TEXT DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'reservada', 'en_mora', 'baja')),
    saldo_mantenimiento NUMERIC(12,2) DEFAULT 0.00,
    fecha_adquisicion DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE INHUMACIONES / DIFUNTOS
CREATE TABLE IF NOT EXISTS public.inhumaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcela_id UUID REFERENCES public.parcelas(id) ON DELETE SET NULL,
    parcela_nomenclatura TEXT,
    nombre_difunto TEXT NOT NULL,
    dni_difunto TEXT,
    fecha_fallecimiento DATE,
    fecha_inhumacion DATE NOT NULL DEFAULT CURRENT_DATE,
    nivel_posicion INT DEFAULT 1,
    es_covid BOOLEAN DEFAULT FALSE,
    causa_defuncion TEXT,
    empresa_funebrera TEXT DEFAULT 'Aeterna Sepelios',
    responsable_contacto TEXT,
    telefono_responsable TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE AFILIADOS AL SEGURO DE SEPELIO
CREATE TABLE IF NOT EXISTS public.afiliados_seguro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_afiliado INT UNIQUE NOT NULL,
    titular_id UUID REFERENCES public.titulares(id) ON DELETE SET NULL,
    nombre_completo TEXT NOT NULL,
    direccion_cobro TEXT,
    zona_cobro TEXT, -- Ej: 'Ruta 1', 'Barrio Loma Blanca', 'Zona 1'
    cobrador_asignado TEXT,
    monto_cuota_mensual NUMERIC(10,2) DEFAULT 18000.00,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'en_mora', 'suspendido', 'baja')),
    fecha_alta DATE DEFAULT CURRENT_DATE,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA DE CUOTAS DEL SEGURO (1 a 12 por año)
CREATE TABLE IF NOT EXISTS public.cuotas_seguro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afiliado_id UUID NOT NULL REFERENCES public.afiliados_seguro(id) ON DELETE CASCADE,
    anio INT NOT NULL DEFAULT 2026,
    mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
    monto NUMERIC(10,2) NOT NULL DEFAULT 18000.00,
    estado_cuota TEXT DEFAULT 'pendiente' CHECK (estado_cuota IN ('pendiente', 'pagada', 'anulada')),
    fecha_vencimiento DATE,
    fecha_pago TIMESTAMPTZ,
    metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia_qr', 'debito', 'otro')),
    nro_recibo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cuota_unica_afiliado_periodo UNIQUE (afiliado_id, anio, mes)
);

-- 9. TABLA DE PAGOS Y RECIBOS (Mantenimiento, Seguro y Caja)
CREATE TABLE IF NOT EXISTS public.pagos_recibos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_recibo TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia_qr',
    concepto TEXT NOT NULL,
    titular_paga TEXT,
    fecha_pago TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pagos_mantenimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nro_recibo TEXT NOT NULL,
    parcela_id UUID REFERENCES public.parcelas(id) ON DELETE RESTRICT,
    titular_id UUID REFERENCES public.titulares(id) ON DELETE RESTRICT,
    monto_pagado NUMERIC(12,2) NOT NULL,
    periodo_cubierto TEXT,
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('efectivo', 'transferencia_qr', 'debito', 'credito', 'otro')),
    comprobante_transferencia TEXT,
    operador_nombre TEXT DEFAULT 'Administración',
    observaciones TEXT,
    fecha_pago TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ÍNDICES DE RENDIMIENTO PARA BÚSQUEDAS INSTANTÁNEAS
CREATE INDEX IF NOT EXISTS idx_parcelas_nomenclatura ON public.parcelas(nomenclatura);
CREATE INDEX IF NOT EXISTS idx_titulares_nombre ON public.titulares(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_inhumaciones_nombre ON public.inhumaciones(nombre_difunto);
CREATE INDEX IF NOT EXISTS idx_inhumaciones_covid ON public.inhumaciones(es_covid);
CREATE INDEX IF NOT EXISTS idx_afiliados_nro ON public.afiliados_seguro(numero_afiliado);
CREATE INDEX IF NOT EXISTS idx_cuotas_afiliado ON public.cuotas_seguro(afiliado_id);

-- 11. HABILITAR SEGURIDAD POR FILAS (RLS)
ALTER TABLE public.configuracion_cobro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inhumaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afiliados_seguro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas_seguro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_mantenimiento ENABLE ROW LEVEL SECURITY;

-- 12. POLÍTICAS DE ACCESO TOTAL (ANON Y AUTHENTICATED)
DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.configuracion_cobro;
CREATE POLICY "Acceso total personal y anon" ON public.configuracion_cobro FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.titulares;
CREATE POLICY "Acceso total personal y anon" ON public.titulares FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.sectores;
CREATE POLICY "Acceso total personal y anon" ON public.sectores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.parcelas;
CREATE POLICY "Acceso total personal y anon" ON public.parcelas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.inhumaciones;
CREATE POLICY "Acceso total personal y anon" ON public.inhumaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.afiliados_seguro;
CREATE POLICY "Acceso total personal y anon" ON public.afiliados_seguro FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.cuotas_seguro;
CREATE POLICY "Acceso total personal y anon" ON public.cuotas_seguro FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.pagos_recibos;
CREATE POLICY "Acceso total personal y anon" ON public.pagos_recibos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total personal y anon" ON public.pagos_mantenimiento;
CREATE POLICY "Acceso total personal y anon" ON public.pagos_mantenimiento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

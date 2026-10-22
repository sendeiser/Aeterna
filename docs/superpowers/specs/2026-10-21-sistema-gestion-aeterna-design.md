# Diseño de Sistema Integral de Gestión - Aeterna (Cementerio Parque & Servicios Funerarios)

**Fecha:** 2026-10-21  
**Estado:** Propuesta de Diseño para Aprobación  
**Ubicación:** Chamical, La Rioja, Argentina  

---

## 1. Intención y Propósito ("The Why")
Aeterna opera actualmente con registros manuscritos, cuadernos y planillas impresas escaneadas para gestionar parcelas del cementerio parque, cuotas de mantenimiento, inhumaciones de difuntos y pólizas del seguro de sepelio.  
El objetivo es **digitalizar y centralizar 100% la operación administrativa** en una aplicación web moderna, ágil y ultra liviana que funcione sin trabas en computadoras de bajos recursos y teléfonos celulares, con base de datos en **Supabase** y especificaciones listas para maquetado en **Stitch**.

---

## 2. Objetivos, No-Objetivos y Anti-Objetivos

### Objetivos (Goals)
* **Digitalización Total:** Reemplazar las planillas físicas con formularios web directos, rápidos y con validaciones.
* **Compatibilidad de Recursos:** Rendimiento instantáneo en PCs de gama baja de oficina (mínimo consumo de RAM) y diseño 100% responsivo para uso en celulares.
* **Cobro con Código QR:** Generación de QR dinámico/estático con visualización clara de CBU, Alias, Titular de cuenta y Monto para cobros presenciales o remotos con cualquier billetera virtual/banco.
* **Cuentas Corrientes Claras:** Consulta inmediata de deuda por parcela o afiliado, emisión de recibos y registro del método de pago.
* **Buscador Universal de Catastro y Difuntos:** Localización de parcelas por nomenclatura (ej. `A-25-96`), titular o difunto sepultado en menos de 2 segundos.
* **Migración de Datos:** Cargar de forma automatizada los datos extraídos de los documentos históricos (`uno .pdf`, `seguro.pdf`, `CamScanner`, `COVID.pdf`) a las tablas de Supabase.

### No-Objetivos (Non-Goals)
* No se requiere inicialmente un portal de autogestión público para que los clientes paguen online por pasarela con tarjeta (Mercado Pago Checkout Pro / Webhook automático). Se prioriza transferencia bancaria verificada en oficina con QR, CBU y Alias.
* No se requiere sistema de facturación electrónica AFIP/ARCA en esta primera etapa (se gestionan recibos internos numerados).

### Anti-Objetivos (Anti-Goals)
* **Evitar frameworks pesados con SSR:** No usar arquitecturas con servidores Node.js pesados en local (evitar caídas por falta de memoria RAM).
* **Evitar interfaces sobrecargadas:** No diseñar pantallas saturadas que requieran scroll horizontal o que dificulten la carga rápida de datos en ventanilla.

---

## 3. Restricciones y Decisiones Técnicas

* **Plataforma Web:** Single Page Application (SPA) con **Vite + React 18/19** y **TailwindCSS**.
  * Carga inicial < 1.5s en conexiones lentas.
  * Consumo de RAM en navegador < 80 MB.
  * Soporte PWA (Progressive Web App): instalable como app en móvil y escritorio, caché local de vistas.
* **Backend y Base de Datos:** **Supabase** (PostgreSQL).
  * Conexión directa mediante `@supabase/supabase-js`.
  * Políticas de seguridad RLS (Row Level Security).
  * Autenticación para personal administrativo.
* **Manejo de Formularios:** `react-hook-form` + validaciones con `zod` para velocidad de tipeo sin re-renderizados pesados.
* **Iconografía y Componentes:** `lucide-react` y componentes estilizados con Tailwind, preparados para trasladar a **Stitch**.

---

## 4. Estructura Relacional de la Base de Datos (Script SQL)

El siguiente script define la estructura relacional completa lista para ejecutar en el Editor SQL de Supabase:

```sql
-- ==============================================================
-- SISTEMA AETERNA - ESQUEMA RELACIONAL SUPABASE (PostgreSQL)
-- ==============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE CONFIGURACIÓN DE COBRO (CBU / ALIAS / QR)
CREATE TABLE IF NOT EXISTS public.configuracion_cobro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alias_cbu TEXT NOT NULL DEFAULT 'AETERNA.PARQUE',
    cbu TEXT NOT NULL DEFAULT '0000003100010000000000',
    titular_cuenta TEXT NOT NULL DEFAULT 'Aeterna Servicios S.R.L.',
    banco TEXT NOT NULL DEFAULT 'Banco Rioja / Santander',
    cuit TEXT NOT NULL DEFAULT '30-00000000-0',
    mensaje_recibo TEXT DEFAULT 'Gracias por su pago. Conserve este comprobante.',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial por defecto
INSERT INTO public.configuracion_cobro (alias_cbu, cbu, titular_cuenta, banco, cuit)
VALUES ('AETERNA.CHAMICAL', '0000003100012345678901', 'Aeterna Parque & Sepelios', 'Banco Rioja', '30-71234567-9')
ON CONFLICT DO NOTHING;

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL, -- Ej: 'A', 'E', 'SALINAS'
    nombre TEXT NOT NULL,
    descripcion TEXT
);

INSERT INTO public.sectores (codigo, nombre, descripcion) VALUES
('A', 'Sector A', 'Sector principal parquizado A'),
('E', 'Sector E', 'Sector parquizado E'),
('SALINAS', 'Sector Salinas', 'Sector Salinas')
ON CONFLICT (codigo) DO NOTHING;

-- 5. TABLA DE PARCELAS
CREATE TABLE IF NOT EXISTS public.parcelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomenclatura TEXT UNIQUE NOT NULL, -- Ej: 'A-25-96', 'E-13-127'
    sector_id UUID REFERENCES public.sectores(id) ON DELETE SET NULL,
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
    parcela_id UUID REFERENCES public.parcelas(id) ON DELETE CASCADE,
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
    zona_cobro TEXT, -- Ej: 'Ruta 1', 'Barrio Loma Blanca', etc.
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
    anio INT NOT NULL,
    nro_cuota INT NOT NULL CHECK (nro_cuota BETWEEN 1 AND 12),
    monto NUMERIC(10,2) NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'anulada')),
    fecha_vencimiento DATE,
    fecha_pago TIMESTAMPTZ,
    metodo_pago TEXT CHECK (metodo_pago IN ('efectivo', 'transferencia_qr', 'debito', 'otro')),
    nro_recibo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT cuota_unica_afiliado_periodo UNIQUE (afiliado_id, anio, nro_cuota)
);

-- 9. TABLA DE PAGOS Y RECIBOS (Mantenimiento y Caja)
CREATE TABLE IF NOT EXISTS public.pagos_mantenimiento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nro_recibo TEXT NOT NULL,
    parcela_id UUID NOT NULL REFERENCES public.parcelas(id) ON DELETE RESTRICT,
    titular_id UUID REFERENCES public.titulares(id) ON DELETE RESTRICT,
    monto_pagado NUMERIC(12,2) NOT NULL,
    periodo_cubierto TEXT, -- Ej: '2025/2026', 'Cuota 10/2026'
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
CREATE INDEX IF NOT EXISTS idx_afiliados_nro ON public.afiliados_seguro(numero_afiliado);
```

---

## 5. Especificaciones de Pantallas y Formularios para Stitch

Las siguientes 5 pantallas están formuladas con estructura detallada para pasarlas a diseño/maquetado con **Stitch**:

### Pantalla 1: Tablero Central y Buscador Rápido (Dashboard & Quick Search)
* **Objetivo:** Responder en el acto a cualquier persona que entra a la oficina o llama por teléfono.
* **Componentes UI:**
  * Barra de búsqueda omnibox superior: busca en simultáneo por *Nombre de Titular*, *Difunto*, *Nro. Afiliado* o *Nomenclatura (`A-25-96`)*.
  * 4 Tarjetas métricas (KPIs): Total Parcelas Ocupadas, Parcelas en Mora, Afiliados Activos Seguro, Total Recaudado en el Día.
  * Resultados instantáneos en tabla liviana con acciones directas: `[Ver Parcela]`, `[Registrar Pago]`, `[Ver Ficha]`.

### Pantalla 2: Formulario de Gestión de Parcelas y Titulares
* **Campos:**
  * Sección Titular: Nombre y Apellido, DNI, Teléfono / WhatsApp, Domicilio, Barrio.
  * Sección Parcela: Selector de Sector (`A`, `E`, `Salinas`), Manzana/Fila, N° Parcela, Nivel/Capacidad (1 a 3 espacios).
  * Estado: Radio buttons (`Activa`, `En Mora`, `Disponible`, `Baja`).
  * Saldo Actual de Mantenimiento ($).
  * Botones de acción: `[Guardar Parcela]`, `[Emitir Recibo de Mantenimiento]`, `[Asignar Inhumación]`.

### Pantalla 3: Formulario de Registro de Inhumación (Libro de Sepelios)
* **Campos:**
  * Selector de Parcela asociada (con autocompletado y validación de espacios libres disponibles).
  * Nombre completo del Difunto y DNI.
  * Fecha de Defunción y Fecha de Inhumación (selector de fecha accesible).
  * Checkbox destacado: `[X] Fallecido por COVID-19 / Protocolo Especial`.
  * Ubicación/Nivel en la fosa: Nivel 1, Nivel 2 o Nivel 3.
  * Empresa de sepelios y notas sanitarias o del servicio.

### Pantalla 4: Formulario y Cuadricula de Afiliados al Seguro
* **Campos:**
  * N° de Afiliado, Nombre, Domicilio de cobranza, Zona / Cobrador de calle.
  * Monto de Cuota estándar (editable, por defecto $18.000).
  * Matriz visual de 12 cuotas (Ene a Dic): botones interactivos con colores (Verde = Pagada, Rojo = Adeudada, Gris = Futura).
  * Un click sobre la cuota abre el modal de cobro inmediato.

### Pantalla 5: Modal de Cobro con Código QR y Datos de Transferencia
* **Comportamiento en PC y Celular:**
  * Se activa al cobrar mantenimiento o cuota de seguro.
  * Muestra el monto total a pagar en tipografía grande y clara.
  * Selector de método: `[ Efectivo ]` | `[ Transferencia QR ]`.
  * Al elegir **Transferencia QR**:
    * Renderiza un **Código QR grande** en pantalla para que el cliente lo escanee con su celular (Mercado Pago, BNA+, Modo, o cualquier banco).
    * Debajo, cajas de texto con botones `[ Copiar ]` al portapapeles:
      * **Alias:** `AETERNA.CHAMICAL` `[Copiar]`
      * **CBU:** `0000003100012345678901` `[Copiar]`
      * **Titular:** `Aeterna Servicios S.R.L.`
      * **Banco:** `Banco Rioja`
    * Campo para ingresar los últimos 4 dígitos o nro de comprobante de transferencia bancaria.
    * Botón: `[ Confirmar Pago y Emitir Recibo ]`.
    * Opción de descarga en PDF e imprimir o enviar comprobante por WhatsApp al titular.

---

## 6. Pipeline de Carga Automática de los Datos Históricos

Utilizaremos el script extractor de datos (ya pre-procesado con OCR sobre `uno .pdf`, `seguro.pdf`, `camscanner` y `COVID.pdf`) para:
1. Parsear los registros de parcelas, titulares, saldos iniciales y notas de baja.
2. Parsear el padrón de 40+ afiliados de seguro con montos y cuotas.
3. Parsear el libro de inhumaciones (incluyendo registros COVID 2020-2021).
4. Insertar en bloque (*batch upsert*) directamente en las tablas de Supabase.

---

## 7. Próximos Pasos del Flujo Superpowers

1. **Aprobación del Usuario:** Revisión y conformidad con esta especificación de diseño.
2. **Entrega de Wireframes / Estructuras para Stitch:** Guía de prompts y componentes estructurados para armar los layouts visuales en Stitch.
3. **Ejecución del Plan:** Creación del proyecto Vite + React y ejecución de la migración de datos a Supabase con `writing-plans`.

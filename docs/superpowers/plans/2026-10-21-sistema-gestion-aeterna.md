# Sistema de Gestión Aeterna - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación web ultra liviana (Vite + React SPA/PWA) para la gestión administrativa de Aeterna (Cementerio Parque & Servicios de Sepelio en Chamical, La Rioja), con conexión a Supabase, migración de los registros históricos escaneados, formularios de alta/edición optimizados para PC de bajos recursos y celulares, y módulo de cobro con código QR (CBU/Alias).

**Architecture:** Single Page Application (SPA) con Vite y React 18, empaquetado optimizado (<200KB gzipped) y soporte PWA para acceso instantáneo en móviles y PCs lentas. Integración cliente directo con Supabase (PostgreSQL relacional) con políticas RLS, validación de formularios con `zod` y `react-hook-form`, y generación de QR interoperable para transferencias bancarias.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS, `@supabase/supabase-js`, `lucide-react`, `qrcode.react`, `zod`, `react-hook-form`.

**Spec:** [docs/superpowers/specs/2026-10-21-sistema-gestion-aeterna-design.md](file:///d:/Aeterna/docs/superpowers/specs/2026-10-21-sistema-gestion-aeterna-design.md)

---

## Global Constraints

* **Plataforma objetivo:** Computadoras con especificaciones bajas (Windows con procesadores modestos, 2GB RAM) y teléfonos móviles (Chrome / Safari / PWA).
* **Consumo de memoria:** < 80 MB de RAM en navegador en ejecución.
* **Tiempos de carga:** < 1.5s en primera carga, navegación instantánea (< 100ms) entre pantallas sin recargas de página.
* **Almacenamiento y Backend:** Supabase PostgreSQL; toda consulta debe utilizar índices y paginación para no sobrecargar el cliente.
* **Formularios:** Validaciones en tiempo real sin bloquear la interfaz y con soporte para uso exclusivo de teclado (Tab / Enter) en oficina.

---

## Review Focus

1. **Búsqueda con caracteres especiales o espacios:** Nomenclaturas como `A-25-96`, `E-13-127`, `Sector Salinas` y apellidos compuestos con tildes deben encontrarse insensible a mayúsculas/minúsculas y acentos.
2. **Capacidad de parcela excedida:** Impedir registrar una inhumación en una parcela que ya alcanzó su capacidad máxima de niveles sin confirmación explícita del operador.
3. **Copia de CBU/Alias en portapapeles:** Asegurar compatibilidad de `navigator.clipboard.writeText` con fallback para contextos HTTP no seguros o navegadores móviles antiguos.
4. **Persistencia y formato de montos monetarios:** Los valores de saldo de mantenimiento ($80.000 a $470.000+) y cuotas de seguro ($18.000) deben formatearse con separador de miles argentino (`$ 18.000,00`) y evitar errores de redondeo de punto flotante.
5. **Generación de QR y descarga de recibos:** El código QR debe renderizarse instantáneamente en canvas/SVG y permitir impresión limpia en formato ticket térmico o A4 sin cabeceras innecesarias del navegador.

---

## File Structure

```text
d:/Aeterna/
├── schema.sql                               # Script de base de datos Supabase
├── scripts/
│   └── seed_documents_data.ts               # Script ETL para sembrar datos OCR a Supabase
├── src/
│   ├── main.tsx                             # Punto de entrada Vite React
│   ├── App.tsx                              # Enrutador principal y Shell de la app
│   ├── index.css                            # Tokens de diseño TailwindCSS
│   ├── types/
│   │   └── database.ts                      # Tipos TypeScript generados de Supabase
│   ├── lib/
│   │   ├── supabase.ts                      # Cliente singleton de Supabase
│   │   └── formatters.ts                    # Formateo de moneda ARS, fechas y CBU/Alias
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                   # Barra de navegación adaptativa (mobile/desktop)
│   │   │   └── Shell.tsx                    # Contenedor principal con estado de conexión
│   │   ├── search/
│   │   │   └── OmniboxSearch.tsx            # Buscador unificado instantáneo
│   │   ├── payment/
│   │   │   ├── QRPaymentModal.tsx           # Modal interactivo de cobro QR + CBU/Alias
│   │   │   └── ReceiptPrint.tsx             # Plantilla de recibo imprimible / WhatsApp
│   │   ├── forms/
│   │   │   ├── ParcelaForm.tsx              # Formulario de alta/edición de parcela y titular
│   │   │   ├── InhumacionForm.tsx           # Formulario de registro de difunto y protocolo COVID
│   │   │   └── AfiliadoForm.tsx             # Formulario de alta y seguimiento de afiliado seguro
│   │   └── views/
│   │       ├── DashboardView.tsx            # Métricas rápidas y accesos directos
│   │       ├── ParcelasView.tsx             # Listado, filtrado y estado de parcelas
│   │       ├── InhumacionesView.tsx         # Libro digital de inhumaciones
│   │       ├── AfiliadosSeguroView.tsx      # Matriz de 12 cuotas y cobradores
│   │       └── ConfiguracionView.tsx        # Edición de CBU, Alias y datos del parque
│   └── tests/
│       ├── formatters.test.ts               # Tests unitarios de formateo de moneda y CBU
│       ├── search.test.ts                   # Tests unitarios del buscador
│       └── validation.test.ts               # Tests de validación de parcelas e inhumaciones
└── docs/
    └── stitch/
        └── STITCH_PROMPTS_AND_SPECS.md      # Paquete de especificaciones para Google Stitch
```

---

## Tasks

### Task 1: Scaffolding Vite + React + Tailwind + PWA
**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `index.html`, `tsconfig.json`
- Test: `src/tests/setup.test.ts`

**Interfaces:**
- Produces: Aplicación funcional ejecutable con `npm run dev` y comandos de test listos (`npm test` con Vitest).

- [ ] **Step 1: Write setup test**
Verificar que Vitest ejecuta y los tests unitarios básicos pasan.
- [ ] **Step 2: Initialize project files**
Configurar `package.json` con dependencias mínimas requeridas (`react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `qrcode.react`, `zod`, `react-hook-form`, `clsx`, `tailwind-merge`).
- [ ] **Step 3: Configure TailwindCSS**
Configurar `tailwind.config.js` y `src/index.css` con paleta profesional (fondos oscuros/claros de alto contraste, tonos esmeralda/verde para estados pagados, ámbar para mora y azul institucional).
- [ ] **Step 4: Run test to verify passes**
Ejecutar `npm run test:run` y verificar compilación de Vite.
- [ ] **Step 5: Commit**
`git commit -m "chore: scaffold vite react tailwind project for aeterna"`

---

### Task 2: Supabase Client and Typed Models
**Files:**
- Create: `src/types/database.ts`, `src/lib/supabase.ts`, `src/lib/formatters.ts`, `.env.example`
- Test: `src/tests/formatters.test.ts`

**Interfaces:**
- Produces: `supabase` client singleton, `formatCurrency(val: number): string`, `formatNomenclatura(sec: string, man: string, num: string): string`, `copyToClipboard(text: string): Promise<boolean>`.

- [ ] **Step 1: Write failing tests for formatters**
Pruebas de formateo monetario argentino (`18000 -> "$ 18.000,00"`, `470608.61 -> "$ 470.608,61"`), validación de CBU (22 dígitos) y Alias.
- [ ] **Step 2: Implement formatters and Supabase client**
Escribir `src/lib/formatters.ts` con manejo robusto de redondeo y fallback de portapapeles.
Escribir `src/lib/supabase.ts` con soporte para variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, con modo demo/fallback offline si aún no se configuran las credenciales en producción.
- [ ] **Step 3: Run tests to verify pass**
Ejecutar `npm test`.
- [ ] **Step 4: Commit**
`git commit -m "feat: add supabase client types and currency/clipboard formatters"`

---

### Task 3: Data Migration / Seeding Script for OCR Records
**Files:**
- Create: `scripts/seed_documents_data.ts`
- Consumes: `scratch/extracted/summary.json` (documentos OCR procesados)
- Produces: Script de inserción masiva a Supabase para cargar titulares, parcelas con saldos históricos, afiliados con cuotas y difuntos COVID.

- [ ] **Step 1: Write migration parser logic**
Transformar los registros crudos de `uno.md`, `seguro.md`, `camscanner.md` y `covid.md` a objetos tipados (`Titular`, `Parcela`, `Afiliado`, `Inhumacion`).
- [ ] **Step 2: Add idempotency and conflict resolution**
Usar `upsert` basado en `nomenclatura` para parcelas y `numero_afiliado` para el seguro.
- [ ] **Step 3: Verify execution with dry-run flag**
Ejecutar `npx ts-node scripts/seed_documents_data.ts --dry-run` para validar que reconoce los más de 100 registros sin errores de sintaxis.
- [ ] **Step 4: Commit**
`git commit -m "feat: add data seeding and migration script for historical documents"`

---

### Task 4: Unified Omnibox Search & Dashboard View
**Files:**
- Create: `src/components/search/OmniboxSearch.tsx`, `src/components/views/DashboardView.tsx`
- Test: `src/tests/search.test.ts`

**Interfaces:**
- Consumes: `supabase`
- Produces: `<OmniboxSearch onSelectResult={(item) => void} />`, `<DashboardView />`

- [ ] **Step 1: Write search filtering test**
Verificar que la búsqueda local o remota encuentra resultados por prefijos (`A-25`, `aballay`, `salinas`, `covid`).
- [ ] **Step 2: Implement OmniboxSearch**
Caja de búsqueda estilo Spotlight con navegación por flechas de teclado, atajo `Ctrl+K`, badges por tipo (Parcela / Difunto / Afiliado) y saldo adeudado visible en el resultado.
- [ ] **Step 3: Implement DashboardView**
Tarjetas de métricas (Parcelas Ocupadas, En Mora, Afiliados Activos, Recaudación Hoy) y accesos directos de 1 click a nuevos registros.
- [ ] **Step 4: Run tests & verify UI**
- [ ] **Step 5: Commit**
`git commit -m "feat: add unified omnibox search and administrative dashboard"`

---

### Task 5: Titulares & Parcelas Form & Management
**Files:**
- Create: `src/components/forms/ParcelaForm.tsx`, `src/components/views/ParcelasView.tsx`
- Test: `src/tests/parcelas.test.ts`

**Interfaces:**
- Produces: `<ParcelaForm initialData? onSave={(parcela) => void} />`, `<ParcelasView />`

- [ ] **Step 1: Write validation tests for ParcelaForm**
Validar que `nomenclatura` cumple formato de sector y que el saldo no admite valores negativos inválidos.
- [ ] **Step 2: Implement ParcelaForm**
Formulario con pestañas compactas: Datos del Titular, Ubicación en Parque (`Sector`, `Manzana/Fila`, `Nro`), Estado (`Disponible`, `Ocupada`, `En Mora`, `Baja`) y Saldo de Mantenimiento.
- [ ] **Step 3: Implement ParcelasView**
Tabla con paginación ligera, filtros rápidos (`Todas`, `En Mora`, `Ocupadas`, `Disponibles`), ordenamiento y botón para abrir cobro directo.
- [ ] **Step 4: Commit**
`git commit -m "feat: add parcelas and titulares form and table view"`

---

### Task 6: Inhumaciones & COVID Protocol Register
**Files:**
- Create: `src/components/forms/InhumacionForm.tsx`, `src/components/views/InhumacionesView.tsx`
- Test: `src/tests/inhumaciones.test.ts`

**Interfaces:**
- Produces: `<InhumacionForm parcelaId? onSave />`, `<InhumacionesView />`

- [ ] **Step 1: Write test for level capacity check**
Verificar que el formulario alerta si los niveles ocupados igualan la capacidad total de la parcela.
- [ ] **Step 2: Implement InhumacionForm**
Campos: Difunto, DNI, Fecha defunción, Fecha inhumación, Parcela vinculada con autocompletado, Nivel (1 a 3), Checkbox destacado `[X] Caso COVID-19 / Protocolo Especial`, Empresa y notas.
- [ ] **Step 3: Implement InhumacionesView**
Libro cronológico de inhumaciones con filtro por año (ej. 2020, 2021, histórico) y exportación/impresión.
- [ ] **Step 4: Commit**
`git commit -m "feat: add inhumaciones form with covid protocol support and historical book"`

---

### Task 7: Afiliados al Seguro & Matriz de Cuotas 1-12
**Files:**
- Create: `src/components/forms/AfiliadoForm.tsx`, `src/components/views/AfiliadosSeguroView.tsx`
- Test: `src/tests/afiliados.test.ts`

**Interfaces:**
- Produces: `<AfiliadosSeguroView />`, `<CuotasMatrix afiliadoId cuotas onPagarCuota />`

- [ ] **Step 1: Write cuotas status logic tests**
Validar cálculo de cuotas pendientes vs pagadas y generación automática de los 12 meses del año corriente.
- [ ] **Step 2: Implement AfiliadoForm**
N° de afiliado, titular, dirección en Chamical, cobrador/zona asignada, valor de cuota (por defecto $18.000).
- [ ] **Step 3: Implement AfiliadosSeguroView con Matriz Visual**
Grilla interactiva donde cada fila es un afiliado y cuenta con 12 botones compactos (Ene–Dic) que indican el estado de pago. Al pulsar una cuota adeudada, se abre el modal de cobro.
- [ ] **Step 4: Commit**
`git commit -m "feat: add seguro de sepelio view with 12-month interactive payment matrix"`

---

### Task 8: QR Payment Modal, CBU/Alias Clipboard & Digital Receipt
**Files:**
- Create: `src/components/payment/QRPaymentModal.tsx`, `src/components/payment/ReceiptPrint.tsx`, `src/components/views/ConfiguracionView.tsx`
- Test: `src/tests/payment.test.ts`

**Interfaces:**
- Produces: `<QRPaymentModal isOpen onClose onConfirmPayment concepto monto titularInfo />`, `<ReceiptPrint />`

- [ ] **Step 1: Write payment modal calculation tests**
Verificar generación del payload de transferencia bancaria y actualización de estado de cuenta tras confirmación.
- [ ] **Step 2: Implement QRPaymentModal**
  - Muestra monto destacado en grande.
  - Generador de QR dinámico interoperable.
  - Cajas con botones `[ Copiar ]` para **Alias** (`AETERNA.CHAMICAL`), **CBU** (`0000003100012345678901`), Titular y Banco.
  - Registro de N° de comprobante o referencia.
- [ ] **Step 3: Implement ReceiptPrint and WhatsApp Sharing**
Recibo digital con botón de impresión directa y botón `[ Enviar por WhatsApp ]` con mensaje preformateado y detalle de la operación.
- [ ] **Step 4: Implement ConfiguracionView**
Pantalla para que el administrador actualice el CBU, Alias, Titular de cuenta y valor de cuotas de mantenimiento sin tocar código.
- [ ] **Step 5: Commit**
`git commit -m "feat: add qr payment modal with alias/cbu copy and digital receipt"`

---

### Task 9: Stitch Export Package & End-to-End Verification
**Files:**
- Create: `docs/stitch/STITCH_PROMPTS_AND_SPECS.md`
- Test: Verificación completa en navegador móvil y de escritorio

**Interfaces:**
- Produces: Documento guía completo con prompts de diseño exactos para pegar en **Stitch** (Google Stitch), esquemas de componentes y verificación e2e del sistema Aeterna.

- [ ] **Step 1: Create STITCH_PROMPTS_AND_SPECS.md**
Documentar los 5 prompts específicos para Stitch con layout, jerarquía visual, tokens de color (Emerald/Zinc/Slate) y estados de interfaz.
- [ ] **Step 2: Build production bundle and check performance**
Ejecutar `npm run build` y comprobar que el tamaño total del bundle es < 200 KB gzipped.
- [ ] **Step 3: Verify end-to-end user flows**
Verificar que la búsqueda, la carga de parcelas, el libro de fallecidos, la matriz de seguro y el cobro QR funcionan fluidamente.
- [ ] **Step 4: Commit**
`git commit -m "docs: generate stitch design prompts pack and complete e2e verification"`

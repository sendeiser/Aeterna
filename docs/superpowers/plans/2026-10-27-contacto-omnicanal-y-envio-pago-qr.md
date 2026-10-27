# Contacto Omnicanal y Envío de Pago QR / Alias - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar canales de contacto (Gmail/Email, Facebook, Instagram) a los módulos de Parcelas, Inhumaciones y Plan Seguro Integral, y permitir el envío omnicanal (WhatsApp, Instagram, Facebook y Email) del Alias y Código QR de cobro para que el cliente pueda pagar.

**Architecture:** El esquema de base de datos Supabase se amplía con columnas de contacto en `titulares`, `inhumaciones` y `afiliados_seguro`. En el frontend Web (React/TypeScript), se implementa un módulo utilitario de compartición omnicanal (`paymentShareHelper`), se actualizan los formularios de edición y se integra la botonera de envío de cobro en `QRPaymentModal` y vistas operativas. En la aplicación de escritorio (`aeterna-xp`), se actualizan los modelos de datos en Object Pascal, servicios REST de Supabase, campos en diálogos Win32 nativos y opciones de copia/apertura del enlace de pago y alias.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Supabase (PostgreSQL), Object Pascal (Free Pascal 3.2.2 / Lazarus Win32).

**Spec:** Audio de requerimiento del usuario (2026-10-27) y especificaciones en `docs/superpowers/specs/2026-10-21-sistema-gestion-aeterna-design.md` y `docs/superpowers/specs/2026-10-25-aeterna-xp-lazarus-design.md`.

## Global Constraints
- Compatibilidad estricta con navegadores móviles y de escritorio en la app Web.
- Compatibilidad estricta con Win32 nativo en `aeterna-xp` sin dependencias de librerías modernas de Windows.
- Preservar consistencia de datos en tiempo real con Supabase Cloud vía TLS 1.2.
- El alias oficial por defecto es `AETERNA.CHAMICAL`.
- Los mensajes de cobro deben incluir: Monto, Concepto, Identificador/Referencia, CBU, Alias, Titular de Cuenta y Link interactivo al portal de pago con QR.

## Review Focus
- Manejo seguro de enlaces sociales: formato de usuarios de Instagram (`@usuario` o `usuario`) y Facebook (`perfil` o link) sin romper deep-links.
- Copia al portapapeles con fallback robusto cuando `navigator.clipboard` no esté disponible o requiera foco.
- Teléfonos con o sin prefijo internacional (asegurar formato `+54 9 ...` para WhatsApp).
- Campos nulos o vacíos en registros existentes migrados sin generar excepciones ni romper la UI.
- Verificación de compilación limpia en Free Pascal 3.2.2 para el binario Win32.

---

### Task 1: Esquema de Base de Datos y Tipos TypeScript

**Files:**
- Modify: `schema.sql:32-113`
- Modify: `src/types/database.ts:18-103`
- Test: `src/tests/contactData.test.ts`

**Interfaces:**
- Consumes: Tipos actuales `Titular`, `Inhumacion`, `AfiliadoSeguro`.
- Produces: Campos `email?: string | null`, `facebook?: string | null`, `instagram?: string | null` en `Titular`, `email_responsable?: string | null`, `facebook_responsable?: string | null`, `instagram_responsable?: string | null` en `Inhumacion`, y `telefono?: string | null`, `email?: string | null`, `facebook?: string | null`, `instagram?: string | null` en `AfiliadoSeguro`.

- [ ] **Step 1: Escribir el test que valide la presencia y estructura de los nuevos campos de contacto en los tipos**
- [ ] **Step 2: Ejecutar vitest para verificar que falla o detecta tipos incompletos**
- [ ] **Step 3: Actualizar `schema.sql` con las nuevas columnas y `src/types/database.ts` con las interfaces**
- [ ] **Step 4: Ejecutar vitest y verificar que el test pasa**
- [ ] **Step 5: Commit de los cambios de esquema y tipos**

---

### Task 2: Módulo Utilitario de Compartición Omnicanal de Pagos (`paymentShareHelper`)

**Files:**
- Create: `src/lib/paymentShareHelper.ts`
- Test: `src/tests/paymentShareHelper.test.ts`

**Interfaces:**
- Consumes: Parámetros de cobro (`monto`, `concepto`, `identificador`, `titularNombre`, `cbu`, `alias`, `banco`, `qrPaymentUrl`, `telefono`, `email`, `facebook`, `instagram`).
- Produces: `formatPaymentShareMessage()`, `getWhatsAppShareUrl()`, `getInstagramShareData()`, `getFacebookShareData()`, `getEmailShareUrl()`.

- [ ] **Step 1: Escribir tests unitarios en `src/tests/paymentShareHelper.test.ts` para cada canal (WhatsApp, Instagram, Facebook, Email)**
- [ ] **Step 2: Ejecutar vitest y verificar que falla por no existir el módulo**
- [ ] **Step 3: Implementar `src/lib/paymentShareHelper.ts` con generación de mensajes limpios y URLs de deep-linking**
- [ ] **Step 4: Ejecutar vitest y verificar que todos los tests de compartición pasan**
- [ ] **Step 5: Commit del utilitario de compartición omnicanal**

---

### Task 3: Capa de Servicios (`dataService.ts`) para Persistir Nuevos Canales de Contacto

**Files:**
- Modify: `src/services/dataService.ts`
- Test: `src/tests/contactData.test.ts`

**Interfaces:**
- Consumes: Interfaces actualizadas de `Titular`, `Inhumacion`, `AfiliadoSeguro`.
- Produces: Métodos de lectura y guardado (`getParcelas`, `saveParcela`, `getInhumaciones`, `saveInhumacion`, `getAfiliados`, `saveAfiliado`) soportando email, facebook e instagram.

- [ ] **Step 1: Escribir test en `src/tests/contactData.test.ts` para verificar el mapeo y persistencia de datos de contacto**
- [ ] **Step 2: Ejecutar vitest y confirmar la falla en los campos no mapeados**
- [ ] **Step 3: Actualizar `src/services/dataService.ts` agregando los campos de contacto en las operaciones de lectura y mutación**
- [ ] **Step 4: Ejecutar vitest y verificar que pasa el test de persistencia**
- [ ] **Step 5: Commit de la actualización de servicios**

---

### Task 4: Formularios Web con Canales de Contacto (`ParcelaForm`, `InhumacionForm`, `AfiliadoForm`)

**Files:**
- Modify: `src/components/forms/ParcelaForm.tsx`
- Modify: `src/components/forms/InhumacionForm.tsx`
- Modify: `src/components/forms/AfiliadoForm.tsx`

**Interfaces:**
- Consumes: Entidades con campos `email`, `facebook`, `instagram`.
- Produces: Entradas de formulario responsivas con iconos de marca (Gmail, Facebook, Instagram) y validaciones amigables.

- [ ] **Step 1: Agregar inputs para Gmail, Facebook e Instagram en `ParcelaForm.tsx` dentro de la sección de Titular**
- [ ] **Step 2: Agregar inputs para Nombre, Teléfono, Gmail, Facebook e Instagram de contacto familiar en `InhumacionForm.tsx`**
- [ ] **Step 3: Agregar inputs para Teléfono WhatsApp, Gmail, Facebook e Instagram en `AfiliadoForm.tsx`**
- [ ] **Step 4: Ejecutar `npm run build` y `npm test` para asegurar integridad de TypeScript y componentes**
- [ ] **Step 5: Commit de las actualizaciones en formularios web**

---

### Task 5: Botonera Omnicanal de Cobro en `QRPaymentModal` y Vistas Operativas

**Files:**
- Modify: `src/components/payment/QRPaymentModal.tsx`
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/views/AfiliadosSeguroView.tsx`
- Modify: `src/components/views/InhumacionesView.tsx`

**Interfaces:**
- Consumes: `paymentShareHelper` y datos de contacto de cada módulo.
- Produces: Botonera multi-canal ("Enviar por WhatsApp", "Enviar por Instagram", "Enviar por Facebook", "Enviar por Gmail", "Copiar Mensaje y Alias") y badges de contacto en las tablas/tarjetas.

- [ ] **Step 1: Integrar en `QRPaymentModal.tsx` el bloque de "Enviar Datos de Pago al Cliente" antes de la confirmación, permitiendo enviar Alias y QR por WhatsApp, Instagram, Facebook y Email**
- [ ] **Step 2: En `ParcelasView.tsx`, mostrar iconos de contacto disponibles y permitir abrir el modal o compartir directamente el pago de mantenimiento**
- [ ] **Step 3: En `AfiliadosSeguroView.tsx`, mostrar los canales del afiliado y botón rápido para enviar el cobro de cuota mensual**
- [ ] **Step 4: En `InhumacionesView.tsx`, mostrar el contacto responsable y opción de envío de cobro por servicios**
- [ ] **Step 5: Ejecutar suite de pruebas completa `npm test` y verificar que todos los casos pasan**
- [ ] **Step 6: Commit de las mejoras visuales y funcionales en la app web**

---

### Task 6: Actualización de la Suite de Escritorio Windows XP (`aeterna-xp`)

**Files:**
- Modify: `aeterna-xp/src/core/uDataModels.pas`
- Modify: `aeterna-xp/src/services/uParcelasService.pas`
- Modify: `aeterna-xp/src/services/uInhumacionesService.pas`
- Modify: `aeterna-xp/src/services/uAfiliadosService.pas`
- Modify: `aeterna-xp/src/app/uWin32Dialogs.pas`
- Test: Compilación con `tools/fpc/app/bin/i386-win32/fpc.exe`

**Interfaces:**
- Consumes: Campos de contacto `Email`, `Facebook`, `Instagram` en `TTitular`, `TInhumacion`, `TAfiliadoSeguro`.
- Produces: Diálogos Win32 con campos editables de Gmail, Facebook e Instagram, y copiado de datos de pago (Alias + Enlace QR) al portapapeles de Windows para envío rápido por redes sociales.

- [ ] **Step 1: Agregar campos en `uDataModels.pas` para `TTitular`, `TInhumacion` y `TAfiliadoSeguro`**
- [ ] **Step 2: Actualizar la deserialización y serialización JSON en los servicios de Pascal**
- [ ] **Step 3: Agregar controles Edit y Labels en `uWin32Dialogs.pas` para Gmail, Facebook e Instagram, y botón/función para copiar datos de transferencia y QR web**
- [ ] **Step 4: Compilar `AeternaXP.pas` usando `tools/fpc/app/bin/i386-win32/fpc.exe` y verificar que la compilación termine con código de salida 0**
- [ ] **Step 5: Commit de la actualización de la suite de escritorio**

---

### Task 7: Verificación Final Integral y Entrega

- [ ] **Step 1: Ejecutar suite completa de tests de la web (`npm test`)**
- [ ] **Step 2: Ejecutar validación de build de TypeScript (`npm run build`)**
- [ ] **Step 3: Probar generación de mensajes omnicanal y links de pago**
- [ ] **Step 4: Verificar ejecución limpia del binario compilado de `aeterna-xp`**
- [ ] **Step 5: Documentar y presentar resumen completo al usuario**

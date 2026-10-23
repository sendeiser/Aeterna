# Plan de Implementación: Edición en Línea en Tablas, Modales de Alta y Remoción de "Catastro"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar edición directa por fila en las tablas principales (Parcelas, Inhumaciones, Seguro Integral) con botones Guardar/Cancelar, trasladar la creación de nuevos registros a ventanas modales flotantes (liberando las vistas a ancho completo), y eliminar completamente la palabra "catastro" en toda la interfaz.

**Architecture:** 
- En cada vista de tabla (`ParcelasView`, `InhumacionesView`, `AfiliadosSeguroView`), se introduce un estado local para la fila en edición (`editingRowId` y `editFormData`).
- Al presionar "Editar", los campos de la fila mutan a inputs/selects compactos estilizados, y los botones de acción se reemplazan por "Guardar ✓" y "Cancelar ✕".
- Se eliminan los formularios fijos incrustados (panel lateral de Parcelas y tarjeta superior de Inhumaciones). Los botones de cabecera `+ Nueva Parcela`, `+ Nueva Inhumación` y `+ Nuevo Afiliado` activan los modales existentes (`ParcelaForm`, `InhumacionForm`, `AfiliadoForm`).
- Se realiza un barrido léxico integral para reemplazar "Catastro" por "Parcelas" o "Gestión de Parcelas".

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide / Material Symbols, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-23-edicion-inline-tablas-modales-y-quitar-catastro-design.md](file:///d:/Aeterna/docs/superpowers/specs/2026-10-23-edicion-inline-tablas-modales-y-quitar-catastro-design.md)

## Global Constraints
- La palabra "catastro" (y "catrasto") debe desaparecer de toda etiqueta visible para el usuario (pestañas, encabezados, tooltips, placeholders, reportes).
- La edición en línea debe ser por fila accionada por botones explícitos ("Guardar ✓" / "Cancelar ✕") para prevenir modificaciones accidentales.
- Las tablas deben aprovechar el ancho completo disponible (full-width) al retirar los paneles de formulario embebidos.
- Las validaciones existentes (morosidad, stand-by, condición vital vivo/fallecido) deben preservarse intactas al guardar en línea.

## Review Focus
1. Al cancelar una edición en línea (`Cancelar ✕`), los datos originales deben restablecerse sin alterar el estado.
2. Al guardar una edición en línea en Parcelas, si la deuda supera 3 años o se cambia el estado, debe evaluarse automáticamente el estado `standby`.
3. Al abrir el modal de "+ Nueva Parcela" o "+ Nueva Inhumación", el formulario debe iniciar en blanco (sin datos residuales de ediciones previas).
4. El diseño responsivo de las filas editables no debe romper el alineamiento vertical ni desbordar horizontalmente la cuadrícula.
5. Los recibos y vouchers oficiales deben continuar imprimiéndose con doble talón y sin referencias a "Catastro".

---

### Task 1: Remoción Global de la Palabra "Catastro" en UI y Textos

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/views/InhumacionesView.tsx`
- Modify: `src/components/views/ConfiguracionView.tsx`
- Modify: `src/components/search/OmniboxSearch.tsx`
- Modify: `src/components/payment/QRPaymentModal.tsx`
- Modify: `src/components/payment/PortalPagoPublico.tsx`

**Interfaces:**
- `Navbar.tsx`: pestaña `parcelas` con etiqueta `'Parcelas'` (en lugar de `'Parcelas & Catastro'`). Subtítulo: `'Módulo de Gestión de Parcelas'`.
- `InhumacionesView.tsx`: prop renombrada `onVerParcela?: (nomenclatura: string) => void`.

- [ ] **Step 1: Reemplazar "Parcelas & Catastro" por "Parcelas" en Navbar y encabezados**
- [ ] **Step 2: Reemplazar menciones en ParcelasView, InhumacionesView y ConfiguracionView**
- [ ] **Step 3: Reemplazar menciones en OmniboxSearch y comprobantes de pago**
- [ ] **Step 4: Ejecutar `npm test` para asegurar que las pruebas sigan pasando**
- [ ] **Step 5: Commit de Task 1**

---

### Task 2: Modales de Alta para Parcelas e Inhumaciones & Expansión de Tablas a Ancho Completo

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/views/InhumacionesView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- `ParcelasView`: recibe `onNuevaParcela: () => void`. Elimina el panel lateral fijo `lg:col-span-4`. La tabla ocupa `col-span-12` / `w-full`.
- `InhumacionesView`: recibe `onNuevaInhumacion: () => void`. Elimina el `<section>` superior de registro estático.
- `App.tsx`: maneja `formParcelaOpen` y `formInhumacionOpen` desplegando los modales flotantes correspondientes.

- [ ] **Step 1: Retirar formulario lateral en `ParcelasView.tsx` y añadir botón `+ Nueva Parcela` en cabecera**
- [ ] **Step 2: Retirar tarjeta de formulario superior en `InhumacionesView.tsx` y añadir botón `+ Nueva Inhumación` en cabecera**
- [ ] **Step 3: Conectar los modales `ParcelaForm` e `InhumacionForm` en `App.tsx`**
- [ ] **Step 4: Verificar que el diseño de las tablas ahora es limpio y de ancho completo**
- [ ] **Step 5: Commit de Task 2**

---

### Task 3: Edición en Línea por Fila en Tabla de Parcelas

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`

**Interfaces:**
- Estado: `editingRowId: string | null`, `editRowData: Partial<Parcela> & { titularNombre?: string; titularDni?: string; titularTelefono?: string; titularDireccion?: string; titularEstadoVital?: 'vivo' | 'fallecido' }`.
- Botones de acción en modo lectura: `Editar` (lápiz), `Reactivar`, `Liberar`, `Cobrar QR`.
- Botones de acción en modo edición: `Guardar ✓` (valida y ejecuta `onSaveParcela`), `Cancelar ✕` (cancela edición).

- [ ] **Step 1: Crear estado de edición en línea y funciones `startEditRow`, `cancelEditRow`, `saveEditRow`**
- [ ] **Step 2: Renderizar inputs/selects en celdas cuando `editingRowId === p.id` (Titular, DNI, Condición Vital, Estado, Saldo)**
- [ ] **Step 3: Renderizar botones "Guardar ✓" y "Cancelar ✕" en la columna de acciones**
- [ ] **Step 4: Probar interactividad y persistencia con `onSaveParcela`**
- [ ] **Step 5: Commit de Task 3**

---

### Task 4: Edición en Línea por Fila en Tabla de Inhumaciones

**Files:**
- Modify: `src/components/views/InhumacionesView.tsx`

**Interfaces:**
- Estado: `editingRowId: string | null`, `editRowData: Partial<Inhumacion>`.
- Campos editables en fila: Difunto (nombre completo), DNI, Fecha Inhumación, Parcela, Nivel, Empresa Fúnebre.
- Botones de acción en modo edición: `Guardar ✓` y `Cancelar ✕`.

- [ ] **Step 1: Crear estado de edición en línea `editingRowId` y `editRowData` en `InhumacionesView.tsx`**
- [ ] **Step 2: Renderizar inputs en celdas cuando `editingRowId === inh.id`**
- [ ] **Step 3: Implementar `handleSaveInlineInhumacion` y `handleCancelInlineInhumacion`**
- [ ] **Step 4: Verificar persistencia y actualización de la lista de inhumaciones**
- [ ] **Step 5: Commit de Task 4**

---

### Task 5: Edición en Línea por Fila en Tabla de Afiliados (Plan Seguro Integral)

**Files:**
- Modify: `src/components/views/AfiliadosSeguroView.tsx`

**Interfaces:**
- Estado: `editingRowId: string | null`, `editRowData: Partial<AfiliadoSeguro>`.
- Campos editables en fila: Nombre completo, DNI, Teléfono, Dirección, Zona, Monto Cuota, Estado.
- Botones de acción en modo edición: `Guardar ✓` y `Cancelar ✕`.

- [ ] **Step 1: Crear estado de edición en línea en `AfiliadosSeguroView.tsx`**
- [ ] **Step 2: Renderizar campos editables compactos en fila de afiliado**
- [ ] **Step 3: Implementar guardado con `onEditarAfiliado` y cancelación limpia**
- [ ] **Step 4: Ejecutar tests unitarios**
- [ ] **Step 5: Commit de Task 5**

---

### Task 6: Verificación Integral End-to-End con Playwright y Regresión

**Files:**
- Create: `scripts/test_inline_editing_and_modals.cjs`
- Modify: `scripts/test_reglas_and_features.cjs`

- [ ] **Step 1: Escribir script de prueba automatizada `test_inline_editing_and_modals.cjs`**
- [ ] **Step 2: Ejecutar Playwright validando modales, edición en línea y ausencia de "catastro"**
- [ ] **Step 3: Ejecutar `npm test` y `npm run build`**
- [ ] **Step 4: Commit de Task 6**

# Matriz Anual de Cuotas y Padrón del Seguro de Sepelio - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la matriz anual de 12 cuotas del Seguro de Sepelio en una herramienta 100% funcional y conectada en tiempo real con Supabase y LocalStorage, permitiendo cobros individuales, cobro consolidado de mora, visualización de comprobantes y reversión de cuotas pagadas.

**Architecture:** Se extienden los servicios en `dataService.ts` para persistir operaciones en `cuotas_seguro` y `pagos_recibos`. En la UI se añade un modal de detalle de cuota (`DetalleCuotaModal.tsx`), se dinamizan las celdas de la matriz de `AfiliadosSeguroView.tsx` y se orquesta la sincronización reactiva bidireccional en `App.tsx`.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase JS Client, Lucide/Material Symbols, Vitest/ts-node.

**Spec:** `docs/superpowers/specs/2026-10-22-matriz-cuotas-seguro-design.md`

## Global Constraints
- Utilizar la tabla existente `cuotas_seguro` de Supabase con los campos `afiliado_id`, `anio`, `mes`, `monto`, `estado_cuota`, `fecha_pago`, `metodo_pago`, `nro_recibo`.
- No romper la retrocompatibilidad con `localStorage` (debe funcionar offline y online).
- Mantener la estética premium del sistema de diseño (tokens de color de DESIGN.md, tipografía tabular `font-code-cadastral`).

## Review Focus
- **Reversión de pago:** Al anular una cuota, el afiliado debe regresar de inmediato a estado en mora si corresponde, y el saldo de deuda debe recalcularse.
- **Cobro de mora acumulada:** Si se cobran 2 o 3 cuotas juntas, debe generarse un único recibo con el monto sumado y marcarse todas las cuotas seleccionadas como pagadas.
- **Persistencia tras recargar:** Al refrescar la aplicación, las cuotas cobradas deben persistir desde Supabase y no resetearse a valores de prueba.
- **Creación de afiliado nuevo:** Debe inicializar las 12 cuotas de 2026 en Supabase.
- **Comprobante imprimible:** El modal de detalle debe formatear el recibo listo para imprimir o enviar.

---

### Task 1: Métodos de Persistencia de Cuotas en Supabase y Storage (`dataService.ts`)

**Files:**
- Modify: `src/services/dataService.ts`
- Create: `scripts/test_cuotas_sync.ts`

**Interfaces:**
- Produces:
  - `registrarPagoCuotaSupabase(afiliadoId: string, anio: number, mes: number, pagoData: { nroRecibo: string; metodoPago: string; monto: number }): Promise<boolean>`
  - `revertirPagoCuotaSupabase(afiliadoId: string, anio: number, mes: number): Promise<boolean>`
  - `crearCuotasAnualesSupabase(afiliadoId: string, anio: number, monto: number): Promise<boolean>`

- [ ] **Step 1: Crear script de prueba automatizado `scripts/test_cuotas_sync.ts`**
  - Probar lectura de cuotas existentes.
  - Probar registro de pago de una cuota de prueba.
  - Probar reversión de la cuota a pendiente.

- [ ] **Step 2: Ejecutar test para verificar fallo previo**
  Run: `npx ts-node scripts/test_cuotas_sync.ts`
  Expected: FAIL (funciones aún no implementadas en `dataService.ts`).

- [ ] **Step 3: Implementar métodos en `src/services/dataService.ts`**
  - Implementar `registrarPagoCuotaSupabase`.
  - Implementar `revertirPagoCuotaSupabase`.
  - Implementar `crearCuotasAnualesSupabase`.
  - Actualizar `fetchAfiliadosSupabase` para mapear los objetos detallados de `cuotas_seguro` (`cuotasDetalle`).
  - Actualizar `saveAfiliadosToStorage`.

- [ ] **Step 4: Ejecutar test para verificar éxito**
  Run: `npx ts-node scripts/test_cuotas_sync.ts`
  Expected: PASS con código 0.

- [ ] **Step 5: Commit de Task 1**
  ```bash
  git add src/services/dataService.ts scripts/test_cuotas_sync.ts
  git commit -m "feat(dataService): add Supabase and local sync for cuotas_seguro"
  ```

---

### Task 2: Componente `DetalleCuotaModal.tsx` para Comprobante y Reversión

**Files:**
- Create: `src/components/modals/DetalleCuotaModal.tsx`

**Interfaces:**
- Consumes: `AfiliadoSeguro`, datos de la cuota (`mes`, `anio`, `monto`, `nroRecibo`, `fechaPago`, `metodoPago`).
- Produces: `onClose: () => void`, `onRevertir: (afiliadoId: string, mes: number) => void`.

- [ ] **Step 1: Crear el componente `DetalleCuotaModal.tsx`**
  - Renderizar modal con estilo ticket/comprobante oficial:
    - Membrete Parroquial/Municipal "Aeterna - Seguro de Sepelio Chamical".
    - Datos del titular, DNI, N° de afiliado y domicilio.
    - Período abonado (ej: "Cuota 03/2026 - Marzo").
    - N° de Recibo oficial, fecha de cobro y método de pago (QR Interoperable / Efectivo).
    - Botón "Imprimir Comprobante" (`window.print()`).
    - Botón de peligro "Anular/Revertir Cobro" con confirmación de alerta.

- [ ] **Step 2: Verificar sintaxis y tipado**
  Run: `npx tsc --noEmit`
  Expected: Sin errores de TypeScript en el componente.

- [ ] **Step 3: Commit de Task 2**
  ```bash
  git add src/components/modals/DetalleCuotaModal.tsx
  git commit -m "feat(ui): add DetalleCuotaModal component for receipt preview and voiding"
  ```

---

### Task 3: Matriz Funcional en `AfiliadosSeguroView.tsx`

**Files:**
- Modify: `src/components/views/AfiliadosSeguroView.tsx`

**Interfaces:**
- Consumes: `onCobrarCuota`, `onRevertirCuota`, `onCobrarMultiplesCuotas`.
- Produces: Click en celda pagada abre `DetalleCuotaModal`. Click en celda vencida o futura abre pasarela. Botón "Cobrar Mora Total" para acumular meses impagos.

- [ ] **Step 1: Agregar soporte a props y estado de modal en `AfiliadosSeguroView.tsx`**
  - Añadir `selectedCuotaDetalle` state para controlar `DetalleCuotaModal`.
  - Añadir soporte a `onRevertirCuota` y `onCobrarMultiplesCuotas`.

- [ ] **Step 2: Hacer clicables las celdas pagadas (verdes)**
  - En Desktop y Mobile, añadir `onClick={() => abrirDetalleCuota(afiliado, mes)}`.
  - Agregar tooltip descriptivo y cursor interactivo.

- [ ] **Step 3: Añadir acción "Cobrar Mora Total"**
  - Para afiliados con más de 1 cuota vencida, mostrar botón destacado con el total acumulado adeudado.

- [ ] **Step 4: Verificar compilación y tipos**
  Run: `npx tsc --noEmit`
  Expected: PASS

- [ ] **Step 5: Commit de Task 3**
  ```bash
  git add src/components/views/AfiliadosSeguroView.tsx
  git commit -m "feat(views): enable full interactive matrix actions in AfiliadosSeguroView"
  ```

---

### Task 4: Conexión y Sincronización Global en `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Actualizar `handleCobrarAfiliado` para actualizar `cuotas_seguro` en Supabase y `localStorage`.
- Implementar `handleRevertirCuotaAfiliado`.
- Implementar `handleCobrarMultiplesCuotas`.
- Asegurar que al crear un nuevo afiliado se generen las 12 cuotas anuales.

- [ ] **Step 1: Implementar `handleCobrarAfiliado` completo con sincronización en `cuotas_seguro`**
  - Actualizar el estado de afiliados (`cuotasPagadas` y `cuotasDetalle`).
  - Llamar `saveAfiliadosToStorage`.
  - Invocar `registrarPagoCuotaSupabase` y `registrarPagoSupabase`.
  - Recalcular `estado = 'activo'` si queda sin meses vencidos.

- [ ] **Step 2: Implementar `handleRevertirCuotaAfiliado`**
  - Remover el mes de `cuotasPagadas`.
  - Actualizar `cuotas_seguro` en Supabase a 'pendiente'.
  - Cambiar estado a `'inactivo'` / mora si el mes revertido correspondía al período en curso.
  - Guardar en `localStorage`.

- [ ] **Step 3: Implementar `handleCobrarMultiplesCuotas`**
  - Abrir modal QR con el monto total acumulado y concepto compuesto (ej: "Cuotas Ene, Feb, Mar 2026").
  - Al confirmar, impactar todas las cuotas en Supabase y registrar un único recibo consolidado.

- [ ] **Step 4: Verificar compilación completa**
  Run: `npx tsc --noEmit`
  Expected: PASS

- [ ] **Step 5: Commit de Task 4**
  ```bash
  git add src/App.tsx
  git commit -m "feat(app): wire cuota payments, multi-cuota collections and reversals with Supabase"
  ```

---

### Task 5: Verificación Integral End-to-End

**Files:**
- Modify: `scripts/e2e_workflows_test.cjs`

- [ ] **Step 1: Extender `scripts/e2e_workflows_test.cjs` para cubrir la matriz**
  - Navegar a la pestaña "Seguro de Sepelio".
  - Verificar que las cuotas se renderizan correctamente.
  - Simular cobro de cuota con modal QR.
  - Simular clic en cuota pagada y verificar apertura de `DetalleCuotaModal`.
  - Capturar screenshot de evidencia.

- [ ] **Step 2: Ejecutar test E2E**
  Run: `node scripts/e2e_workflows_test.cjs`
  Expected: 100% de los pasos exitosos y capturas generadas.

- [ ] **Step 3: Commit final**
  ```bash
  git add scripts/e2e_workflows_test.cjs
  git commit -m "test(e2e): add end-to-end test for functional cuotas matrix"
  ```

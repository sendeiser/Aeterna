# Plan de Implementación: Columna y Filtro de Domicilio en Parcelas + Enviar Cobro en Stand-by

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar la columna visible de Domicilio y el filtro específico por Domicilio/Barrio en la grilla de parcelas, permitir su edición rápida y en formulario, e incorporar el botón de "Enviar cobro" a distancia para parcelas en estado `standby`.

**Architecture:** Se extiende `ParcelasView.tsx` incorporando la columna `Domicilio` en la tabla desktop, el filtro dedicado `filterDomicilio` con debounce/limpieza inmediata, y el renderizado del botón `Enviar cobro` en parcelas `standby` que conecta con `EnviarCobroModal`. Se agregan campos de domicilio en `ParcelaForm.tsx` y en el estado de edición en línea de `ParcelasView.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide / Material Symbols, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-domicilio-parcelas-y-cobro-standby-design.md`

## Global Constraints
- No modificar el esquema de base de datos en PostgreSQL ni migraciones: `direccion` y `barrio` ya existen en `titulares`.
- Mantener las acciones administrativas existentes en standby (`Reactivar` y `Liberar`).
- Mantener diseño limpio Material 3 / Tailwind conforme a la paleta institucional de Aeterna.

## Review Focus
1. Parcela sin titular asignado o titular sin dirección: mostrar `Sin domicilio` en gris/itálica sin provocar excepciones de `null`.
2. Filtro de domicilio insensible a mayúsculas/minúsculas y acentos: buscar tanto en `direccion` como en `barrio`.
3. Parcela en stand-by cobrada por el total: confirmar que `cobroService` y `App.tsx` transicionen la parcela a `ocupada`.
4. Ordenamiento por domicilio: las parcelas sin domicilio deben quedar al final de la lista.
5. Edición rápida en línea: el campo de domicilio debe actualizar el titular en memoria y persistir en Supabase.

---

### Task 1: Pruebas unitarias de filtrado por domicilio y cobro en Standby

**Files:**
- Create: `src/tests/parcelasDomicilioYStandby.test.ts`
- Modify: `src/services/cobroService.ts` (si se requiere ajuste de tipado o retorno)

**Interfaces:**
- Consumes: `aplicarCobroParcela(input: CobroParcelaInput)` de `src/services/cobroService.ts`
- Produces: Tests unitarios que validan el filtrado por domicilio/barrio y la regularización automática de standby a ocupada al registrar el cobro.

- [ ] **Step 1: Escribir los tests unitarios**
Crear `src/tests/parcelasDomicilioYStandby.test.ts` verificando:
1. Filtrado de parcelas por domicilio (calle y barrio).
2. Cobro de parcela en `standby`: el estado resultante debe ser `ocupada` y el saldo `$0`.
3. Cobro parcial de parcela en `standby`: el estado se mantiene en `standby` si aún queda saldo pendiente.

- [ ] **Step 2: Ejecutar el test para verificar que falle o pase**
Run: `npx vitest run src/tests/parcelasDomicilioYStandby.test.ts`
Expected: PASS o FAIL con detalles claros.

- [ ] **Step 3: Ajustar `cobroService.ts` si fuera necesario**
Asegurar que la transición de `standby` a `ocupada` esté cubierta cuando `nuevoSaldo <= 0`.

- [ ] **Step 4: Confirmar paso de tests**
Run: `npx vitest run src/tests/parcelasDomicilioYStandby.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/tests/parcelasDomicilioYStandby.test.ts
git commit -m "test: agregar pruebas de filtrado por domicilio y cobro en parcelas standby"
```

---

### Task 2: Columna Domicilio, Ordenamiento y Filtro Dedicado en `ParcelasView.tsx`

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`

**Interfaces:**
- Consumes: `Parcela.titular.direccion`, `Parcela.titular.barrio`
- Produces:
  - Nueva columna `Domicilio` en tabla desktop (entre Titular y Parcela).
  - Opciones de ordenamiento: `domicilio-asc` y `domicilio-desc`.
  - Input dedicado `filterDomicilio` en la barra de herramientas de filtros secundarios.
  - Visualización de domicilio en la tarjeta móvil (`md:hidden`).

- [ ] **Step 1: Agregar el estado `filterDomicilio` y el ordenamiento por domicilio**
En `ParcelasView.tsx`:
- Declarar `const [filterDomicilio, setFilterDomicilio] = useState('')`.
- Incluir `filterDomicilio` en el hook `useEffect` de reset de página (`setCurrentPage(1)`).
- En `filteredParcelas`: agregar condición para evaluar si `p.titular?.direccion` o `p.titular?.barrio` coinciden con `filterDomicilio`.
- En `sortedParcelas`: agregar casos `domicilio-asc` y `domicilio-desc`.

- [ ] **Step 2: Agregar input de filtro de domicilio en la barra de herramientas**
En la sección de filtros (tanto en desktop como en móvil desplegable), agregar el input con ícono de casa/ubicación y botón de limpieza `✕`.

- [ ] **Step 3: Agregar encabezado y celda `Domicilio` en la tabla desktop**
- En `<thead>`: agregar `<th>` interactivo para ordenar por Domicilio.
- En `<tbody>`: renderizar la celda con ícono `location_on`, texto truncado con tooltip completo, y barrio en subtexto.

- [ ] **Step 4: Mostrar domicilio en las tarjetas de la vista móvil**
En el bloque de información del titular de la tarjeta móvil, renderizar la fila de dirección si `p.titular?.direccion` está presente.

- [ ] **Step 5: Ejecutar test suite para verificar que no haya errores de compilación ni regresiones**
Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/components/views/ParcelasView.tsx
git commit -m "feat(parcelas): agregar columna domicilio, ordenamiento y filtro dedicado por direccion"
```

---

### Task 3: Carga y Edición de Domicilio en Edición Rápida y `ParcelaForm.tsx`

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/forms/ParcelaForm.tsx`

**Interfaces:**
- Consumes: `titular.direccion`, `titular.barrio`
- Produces: Capacidad de actualizar el domicilio directamente desde la fila de la grilla o desde el formulario modal de Parcela.

- [ ] **Step 1: Agregar `titularDireccion` en el estado de edición en línea de `ParcelasView.tsx`**
- Extender el tipo de `editRowData`: `titularDireccion: string`.
- En `startEditRow`: inicializar `titularDireccion: p.titular?.direccion || ''`.
- En el renderizado de la fila en modo edición (`isEditing`): agregar input editable de Domicilio en la columna correspondiente.
- En `saveEditRow`: pasar `direccion: editRowData.titularDireccion` en el objeto `titular` al llamar `onSaveParcela`.

- [ ] **Step 2: Agregar campos de Domicilio y Barrio en `ParcelaForm.tsx`**
- Agregar estados locales `titularDireccion` y `titularBarrio`.
- En el `useEffect` de carga de parcela inicial: cargar los valores del titular.
- En el formulario JSX: agregar los inputs dentro del fieldset "Datos del Titular Responsable".
- En `handleSubmit`: incluir `direccion` y `barrio` en el objeto `titular` enviado a `onSave`.

- [ ] **Step 3: Ejecutar suite de pruebas**
Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/components/views/ParcelasView.tsx src/components/forms/ParcelaForm.tsx
git commit -m "feat(parcelas): habilitar edicion de domicilio en edicion rapida y modal ParcelaForm"
```

---

### Task 4: Habilitar botón "Enviar cobro" en parcelas Stand-by y Verificación E2E

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`

**Interfaces:**
- Consumes: `onEnviarCobro?: (parcela: Parcela) => void`
- Produces: Botón `[Enviar cobro]` visible y operativo en parcelas con estado `standby` (desktop y mobile).

- [ ] **Step 1: Agregar botón Enviar cobro en parcelas standby en la tabla desktop**
En `ParcelasView.tsx`, dentro de la condición `p.estado === 'standby'`, agregar junto a `Reactivar` y `Liberar` el botón:
```tsx
{onEnviarCobro && (
  <button
    type="button"
    onClick={() => onEnviarCobro(p)}
    title="Enviar cobro a distancia (QR, Alias y Recibo) para regularizar parcela"
    className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-emerald-50 text-emerald-600 cursor-pointer"
  >
    <span className="material-symbols-outlined text-[18px]">send_to_mobile</span>
  </button>
)}
```

- [ ] **Step 2: Agregar botón Enviar cobro en parcelas standby en las tarjetas móviles**
En la sección móvil de `ParcelasView.tsx`, cuando `p.estado === 'standby'`, agregar el botón `[Enviar cobro]` estilizado con texto e ícono.

- [ ] **Step 3: Verificar visual y funcionalmente en el navegador**
- Comprobar que en la pestaña "Stand-by", cada parcela muestre el botón `[Enviar cobro]`.
- Al hacer clic en una parcela en stand-by, verificar que se abra `EnviarCobroModal` con el monto de la deuda acumulada.
- Comprobar el filtro por domicilio con términos como "Loma Blanca" o "Perón".

- [ ] **Step 4: Ejecutar suite de pruebas completa**
Run: `npm test`
Expected: PASS (todas las pruebas pasan)

- [ ] **Step 5: Commit**
```bash
git add src/components/views/ParcelasView.tsx
git commit -m "feat(parcelas): habilitar boton Enviar cobro en parcelas standby en desktop y mobile"
```

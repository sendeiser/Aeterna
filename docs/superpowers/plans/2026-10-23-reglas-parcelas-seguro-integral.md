# Plan de Implementación: Reglas de Titularidad, Plan Seguro Integral y Optimización Operativa

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar en Aeterna el reemplazo léxico de Nomenclatura por Parcela, filtro de titular vivo/muerto, empresas funerarias de ingreso libre por el usuario, eliminación de 3 columnas en la tabla de inhumaciones, renombrado a Plan Seguro Integral, reglas de stand-by con alerta y última fecha de pago para parcelas (+3 años) y seguro (+3 meses), y circuito de recibos físicos oficiales.

**Architecture:** Se extiende el modelo de datos con el estado `'standby'` para parcelas y estado vital del titular, se implementan helpers de cálculo de morosidad pura y métodos administrativos para reactivación/liberación, se limpian las vistas de UI en React desacoplando selects cerrados a favor de inputs abiertos con datalist, y se formatea la emisión de recibos físicos optimizados con doble talón.

**Tech Stack:** React 18, TypeScript 5, Vite 6, Tailwind CSS 3, Supabase JS, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-23-reglas-parcelas-seguro-integral-design.md](file:///d:/Aeterna/docs/superpowers/specs/2026-10-23-reglas-parcelas-seguro-integral-design.md)

## Global Constraints
- Reemplazar toda mención visible al usuario de "nomenclatura" por "parcela", manteniendo la compatibilidad interna de claves si fuera necesario.
- La tabla de inhumaciones debe quedar exactamente con las columnas esenciales: Fecha Inhumación, Difunto / DNI / Acta, Parcela y Nivel, y Acciones Registrales.
- El ingreso de empresas funerarias no debe limitar al usuario a una lista cerrada.
- Una parcela con morosidad >= 3 años debe entrar en estado `standby` (bloqueada), mostrando alerta clara, fecha de último pago, y permitir al administrador reactivarla o liberarla.
- Un afiliado al Plan Seguro Integral con mora >= 3 meses debe mostrar la alerta de stand-by/suspensión con la última cuota pagada.
- Los recibos generados deben ser físicos, optimizados para impresión con talón contribuyente y talón administración.

## Review Focus
1. Parcela vendida con deuda mayor a 3 años pasa automáticamente a `standby` y muestra el último pago.
2. Acción administrativa "Reactivar" restablece la titularidad y actualiza el estado tras el cobro.
3. Acción administrativa "Liberar" desvincula al titular a histórico y deja la parcela en `disponible`.
4. El filtro de titular clasifica con precisión entre "Vivo" y "Fallecido".
5. Los recibos se imprimen físicamente (`window.print()`) con formato formal sin cortes de página.

---

### Task 1: Modelos de Datos, Tipos y Helper de Reglas de Negocio

**Files:**
- Modify: `src/types/database.ts:1-60`
- Create: `src/lib/reglasNegocio.ts`
- Test: `src/tests/reglasNegocio.test.ts`

**Interfaces:**
- Produces:
  - `evaluarMoraParcela(parcela: Parcela): { enStandby: boolean; aniosMora: number; fechaUltimoPago: string | null; ultimaCuotaPagada: string }`
  - `evaluarMoraAfiliado(afiliado: AfiliadoSeguro): { enStandby: boolean; mesesMora: number; fechaUltimoPago: string | null; ultimaCuotaPagada: string }`

- [ ] **Step 1: Escribir el test unitario fallido para las reglas de morosidad**

```typescript
// src/tests/reglasNegocio.test.ts
import { describe, it, expect } from 'vitest'
import { evaluarMoraParcela, evaluarMoraAfiliado } from '../lib/reglasNegocio'

describe('Reglas de Negocio y Stand-by', () => {
  it('identifica parcela en stand-by por morosidad de 3 o más años y extrae última cuota pagada', () => {
    const res = evaluarMoraParcela({
      id: 'p1',
      nomenclatura: 'A-25-96',
      saldo_mantenimiento: 180000,
      estado: 'ocupada',
      capacidad_total: 3,
      espacios_ocupados: 1,
      fecha_ultimo_pago: '2023-01-10',
      ultima_cuota_pagada: 'Cuota Anual 2022',
      titular: { id: 't1', nombre_completo: 'Juan Perez', estado_titular: 'activo' }
    })
    expect(res.enStandby).toBe(true)
    expect(res.aniosMora).toBeGreaterThanOrEqual(3)
    expect(res.ultimaCuotaPagada).toBe('Cuota Anual 2022')
  })

  it('no pone en stand-by una parcela al día o con menos de 3 años de mora', () => {
    const res = evaluarMoraParcela({
      id: 'p2',
      nomenclatura: 'B-10-20',
      saldo_mantenimiento: 15000,
      estado: 'ocupada',
      capacidad_total: 3,
      espacios_ocupados: 1,
      fecha_ultimo_pago: '2025-11-01',
      titular: { id: 't2', nombre_completo: 'Maria Gomez', estado_titular: 'activo' }
    })
    expect(res.enStandby).toBe(false)
  })

  it('identifica afiliado de Plan Seguro Integral con 3 o más meses de mora', () => {
    const res = evaluarMoraAfiliado({
      id: 'a1',
      nombre_completo: 'Carlos Sosa',
      numero_afiliado: 'AF-100',
      cuotasPagadas: [1, 2], // De enero y febrero, debe marzo, abril, mayo, etc.
      mesActual: 6
    } as any)
    expect(res.enStandby).toBe(true)
    expect(res.mesesMora).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Run: `npx vitest run src/tests/reglasNegocio.test.ts`  
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar tipos en `src/types/database.ts` y lógica en `src/lib/reglasNegocio.ts`**

En `database.ts`:
- Añadir `'standby'` a `EstadoParcela`.
- Añadir `estado_vital?: 'vivo' | 'fallecido'` a `Titular`.
- Añadir `fecha_ultimo_pago?: string | null`, `titular_anterior?: Titular | null` a `Parcela`.
- Añadir `meses_mora?: number`, `fecha_ultimo_pago?: string | null` a `AfiliadoSeguro`.

En `src/lib/reglasNegocio.ts`:
- Calcular diferencia de años entre la fecha de referencia y `fecha_ultimo_pago` (o saldo equivalente a 3 años de canon anual ~108,000). Si >= 3 años y tiene titular, retorna `enStandby: true`.
- Calcular meses impagos consecutivos en cuotas de seguro. Si >= 3, retorna `enStandby: true`.

- [ ] **Step 4: Ejecutar test para verificar que pasa**

Run: `npx vitest run src/tests/reglasNegocio.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit de Task 1**

```bash
git add src/types/database.ts src/lib/reglasNegocio.ts src/tests/reglasNegocio.test.ts
git commit -m "feat(types): agregar estado standby, estado vital y helper de reglas de morosidad"
```

---

### Task 2: Métodos de Reactivación, Liberación y Persistencia en `dataService.ts`

**Files:**
- Modify: `src/services/dataService.ts`
- Test: `src/tests/dataService_reglas.test.ts`

**Interfaces:**
- Produces:
  - `reactivarParcelaStandby(parcelaId: string, pagoData?: any): Promise<Parcela>`
  - `liberarParcelaStandby(parcelaId: string, motivo?: string): Promise<Parcela>`

- [ ] **Step 1: Escribir test unitario de reactivación y liberación**

Verifica que `reactivarParcelaStandby` cambie el estado de `'standby'` a `'ocupada'` (o `'al_dia'`) con saldo en cero y fecha de pago actualizada.
Verifica que `liberarParcelaStandby` archive el titular en `titular_anterior`, fije `titular: null` y estado en `'disponible'`.

- [ ] **Step 2: Ejecutar test para verificar fallo previo**

Run: `npx vitest run src/tests/dataService_reglas.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implementar métodos en `dataService.ts` y evaluar morosidad al cargar parcelas**

En `loadInitialData()` / `fetchParcelasSupabase()`:
- Al mapear cada parcela, si cumple las condiciones de mora de 3 años, asignar automáticamente `estado: 'standby'` y su `fecha_ultimo_pago`.
- Implementar `reactivarParcelaStandby` y `liberarParcelaStandby` con actualización en localStorage y Supabase.

- [ ] **Step 4: Ejecutar test para verificar que pasa**

Run: `npx vitest run src/tests/dataService_reglas.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit de Task 2**

```bash
git add src/services/dataService.ts src/tests/dataService_reglas.test.ts
git commit -m "feat(dataService): incorporar evaluacion de standby, reactivacion y liberacion de parcelas"
```

---

### Task 3: Reemplazo Global de Término "Nomenclatura" por "Parcela"

**Files:**
- Modify: `src/components/search/OmniboxSearch.tsx`
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/views/InhumacionesView.tsx`
- Modify: `src/components/modals/ActaInhumacionModal.tsx`
- Modify: `src/tests/search.test.ts`
- Modify: `src/tests/formatters.test.ts`

- [ ] **Step 1: Actualizar tests de búsqueda y formateadores**

Cambiar descripciones y verificaciones de test para reflejar "parcela" en vez de "nomenclatura".

- [ ] **Step 2: Reemplazar textos en `OmniboxSearch.tsx`**

Línea 100: `placeholder="Buscar por titular, parcela (A-25-96), difunto o afiliado..."`.

- [ ] **Step 3: Reemplazar textos y encabezados en `ParcelasView.tsx`**

- Encabezado de tabla: `<th>Parcela</th>` (en lugar de `<th>Nomenclatura</th>`).
- Previsualización en formulario: `"Identificador de Parcela"` (en lugar de `"Nomenclatura Oficial"`).
- Placeholders de búsqueda: `"Filtrar por parcela (ej. A-25), apellido titular o DNI..."`.
- Tarjetas y modales de confirmación: `"¿Confirma eliminar la parcela ${p.nomenclatura}?"` asegurando que el rótulo visible sea "Parcela".

- [ ] **Step 4: Ejecutar suite de pruebas**

Run: `npx vitest run`  
Expected: PASS.

- [ ] **Step 5: Commit de Task 3**

```bash
git add src/components/search/OmniboxSearch.tsx src/components/views/ParcelasView.tsx src/components/views/InhumacionesView.tsx src/components/modals/ActaInhumacionModal.tsx src/tests/search.test.ts src/tests/formatters.test.ts
git commit -m "refactor(ui): reemplazar terminologia nomenclatura por parcela en toda la interfaz"
```

---

### Task 4: Filtro de Titular Vivo/Fallecido y Gestión de Parcelas en Stand-by

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/modals/ParcelaModal.tsx` (o formulario de edición de titular)

- [ ] **Step 1: Agregar estado y botones de filtro por estado vital**

En `ParcelasView.tsx`:
- Estado `filterTitularVital: 'todos' | 'vivo' | 'fallecido'` y filtro rápido:
  - Botones tipo píldora o selector: `Todos`, `Titular Vivo`, `Titular Fallecido`.
- Filtrar la lista según `p.titular?.estado_vital` (o si `estado_titular === 'fallecido'`).

- [ ] **Step 2: Mostrar insignia, alerta destacada y última cuota pagada para parcelas en Stand-by**

Para parcelas con `p.estado === 'standby'`:
- Badge y banner de advertencia: `⚠️ Stand-by: Titularidad Caduca (+3 años sin pago)`.
- Mostrar claramente en la fila de la tabla y en la tarjeta catastral:
  `Última cuota pagada: ${p.ultima_cuota_pagada || 'Cuota Anual 2022 (o s/ registro)'}` y `Fecha de pago: ${p.fecha_ultimo_pago || 'Sin fecha'}`.
- Botones de acción administrativa exclusivos:
  - **"Reactivar Parcela"**: Abre cobro de regularización y restaura la titularidad.
  - **"Liberar Parcela"**: Confirmación administrativa para liberar la parcela a `disponible` archivando el titular anterior.

- [ ] **Step 3: Permitir definir estado vital en el formulario de Parcela / Titular**

Selector "Condición del Titular: [ Vivo | Fallecido ]" al editar o dar de alta la titularidad de una parcela.

- [ ] **Step 4: Verificar compilación y renderizado**

Run: `npm run build`  
Expected: Compilación exitosa sin errores TypeScript.

- [ ] **Step 5: Commit de Task 4**

```bash
git add src/components/views/ParcelasView.tsx
git commit -m "feat(parcelas): agregar filtro titular vivo/fallecido y flujo de gestion de standby"
```

---

### Task 5: Formulario Abierto de Empresas Funerarias y Limpieza de Tabla de Inhumaciones

**Files:**
- Modify: `src/components/views/InhumacionesView.tsx`
- Modify: `src/components/forms/InhumacionForm.tsx`

- [ ] **Step 1: Quitar columnas de la tabla de inhumaciones**

En `InhumacionesView.tsx` (en `<thead>` y `<tbody>`):
- Eliminar columna `Empresa Fúnebre` (`<th>` y `<td>`).
- Eliminar columna `Indicador Sanitario` (`<th>` y `<td>`).
- Eliminar columna `Oficial de Registro` (`<th>` y `<td>`).
- La grilla resultante queda con: *Fecha Inhumación*, *Difunto / DNI / N° Acta*, *Parcela y Nivel*, y *Acciones Registrales*.

- [ ] **Step 2: Reemplazar el select de empresa funeraria por campo de texto libre con sugerencias**

En el modal/formulario de nueva inhumación:
- Reemplazar `<select>` por:
```tsx
<input
  type="text"
  list="empresas-funebreras-list"
  value={formFunebrera}
  onChange={(e) => setFormFunebrera(e.target.value)}
  placeholder="Ingrese nombre de la empresa fúnebre interviniente..."
  className="w-full h-[36px] px-3 text-body-md bg-surface-container-lowest border border-outline-variant rounded focus:border-secondary outline-none text-on-surface"
/>
<datalist id="empresas-funebreras-list">
  <option value="Servicios Sociales Chamical" />
  <option value="Cochería La Rioja Integral" />
  <option value="Empresa Fúnebre San Pedro" />
  <option value="Traslado Municipal de Salud" />
</datalist>
```
Permite ingresar cualquier funeraria libremente.

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Commit de Task 5**

```bash
git add src/components/views/InhumacionesView.tsx src/components/forms/InhumacionForm.tsx
git commit -m "feat(inhumaciones): input libre de empresas funebreras y simplificacion de columnas en tabla"
```

---

### Task 6: Renombrado a "Plan Seguro Integral" y Alerta de Suspensión (+3 meses)

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/views/AfiliadosSeguroView.tsx`
- Modify: `src/components/modals/DetalleCuotaModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Renombrar a "Plan Seguro Integral" en Navbar y encabezados**

En `Navbar.tsx`:
- Pestaña: `"Plan Seguro Integral"` (icono de protección/seguro).
- Título institucional: `"Padrón General - Plan Seguro Integral"`.

En `AfiliadosSeguroView.tsx`:
- Título principal: `"Padrón General de Afiliados · Plan Seguro Integral"`.

- [ ] **Step 2: Implementar alerta de Stand-by / Suspensión (+3 meses impagos)**

En `AfiliadosSeguroView.tsx`:
- Para afiliados con 3 o más cuotas vencidas consecutivas:
  - Mostrar badge y alerta: `⚠️ Plan Suspendido / Stand-by (+3 meses de mora)`.
  - Exhibir la última cuota pagada (ej. `Último pago: Febrero 2026` o fecha de recibo).
  - Filtro rápido para identificar de inmediato los afiliados en estado crítico de suspensión.

- [ ] **Step 3: Verificar compilación**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Commit de Task 6**

```bash
git add src/components/layout/Navbar.tsx src/components/views/AfiliadosSeguroView.tsx src/components/modals/DetalleCuotaModal.tsx src/App.tsx
git commit -m "feat(seguro): renombrar a Plan Seguro Integral y agregar alerta de standby para mora de +3 meses"
```

---

### Task 7: Circuito de Recibos de Pagos Físicos Oficiales

**Files:**
- Create/Modify: `src/components/modals/ReciboFisicoModal.tsx` (o enriquecer `DetalleCuotaModal.tsx`)
- Modify: `src/App.tsx`
- Modify: `src/index.css` (estilos específicos `@media print` para recibo físico de doble talón)

- [ ] **Step 1: Crear plantilla de recibo físico oficial con doble talón**

Diseñar el comprobante físico con:
- Talón 1: **Original Contribuyente**.
- Talón 2: **Duplicado Administración**.
- Datos del cementerio parque / Plan Seguro Integral, N° de recibo físico preimpreso/correlativo, fecha y hora, detalle de conceptos, total abonado en letras y números.
- Espacios formales para firma y sello de Tesorería y firma del pagador.

- [ ] **Step 2: Integrar el botón "Imprimir Recibo Físico" en los flujos de cobro**

Tanto al cobrar cuotas en el Plan Seguro Integral como al cobrar mantenimiento de parcelas o reactivaciones:
- Mostrar la vista previa del recibo físico.
- Botón principal de acción: `"Imprimir Recibo Físico"` que dispara `window.print()`.

- [ ] **Step 3: Verificar formato de impresión sin desbordes**

Asegurar con `@media print` que ambos talones quepan prolijamente en una sola página física.

- [ ] **Step 4: Commit de Task 7**

```bash
git add src/components/modals/ReciboFisicoModal.tsx src/components/modals/DetalleCuotaModal.tsx src/App.tsx src/index.css
git commit -m "feat(print): implementar formato de recibos fisicos oficiales con doble talon para impresion"
```

---

### Task 8: Verificación Integral End-to-End y Regresión

**Files:**
- Create: `scripts/test_reglas_and_features.cjs`

- [ ] **Step 1: Escribir script de validación integral**

Probar:
1. Reemplazo de Nomenclatura por Parcela verificado en el DOM.
2. Filtro de titular vivo/fallecido funcionando y filtrando filas.
3. Inhumaciones sin las 3 columnas y con campo de empresa fúnebre editable.
4. Parcela en stand-by bloqueada con alerta de +3 años y opciones de reactivar/liberar.
5. Plan Seguro Integral con alertas de +3 meses de mora.
6. Generación de recibo físico oficial imprimible.

- [ ] **Step 2: Ejecutar script de verificación y tests unitarios**

Run: `node scripts/test_reglas_and_features.cjs && npm test && npm run build`  
Expected: Todo en verde con código 0.

- [ ] **Step 3: Commit final de verificación**

```bash
git add scripts/test_reglas_and_features.cjs
git commit -m "test: validar integralmente reglas de titularidad, standby, seguro integral y recibos fisicos"
```

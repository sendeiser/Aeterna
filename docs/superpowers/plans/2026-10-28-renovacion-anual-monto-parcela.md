# Renovación Automática de Cuota Anual de Parcela con el Mismo Monto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Almacenar el monto abonado por mantenimiento anual en cada parcela y volver a cobrar automáticamente ese mismo monto en `saldo_mantenimiento` al iniciar el año calendario siguiente.

**Architecture:** Se agregan `ultimo_monto_anual` y `ultimo_anio_pagado` a `Parcela` (`src/types/database.ts`), se codifican/decodifican también en `notas` (`[CuotaAnual:MONTO|AnioPago:ANIO]`) para persistencia transparente en Supabase, se actualiza `aplicarCobroParcela` (`src/services/cobroService.ts`) para guardarlos al cobrar, y se agrega `sincronizarRenovacionAnualParcela` en `src/lib/reglasNegocio.ts` invocada desde `dataService.ts` para recargar automáticamente ese mismo monto cuando comienza un nuevo año.

**Tech Stack:** TypeScript, React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-28-renovacion-anual-monto-parcela-design.md`

## Global Constraints

- Al registrar el pago anual de una parcela (`aplicarCobroParcela`), debe guardarse `ultimo_monto_anual: montoCobrado` y `ultimo_anio_pagado`.
- Al iniciar el año calendario siguiente (`anioReferencia > ultimo_anio_pagado`), `sincronizarRenovacionAnualParcela` debe asignar a `saldo_mantenimiento` el mismo monto (`ultimo_monto_anual * (anioReferencia - ultimo_anio_pagado)`).
- Si se realiza un pago adelantado sobre una parcela que ya tenía cubierto el año actual (`ultimo_anio_pagado >= anioCobro` y `saldo_mantenimiento === 0`), `ultimo_anio_pagado` avanza en `+1`.

## Review Focus

- Una parcela que pagó un monto personalizado (ej. `$45.000`) en 2026 y quedó con `saldo_mantenimiento = 0` debe pasar automáticamente a tener `saldo_mantenimiento = 45000` al evaluarse en `2027-01-01`.
- Si pasan 2 años sin pagar (ej. en `2028-01-01`), debe acumular `2 * 45000 = 90000`, y a los 3 años (`2029-01-01`) debe acumular `3 * 45000 = 135000` y pasar a estado `'standby'`.
- Los metadatos `[CuotaAnual:45000|AnioPago:2026]` en `notas` deben poder leerse de vuelta cuando una parcela viene desde Supabase sin propiedades extendidas directas.

---

### Task 1: Implementar persistencia de `ultimo_monto_anual` en `aplicarCobroParcela` y renovación anual automática en `reglasNegocio.ts` y `dataService.ts`

**Files:**
- Modify: `src/types/database.ts:44-65`
- Modify: `src/lib/reglasNegocio.ts:1-85`
- Modify: `src/services/cobroService.ts:15-62`
- Modify: `src/services/dataService.ts:100-122`
- Modify: `src/services/dataService.ts:475-510`
- Modify: `src/services/dataService.ts:628-655`
- Modify: `src/App.tsx:306-310`
- Modify: `src/components/payment/EnviarCobroModal.tsx:115-125`
- Test: `src/tests/cobroService.test.ts`

**Interfaces:**
- Consumes: `Parcela` de `src/types/database.ts`
- Produces:
  - `sincronizarRenovacionAnualParcela(parcela: Parcela, fechaReferenciaISO?: string): Parcela` en `src/lib/reglasNegocio.ts`
  - `extraerMetaAnualDeNotas(notas?: string | null): { ultimoMontoAnual?: number; ultimoAnioPagado?: number }` en `src/lib/reglasNegocio.ts`
  - ` inyectarMetaAnualEnNotas(notas: string | null | undefined, monto: number, anio: number): string` en `src/lib/reglasNegocio.ts`

- [x] **Step 1: Write the failing tests in `src/tests/cobroService.test.ts`**

Agregar pruebas en `src/tests/cobroService.test.ts` que verifiquen:
1. Cuando una persona paga su cuota anual (ej. `$42.000` en `2026-05-10`), `aplicarCobroParcela` deja `saldo_mantenimiento = 0`, guarda `ultimo_monto_anual = 42000` y `ultimo_anio_pagado = 2026`.
2. Al iniciar el año siguiente (`2027-01-01`), `sincronizarRenovacionAnualParcela(updatedParcela, '2027-01-01')` vuelve a cobrar exactamente el mismo monto (`saldo_mantenimiento === 42000`).
3. Si pasa otro año más sin pagar (`2028-01-01`), acumula `84000` (`2 * 42000`), y cuando vuelve a pagar en 2027, el saldo vuelve a `0` y en 2028 vuelve a cobrarle el nuevo monto pagado.
4. Persistencia desde `notas` de Supabase: si una parcela tiene `notas: "Titular: Juan. [CuotaAnual:42000|AnioPago:2026]"` y `saldo_mantenimiento: 0`, al sincronizar en `2027-01-02` recupera `ultimo_monto_anual: 42000` y asigna `saldo_mantenimiento: 42000`.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/cobroService.test.ts`
Expected: FAIL (`sincronizarRenovacionAnualParcela` is not exported / `ultimo_monto_anual` is undefined)

- [x] **Step 3: Implement annual fee persistence and next-year auto-renewal**

1. En `src/types/database.ts`: añadir `ultimo_monto_anual?: number | null` y `ultimo_anio_pagado?: number | null` a `Parcela`.
2. En `src/lib/reglasNegocio.ts`: implementar `extraerMetaAnualDeNotas`, `inyectarMetaAnualEnNotas`, `sincronizarRenovacionAnualParcela` y actualizar `evaluarMoraParcela` para usar `ultimo_monto_anual || 36000`.
3. En `src/services/cobroService.ts`: actualizar `aplicarCobroParcela` para guardar `ultimo_monto_anual`, `ultimo_anio_pagado` y actualizar `notas` con `inyectarMetaAnualEnNotas`.
4. En `src/services/dataService.ts`, `src/App.tsx` y `src/components/payment/EnviarCobroModal.tsx`: aplicar `sincronizarRenovacionAnualParcela` al cargar/sincronizar parcelas y usar `parcela.ultimo_monto_anual || 36000` como monto base.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 5: Commit**

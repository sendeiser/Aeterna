# Diseño: Renovación Automática de Cuota Anual de Parcela con el Mismo Monto al Iniciar el Año

**Fecha:** 2026-10-28  
**Alcance:** Cambio acotado (`src/types/database.ts`, `src/lib/reglasNegocio.ts`, `src/services/cobroService.ts`, `src/services/dataService.ts`, `src/App.tsx`, `src/components/payment/EnviarCobroModal.tsx`)

## 1. Intención y Por Qué
Cuando un titular abona el mantenimiento anual de su parcela, el sistema debe recordar el monto abonado y el año cubierto. Al iniciar el año calendario siguiente (1 de enero), se le debe volver a cargar automáticamente ese mismo monto en `saldo_mantenimiento` para que figure pendiente de cobro en el módulo de Cobranzas y en los modales de pago.

## 2. Objetivos y No-Objetivos
- **Objetivos:**
  - Guardar en `Parcela` los campos `ultimo_monto_anual?: number | null` y `ultimo_anio_pagado?: number | null` al registrar un cobro anual en `aplicarCobroParcela`.
  - Persistir y recuperar `ultimo_monto_anual` y `ultimo_anio_pagado` tanto en LocalStorage como en el campo `notas` de Supabase (`[CuotaAnual:MONTO|AnioPago:ANIO]`) para no requerir migraciones destructivas.
  - Al evaluar la parcela al inicio del año (`actualizarCargoAnualParcela` / `evaluarMoraParcela` en `reglasNegocio.ts`), si `anioReferencia > ultimo_anio_pagado`, calcular los años pendientes (`aniosPendientes = anioReferencia - ultimo_anio_pagado`) y actualizar `saldo_mantenimiento` a `aniosPendientes * montoAnualBase` (usando `ultimo_monto_anual` de la parcela, o `36000` si nunca tuvo un monto registrado).
  - Usar `parcela.ultimo_monto_anual || 36000` como monto sugerido en `App.tsx` (`handleCobrarParcela`) y `EnviarCobroModal.tsx` cuando se cobra una parcela o un período adelantado.
- **No-Objetivos:**
  - No modificar el esquema de cuotas mensuales del Plan Seguro Integral (`AfiliadoSeguro`).

## 3. Enfoques Considerados
1. **Renovación Automática al Iniciar el Año + Persistencia Híbrida (Elegido):** Guarda el monto y año al cobrar y recalcula automáticamente el saldo al detectar que el año calendario actual es mayor al último año pagado.
2. **Apertura Manual de Año:** Requiere intervención manual del operador cada 1 de enero. Descartado por riesgo de omisión operativa.

## 4. Detalles de Implementación Acordados
- **Al cobrar (`aplicarCobroParcela`):**
  - Registra `ultimo_monto_anual: montoCobrado`.
  - Si cubre la deuda anual, registra `ultimo_anio_pagado: anioCobro` (año de la fecha de cobro, o `anioCobro + 1` si era un cobro adelantado sobre una parcela que ya tenía pagado el año actual).
  - Sincroniza la etiqueta `[CuotaAnual:${montoCobrado}|AnioPago:${ultimoAnioPagado}]` en `notas` para persistencia transparente en Supabase.
- **Al iniciar un nuevo año (`sincronizarRenovacionAnualParcela` en `reglasNegocio.ts`):**
  - Se ejecuta al cargar y sincronizar parcelas (`loadInitialData` y `fetchParcelasSupabase`) y dentro de `evaluarMoraParcela`.
  - Si la parcela tiene titular (`estado !== 'disponible' && estado !== 'baja'`) y `anioReferencia > ultimoAnioPagado`, el saldo exigible para el nuevo año pasa a ser ` Math.max(parcela.saldo_mantenimiento, (anioReferencia - ultimoAnioPagado) * montoAnual)` donde `montoAnual = parcela.ultimo_monto_anual || 36000`.

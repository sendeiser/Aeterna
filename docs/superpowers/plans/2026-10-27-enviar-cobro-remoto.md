# Enviar Cobro a Distancia (QR, Alias y Recibo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un nuevo botón y modal independiente ("Enviar cobro") en Parcelas y Plan Seguro para solicitar cobros a distancia enviando QR, Alias, CBU y redes/WhatsApp, y emitir/enviar el comprobante oficial una vez realizado el pago.

**Architecture:** Se extrae la lógica pura de cálculo contable y mutación de estado a `src/services/cobroService.ts` compartida entre el cobro de ventanilla existente y el nuevo modal. Se añade soporte de generación de mensajes de comprobante y exportación de imagen QR en `paymentShareHelper.ts`. Se construye el componente `EnviarCobroModal.tsx` con flujo en dos etapas (Solicitud con QR/Alias -> Registro -> Envío de Recibo Oficial) y se añaden los botones en `ParcelasView`, `AfiliadosSeguroView` y el estado central en `App.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, Vitest, `@supabase/supabase-js`, `qrcode.react`, HTML Canvas API.

**Spec:** [docs/superpowers/specs/2026-10-27-enviar-cobro-remoto-design.md](file:///d:/Aeterna/docs/superpowers/specs/2026-10-27-enviar-cobro-remoto-design.md)

## Global Constraints

- En parcelas, el concepto institucional debe ser "Mantenimiento Anual - Parcela X" (reemplazando "Cuatrimestral").
- Cuando una parcela tiene saldo $0, se reconoce como "Al Día - Mantenimiento Anual al día" y permite enviar el comprobante del pago registrado o cobrar el período siguiente por adelantado.
- El link web se omite automáticamente del mensaje si la aplicación corre en `localhost` o `127.0.0.1` para evitar enlaces rotos al contribuyente.
- El modal existente `QRPaymentModal` de ventanilla no debe sufrir regresiones visuales ni funcionales.
- Todos los tests existentes (38 tests) deben permanecer en verde.

## Review Focus

1. Parcela con saldo $0 (Al Día): el modal debe ofrecer enviar el comprobante del pago previo o cobrar período adelantado sin arrojar errores ni NaN.
2. Parcela con deuda en mora (> $0): el modal debe prellenar el importe exacto adeudado de mantenimiento anual.
3. Afiliado con múltiples cuotas adeudadas: el modal debe permitir seleccionar qué meses cobrar y calcular el total dinámicamente.
4. Generación y copia/descarga de imagen QR en navegadores que no soportan Web Share API de archivos.
5. Emisión del recibo tras el pago: el texto de comprobante debe formatear correctamente fecha, CAE/número de recibo, concepto y monto.

---

### Task 1: Formateo de Recibos y Supresión de Localhost en `paymentShareHelper`

**Files:**
- Modify: `src/lib/paymentShareHelper.ts`
- Test: `src/tests/paymentShareHelper.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ReciboShareParams {
    nroRecibo: string
    titularNombre: string
    identificador: string
    concepto: string
    monto: number
    metodo: 'efectivo' | 'transferencia_qr'
    comprobante?: string
    fecha?: string
    telefono?: string | null
    email?: string | null
    facebook?: string | null
    instagram?: string | null
  }
  export function formatReciboShareMessage(params: ReciboShareParams): string
  export function getWhatsAppReciboShareUrl(params: ReciboShareParams): string
  ```

- [ ] **Step 1: Write the failing tests in `src/tests/paymentShareHelper.test.ts`**

Agregar pruebas para:
1. `formatReciboShareMessage`: comprueba que incluya encabezado institucional, número de recibo oficial, titular, concepto, monto formateado, método y datos de atención en Chamical.
2. `formatPaymentShareMessage`: comprueba que si `paymentUrl` contiene `localhost` o `127.0.0.1`, se omite el bloque de enlace para no enviar links inaccesibles.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/paymentShareHelper.test.ts`
Expected: FAIL with `formatReciboShareMessage is not a function`.

- [ ] **Step 3: Implement `formatReciboShareMessage` and localhost filter in `src/lib/paymentShareHelper.ts`**

Implementar:
- Comprobación en `formatPaymentShareMessage`:
  ```typescript
  const isLocalLink = params.paymentUrl && /(localhost|127\.0\.0\.1)/i.test(params.paymentUrl)
  if (params.paymentUrl && !isLocalLink) { ... }
  ```
- Función `formatReciboShareMessage` y wrappers para WhatsApp (`getWhatsAppReciboShareUrl`), Instagram, Facebook y Email.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/paymentShareHelper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/paymentShareHelper.ts src/tests/paymentShareHelper.test.ts
git commit -m "feat: agregar generacion de mensajes oficiales de recibo y filtro localhost"
```

---

### Task 2: Servicio Puro de Reglas Contables `cobroService.ts`

**Files:**
- Create: `src/services/cobroService.ts`
- Test: `src/tests/cobroService.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface CobroParcelaInput {
    parcela: Parcela
    montoCobrado: number
    nroRecibo?: string
    comprobante?: string
    metodo?: 'efectivo' | 'transferencia_qr'
    concepto?: string
  }
  export function aplicarCobroParcela(input: CobroParcelaInput): {
    updatedParcela: Parcela
    nuevoPago: PagoRecibo
  }

  export interface CobroCuotasInput {
    afiliado: AfiliadoSeguro
    nrosCuotas: number[]
    valorUnitario?: number
    nroRecibo?: string
    comprobante?: string
    metodo?: 'efectivo' | 'transferencia_qr'
  }
  export function aplicarCobroCuotas(input: CobroCuotasInput): {
    updatedAfiliado: AfiliadoSeguro
    nuevoPago: PagoRecibo
    cuotasDetalleNuevas: CuotaSeguroDetalle[]
  }
  ```

- [ ] **Step 1: Write the failing tests in `src/tests/cobroService.test.ts`**

Tests para:
1. `aplicarCobroParcela`: reduce `saldo_mantenimiento`, si llega a 0 cambia estado de 'en_mora' / 'standby' a 'ocupada', genera `PagoRecibo` con concepto de mantenimiento anual.
2. `aplicarCobroCuotas`: actualiza `cuotasPagadas` sin duplicados, genera `cuotasDetalle` pagadas y genera `PagoRecibo` con el monto acumulado.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/cobroService.test.ts`
Expected: FAIL with module not found or functions not defined.

- [ ] **Step 3: Implement `src/services/cobroService.ts`**

Implementar funciones puras que calculan las transformaciones de estado y recibos oficiales sin efectos colaterales de React/I-O.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/cobroService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/cobroService.ts src/tests/cobroService.test.ts
git commit -m "feat: implementar servicio puro cobroService para calculos de cobro y recibos"
```

---

### Task 3: Componente `EnviarCobroModal.tsx`

**Files:**
- Create: `src/components/payment/EnviarCobroModal.tsx`

**Interfaces:**
- Consumes:
  - `formatPaymentShareMessage`, `formatReciboShareMessage`, `getWhatsAppShareUrl`, etc. from `src/lib/paymentShareHelper.ts`
  - `generateBCRAEMVCoQR`, `generateWebPaymentUrl` from `src/lib/qrHelper.ts`
  - `ConfiguracionCobro`, `Parcela`, `AfiliadoSeguro`, `PagoRecibo` from `src/types/database.ts`
- Produces:
  ```typescript
  export interface EnviarCobroModalProps {
    isOpen: boolean
    onClose: () => void
    tipo: 'parcela' | 'seguro'
    item: Parcela | AfiliadoSeguro | null
    config: ConfiguracionCobro
    ultimoPago?: PagoRecibo | null
    onConfirmarCobro: (datos: {
      monto: number
      nroRecibo: string
      comprobante: string
      nrosCuotas?: number[]
      metodo: 'transferencia_qr' | 'efectivo'
      concepto: string
    }) => Promise<void> | void
  }
  export const EnviarCobroModal: React.FC<EnviarCobroModalProps>
  ```

- [ ] **Step 1: Crear `EnviarCobroModal.tsx` con soporte de 2 pasos**

1. **Paso 1: Solicitud de Cobro:**
   - Detectar si la parcela tiene saldo 0 ("Al Día"). Si está al día, mostrar badge de "Al Día" y opción de conmutar a "Cobro período anticipado" o "Ver/Enviar Comprobante del último pago".
   - Si es seguro, selector de cuotas (por defecto los meses vencidos o el siguiente mes libre).
   - Visualización del QR institucional + CBU/Alias.
   - Botón "Copiar Imagen del QR" / "Descargar Imagen QR" (renderizando canvas a partir de SVG).
   - Botonera omnicanal: WhatsApp, Instagram Direct, Facebook Messenger, Gmail y "Copiar Texto Completo".
2. **Paso 2: Registrar Pago:**
   - Inputs de monto, número de comprobante y número de recibo pregenerado.
   - Botón "Confirmar Pago Recibido".
3. **Paso 3: Post-Cobro (Envío de Comprobante Oficial):**
   - Muestra confirmación de pago acreditado.
   - Botonera para enviar el **Comprobante Oficial / Recibo** por WhatsApp, Instagram, Facebook o Gmail.

- [ ] **Step 2: Verificar renderizado y tipos con `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: 0 errores de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/components/payment/EnviarCobroModal.tsx
git commit -m "feat: crear componente EnviarCobroModal con envio de QR y comprobante oficial"
```

---

### Task 4: Botón "Enviar cobro" en `ParcelasView` y `AfiliadosSeguroView`

**Files:**
- Modify: `src/components/views/ParcelasView.tsx`
- Modify: `src/components/views/AfiliadosSeguroView.tsx`

- [ ] **Step 1: Agregar prop y botones en `ParcelasView.tsx`**

1. Agregar prop `onEnviarCobro?: (parcela: Parcela) => void` en `ParcelasViewProps`.
2. En la tabla de escritorio (líneas ~1240) y en las tarjetas móviles (líneas ~1680), agregar el botón "Enviar cobro" con icono `send_to_mobile` o `share` estilizado en azul/esmeralda institucional junto al botón existente "Cobrar".

- [ ] **Step 2: Agregar prop y botones en `AfiliadosSeguroView.tsx`**

1. Agregar prop `onEnviarCobro?: (afiliado: AfiliadoSeguro) => void` en `AfiliadosSeguroViewProps`.
2. En la fila de acciones de escritorio (líneas ~1080) y tarjetas móviles (líneas ~1510), agregar el botón "Enviar cobro" con icono `send_to_mobile` junto a "Cobrar Cuota".

- [ ] **Step 3: Verificar tipos con `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/ParcelasView.tsx src/components/views/AfiliadosSeguroView.tsx
git commit -m "feat: agregar botones de Enviar cobro en vistas de Parcelas y Afiliados"
```

---

### Task 5: Integración en `App.tsx` y Unificación Contable con `cobroService`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Integrar estado de `EnviarCobroModal` y unificar lógica contable**

1. Refactorizar `handleCobrarParcela` y `handleCobrarAfiliado` en `App.tsx` para usar `aplicarCobroParcela` y `aplicarCobroCuotas` de `cobroService.ts`.
2. Actualizar el concepto por defecto de mantenimiento a: `"Mantenimiento Anual - Parcela ${parcela.nomenclatura}"`.
3. Crear estado y handler `handleOpenEnviarCobroParcela` y `handleOpenEnviarCobroAfiliado`.
4. Montar `<EnviarCobroModal>` conectado a la sincronización Supabase y Storage.

- [ ] **Step 2: Ejecutar tests automáticos completos**

Run: `npm test`
Expected: Todos los tests pasando (12 test suites, > 40 tests).

- [ ] **Step 3: Validar que la compilación de producción y de dev funcione**

Run: `npm run build`
Expected: Build exitoso sin errores de bundling.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrar EnviarCobroModal y unificar cobro contable en App"
```

---

### Task 6: Verificación Integral en Navegador (Mobile y Desktop)

**Files:**
- Test end-to-end interactivo o script de verificación.

- [ ] **Step 1: Ejecutar script de verificación de flujo de cobro**

Verificar mediante test o script:
- Abrir modal de envío para parcela con saldo > 0 y saldo 0.
- Simular confirmación de pago y verificar que se emita recibo en historial de `pagos`.
- Abrir modal de envío para afiliado del plan seguro con cuotas pendientes.
- Validar mensaje generado con Alias, CBU y comprobante.

- [ ] **Step 2: Commit final de verificación**

```bash
git commit --allow-empty -m "chore: verificacion de cobro omnicanal y comprobantes completada"
```

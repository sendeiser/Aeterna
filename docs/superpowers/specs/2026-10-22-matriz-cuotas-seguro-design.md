# Especificación de Diseño: Matriz Anual de Cuotas y Padrón del Seguro de Sepelio

**Fecha:** 22 de Octubre de 2026  
**Autor:** Antigravity  
**Estado:** Propuesto (Pendiente de Aprobación)

---

## 1. Contexto y Objetivos
Convertir la matriz anual de 12 cuotas (Ene-Dic) del Seguro de Sepelio en una herramienta operativa 100% funcional y conectada en tiempo real con Supabase y LocalStorage:
1. **Cobro individual y múltiple:** Permitir cobrar una cuota específica o acumular todas las cuotas vencidas de un afiliado en un único recibo con QR o efectivo.
2. **Persistencia bidireccional:** Reflejar cada pago en la tabla `cuotas_seguro` de Supabase (`estado_cuota = 'pagada'`, `nro_recibo`, `fecha_pago`, `metodo_pago`) y en la tabla `pagos_recibos`.
3. **Generación automática de cuotas:** Al registrar un nuevo afiliado, generar automáticamente sus 12 cuotas anuales para el ejercicio fiscal 2026.
4. **Trazabilidad y consulta de cuotas pagadas:** Al presionar una cuota pagada (verde con ✓), desplegar el comprobante con los detalles del cobro (N° de recibo, fecha, método, monto), opción de impresión y posibilidad de revertir/anular el cobro con confirmación.
5. **Recálculo dinámico del estado:** Actualización reactiva instantánea del estado del afiliado (`al día` vs `en mora`) en la tabla, las tarjetas móviles, el contador superior y el Dashboard.

---

## 2. Arquitectura de Datos y Métodos

### 2.1. Métodos en `src/services/dataService.ts`
- `fetchAfiliadosSupabase()`: Recupera afiliados junto con sus registros en `cuotas_seguro` (con detalles de fecha_pago, nro_recibo y metodo_pago).
- `registrarPagoCuotaSupabase(afiliadoId, anio, mes, pagoData)`:
  - Actualiza `cuotas_seguro` estableciendo `estado_cuota = 'pagada'`, `fecha_pago`, `nro_recibo`, `metodo_pago`.
  - Si el afiliado tiene todas las cuotas vencidas al día, actualiza su estado a `activo` en `afiliados_seguro`.
- `revertirPagoCuotaSupabase(afiliadoId, anio, mes)`:
  - Cambia `estado_cuota = 'pendiente'`, limpia `fecha_pago` y `nro_recibo`.
- `crearCuotasAnualesSupabase(afiliadoId, anio, monto)`:
  - Inserta las 12 cuotas del año para el afiliado si aún no existen.
- `saveAfiliadosToStorage(afiliados)`:
  - Garantiza persistencia offline inmediata en `localStorage`.

### 2.2. Tipos de Datos (`src/types/database.ts`)
Afiliado enriquecido con el historial de cuotas detallado:
```typescript
export interface CuotaDetalle {
  mes: number
  anio: number
  estado: 'pagada' | 'pendiente' | 'vencida'
  monto: number
  fecha_pago?: string | null
  nro_recibo?: string | null
  metodo_pago?: string | null
}
```

---

## 3. Experiencia de Usuario (UI/UX)

### 3.1. Celdas de la Matriz (Desktop & Mobile)
- **Verde (Pagada):**
  - Muestra mes, número y tilde `✓`.
  - Cursor pointer con tooltip: *"Pagada - Ver recibo"*.
  - Al hacer clic: Abre el modal `DetalleCuotaModal` con los datos del recibo, botón para imprimir comprobante y botón *"Anular Cobro"* (con confirmación administrativa).
- **Rojo (Vencida - mes actual o anterior sin abonar):**
  - Efecto pulsante suave con borde rojo.
  - Al hacer clic: Abre el modal de pago QR / Efectivo para ese mes.
- **Gris (A vencer - meses futuros):**
  - Botón discreto que indica *"Adelantar pago de mes X"*.

### 3.2. Acciones Rápidas en Padrón
- **Botón "Cobrar Todo lo Vencido":**
  - Si un afiliado tiene 2 o más cuotas en mora, aparece el botón *"Cobrar Mora Total (X cuotas: $Y)"*, consolidando las cuotas en un solo cobro y recibo.
- **Impresión de Planilla de Cobranza:**
  - Optimización para impresión física con la grilla de cuotas para el cobrador de calle.

---

## 4. Plan de Pruebas y Verificación
1. **Prueba unitaria/script de integración:** Comprobar inserción, cobro y reversión de cuotas en `cuotas_seguro` de Supabase.
2. **Prueba en navegador:**
   - Registrar cobro de cuota 3 (Marzo) de un afiliado en mora.
   - Verificar que pasa a "Al Día" y se incrementa la recaudación del día.
   - Abrir el detalle de la cuota pagada y verificar los datos del recibo.
   - Probar la reversión de cobro y comprobar que vuelve a estado de mora.
   - Validar que al recargar la página la información persiste intacta desde Supabase.

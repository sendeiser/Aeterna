# Especificación de Diseño: Reglas de Titularidad, Plan Seguro Integral y Optimización Operativa

**Fecha:** 23 de Octubre de 2026  
**Autor:** Antigravity  
**Estado:** Propuesto (Pendiente de Aprobación)

---

## 1. Objetivos y Alcance

Este documento especifica los cambios funcionales, visuales y operativos para la plataforma **Aeterna**:
1. **Reemplazo Léxico Completo:** Cambiar en toda la interfaz de usuario la palabra *"Nomenclatura"* por *"Parcela"*.
2. **Filtro de Estado Vital del Titular:** Incorporar en la gestión de parcelas y catastro un filtro para identificar si el titular está *"Vivo"* o *"Fallecido"*.
3. **Ingreso Abierto de Empresas Fúnebres:** Permitir que el operador ingrese libremente por teclado el nombre de cualquier empresa de sepelios en los registros de inhumaciones (reemplazando el selector estático).
4. **Simplificación de la Tabla de Inhumaciones:** Retirar las columnas *"Empresa Fúnebre"*, *"Indicador Sanitario"* y *"Oficial de Registro"* para una grilla administrativa más ágil y despejada.
5. **Renombrado Oficial:** Renombrar el módulo, planes y reportes de seguro de sepelio a **"Plan Seguro Integral"**.
6. **Reglas de Morosidad Crítica y Stand-by Automático:**
   - **Parcelas (+3 años sin pago):** Pérdida automática de titularidad; la parcela entra en estado `standby` (bloqueada administrativamente con alerta visual). Muestra la fecha del último pago registrado. El administrador cuenta con acciones para **Reactivar** (al regularizar pago) o **Liberar** la parcela (revoque definitivo a disponible).
   - **Plan Seguro Integral (+3 meses de mora):** Alerta de suspensión/stand-by si adeuda 3 o más meses consecutivos, exhibiendo la fecha de la última cuota pagada.
7. **Emisión de Recibos Físicos:** Orientar el flujo de cobranza hacia la generación e impresión de comprobantes físicos oficiales con doble talón (Administración y Contribuyente) listos para firma manual.

---

## 2. Decisiones de Arquitectura y Modelo de Datos

### 2.1. Estados y Modelos (`src/types/database.ts`)
- **Estado de Parcela (`EstadoParcela`):**
  Se incorpora el estado `'standby'` a:
  ```typescript
  export type EstadoParcela =
    | 'disponible'
    | 'ocupada'
    | 'en_mora'
    | 'reservada'
    | 'mantenimiento'
    | 'standby' // Bloqueada por morosidad crítica (+3 años)
  ```
- **Campos en `Parcela`:**
  - `fecha_ultimo_pago?: string | null`: Almacena la fecha ISO o legible del último abono de mantenimiento registrado.
  - `fecha_adquisicion?: string | null`: Fecha en que fue adquirida la parcela.
  - `titular_anterior?: Titular | null`: Respaldo histórico del titular si la parcela es liberada.
- **Campos en `Titular`:**
  - `estado_vital?: 'vivo' | 'fallecido'`: Permite clasificar de forma explícita la condición vital del titular independientemente de su estado registral.
- **Campos en `AfiliadoSeguro`:**
  - `meses_mora: number`: Conteo de cuotas consecutivas vencidas impagas.
  - `fecha_ultimo_pago?: string | null`: Fecha o mes del último recibo emitido.

### 2.2. Lógica de Negocio y Métodos (`src/services/dataService.ts`)
- **Detección Automática de Stand-by en Parcelas:**
  Una parcela ocupada con titular asignado pasa automáticamente a `standby` si han transcurrido 3 años (36 meses) sin pago de mantenimiento (o cuando el saldo acumulado en mora supera el equivalente a 3 años de canon sin registrar pagos recientes).
- **Acciones Administrativas de Stand-by:**
  - `reactivarParcela(parcelaId, pagoData)`: Restaura la parcela a estado `ocupada` o `al_dia` tras registrar el pago físico de regularización.
  - `liberarParcela(parcelaId, motivo)`: Archiva el titular en `titular_anterior`, limpia el titular activo y cambia el estado a `disponible` para reasignación catastral.
- **Detección Automática de Suspensión en Plan Seguro Integral:**
  Si un afiliado acumula 3 o más cuotas consecutivas impagas en el ejercicio corriente, su estado se actualiza visualmente a `suspendido` con alerta de *"Stand-by por Mora (+3 meses)"*.

---

## 3. Experiencia de Usuario (UI/UX)

### 3.1. Catastro y Parcelas (`ParcelasView.tsx`)
- **Terminología:** Se reemplaza toda etiqueta "Nomenclatura" por "Parcela" (ej. encabezado de tabla, previsualización en formularios, tarjeta de detalle, placeholder de búsqueda).
- **Filtro de Estado Vital:** Selector en la barra de filtros:
  - `Titular: Todos` | `Titular Vivo` | `Titular Fallecido`.
- **Insignia, Alerta de Stand-by y Última Cuota Pagada:**
  - Para parcelas en `standby` (mora > 3 años): Etiqueta distintiva con fondo ámbar/rojo con icono de advertencia: `⚠️ Titularidad en Stand-by (+3 años sin pago)`.
  - **Exhibición destacada de la última cuota pagada:** Mostrar claramente tanto en la fila de la grilla como en la tarjeta y modal de detalle: `Última cuota pagada: [Período / Fecha]` (ej. *"Cuota 01/2023 - Abonada el 15/01/2023"* o *"Sin pagos de cuotas registrados"* si nunca abonó desde la compra).
  - Bloqueo de acciones estándar: Se habilitan los botones administrativos *"Reactivar Parcela"* y *"Liberar Parcela"*.

### 3.2. Inhumaciones (`InhumacionesView.tsx` y formularios)
- **Tabla limpia:** Se eliminan las columnas *"Empresa Fúnebre"*, *"Indicador Sanitario"* y *"Oficial de Registro"*.
- **Columnas definitivas:**
  1. Fecha de Inhumación (con hora).
  2. Difunto / DNI / N° de Acta.
  3. Parcela y Nivel (ej. `A-25-96 [Nivel 1]`).
  4. Acciones Registrales (Botón *"Imprimir Acta Oficial"* y menú de acciones).
- **Empresa Fúnebre Dinámica:**
  El formulario de registro ahora dispone de un campo de texto con autocompletado (`<input list="funerarias-sugeridas" ... />`), permitiendo escribir cualquier razón social o funeraria interviniente sin restricciones.

### 3.3. Plan Seguro Integral (`AfiliadosSeguroView.tsx`)
- Se renombra toda la sección y documentos a **"Plan Seguro Integral"**.
- Las filas de afiliados con 3 o más meses impagos muestran el aviso `⚠️ Plan en Stand-by (+3 meses)` junto a la última cuota pagada.

### 3.4. Emisión de Recibos Físicos
- Al procesar el cobro de cuotas o mantenimiento, se presenta el comprobante oficial diseñado para impresión física:
  - Formato normalizado A4 / Media cuartilla con doble talón (Original para el titular / Duplicado para Administración).
  - Incluye número de recibo físico correlativo, fecha, concepto detallado, espacio para firma y sello de Tesorería.
  - El botón principal ejecuta directamente la orden de impresión física del navegador (`window.print()`).

---

## 4. Plan de Verificación y Pruebas
1. **Pruebas Unitarias (`vitest`):**
   - Actualización de tests existentes en `search.test.ts` y `formatters.test.ts` para verificar la búsqueda por "Parcela" y filtros de titular vivo/fallecido.
   - Test de cálculo de morosidad: evaluación de regla de 3 años para parcelas y 3 meses para seguro.
2. **Pruebas de Integración y End-to-End:**
   - Validar que una parcela con mora crítica muestre la alerta de stand-by y la fecha del último pago.
   - Probar los botones de "Reactivar" y "Liberar" en una parcela en stand-by.
   - Comprobar que en Inhumaciones las 3 columnas ya no aparezcan y el campo funeraria admita texto libre.
   - Verificar la impresión de recibos físicos.

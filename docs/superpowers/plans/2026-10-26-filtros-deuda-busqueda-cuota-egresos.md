# Plan de Implementación: Filtros Bajas, Cancelación de Deuda, Búsqueda de Parcela, Cuota Masiva y Gestión de Egresos

> **Para agentes de desarrollo:** SUB-HABILIDAD REQUERIDA: Usar `superpowers:subagent-driven-development` o `superpowers:executing-plans` para implementar este plan tarea por tarea. Cada paso utiliza la sintaxis de casilla de verificación (`- [ ]`) para su seguimiento.

---

## Resumen Ejecutivo

Este plan implementa de forma sincronizada en **ambas plataformas** (Web y Escritorio Nativo Win32 Aeterna XP) las 5 funcionalidades requeridas:
1. **Filtro de Parcelas Dadas de Baja:** Distinguir entre parcelas en baja/standby **libres** (sin difuntos) y parcelas en baja **con inhumados**.
2. **Cancelación de Deuda y Recibo Vinculado a Parcela:** Registro de cancelación con monto personalizable y generación de número de recibo que incluye la nomenclatura de la parcela y correlativo (`REC-A-01-01-...`).
3. **Buscador de Parcela al Cargar Inhumado:** Selector con búsqueda interactiva en tiempo real por nomenclatura, sector o titular en el formulario de sepelios.
4. **Actualización Masiva de Cuota del Seguro:** Cambio simultáneo de cuota mensual para todos los afiliados activos en Supabase y localmente.
5. **Carga de Ingresos y Egresos Mensuales:** Módulo de caja con registro de egresos (gastos operativos, mantenimiento, combustible) y balance neto mensual (`Ingresos - Egresos`).

---

## Archivos Involucrados

| Archivo | Plataforma | Responsabilidad |
|---|---|---|
| `src/types/database.ts` | Web | Tipos para MovimientoCaja (ingreso/egreso), filtros de baja y recibos vinculados. |
| `src/services/dataService.ts` | Web | Métodos Supabase y LocalStorage para egresos, cuota masiva y cancelación de deuda. |
| `src/components/views/ParcelasView.tsx` | Web | Chips de filtro "Baja Libre" y "Baja con Inhumados", modal de cancelación de deuda. |
| `src/components/forms/InhumacionForm.tsx` | Web | Buscador predictivo de parcela destino al registrar o editar una inhumación. |
| `src/components/views/AfiliadosSeguroView.tsx` | Web | Botón y modal de actualización masiva de cuota mensual para afiliados. |
| `src/components/views/CajaView.tsx` / `App.tsx` | Web | Vista y modal para registrar Egresos e Ingresos con tarjetas de Balance Neto mensual. |
| `aeterna-xp/src/models/uDataModels.pas` | Win32 | Definición de tipo `TMovimientoCaja` (`tcIngreso`, `tcEgreso`) y estructuras de datos. |
| `aeterna-xp/src/services/uAfiliadosService.pas` | Win32 | Método HTTP Supabase para actualización masiva de cuotas (`ActualizarCuotaMasiva`). |
| `aeterna-xp/src/services/uCajaService.pas` | Win32 | Registro y consulta de egresos e ingresos en Supabase / local. |
| `aeterna-xp/src/app/uWin32Dialogs.pas` | Win32 | Diálogos de Egreso de Caja, Selección/Búsqueda de Parcela y Cuota Masiva. |
| `aeterna-xp/src/app/uWin32App.pas` | Win32 | UI nativa: combos de filtro de baja, botones de cuota masiva, egresos y balance. |

---

## Tareas de Implementación

### Tarea 1: Tipos y Servicios Base para Egresos y Cuota Masiva (Web)

- [ ] **Paso 1.1: Extender tipos en `src/types/database.ts`**
  - Agregar interfaz `MovimientoCaja`:
    ```typescript
    export interface MovimientoCaja {
      id: string
      tipo: 'ingreso' | 'egreso'
      concepto: string
      categoria: string // 'mantenimiento' | 'cuota_seguro' | 'combustible' | 'servicios' | 'sueldos' | 'materiales' | 'otros'
      monto: number
      metodo_pago: 'efectivo' | 'transferencia' | 'qr'
      numero_recibo: string
      parcela_nomenclatura?: string
      titular_nombre?: string
      fecha: string
      operador?: string
    }
    ```
- [ ] **Paso 1.2: Métodos en `src/services/dataService.ts`**
  - Implementar `actualizarCuotaMasivaSupabase(nuevoMonto: number, soloActivos: boolean): Promise<{ success: boolean; count: number }>`
  - Implementar `registrarEgresoCaja(egreso: MovimientoCaja): Promise<boolean>`
  - Implementar `fetchMovimientosCaja(): Promise<MovimientoCaja[]>`
- [ ] **Paso 1.3: Tests unitarios en `src/tests/`**
  - Crear `src/tests/egresos_y_cuota_masiva.test.ts` verificando:
    - Validación de monto positivo en egreso.
    - Cálculo de balance mensual: `ingresos - egresos`.
    - Actualización masiva de cuotas en afiliados.
  - Ejecutar `npm test` para validar.
- [ ] **Paso 1.4: Commit de Tarea 1**

---

### Tarea 2: Filtros de Bajas Libres vs. Bajas con Inhumados (Web y Win32)

- [ ] **Paso 2.1: Implementar filtros en `src/components/views/ParcelasView.tsx`**
  - Calcular difuntos por parcela para distinguir `baja_libre` de `baja_con_inhumados`.
  - Agregar botones en la barra de filtros rápidos:
    - `Baja: Libre (Sin difuntos)`
    - `Baja: Con Inhumados`
  - Agregar badges descriptivos en las tarjetas y filas de la tabla.
- [ ] **Paso 2.2: Implementar filtros en `aeterna-xp/src/app/uWin32App.pas`**
  - En `hCmbEstadoParc`, agregar las opciones:
    - `Baja: Libre (Sin Inhumados)`
    - `Baja: Con Inhumados`
  - En `FiltrarYMostrarParcelas`, contar inhumaciones vinculadas a cada parcela en `DataInhumaciones`.
  - Filtrar según la opción seleccionada.
- [ ] **Paso 2.3: Verificación y Compilación**
  - Validar TypeScript con `npx tsc --noEmit`.
  - Compilar `AeternaXP.pas` con Free Pascal.
- [ ] **Paso 2.4: Commit de Tarea 2**

---

### Tarea 3: Cancelación de Deuda con Monto y Recibo Vinculado a Parcela

- [ ] **Paso 3.1: Cancelación en Web (`ParcelasView.tsx` / `QRPaymentModal.tsx`)**
  - Permitir ingresar monto a cancelar (precompletado con `saldo_mantenimiento`).
  - Generar número de recibo normalizado:
    `const nroRecibo = 'REC-' + parcela.nomenclatura + '-' + format(new Date(), 'yyyyMMdd_HHmm')`
  - Descontar saldo y actualizar estado si la deuda queda en $0.
- [ ] **Paso 3.2: Cancelación en Win32 (`uWin32App.pas`)**
  - En `AccionCobrarMantenimientoParcela`:
    - Precompletar `Monto` con `DataParcelas[Idx].SaldoMantenimiento`.
    - Formatear `Recibo := 'REC-' + Nomenclatura + '-' + FormatDateTime('yyyyymmdd_hhnnss', Now);`
    - Al asentar el pago, restar `Monto` del `SaldoMantenimiento` de la parcela y actualizar en Supabase.
- [ ] **Paso 3.3: Verificación de Recibos y PDF**
  - Verificar generación de recibo oficial con el nuevo identificador.
- [ ] **Paso 3.4: Commit de Tarea 3**

---

### Tarea 4: Buscador de Parcela al Cargar Inhumado (Web y Win32)

- [ ] **Paso 4.1: Componente selector predictivo en `src/components/forms/InhumacionForm.tsx`**
  - Agregar campo de búsqueda reactiva por texto (nomenclatura, sector, titular o DNI).
  - Menú desplegable filtrado con capacidad de niveles y estado de la parcela.
  - Asignación automática de `parcela_id` y visualización clara de la parcela elegida.
- [ ] **Paso 4.2: Selector en diálogo Win32 (`uWin32Dialogs.pas`)**
  - Mejorar el diálogo de nueva inhumación: incluir un ComboBox desplegable con autocompletado o lista filtrable de parcelas cargadas en memoria.
- [ ] **Paso 4.3: Verificación de Formulario**
  - Comprobar registro de inhumación asignando parcela mediante búsqueda.
- [ ] **Paso 4.4: Commit de Tarea 4**

---

### Tarea 5: Actualización Masiva de Cuota de Seguro (Web y Win32)

- [ ] **Paso 5.1: Modal y acción masiva en `src/components/views/AfiliadosSeguroView.tsx`**
  - Botón "Cambiar Cuota a Todos" en la barra de acciones de Afiliados.
  - Diálogo de confirmación con input numérico del nuevo valor de la cuota.
  - Llamada a `actualizarCuotaMasivaSupabase`, actualización local del estado y notificación de éxito.
- [ ] **Paso 5.2: Acción masiva en Win32 (`uWin32App.pas` y `uAfiliadosService.pas`)**
  - Botón `hBtnCuotaMasiva` en el Módulo 3 de Afiliados.
  - Diálogo para ingresar el nuevo monto.
  - Método `TAfiliadosService.ActualizarCuotaMasiva(NuevoMonto)` en `uAfiliadosService.pas` que actualiza los registros vía API Supabase.
- [ ] **Paso 5.3: Tests y Verificación**
  - Verificar cambio masivo de cuota en tests y ejecución.
- [ ] **Paso 5.4: Commit de Tarea 5**

---

### Tarea 6: Gestión de Ingresos y Egresos Mensuales (Tesorería / Caja)

- [ ] **Paso 6.1: Módulo de Caja en Web (`App.tsx` / `CajaView.tsx`)**
  - Integrar vista dedicada de Caja / Tesorería en Web con:
    - Listado de movimientos (Ingresos en verde, Egresos en rojo).
    - Botón `+ Registrar Egreso` con categorías (Mantenimiento, Combustible, Servicios, Sueldos, etc.).
    - Tarjetas de resumen del mes actual: `Total Ingresos`, `Total Egresos`, `Balance Neto`.
- [ ] **Paso 6.2: Egresos en Win32 (`uWin32App.pas`, `uWin32Dialogs.pas`, `uCajaService.pas`)**
  - Diálogo `ShowDlgEgresoCaja` para cargar gastos operativos.
  - Botón `- Registrar Egreso` (`IDC_BTN_NUEVO_EGRESO`) en el Módulo 4 de Caja.
  - Actualización del banner de Caja para mostrar: `Ingresos Hoy / Egresos Hoy / Balance Neto`.
  - Diferenciación visual de Egresos en `hLvCaja` (montos negativos o indicadores de egreso).
- [ ] **Paso 6.3: Compilación, Empaquetado de Instalador y Tests Finales**
  - Recompilar `AeternaXP.exe` con Free Pascal.
  - Reconstruir instalador `setup_aeterna_xp.exe` con Inno Setup.
  - Copiar instaladores a `setup.exe` e `instalador.exe`.
  - Correr `npm test` y `npx tsc --noEmit`.
- [ ] **Paso 6.4: Commit final y Push a `origin main`**

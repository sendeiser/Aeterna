# Diseño: Columna y Filtro de Domicilio en Parcelas + Enviar Cobro en Stand-by

- **Fecha:** 27 de Octubre de 2026
- **Estado:** Propuesto para aprobación
- **Módulos afectados:** `src/components/views/ParcelasView.tsx`, `src/components/forms/ParcelaForm.tsx`, `src/services/dataService.ts`, `src/services/cobroService.ts`

---

## 1. Contexto y Objetivos

### 1.1 Contexto
En la gestión municipal de parcelas del Cementerio Parque San Nicolás (Chamical), el operador necesita:
1. Conocer de forma directa el **domicilio** (calle, número y/o barrio) del titular de cada parcela directamente en la grilla principal para labores de cobranza a domicilio, correspondencia y notificaciones oficiales.
2. Filtrar o buscar parcelas específicamente por **domicilio / barrio** (por ejemplo, buscar todas las parcelas de "B° Loma Blanca", "Av. Perón" o "Castro Barros") sin que se mezcle con nombres o nomenclaturas.
3. Enviar el cobro a distancia (QR, Alias CBU y recibo) a las parcelas que se encuentran en estado `standby` (mora superior a 3 años / caducidad administrativa). Actualmente las parcelas en stand-by solo ofrecían los botones de `Reactivar` y `Liberar`, impidiendo enviarles el link de pago por WhatsApp o redes.

### 1.2 Metas (Goals)
- Agregar la columna visible **"Domicilio"** en la tabla desktop de [ParcelasView.tsx](file:///d:/Aeterna/src/components/views/ParcelasView.tsx) con ordenamiento alfabético ascendente y descendente.
- Agregar visualización de domicilio en la tarjeta móvil de la parcela.
- Agregar un input de filtro específico **"Filtrar por Domicilio / Barrio"** en la barra de herramientas de parcelas con botón de limpieza rápida (`✕`).
- Permitir la edición del domicilio del titular tanto en la **edición rápida en línea** de la fila como en el modal de edición de parcela ([ParcelaForm.tsx](file:///d:/Aeterna/src/components/forms/ParcelaForm.tsx)).
- Habilitar el botón **"Enviar cobro"** (`send_to_mobile`) en las parcelas con estado `standby` (desktop y móvil), abriendo `EnviarCobroModal` con el monto de la deuda acumulada.
- Al saldar la deuda mediante cobro remoto, restablecer el estado de la parcela a `ocupada` (al día), tal como ya está soportado en `cobroService.ts`.

### 1.3 No-Metas (Non-Goals)
- No se modificará la estructura de base de datos en Supabase: el campo `direccion` en la tabla `titulares` ya existe y está disponible.
- No se alteran los botones de regularización administrativa manual (`Reactivar` y `Liberar`), los cuales se conservan intactos.

---

## 2. Enfoques considerados

- **Enfoque A (Seleccionado por el usuario):**
  - Columna visible dedicada `Domicilio` en la tabla desktop.
  - Línea con ícono `location_on` en la tarjeta móvil de parcelas.
  - Input dedicado para filtrar por domicilio/barrio con limpieza rápida.
  - Edición de domicilio en la fila rápida y en `ParcelaForm`.
  - Botón `Enviar cobro` en parcelas `standby` (desktop y móvil).
- **Enfoque B (Descartado):**
  - Solo agregar la columna visual y confiar en el buscador global sin input específico de domicilio. Descartado porque no cumplía el requerimiento explícito del usuario de poder filtrar de forma específica por domicilio.

---

## 3. Especificación Técnica

### 3.1 Columna Domicilio en Tabla Desktop (`ParcelasView.tsx`)
- Ubicación: Entre la columna **"Titular Actual"** y la columna **"Parcela"**.
- Contenido:
  ```tsx
  <td className="py-2.5 px-3">
    <div className="flex items-center gap-1 text-xs text-on-surface">
      <span className="material-symbols-outlined text-[14px] text-outline shrink-0">location_on</span>
      <span className="truncate max-w-[180px] font-medium" title={p.titular?.direccion || 'Sin domicilio registrado'}>
        {p.titular?.direccion || <span className="text-outline italic">Sin domicilio</span>}
      </span>
    </div>
    {p.titular?.barrio && (
      <span className="text-[10px] text-outline block pl-4">
        {p.titular.barrio}
      </span>
    )}
  </td>
  ```
- Soporte para ordenamiento: Opción de ordenar por `domicilio-asc` y `domicilio-desc` al hacer clic en el encabezado de la columna.

### 3.2 Visualización en Móvil (`ParcelasView.tsx`)
- En la tarjeta móvil de la parcela, debajo de los canales de contacto (WhatsApp, email, redes):
  ```tsx
  {p.titular?.direccion && (
    <div className="flex items-center gap-1 text-[11px] text-on-surface-variant mt-1">
      <span className="material-symbols-outlined text-[13px] text-outline">location_on</span>
      <span className="truncate">{p.titular.direccion}</span>
    </div>
  )}
  ```

### 3.3 Filtro por Domicilio / Barrio
- Estado nuevo: `filterDomicilio: string`.
- Input en la barra de herramientas de filtros secundarios (tanto desktop como móvil desplegable):
  ```tsx
  <div className="relative flex items-center">
    <span className="material-symbols-outlined absolute left-2 text-[15px] text-outline">home</span>
    <input
      type="text"
      placeholder="Filtrar por domicilio / barrio..."
      value={filterDomicilio}
      onChange={(e) => setFilterDomicilio(e.target.value)}
      className="pl-7 pr-6 h-8 text-xs bg-white border border-outline-variant rounded-lg focus:border-secondary focus:outline-none"
    />
    {filterDomicilio && (
      <button onClick={() => setFilterDomicilio('')} className="absolute right-1.5 p-0.5 text-outline hover:text-on-surface">
        <span className="material-symbols-outlined text-[13px]">close</span>
      </button>
    )}
  </div>
  ```
- Criterio de filtrado en `filteredParcelas`:
  ```ts
  if (filterDomicilio.trim()) {
    const qDom = filterDomicilio.toLowerCase()
    const dir = (p.titular?.direccion || '').toLowerCase()
    const bar = (p.titular?.barrio || '').toLowerCase()
    if (!dir.includes(qDom) && !bar.includes(qDom)) return false
  }
  ```

### 3.4 Edición de Domicilio
- En la fila editable (`editRowData`):
  - Agregar `titularDireccion: string` en el estado `editRowData`.
  - Renderizar un input en la celda de Domicilio durante el modo de edición.
  - Al guardar (`saveEditRow`), persistir `direccion` en el titular correspondiente.
- En [ParcelaForm.tsx](file:///d:/Aeterna/src/components/forms/ParcelaForm.tsx):
  - Agregar campo "Domicilio / Dirección" y "Barrio" dentro del bloque de datos del titular responsable.
  - Cargar el valor inicial en `useEffect` y pasarlo en `onSave`.

### 3.5 Botón "Enviar cobro" en Parcelas en Stand-by
- En `ParcelasView.tsx` (sección móvil y tabla desktop):
  - Cuando `p.estado === 'standby'`, además de los botones `[Reactivar]` y `[Liberar]`, incluir:
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
  - En la vista móvil:
    ```tsx
    {onEnviarCobro && (
      <button
        type="button"
        onClick={() => onEnviarCobro(p)}
        className="h-8 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
        title="Enviar cobro a distancia (QR, Alias y Recibo)"
      >
        <span className="material-symbols-outlined text-[15px]">send_to_mobile</span>
        <span>Enviar cobro</span>
      </button>
    )}
    ```

---

## 4. Plan de Verificación y Pruebas
1. **Tests automáticos**:
   - Ejecutar `npm test` para asegurar que las 12 suites existentes pasen sin regresiones.
   - Agregar o actualizar pruebas en `reglasNegocio.test.ts` y `cobroService.test.ts` para validar que el cobro sobre parcelas standby transicione correctamente a ocupada/al día.
2. **Pruebas visuales con Navegador**:
   - Abrir `http://localhost:3000` en la vista de Parcelas.
   - Verificar la presencia de la columna "Domicilio" y la correcta visualización de direcciones reales como "B° Loma Blanca E-160".
   - Escribir en el filtro de domicilio y verificar el filtrado inmediato.
   - Cambiar al filtro "Stand-by", confirmar la presencia del botón "Enviar cobro", hacer clic y verificar que abra `EnviarCobroModal` con los datos de la parcela y monto correspondiente.

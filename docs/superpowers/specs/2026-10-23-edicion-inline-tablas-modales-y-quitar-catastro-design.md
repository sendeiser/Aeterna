# Documento de Diseño: Edición en Línea en Tablas, Modales de Alta y Remoción de "Catastro"

## 1. Contexto y Objetivos

El usuario solicitó dos optimizaciones funcionales y de experiencia de usuario (UX) críticas, junto con una limpieza terminológica:
1. **Edición directa en las tablas (Inline Row Editing):** En lugar de editar a través de formularios externos o paneles fijos, los datos existentes de las tablas se editan directamente en la fila activa, con botones explícitos de "Guardar ✓" y "Cancelar ✕".
2. **Nuevos registros exclusivamente a través de Modales:** Los formularios fijos (panel lateral de Parcelas y tarjeta superior de Inhumaciones) se retiran de la vista principal. Al presionar botones destacados de "+ Nueva Parcela", "+ Nueva Inhumación" y "+ Nuevo Afiliado", se abren modales flotantes (`ParcelaForm`, `InhumacionForm`, `AfiliadoForm`), permitiendo que las tablas ocupen el 100% del ancho y alto útil de la pantalla.
3. **Eliminación integral del término "Catastro" (y "catrasto"):** La palabra "Catastro" se retira de la navegación, encabezados, subtítulos, pies de página, mensajes de auditoría y diálogos de búsqueda, unificando la denominación hacia **"Parcelas"** y **"Gestión de Parcelas"**.

---

## 2. Decisiones de Diseño y Arquitectura

### 2.1. Modo de Edición en Línea por Fila (Row-Level Inline Edit)
Para asegurar precisión administrativa en registros oficiales (parcelas, inhumaciones y seguros):
- **Estado de edición:** Cada tabla mantendrá el ID del registro en edición (`editingRowId: string | null`) y un estado temporal con los datos en borrador (`editFormData: Record<string, any>`).
- **Activación:** Se incluye una columna o botón de acción con ícono de lápiz ("Editar").
- **Visualización en modo edición:**
  - Las celdas de la fila seleccionada se transforman en `<input>` y `<select>` compactos y legibles (estilizados con bordes sutiles, fondo contrastado y foco accesible).
  - La columna de acciones reemplaza temporalmente los botones habituales por:
    - **Guardar ✓** (`bg-emerald-600 text-white hover:bg-emerald-700`): Valida los campos, llama al callback `onSave` correspondiente, actualiza el estado local, persiste en `localStorage` y sincroniza con Supabase si está online.
    - **Cancelar ✕** (`bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300`): Descarta los cambios locales en borrador y restituye la fila a modo lectura.
- **Campos editables por tabla:**
  - **Parcelas:**
    - Parcela / Nomenclatura (Sector, Manzana, Número o código).
    - Titular (Nombre y Apellido).
    - DNI del titular.
    - Teléfono del titular.
    - Dirección del titular.
    - Condición Vital (`Vivo` / `Fallecido`).
    - Estado de Parcela (`disponible`, `ocupada`, `en_mora`, `standby`).
    - Saldo de mantenimiento ($).
  - **Inhumaciones:**
    - Fecha y hora de inhumación.
    - Difunto / Nombre completo.
    - DNI del fallecido.
    - Parcela asignada y Nivel en fosa (1, 2 ó 3).
    - Empresa fúnebre (input de texto libre).
  - **Plan Seguro Integral (Afiliados):**
    - Nombre del titular.
    - DNI.
    - Teléfono.
    - Dirección.
    - Zona de cobranza (Centro, Norte, Sur, etc.).
    - Monto de cuota mensual ($).
    - Estado del afiliado (`activo`, `deuda`, `suspendido`).

### 2.2. Nuevos Registros a través de Modales
- **Parcelas (`ParcelasView.tsx`):**
  - Se elimina el panel lateral de formulario derecho (`<div className="lg:col-span-4 ...">`), expandiendo la tabla a ancho completo (12 columnas / full-width).
  - Se añade en la cabecera el botón primario `+ Nueva Parcela`, el cual abre el modal flotante con `ParcelaForm`.
  - El botón global `+ Nuevo Registro` del Navbar también abre directamente el modal `ParcelaForm`.
- **Inhumaciones (`InhumacionesView.tsx`):**
  - Se retira la sección estática superior de registro (`<section className="bg-surface-container-lowest ...">`). La vista muestra de inmediato los filtros y el Libro de Inhumaciones.
  - Se añade el botón primario `+ Nueva Inhumación` en la cabecera, que abre `InhumacionForm` en modal flotante.
- **Plan Seguro Integral (`AfiliadosSeguroView.tsx`):**
  - El botón `+ Nuevo Afiliado` abre el modal `AfiliadoForm`, mientras que los afiliados existentes se editan directamente en la fila de la tabla sin requerir modal.

### 2.3. Remoción del Término "Catastro"
- `Navbar.tsx`:
  - Tab 2: `Parcelas & Catastro` $\rightarrow$ `Parcelas`.
  - Subtítulo: `Módulo de Catastro Parcelario` $\rightarrow$ `Módulo de Gestión de Parcelas`.
- `ParcelasView.tsx`:
  - `Catastro y Fosa` $\rightarrow$ `Fosa y Ubicación`.
  - Mensajes de confirmación y alertas: `Catastro Municipal` $\rightarrow$ `Registro de Parcelas`.
- `InhumacionesView.tsx`:
  - Botón y tooltip `Ver Parcela en Catastro` $\rightarrow$ `Ver Parcela`.
  - Prop `onVerParcelaEnCatastro` $\rightarrow$ `onVerParcela`.
- `ConfiguracionView.tsx`:
  - Botón `Sincronizar Catastro a Supabase` $\rightarrow$ `Sincronizar Parcelas a Supabase`.
- `OmniboxSearch.tsx`:
  - Placeholder / footer: `Chamical · Aeterna Catastro` $\rightarrow$ `Chamical · Aeterna Parque`.
- `QRPaymentModal.tsx` & `PortalPagoPublico.tsx`:
  - Rótulos y membretes oficiales: `Dirección de Rentas y Catastro` $\rightarrow$ `Dirección de Rentas y Cementerio Parque`.

---

## 3. Pruebas y Criterios de Aceptación
1. **Pruebas Unitarias (`vitest`):**
   - Verificar que los métodos de guardado y manipulación de datos mantengan compatibilidad.
   - Ejecutar suite completa con 100% de tests pasando.
2. **Pruebas End-to-End (`Playwright`):**
   - Navegar a la pestaña **"Parcelas"** (verificando que ya no diga "Parcelas & Catastro").
   - Verificar que la tabla de Parcelas ocupe el ancho completo sin panel lateral fijo.
   - Probar clic en "Editar" en una fila de Parcelas: modificar titular y estado, presionar "Guardar ✓" y verificar persistencia en la tabla.
   - Probar clic en "Editar" y luego "Cancelar ✕", verificando que los cambios no se aplican.
   - Probar botón `+ Nueva Parcela`: confirmar apertura del modal flotante.
   - Navegar a **"Inhumaciones"**: verificar que no exista el formulario estático gigante al inicio.
   - Probar botón `+ Nueva Inhumación`: confirmar apertura del modal de registro.
   - Probar edición en línea en fila de Inhumaciones y guardado exitoso.
   - Navegar a **"Plan Seguro Integral"**: probar edición en línea de un afiliado y guardado.
   - Verificar ausencia total de la palabra "catastro" en elementos visibles de navegación y encabezados.

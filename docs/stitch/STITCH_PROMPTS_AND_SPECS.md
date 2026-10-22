# Paquete de Especificaciones y Prompts para Google Stitch
## Sistema de Gestión Aeterna - Cementerio Parque & Servicios de Sepelio

Este documento contiene los prompts, jerarquía visual y especificaciones exactas para ingresar en **Stitch** (o cualquier generador UI) de modo que el diseño visual obtenido coincida al 100% con la arquitectura de datos, la estructura relacional de Supabase y las restricciones de rendimiento (<2GB RAM) del sistema.

---

## 1. Guía de Estilo y Sistema de Diseño (Design Tokens)

* **Estética General:** Profesional, sobria, moderna y de alto contraste (para pantallas de oficina y sol directo en móviles).
* **Colores Principales:**
  * Fondo General: Slate-50 / Zinc-900 (según modo claro/oscuro).
  * Primario / Institucional: Azul Cobalto Profundo (`#1E3A8A` / `blue-900`).
  * Estados de Pago / Éxito: Esmeralda Suave (`#059669` / `emerald-600`).
  * Mora / Advertencia: Ámbar Cálido (`#D97706` / `amber-600`).
  * Cancelado / Baja: Carmesí (`#DC2626` / `rose-600`).
* **Tipografía:** Inter o Roboto (tipografía legible, peso regular y semibold para datos numéricos).
* **Densidad:** Media-compacta para ver la mayor cantidad de información sin scrolls excesivos en pantallas pequeñas.

---

## 2. Prompts Específicos para Cada Pantalla en Stitch

### Pantalla 1: Dashboard y Buscador Universal (Omnibox)
**Prompt para Stitch:**
```text
Crea una interfaz de panel administrativo para "Aeterna - Parque & Sepelios".
En la parte superior, una barra de búsqueda destacada omnibox (tipo Spotlight / Command palette) con placeholder: "Buscar por Titular, Nomenclatura (ej: A-25-96), Difunto o N° Afiliado (Ctrl+K)...".
Debajo, 4 tarjetas de métricas en fila:
1. "Parcelas Ocupadas" (Icono de cruz/parque, valor 428, badge de total).
2. "En Mora de Mantenimiento" (Icono de alerta ámbar, valor 34 parcelas, monto total adeudado $ 12.450.000).
3. "Afiliados al Seguro" (Icono de escudo/salud, valor 156 activos, cuota base $18.000).
4. "Recaudación del Día" (Icono de recibo verde, valor $ 360.000 con desglose Efectivo y QR).
En el área central, una tabla de 'Actividad y Búsqueda Rápida' con columnas: Nomenclatura, Titular / Afiliado, Sector, Estado (badges coloreados: Al Día, Mora, COVID-19), Saldo, y botones rápidos: [Cobrar QR] y [Ver Ficha].
Barra lateral o navegación superior colapsable con accesos: Dashboard, Parcelas, Inhumaciones, Seguro de Sepelio, Caja/Cobros, Configuración.
Diseño responsivo para móviles y PCs antiguas con transiciones sutiles y alto contraste.
```

---

### Pantalla 2: Formulario y Catastro de Parcelas y Titulares
**Prompt para Stitch:**
```text
Diseña una pantalla de formulario y gestión de parcelas de cementerio parque.
Diseño en 2 columnas en escritorio y 1 columna en móvil:
Columna Izquierda (Formulario de Carga Ágil):
- Título: "Registro / Edición de Parcela"
- Grupo Titular: Campo Nombre y Apellido (autocompletado), DNI, Teléfono / WhatsApp, Domicilio en Chamical.
- Grupo Parcela: Selector de Sector (Sector A, Sector E, Sector Salinas), Fila/Manzana, Número de Parcela (genera código ej: A-25-96), Capacidad (radio buttons: 1, 2 o 3 niveles).
- Grupo Estado: Badges seleccionables: [Disponible] [Ocupada] [En Mora] [Baja].
- Campo Saldo de Mantenimiento ($ ARS) con formato automático.
- Botones inferiores: [Guardar Parcela] y [Cancelar].
Columna Derecha (Listado y Vista Rápida):
- Filtros rápidos por sector (Pestañas: Todos, Sector A, Sector E, Salinas, En Mora).
- Tarjetas compactas o tabla con selector rápido para ver historial de la parcela y personas sepultadas en ella.
```

---

### Pantalla 3: Libro Digital de Inhumaciones (Difuntos y Protocolo COVID)
**Prompt para Stitch:**
```text
Diseña la pantalla para el "Libro de Inhumaciones y Sepelios" del parque cementerio.
Formulario superior o modal de carga rápida:
- Parcela Destino: selector predictivo con indicador de capacidad (ej: "A-25-96 - Nivel 2 libre de 3").
- Nombre Completo del Difunto y DNI.
- Fecha de Defunción y Fecha de Inhumación (con selector de fecha nativo accesible).
- Switch / Checkbox destacado con badge violeta: "[X] Fallecido por COVID-19 / Protocolo Especial Sanitario".
- Nivel ocupado en la fosa: Selector de Nivel 1 (inferior), Nivel 2 (medio), Nivel 3 (superior).
- Empresa fúnebre interviniente y Notas sanitarias / funerarias.
- Botón principal: [Registrar Inhumación en Parcela].
Debajo, el registro histórico paginado:
- Filtros por año (2020, 2021, 2022, Recientes) y buscador por nombre del difunto.
- Filas con fecha, difunto, parcela, indicativo COVID y botón para imprimir constancia de sepelio.
```

---

### Pantalla 4: Padrón de Seguro de Sepelio con Matriz de 12 Cuotas
**Prompt para Stitch:**
```text
Diseña una vista administrativa de "Padrón de Afiliados al Seguro de Sepelio".
Cabecera con buscador de afiliados, filtro por Zona/Cobrador de calle (Ruta 1, Loma Blanca, Centro) y botón [+ Nuevo Afiliado].
Tabla principal interactiva:
- Columna 1: N° Afiliado (ej. #12, #84).
- Columna 2: Nombre del Afiliado y Dirección en Chamical.
- Columna 3: Monto de Cuota Mensual ($ 18.000).
- Columna 4: "Estado Cuotas 2026" mostrando una cuadrícula de 12 pequeños botones cuadrados numerados del 1 al 12 (Ene a Dic):
  * Cuota pagada: Verde esmeralda con tilde pequeña.
  * Cuota adeudada/vencida: Rojo suave con número en blanco.
  * Cuota a vencer: Gris neutro.
- Al hacer click en cualquier cuota roja o pendiente, se activa directamente el modal de cobro.
- Columna 5: Acciones (Editar afiliado, Imprimir planilla de ruta para cobrador).
Optimizado para celulares con scroll horizontal suave solo en la matriz de cuotas.
```

---

### Pantalla 5: Modal de Cobro con Código QR (CBU / Alias) y Recibo
**Prompt para Stitch:**
```text
Diseña un modal flotante centrado de cobranza rápida para el sistema Aeterna.
Cabecera:
- Título: "Registrar Cobranza"
- Subtítulo: "Parcela A-25-96 / Afiliado #14 - Lidia Sánchez"
- Monto destacado en tipografía grande: "$ 18.000,00 ARS"
Selector de Método de Pago (Pestañas o segmented control):
[ Efectivo ]  |  [ Transferencia QR / Bancaria ] (Seleccionado)
Contenido de Transferencia QR:
- Código QR cuadrado de alta visibilidad (200x200px) centrado para que el cliente lo escanee con Mercado Pago, BNA+, MODO o app bancaria.
- Debajo del QR, 2 tarjetas de copiado rápido con icono de copiar y feedback visual "¡Copiado!":
  1. Alias: "AETERNA.CHAMICAL"  [ Botón Copiar ]
  2. CBU: "0000003100012345678901"  [ Botón Copiar ]
- Información adicional en texto fino: "Banco Rioja - Titular: Aeterna Servicios S.R.L. - CUIT: 30-71234567-9".
- Campo de entrada opcional: "N° de comprobante / últimos 4 dígitos de la transferencia".
Botones de pie:
- [ Cancelar ]
- Botón principal verde: [ Confirmar Cobro y Emitir Recibo ]
Al confirmar, transición a vista de recibo con botones: [ Imprimir Ticket Térmico ], [ Imprimir A4 ], [ Compartir por WhatsApp ].
```

---

## 3. Integración Directa con la Arquitectura

Cuando generes o ajustes los componentes visuales en Stitch:
1. Todos los nombres de campos en los inputs coinciden con las columnas de `schema.sql`:
   - `nomenclatura`, `sector_id`, `saldo_mantenimiento`, `capacidad_total`
   - `numero_afiliado`, `monto_cuota_mensual`, `zona_cobro`
   - `nombre_difunto`, `es_covid`, `fecha_inhumacion`
   - `alias_cbu`, `cbu`, `titular_cuenta`
2. El frontend de React conectará las propiedades de estos componentes generados directamente con los servicios de `@supabase/supabase-js`.

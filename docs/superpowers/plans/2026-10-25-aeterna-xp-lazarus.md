# Aeterna XP (Lazarus / Free Pascal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una suite de escritorio nativa Win32 (x86 32-bit) en Object Pascal (Lazarus / Free Pascal) que ejecute todos los módulos de Aeterna en Windows XP SP3 con 2 GB de RAM, conectándose en tiempo real a Supabase con OpenSSL independiente y generando reportes vectoriales en PDF de forma nativa.

**Architecture:** Aplicación cliente de escritorio autónoma basada en la biblioteca de componentes nativos LCL (Lazarus Component Library). Utiliza la librería de red Synapse con DLLs de OpenSSL 1.1.1 de 32 bits para comunicación REST/HTTPS contra PostgREST de Supabase (`/rest/v1/`), parseo nativo de JSON (`fpjson`) y motor vectorial puro `fpPDF` para emisión de documentos e impresión sin dependencias externas.

**Tech Stack:** Free Pascal (FPC 3.2.x), Lazarus LCL, Synapse (HTTP/SSL), OpenSSL 1.1.1 Win32 PE (`libeay32.dll`, `ssleay32.dll`), fpPDF, Inno Setup 5/6.

**Spec:** [docs/superpowers/specs/2026-10-25-aeterna-xp-lazarus-design.md](file:///d:/Aeterna/docs/superpowers/specs/2026-10-25-aeterna-xp-lazarus-design.md)

## Global Constraints

- **Sistema Operativo Destino:** Windows XP Professional / Home SP3 (32-bit x86, Subsistema Win32 5.01).
- **Límite de Memoria RAM:** Menos de 30 MB de consumo en ejecución (máximo 2 GB de hardware total).
- **Criptografía de Red:** OpenSSL 1.1.1 32-bit empaquetado localmente, sin delegar a `schannel.dll`.
- **API Cloud:** Supabase REST API (`https://xftwykrxumzxaqhosbvt.supabase.co/rest/v1/`) con cabeceras `apikey` y `Authorization: Bearer <anon_key>`.
- **Estructura del Proyecto:** Todo el código fuente de la versión XP reside en el directorio `aeterna-xp/`.

## Review Focus

1. **Fallo de Handshake TLS en Windows XP:** Si la aplicación intenta usar el stack de red nativo de Windows XP, fallará la conexión SSL. Se debe verificar que Synapse cargue explícitamente `libeay32.dll` y `ssleay32.dll` desde la carpeta del ejecutable.
2. **Resiliencia ante Pérdida Momentánea de Red:** Si se corta la conexión WiFi/Ethernet al realizar una consulta o cobro, la aplicación debe mostrar un mensaje claro de error de red sin cerrarse inesperadamente (crash).
3. **Bloqueo de Interfaz Gráfica (Freeze):** Las llamadas HTTP grandes (como cargar 398 parcelas) deben mantener la reactividad visual del puntero y la ventana.
4. **Validación de Fechas en Formato ISO 8601:** Supabase devuelve y espera fechas en formato `YYYY-MM-DD` o ISO UTC; el cliente Pascal debe formatear y parsear fechas de forma robusta sin fallar por configuración regional.
5. **Generación de PDF con Caracteres Especiales:** Los nombres de personas con tildes (á, é, í, ó, ú, ñ) en actas y recibos deben codificarse correctamente en WinAnsi / UTF-8 en el motor `fpPDF`.

---

### Task 1: Estructura del Proyecto, Dependencias de Red y OpenSSL

**Files:**
- Create: `aeterna-xp/bin/config.ini`
- Create: `aeterna-xp/src/core/uConfig.pas`
- Create: `aeterna-xp/src/core/uSynapseHttp.pas`
- Create: `aeterna-xp/tests/test_connection.pas`

**Interfaces:**
- Produces: `TAppConfig.GetSupabaseUrl: string`, `TAppConfig.GetSupabaseKey: string`, `TSynapseHttp.Get(Url: string; Headers: TStrings): string`

- [ ] **Step 1: Crear estructura de directorios y archivo `config.ini`**
Crear carpetas `aeterna-xp/bin`, `aeterna-xp/src/core`, `aeterna-xp/src/services`, `aeterna-xp/src/forms`, `aeterna-xp/src/reports`, `aeterna-xp/tests`.
Definir `config.ini` con `SupabaseUrl=https://xftwykrxumzxaqhosbvt.supabase.co` y la clave anónima.

- [ ] **Step 2: Implementar módulo de configuración `uConfig.pas`**
Leer `config.ini` adyacente al ejecutable con `TIniFile`.

- [ ] **Step 3: Implementar adaptador de red `uSynapseHttp.pas` con OpenSSL**
Configurar `THTTPSend` de Synapse forzando método SSL/TLS seguro e inyección de cabeceras `apikey` y `Authorization`.

- [ ] **Step 4: Crear test de conectividad `test_connection.pas`**
Realizar un `GET /rest/v1/parcelas?select=id&limit=1` y verificar respuesta HTTP 200.

- [ ] **Step 5: Commit**
```bash
git add aeterna-xp/
git commit -m "feat(xp): scaffolding inicial, configuracion y cliente de red con soporte tls"
```

---

### Task 2: Modelos de Datos y Reglas de Negocio en Pascal

**Files:**
- Create: `aeterna-xp/src/core/uDataModels.pas`
- Create: `aeterna-xp/src/core/uBusinessRules.pas`
- Create: `aeterna-xp/tests/test_business_rules.pas`

**Interfaces:**
- Produces: `TParcela`, `TInhumacion`, `TAfiliadoSeguro`, `TCuotaSeguro`, `TPagoMantenimiento`
- Produces: `function EvaluarMoraParcela(const AParcela: TParcela; AnioRef: Integer): TEvaluacionMoraParcela;`
- Produces: `function EvaluarMoraAfiliado(const AAfiliado: TAfiliadoSeguro): Integer;`

- [ ] **Step 1: Definir tipos y registros en `uDataModels.pas`**
Modelar todas las entidades de la base de datos con campos equivalentes a `src/types/database.ts`.

- [ ] **Step 2: Implementar reglas de mora y caducidad en `uBusinessRules.pas`**
Replicar la lógica institucional de `src/lib/reglasNegocio.ts`:
- Mora de 3 meses para afiliados a seguro.
- Mora de 3 años para parcelas de cementerio (pase a stand-by por resolución municipal).

- [ ] **Step 3: Escribir tests de verificación `test_business_rules.pas`**
Comprobar que una parcela con último pago en 2022 o anterior resulte en `enStandby = True` para el año 2026.

- [ ] **Step 4: Commit**
```bash
git add aeterna-xp/src/core/uDataModels.pas aeterna-xp/src/core/uBusinessRules.pas aeterna-xp/tests/test_business_rules.pas
git commit -m "feat(xp): modelos de datos y reglas de negocio para calculo de mora"
```

---

### Task 3: Cliente REST de Supabase y Servicios de Datos

**Files:**
- Create: `aeterna-xp/src/core/uSupabaseClient.pas`
- Create: `aeterna-xp/src/services/uParcelasService.pas`
- Create: `aeterna-xp/src/services/uInhumacionesService.pas`
- Create: `aeterna-xp/src/services/uAfiliadosService.pas`
- Create: `aeterna-xp/src/services/uCajaService.pas`
- Create: `aeterna-xp/tests/test_services.pas`

**Interfaces:**
- Consumes: `uConfig`, `uSynapseHttp`, `uDataModels`
- Produces: `TParcelasService.ObtenerTodas: TParcelaArray`, `TInhumacionesService.ObtenerTodas: TInhumacionArray`, `TAfiliadosService.ObtenerTodos: TAfiliadoArray`, `TCajaService.ObtenerMovimientosHoy: TPagoArray`

- [ ] **Step 1: Implementar `uSupabaseClient.pas` con parseo JSON**
Funciones genéricas `GetArray(Table, QueryParams)` y `PostRecord(Table, JsonBody)`.

- [ ] **Step 2: Implementar `uParcelasService.pas`**
Carga de las 398 parcelas con soporte de filtros por sector (A, E, Salinas).

- [ ] **Step 3: Implementar `uInhumacionesService.pas`**
Lectura del libro de inhumaciones y alta de nuevo registro fúnebre.

- [ ] **Step 4: Implementar `uAfiliadosService.pas`**
Listado de afiliados, carga de cuotas mensuales y registro de pagos.

- [ ] **Step 5: Implementar `uCajaService.pas`**
Obtención de cobros del día y liquidación de cierre.

- [ ] **Step 6: Ejecutar test de integración con Supabase**
Verificar obtención de registros reales de las tablas en `test_services.pas`.

- [ ] **Step 7: Commit**
```bash
git add aeterna-xp/src/services/ aeterna-xp/src/core/uSupabaseClient.pas
git commit -m "feat(xp): servicios rest de parcelas, inhumaciones, afiliados y caja"
```

---

### Task 4: Ventana Principal, Menú y Dashboard Ejecutivo

**Files:**
- Create: `aeterna-xp/src/forms/fMain.pas`
- Create: `aeterna-xp/src/forms/fMain.lfm`

**Interfaces:**
- Consumes: Todos los servicios (`uParcelasService`, `uInhumacionesService`, `uAfiliadosService`, `uCajaService`)
- Produces: Formulario principal `TfrmMain` con navegación de pestañas y métricas en tiempo real.

- [ ] **Step 1: Diseñar formulario `fMain` con LCL**
Barra superior de acciones rápidas, panel de métricas (KPIs de ocupación, deuda en mora, afiliados al día y recaudación en caja).

- [ ] **Step 2: Conectar carga asíncrona de datos**
Poblar las tarjetas de estado y la barra de estado inferior (conexión a Supabase activa / inactiva).

- [ ] **Step 3: Commit**
```bash
git add aeterna-xp/src/forms/fMain.*
git commit -m "feat(xp): ventana principal y dashboard ejecutivo con indicadores kpi"
```

---

### Task 5: Módulo de Catastro y Mapa de Parcelas

**Files:**
- Create: `aeterna-xp/src/forms/fParcelas.pas`
- Create: `aeterna-xp/src/forms/fParcelas.lfm`
- Create: `aeterna-xp/src/forms/fDetalleParcela.pas`

**Interfaces:**
- Consumes: `uParcelasService`, `uDataModels`
- Produces: `TfrmParcelas` con grilla interactiva y ficha de parcela.

- [ ] **Step 1: Diseñar visor de parcelas en `fParcelas`**
Selector de sectores (A, E, Salinas), filtros por estado (Disponible, Ocupada, Mora, Stand-by) y buscador rápido por titular o nomenclatura.

- [ ] **Step 2: Implementar renderizado con código de colores**
Dibujo de celdas con colores institucionales en `TDrawGrid` o `TStringGrid`.

- [ ] **Step 3: Crear modal de detalle y edición `fDetalleParcela`**
Muestra datos del titular, saldo deudor, historial de fallecidos en la parcela y botón para registrar cobranza de mantenimiento.

- [ ] **Step 4: Commit**
```bash
git add aeterna-xp/src/forms/fParcelas.* aeterna-xp/src/forms/fDetalleParcela.*
git commit -m "feat(xp): modulo de catastro, grilla de parcelas y ficha tecnica"
```

---

### Task 6: Módulo de Inhumaciones y Libro de Actas

**Files:**
- Create: `aeterna-xp/src/forms/fInhumaciones.pas`
- Create: `aeterna-xp/src/forms/fInhumaciones.lfm`
- Create: `aeterna-xp/src/forms/fNuevaInhumacion.pas`

**Interfaces:**
- Consumes: `uInhumacionesService`, `uParcelasService`
- Produces: `TfrmInhumaciones` y diálogo de alta `TfrmNuevaInhumacion`.

- [ ] **Step 1: Diseñar listado de inhumaciones en `fInhumaciones`**
Tabla ordenada con fecha de inhumación, difunto, DNI, parcela y protocolo (COVID / Estándar). Buscador reactivo.

- [ ] **Step 2: Implementar diálogo de alta `fNuevaInhumacion`**
Formulario con validación de campos obligatorios, asignación de nivel en parcela y guardado directo en Supabase.

- [ ] **Step 3: Commit**
```bash
git add aeterna-xp/src/forms/fInhumaciones.* aeterna-xp/src/forms/fNuevaInhumacion.*
git commit -m "feat(xp): registro de servicios fúnebres y libro de actas de inhumaciones"
```

---

### Task 7: Módulo de Afiliados al Seguro de Sepelio y Cobranzas

**Files:**
- Create: `aeterna-xp/src/forms/fAfiliados.pas`
- Create: `aeterna-xp/src/forms/fAfiliados.lfm`
- Create: `aeterna-xp/src/forms/fCobranzaCuota.pas`

**Interfaces:**
- Consumes: `uAfiliadosService`, `uCajaService`
- Produces: `TfrmAfiliados` y modal de cobro `TfrmCobranzaCuota`.

- [ ] **Step 1: Diseñar padrón de afiliados en `fAfiliados`**
Lista de mutual con número de afiliado, titular, dirección, zona de cobro y matriz de cuotas del año (12 casillas por mes).

- [ ] **Step 2: Detección y filtrado de afiliados en mora (>= 3 meses)**
Filtro de 1 clic para listar los afiliados con cuotas adeudadas.

- [ ] **Step 3: Implementar modal de cobro rápido `fCobranzaCuota`**
Permite seleccionar las cuotas a pagar, elegir método (efectivo o transferencia), actualizar en Supabase e invocar la impresión del recibo.

- [ ] **Step 4: Commit**
```bash
git add aeterna-xp/src/forms/fAfiliados.* aeterna-xp/src/forms/fCobranzaCuota.*
git commit -m "feat(xp): padrón de seguro de sepelio, matriz de cuotas y cobranza"
```

---

### Task 8: Módulo de Caja Diaria y Arqueo de Cierre

**Files:**
- Create: `aeterna-xp/src/forms/fCaja.pas`
- Create: `aeterna-xp/src/forms/fCaja.lfm`
- Create: `aeterna-xp/src/forms/fCierreCaja.pas`

**Interfaces:**
- Consumes: `uCajaService`
- Produces: `TfrmCaja` con balance diario y `TfrmCierreCaja` para el arqueo.

- [ ] **Step 1: Diseñar pantalla de caja en `fCaja`**
Listado de cobros del día clasificados por tipo (Mantenimiento, Seguro, Inhumación). Desglose en tiempo real: Total Efectivo vs. Total Transferencias.

- [ ] **Step 2: Implementar diálogo de arqueo y cierre `fCierreCaja`**
Conteo de billetes/efectivo real, cálculo de diferencia y generación del balance de cierre.

- [ ] **Step 3: Commit**
```bash
git add aeterna-xp/src/forms/fCaja.* aeterna-xp/src/forms/fCierreCaja.*
git commit -m "feat(xp): modulo de caja diaria, balance y proceso de arqueo de cierre"
```

---

### Task 9: Motor de Reportes Vectoriales en PDF Nativos (`fpPDF`)

**Files:**
- Create: `aeterna-xp/src/reports/uReportsPDF.pas`
- Create: `aeterna-xp/tests/test_pdf_generation.pas`

**Interfaces:**
- Consumes: `uDataModels`
- Produces:
  - `procedure GenerarActaInhumacionPDF(const Inh: TInhumacion; const OutputPath: string);`
  - `procedure GenerarFolioInhumacionesPDF(const Lista: TInhumacionArray; const OutputPath: string);`
  - `procedure GenerarReciboPagoPDF(const Pago: TPagoMantenimiento; const OutputPath: string);`
  - `procedure GenerarPlanillaRutaPDF(const Afiliados: TAfiliadoArray; const OutputPath: string);`
  - `procedure GenerarCierreCajaPDF(const Pagos: TPagoArray; TotalEf, TotalDig: Currency; const OutputPath: string);`

- [ ] **Step 1: Configurar motor `fpPDF` con diseño institucional**
Diseñar encabezado con el imagotipo de Aeterna, tipografía limpia, líneas divisoras y pie de página institucional.

- [ ] **Step 2: Implementar generador de Acta de Inhumación**
Emisión de documento A4 con datos de la parroquia, fecha, difunto, ubicación en parcela y espacio de firmas.

- [ ] **Step 3: Implementar Folio del Libro de Inhumaciones y Planilla de Ruta**
Diseño tabular ordenado para encuadernación oficial y planilla de cobranza en calle.

- [ ] **Step 4: Implementar Recibo Oficial y Cierre de Caja**
Formato de recibo con duplicado (original afiliado / talón administración) y balance de caja.

- [ ] **Step 5: Test de generación de PDFs**
Ejecutar `test_pdf_generation.pas` y comprobar que todos los archivos PDF se generan correctamente y sin errores sintácticos.

- [ ] **Step 6: Commit**
```bash
git add aeterna-xp/src/reports/uReportsPDF.pas aeterna-xp/tests/test_pdf_generation.pas
git commit -m "feat(xp): motor vectorial nativo de reportes en pdf para actas, folios, recibos y caja"
```

---

### Task 10: Integración Final, Script de Instalador Inno Setup y Verificación en XP

**Files:**
- Create: `aeterna-xp/AeternaXP.lpr`
- Create: `aeterna-xp/AeternaXP.lpi`
- Create: `aeterna-xp/installer/setup_aeterna_xp.iss`
- Create: `aeterna-xp/README.md`

- [ ] **Step 1: Ensamblar proyecto Lazarus principal (`AeternaXP.lpr`)**
Configurar inicio con pantalla de splash ligera, verificación de configuración y apertura de `fMain`.

- [ ] **Step 2: Crear script de instalador Inno Setup (`setup_aeterna_xp.iss`)**
Configurar instalación en `C:\Archivos de programa\Aeterna`, creación de accesos directos en Escritorio y Menú Inicio, y copiado de DLLs de OpenSSL.

- [ ] **Step 3: Documentar guía de compilación y despliegue en `README.md`**
Instrucciones paso a paso para abrir en Lazarus o compilar por línea de comandos con `lazbuild` o FPC.

- [ ] **Step 4: Commit**
```bash
git add aeterna-xp/
git commit -m "feat(xp): proyecto lazarus ensamblado, script de instalador inno setup y documentacion"
```

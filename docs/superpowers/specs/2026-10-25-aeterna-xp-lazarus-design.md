# Sistema de Gestión Aeterna - Cliente Nativo de Escritorio para Windows XP (Lazarus / Free Pascal)

**Fecha:** 2026-10-25  
**Estado:** Propuesta de Diseño para Aprobación  
**Arquitectura:** Nativa Win32 (x86 32-bit PE)  
**Objetivo de Hardware:** Windows XP SP3 con 2 GB RAM (Pentium 4 / Core 2 Duo o superior)  
**Tecnología Base:** Lazarus Component Library (LCL) / Free Pascal Compiler (FPC) + Synapse + OpenSSL 1.1.1 + fpPDF  

---

## 1. Intención y Propósito

El propósito de este proyecto es dotar a la administración del **Cementerio Parque San Nicolás y Mutual de Sepelios** de una aplicación de escritorio nativa, ultraliviana y 100% autónoma que pueda ejecutarse sin demoras en equipos antiguos con **Windows XP y un máximo de 2 GB de memoria RAM**.

La aplicación debe cubrir la totalidad de los módulos operativos de la plataforma Aeterna, conectándose en tiempo real a la misma base de datos en la nube (**Supabase**) que utiliza la versión web, asegurando consistencia de datos absoluta y capacidad de emitir e imprimir reportes en PDF de forma nativa sin requerir software externo pesado.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas (Goals)
* **Consumo de memoria ínfimo:** Mantener el uso de memoria RAM del programa en ejecución por debajo de **30 MB** (aprovechando menos del 1.5% de los 2 GB disponibles).
* **Compatibilidad estricta con Windows XP SP3:** Ejecutable Win32 de 32 bits sin dependencias de APIs modernas de Windows (ej. sin llamadas a funciones de Vista/7/10 como `GetTickCount64`).
* **Conectividad segura a la Nube (TLS 1.2 / 1.3):** Integrar de forma embebida librerías OpenSSL 1.1.1 de 32 bits independientes de `schannel.dll` de Windows XP, permitiendo dialogar con los endpoints HTTPS de Supabase (`https://xftwykrxumzxaqhosbvt.supabase.co/rest/v1/`).
* **Suite completa de módulos:**
  1. **Catastro y Parcelas:** Mapa visual, estados (disponible, ocupada, en mora, standby), sectores A, E, Salinas y ficha técnica.
  2. **Inhumaciones:** Registro de defunciones, asignación de espacios, control de protocolos (estándar / COVID) y libro de actas.
  3. **Seguro de Sepelio:** Padrón de afiliados, cuotas mensuales, detección de mora (3 meses), talonario de recibos y cobranza.
  4. **Caja Diaria:** Registro de ingresos, desglose efectivo/transferencias y arqueo de cierre.
  5. **Reportes PDF:** Generación nativa con motor vectorial puro en Pascal (`fpPDF`) para actas, folios, planillas de ruta, recibos y cierres de caja.
* **Distribución tradicional:** Empaquetado en un único instalador `.exe` (creado con Inno Setup) que configure el acceso directo en el escritorio y menú inicio de Windows XP.

### No-Metas (Non-Goals)
* No requiere un servidor web local, ni Node.js, ni IIS en la máquina con Windows XP.
* No sustituye la plataforma web: coexiste directamente con ella, compartiendo la misma base de datos Supabase en tiempo real.

### Anti-Metas (Anti-Goals)
* **No usar Electron, CEF ni navegadores embebidos:** Los motores Chromium modernos requieren más de 300 MB de RAM en reposo y provocan fallos de segmentación en Windows XP.
* **No depender de las librerías criptográficas del sistema operativo Windows XP:** Windows XP carece de soporte nativo para TLS 1.2/1.3; depender de WinInet o Schannel causaría fallos de conexión SSL inmediatos.

---

## 3. Restricciones Técnicas

1. **Sistema Operativo:** Windows XP Professional / Home con Service Pack 3 (32-bit x86).
2. **Memoria RAM disponible:** 2 GB DDR/DDR2.
3. **Criptografía de red:** OpenSSL 1.1.1 (compilación compatible con subsistema Win32 NT 5.1).
4. **Protocolo con Supabase:** HTTPS REST v1 mediante PostgREST con `apikey` y cabeceras `Authorization: Bearer <token>`.
5. **Formato de datos:** JSON parseado con la librería nativa de Free Pascal `fpjson` / `jsonparser`.

---

## 4. Enfoques Considerados y Selección

### Enfoques Evaluados:
* **Enfoque 1: Conexión REST directa a Supabase en tiempo real (Seleccionado)**
  * La aplicación realiza consultas HTTP GET/POST/PATCH directas a Supabase mediante Synapse + OpenSSL.
  * *Ventajas:* Garantiza que los cobros, parcelas e inhumaciones registrados en la PC con Windows XP impacten al instante en la nube, y que los cambios realizados desde otros dispositivos se reflejen de inmediato.
* **Enfoque 2: Arquitectura híbrida SQLite local + sincronización offline**
  * Descartado por el usuario para priorizar la consistencia centralizada de datos en tiempo real y evitar colisiones de sincronización en parcelas o cuotas.
* **Enfoque 3: Runtime Web Legacy (Mypal/CEF)**
  * Descartado por el usuario en favor del rendimiento superior, estabilidad y mínimo consumo de memoria de la solución nativa en Object Pascal.

---

## 5. Arquitectura del Software (Lazarus / Free Pascal)

### 5.1 Estructura del Proyecto

```text
aeterna-xp/
├── bin/
│   ├── AeternaXP.exe          # Ejecutable final compilado (~5 a 8 MB)
│   ├── libeay32.dll           # OpenSSL 1.1.1 Crypto (Win32 XP)
│   ├── ssleay32.dll           # OpenSSL 1.1.1 SSL (Win32 XP)
│   └── config.ini             # Configuración de URL y API Key de Supabase
├── src/
│   ├── core/
│   │   ├── uSupabaseClient.pas # Cliente REST HTTPS (Synapse + OpenSSL + JSON)
│   │   ├── uDataModels.pas     # Tipos y registros de datos (Parcela, Inhumacion, Afiliado, Cuota, Pago)
│   │   └── uBusinessRules.pas  # Reglas de negocio (evaluación de mora de 3 meses y 3 años/standby)
│   ├── services/
│   │   ├── uParcelasService.pas
│   │   ├── uInhumacionesService.pas
│   │   ├── uAfiliadosService.pas
│   │   └── uCajaService.pas
│   ├── reports/
│   │   ├── uReportsPDF.pas     # Generador de reportes vectoriales PDF (fpPDF)
│   │   ├── uPrintManager.pas   # Gestión de impresión directa Win32 (GDI)
│   ├── forms/
│   │   ├── fMain.pas           # Formulario principal con dashboard y menú
│   │   ├── fParcelas.pas       # Grilla catastral y mapa visual de parcelas
│   │   ├── fInhumaciones.pas   # Registro y libro de actas fúnebres
│   │   ├── fAfiliados.pas      # Padrón de mutual, cuotas y talonarios
│   │   ├── fCobranzaCuota.pas  # Modal de cobro rápido de cuotas y mantenimiento
│   │   ├── fCaja.pas           # Movimientos diarios y arqueo de cierre
│   │   └── fConfig.pas         # Ajustes de conexión e impresora
│   └── AeternaXP.lpr           # Archivo de proyecto Lazarus
└── installer/
    └── setup_aeterna_xp.iss    # Script de empaquetado para Inno Setup
```

---

## 6. Especificación de Módulos Operativos

### 6.1 Capa de Red y Comunicación Supabase (`uSupabaseClient.pas`)
* Utiliza la librería **Synapse (`httpsend.pas` y `ssl_openssl.pas`)**.
* Configurado para TLS 1.2/1.3 forzando el uso de `ssleay32.dll` y `libeay32.dll` ubicados en el mismo directorio que el ejecutable.
* Métodos principales:
  * `function Get(const Endpoint, Params: string): TJSONArray;`
  * `function Post(const Endpoint: string; Data: TJSONObject): TJSONObject;`
  * `function Patch(const Endpoint, ID: string; Data: TJSONObject): Boolean;`
  * `function Delete(const Endpoint, ID: string): Boolean;`

### 6.2 Módulo de Catastro y Parcelas (`fParcelas.pas`)
* **Grilla Visual Catastral:** Renderizado eficiente sobre `TPaintBox` / `TDrawGrid` con doble búfer para evitar parpadeos en tarjetas gráficas antiguas.
* Representación por colores institucionales:
  * Verde: Disponible
  * Rojo: Ocupada
  * Naranja: En mora de mantenimiento
  * Violeta / Stand-by: Mora crítica (> 3 años)
* Filtros por sector (Sector A, Sector E, Salinas), búsqueda por nomenclatura (ej. `A-25-96`) o por nombre de titular.
* Ficha detallada de parcela con historial de inhumaciones contenidas y saldo deudor.

### 6.3 Módulo de Inhumaciones y Libro de Actas (`fInhumaciones.pas`)
* Listado con búsqueda reactiva por difunto o DNI.
* Alta de servicio de sepelio:
  * Nombre y DNI del fallecido.
  * Fecha de defunción y fecha de inhumación.
  * Asignación de parcela y nivel/espacio ocupado.
  * Protocolo especial (COVID-19 vs. Estándar).
  * Empresa funebrera y datos del responsable que firma el acta.
* Botón de emisión de **Acta de Inhumación Oficial** en PDF.

### 6.4 Módulo de Afiliados al Seguro de Sepelio y Cuotas (`fAfiliados.pas`)
* Padrón de afiliados con número de póliza, nombre, dirección y cobrador asignado.
* Matriz de cuotas del año (Enero a Diciembre) con estados: Pagada (verde), Pendiente (blanco), En Mora (rojo).
* Detección automática de afiliados con mora >= 3 meses.
* Función de cobro rápido de cuotas con actualización simultánea en Supabase y generación del recibo.
* Generación de **Planilla de Ruta para Cobradores** en PDF ordenada por zona y dirección.

### 6.5 Módulo de Caja Diaria y Arqueo (`fCaja.pas`)
* Listado de cobranzas del día clasificadas por concepto (Mantenimiento de Parcela, Cuotas de Seguro, Servicios de Inhumación).
* Subtotales automáticos: Total Efectivo vs. Total Transferencias/Digital.
* Diálogo de **Cierre de Caja** con balance final y exportación a PDF.

### 6.6 Motor de Reportes PDF Nativos (`uReportsPDF.pas`)
* Implementado con la unidad estándar de Free Pascal **`fppdf`**, un motor vectorial puro sin dependencias externas.
* Plantillas de reporte diseñadas:
  1. **Acta de Inhumación Institucional:** Encabezado parroquial, folio, datos del difunto, ubicación catastral y líneas de firmas oficiales.
  2. **Folio de Inhumaciones:** Libro de registro tabular continuo para encuadernación.
  3. **Recibo de Cobranza Oficial:** Comprobante para el afiliado y talón de control para la administración.
  4. **Planilla de Ruta de Cobrador:** Listado clasificado para cobranza domiciliaria con casillas de firma y cobro.
  5. **Planilla de Cierre Diario de Caja:** Resumen de ingresos, arqueo y responsable de turno.

---

## 7. Plan de Empaquetado y Despliegue en Windows XP

1. **Compilación de la Release:**
   * Flags de compilación: `-O3` (optimización máxima), `-Xs` (strip de símbolos de depuración) y subsistema Windows 5.01 (`-WB0x0501`).
   * Tamaño resultante del `.exe`: Entre 5 y 8 megabytes.
2. **Instalador Inno Setup (`setup_aeterna_xp.exe`):**
   * Configurado con compatibilidad mínima `MinVersion=5.1.2600` (Windows XP SP3).
   * Instala los binarios, las DLLs de OpenSSL 1.1.1 de 32 bits y el archivo de configuración.
   * Crea accesos directos en el Escritorio y en el Menú Inicio.

---

## 8. Lo que Queda en Manos del Desarrollador (Builder)

* Disposición exacta de márgenes y tipografías en el motor `fpPDF` para replicar milimétricamente el diseño de los reportes web.
* Selección de íconos Win32 clásicos de 16x16 y 24x24 píxeles para los botones de las barras de herramientas.
* Configuración de la URL de Supabase y API Key en un archivo `config.ini` cifrado o protegido para evitar exposición accidental.

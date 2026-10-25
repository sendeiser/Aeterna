# Aeterna XP - Suite de Escritorio Nativa para Windows XP

**Versión:** 1.0.0-XP  
**Lenguaje:** Object Pascal (Free Pascal 3.2.2 / Lazarus)  
**Arquitectura:** Win32 (x86 32-bit PE)  
**Requisitos de Sistema:** Windows XP Service Pack 3 o superior, Windows 7, 8, 10 y 11.  
**Consumo de Memoria:** < 15 MB de RAM en ejecución.

---

## 1. Instalador y Ejecutables Listos para Usar

El instalador oficial ha sido compilado con **Inno Setup 5.6.1 (versión final certificada para Windows XP SP3)** y está disponible en las siguientes ubicaciones para prueba inmediata:

* **Instalador Oficial:** [`aeterna-xp/setup.exe`](file:///d:/Aeterna/aeterna-xp/setup.exe) (o [`aeterna-xp/instalador.exe`](file:///d:/Aeterna/aeterna-xp/instalador.exe))
* **Carpeta de Instaladores:** [`aeterna-xp/installer/setup_aeterna_xp.exe`](file:///d:/Aeterna/aeterna-xp/installer/setup_aeterna_xp.exe)
* **Binario Portátil Directo:** [`aeterna-xp/bin/AeternaXP.exe`](file:///d:/Aeterna/aeterna-xp/bin/AeternaXP.exe) (requiere `config.ini`, `libeay32.dll` y `ssleay32.dll` en la misma carpeta).

### Instrucciones para Probar en Windows XP:
1. Copie el archivo `setup.exe` a un pendrive o compártalo en red con la PC con Windows XP SP3 (o Windows 7/10/11).
2. Ejecute `setup.exe`. El asistente en español guiará la instalación.
3. Se creará un acceso directo en el Escritorio y en el Menú Inicio (*Aeterna XP*).
4. Al abrirlo, el sistema se conectará en tiempo real con Supabase Cloud vía TLS 1.2 usando las DLLs OpenSSL incluidas.

---

## 2. Módulos Incluidos en la Aplicación

1. **Tablero Ejecutivo (KPIs en Tiempo Real):**
   * Indicadores de ocupación catastral de parcelas.
   * Total histórico de actas del libro de inhumaciones (203 actas registradas).
   * Padrón de afiliados al seguro de sepelio, con detección de morosidad (3 meses y 3 años).
   * Recaudación de caja diaria discriminada (efectivo y digital).

2. **Catastro y Parcelas:**
   * Mapa de sectores: **Sector A**, **Sector E** y **Sector Salinas**.
   * Filtros por sector y por estado (disponible, ocupada, reservada).
   * Visualizador tabular con titular y fecha de último pago.
   * Botón para registrar cobro de mantenimiento anual con emisión automática de recibo oficial por duplicado en PDF.

3. **Libro Parroquial de Inhumaciones:**
   * Registro histórico con más de 200 actas conectadas a Supabase.
   * Búsqueda rápida por nombre de difunto o DNI.
   * Generación instantánea de **Acta Oficial de Inhumación (PDF)** y **Folio Completo del Libro (PDF)** con apertura automática en el visor de documentos.

4. **Seguro de Sepelio y Afiliados:**
   * Matriz de cobranzas y cuotas.
   * Detección y alerta visual de morosidad: *Al Día*, *Aviso: Mora >= 3 meses*, *Urgente: Riesgo de Baja >= 3 años*.
   * Registro de cobro de cuotas con comprobante PDF.
   * Emisión de la **Planilla de Ruta para Cobrador Domiciliario (PDF)** con casillas para firma.

5. **Caja Diaria y Arqueo:**
   * Libro de movimientos y comprobantes emitidos en el día.
   * Totalizadores automáticos de Efectivo vs. Transferencias / QR.
   * Cierre diario de caja con emisión de **Acta de Arqueo y Cierre (PDF)**.

6. **Centro de Reportes PDF Nativos (`fpPDF`):**
   * Emisión con un solo clic de los 5 documentos oficiales vectoriales sin dependencias de software externo.
   * Botón de acceso directo a la carpeta de reportes generados.

---

## 3. Conectividad Segura con Supabase en Windows XP

Para garantizar que una terminal con Windows XP (que carece de TLS 1.2 en su subsistema nativo) se comunique sin problemas con la nube de Supabase:

* Se implementó el cliente HTTP en Object Pascal (`uSynapseHttp.pas` / `uSupabaseClient.pas`).
* El instalador distribuye las bibliotecas OpenSSL 32-bit (`libeay32.dll` y `ssleay32.dll`), permitiendo handshake TLS 1.2 / 1.3 directo contra:
  ```text
  https://xftwykrxumzxaqhosbvt.supabase.co/rest/v1/
  ```

---

## 4. Instrucciones de Recompilación

### Compilación del Ejecutable (`AeternaXP.exe`):
Con Free Pascal 32-bit (`fpc.exe`):
```bash
tools\fpc\app\bin\i386-win32\fpc.exe -Fu"aeterna-xp\src\core" -Fu"aeterna-xp\src\services" -Fu"aeterna-xp\src\reports" -Fu"aeterna-xp\src\app" -FE"aeterna-xp\bin" "aeterna-xp\AeternaXP.pas"
```

### Compilación del Instalador (`setup_aeterna_xp.exe`):
Con Inno Setup 5.6.1 (`ISCC.exe`):
```bash
tools\inno5\app\ISCC.exe "aeterna-xp\installer\setup_aeterna_xp.iss"
```

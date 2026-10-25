# Aeterna XP - Suite de Escritorio Nativa para Windows XP

**Versión:** 1.0.0-XP  
**Lenguaje:** Object Pascal (Lazarus / Free Pascal Compiler)  
**Arquitectura:** Win32 (x86 32-bit PE)  
**Requisitos de Sistema:** Windows XP Service Pack 3 o superior, 64 MB de RAM mínimo (diseñado para máquinas con hasta 2 GB de RAM).  
**Consumo de Memoria:** ~20 a 25 MB de RAM en ejecución.

---

## 1. Descripción General

Aeterna XP es el cliente nativo de escritorio para la administración integral del **Cementerio Parque San Nicolás y Mutual de Sepelios**. 

Ha sido desarrollado para operar de forma ultraliviana y fluida en terminales antiguas con Windows XP SP3, manteniendo una **sincronización en tiempo real con la nube (Supabase)** y emitiendo **reportes vectoriales en PDF de forma nativa** sin depender de software pesado de terceros.

---

## 2. Módulos Incluidos

1. **Dashboard y Actividad Global:** Tarjetas de estado con indicadores de ocupación (52%), parcelas en mora, afiliados a seguro y balance de caja diaria en tiempo real.
2. **Catastro y Parcelas:** Visualizador tabular y por sectores (Sector A, Sector E, Salinas), con código de colores según estado (disponible, ocupada, en mora, standby) y ficha técnica de parcela con historial.
3. **Libro de Actas de Inhumaciones:** Registro de servicios fúnebres con protocolo estándar o especial COVID-19, empresa funebrera, responsable y emisión inmediata de actas oficiales.
4. **Afiliados al Seguro de Sepelio:** Padrón de mutual con matriz de cuotas anuales (Enero a Diciembre), detector automático de afiliados en mora (>= 3 meses), modal de cobranza y planilla de ruta domiciliaria.
5. **Caja Diaria y Arqueo:** Registro automático de cobros (efectivo y transferencias), balance en tiempo real y proceso de arqueo de cierre con conciliación física de billetes.
6. **Motor de Reportes PDF Nativos (`fpPDF`):** Generación de documentos oficiales con tipografía vectorial clara y líneas de corte:
   * *Acta Oficial de Inhumación*
   * *Folio del Libro de Inhumaciones*
   * *Recibo de Cobranza Oficial (Original y Talón Control)*
   * *Planilla de Ruta para Cobrador*
   * *Acta de Arqueo y Cierre Diario de Caja*

---

## 3. Conectividad Segura con Supabase en Windows XP

Windows XP carece de soporte nativo para TLS 1.2 y TLS 1.3 en su subsistema `schannel.dll`. Para resolver esto de forma definitiva y segura:

* El programa incluye su propio adaptador HTTP (`uSynapseHttp.pas` / `uSupabaseClient.pas`).
* Carga de forma local las librerías independientes de OpenSSL 1.1.1 de 32 bits (`libeay32.dll` y `ssleay32.dll`) ubicadas en la carpeta de la aplicación.
* Se comunica directamente con los endpoints PostgREST de Supabase:
  ```text
  https://xftwykrxumzxaqhosbvt.supabase.co/rest/v1/
  ```

---

## 4. Instrucciones de Compilación

### Opción A: Compilar desde el Entorno Lazarus IDE
1. Descargar e instalar **Lazarus 2.2.x o 3.x (32-bit i386-win32)** desde [Lazarus IDE](https://www.lazarus-ide.org/).
2. Abrir el archivo de proyecto `aeterna-xp\AeternaXP.lpi`.
3. Seleccionar el modo de compilación **Release**.
4. Ir al menú **Ejecutar -> Construir Todo (Shift + F9)**.
5. El ejecutable optimizado `AeternaXP.exe` se generará automáticamente en la carpeta `aeterna-xp\bin\`.

### Opción B: Compilación por Línea de Comandos (`lazbuild`)
Ejecutar en la terminal:
```bash
lazbuild --build-mode=Release aeterna-xp\AeternaXP.lpi
```

---

## 5. Generación del Instalador para Windows XP (`setup_aeterna_xp.exe`)

1. Instalar [Inno Setup 5 o 6](https://jrsoftware.org/isdl.php).
2. Abrir el archivo `aeterna-xp\installer\setup_aeterna_xp.iss`.
3. Hacer clic en **Build -> Compile (Ctrl + F9)**.
4. Se generará el instalador `setup_aeterna_xp.exe`, listo para copiar en un pendrive y ejecutar en cualquier PC con Windows XP.

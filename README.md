# Aeterna Parque - Sistema de Gestión Mortuoria & Catastro Parcelario

Sistema integral de gestión de cementerio parque municipal, administración de catastro parcelario, libro digital de inhumaciones, padrón de seguro de sepelio y cobranzas interoperables mediante QR (Transferencias 3.0 / BCRA).

## 🚀 Características Principales

- **Dashboard Operativo en Tiempo Real:** Métricas de ocupación catastral, mora de mantenimiento, recaudación del día y actividad reciente.
- **Catastro Parcelario Integral:** Mapeo de parcelas por sectores (Sector A tradicional, Sector E parque, Salinas), niveles de fosa (1 a 3), titulares, DNI y saldos de mantenimiento.
- **Libro Digital de Inhumaciones:** Registro de actas de defunción, protocolos sanitarios especiales (COVID-19 según Ley Sanitaria 4.120), empresas fúnebres intervinientes y trazabilidad de fosas.
- **Padrón de Seguro de Sepelio:** Control de cobradores en calle, hojas de ruta por zonas, matriz interactiva de cuotas anuales (Enero a Diciembre) y cobranzas al día.
- **Cobranzas Interoperables QR:** Generación de código QR estándar BCRA con CBU y Alias interoperable de Tesorería, integración con WhatsApp para envío de comprobantes y cierre de caja diario.
- **Persistencia Híbrida / Cloud:** Conexión en tiempo real con Supabase (PostgreSQL) con fallback offline a almacenamiento local.
- **Diseño Ultra-Responsive:** Optimizado bajo los lineamientos del design system municipal de Stitch e Impeccable Design, con soporte fluido desde resoluciones compactas de 320px hasta monitores ultrawide.

## 🛠️ Tecnologías

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS.
- **Base de Datos & Backend:** Supabase (PostgreSQL, Row Level Security, RPC).
- **Testing & E2E:** Vitest, Playwright.
- **Iconografía & Tipografía:** Google Material Symbols, Plus Jakarta Sans, Inter, Roboto Mono.

## 📦 Instalación y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/sendeiser/Aeterna.git
   cd Aeterna
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   Crear un archivo `.env` en la raíz con las credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_supabase_project_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

4. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Ejecutar suite de pruebas:
   ```bash
   npm test
   ```

6. Compilar para producción:
   ```bash
   npm run build
   ```

## 🏛️ Jurisdicción y Normativa
Desarrollado para el Cementerio Parque Municipal Este de Chamical, La Rioja, conforme a Ordenanzas Funerarias Municipales y normativa AFIP RG 1415.

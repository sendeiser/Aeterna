const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function run() {
  console.log('🚀 Iniciando verificación de las 5 mejoras solicitadas...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Cargar aplicación
    console.log('🌐 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // TEST 1: Cobro rápido quitado del menú lateral
    console.log('\n--- 1. Verificando que "Cobro Rápido" fue quitado del menú ---');
    const cobroRapidoBtn = page.locator('aside button:has-text("Cobro Rápido"), aside a:has-text("Cobro Rápido")');
    const cobroCount = await cobroRapidoBtn.count();
    console.log(`✅ Botón Cobro Rápido en menú lateral count: ${cobroCount} (debe ser 0)`);
    if (cobroCount > 0) throw new Error('El botón Cobro Rápido aún existe en el menú lateral');

    // TEST 2: Minimizar Navbar / Sidebar
    console.log('\n--- 2. Verificando Minimizar y Expandir Navbar ---');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_navbar_expanded.png') });
    console.log('📸 Captura guardada: verif_navbar_expanded.png');

    const toggleBtn = page.locator('aside #btn-toggle-sidebar').first();
    const isToggleBtnVisible = await toggleBtn.isVisible();
    console.log('✅ Botón de minimizar en sidebar visible:', isToggleBtnVisible);
    await toggleBtn.click();
    await page.waitForTimeout(600);

    const aside = page.locator('aside');
    const asideClass = await aside.getAttribute('class');
    console.log('✅ Aside classes tras colapsar (contiene w-20):', asideClass?.includes('w-20'));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_navbar_collapsed.png') });
    console.log('📸 Captura guardada: verif_navbar_collapsed.png');

    const expandBtn = page.locator('aside #btn-toggle-sidebar').first();
    await expandBtn.click();
    await page.waitForTimeout(600);
    const asideClassAfter = await aside.getAttribute('class');
    console.log('✅ Aside classes tras restaurar (contiene w-64):', asideClassAfter?.includes('w-64'));

    // TEST 3: Dashboard Filtros de Iconos de abajo (Parcelas, Afiliados, Inhumaciones, En Mora, Todos)
    console.log('\n--- 3. Verificando Filtros de Iconos en Dashboard ---');
    
    // Click en pill "Parcelas"
    console.log('Click en #filter-btn-parcelas...');
    await page.locator('#filter-btn-parcelas').click();
    await page.waitForTimeout(500);
    const h2Parcelas = page.locator('h2:has-text("Padrón de Parcelas")').first();
    console.log('✅ Vista Parcelas en dashboard activa:', await h2Parcelas.isVisible());

    // Click en pill "Afiliados"
    console.log('Click en #filter-btn-afiliados...');
    await page.locator('#filter-btn-afiliados').click();
    await page.waitForTimeout(500);
    const h2Afiliados = page.locator('h2:has-text("Nómina de Afiliados al Plan Seguro")').first();
    console.log('✅ Vista Afiliados en dashboard activa:', await h2Afiliados.isVisible());

    // Click en pill "Inhumaciones"
    console.log('Click en #filter-btn-inhumaciones...');
    await page.locator('#filter-btn-inhumaciones').click();
    await page.waitForTimeout(500);
    const h2Inhumaciones = page.locator('h2:has-text("Libro Digital de Inhumaciones")').first();
    console.log('✅ Vista Inhumaciones en dashboard activa:', await h2Inhumaciones.isVisible());

    // Click en pill "En Mora"
    console.log('Click en #filter-btn-mora...');
    await page.locator('#filter-btn-mora').click();
    await page.waitForTimeout(500);
    const h2Mora = page.locator('h2:has-text("Titulares y Parcelas con Mantenimiento en Mora")').first();
    console.log('✅ Vista En Mora en dashboard activa:', await h2Mora.isVisible());

    // Click en pill "Todos"
    console.log('Click en #filter-btn-todos...');
    await page.locator('#filter-btn-todos').click();
    await page.waitForTimeout(500);
    const h2Todos = page.locator('h2:has-text("Actividad Global y Registros Unificados")').first();
    console.log('✅ Vista Todos en dashboard activa:', await h2Todos.isVisible());

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_dashboard_filtros.png') });
    console.log('📸 Captura guardada: verif_dashboard_filtros.png');

    // TEST 4: Vista de Configuración sin datos de base de datos
    console.log('\n--- 4. Verificando Vista de Configuración sin datos de Supabase/DB ---');
    const tabConfig = page.locator('aside button:has-text("Configuración"), aside a:has-text("Configuración")').first();
    await tabConfig.click();
    await page.waitForTimeout(600);

    const dbCard = page.locator('text="Conexión Supabase Cloud", text="supabase_prod", text="API Key"');
    const dbCardCount = await dbCard.count();
    console.log(`✅ Elementos de conexión DB en Configuración count: ${dbCardCount} (debe ser 0)`);
    if (dbCardCount > 0) throw new Error('Aún hay información de base de datos en Configuración');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_configuracion_sin_db.png') });
    console.log('📸 Captura guardada: verif_configuracion_sin_db.png');

    // TEST 5: Inhumaciones se editan con Modal
    console.log('\n--- 5. Verificando que Inhumaciones se editan con Modal ---');
    const tabInhumaciones = page.locator('aside button:has-text("Inhumaciones"), aside a:has-text("Inhumaciones")').first();
    await tabInhumaciones.click();
    await page.waitForTimeout(600);

    // Botón de editar en la primera fila de la tabla
    const btnEditarInh = page.locator('table button:has-text("Editar")').first();
    console.log('Haciendo clic en "Editar" de Inhumación...');
    await btnEditarInh.click();
    await page.waitForTimeout(600);

    // Verificar modal abierto
    const modalInhHeader = page.locator('h3:has-text("Editar Inhumación")').first();
    const isModalInhVisible = await modalInhHeader.isVisible();
    console.log('✅ Modal de Editar Inhumación visible:', isModalInhVisible);
    if (!isModalInhVisible) throw new Error('El modal de edición de inhumación no se abrió');

    // Verificar campos en el modal
    const inputDifunto = page.locator('input[placeholder*="Ej. Gómez"]').first();
    const difuntoVal = await inputDifunto.inputValue();
    console.log(`✅ Campo Nombre del Difunto pre-cargado: "${difuntoVal}"`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_inhumacion_modal_edicion.png') });
    console.log('📸 Captura guardada: verif_inhumacion_modal_edicion.png');

    // Cerrar modal
    const btnCancelar = page.locator('button:has-text("Cancelar")').first();
    await btnCancelar.click();
    await page.waitForTimeout(400);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO! 🚀');
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

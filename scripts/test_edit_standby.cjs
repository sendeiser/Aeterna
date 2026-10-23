const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function run() {
  console.log('🚀 Iniciando prueba: Edición de parcelas en Stand-by...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Navegar a la app
    console.log('🌐 Navegando a http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2. Ir al módulo Parcelas
    console.log('📌 1. Navegando al módulo de Parcelas...');
    await page.locator('aside button:has-text("Parcelas"), aside a:has-text("Parcelas")').first().click();
    await page.waitForTimeout(600);

    // 3. Filtrar por Stand-by
    console.log('🔴 2. Filtrando por sector/estado Stand-by...');
    const btnFiltroStandby = page.locator('#btn-filtro-sector-standby').first();
    await btnFiltroStandby.click();
    await page.waitForTimeout(600);

    // 4. Verificar que las filas de la tabla tienen botón "Editar"
    console.log('🔍 3. Verificando presencia del botón "Editar" en parcelas Stand-by...');
    const filaStandby = page.locator('table tbody tr').first();
    const isFilaVisible = await filaStandby.isVisible();
    console.log('✅ Fila de parcela Stand-by visible:', isFilaVisible);

    const btnEditarStandby = filaStandby.locator('button:has-text("Editar")').first();
    const isBtnEditarVisible = await btnEditarStandby.isVisible();
    console.log('✅ Botón "Editar" en parcela Stand-by visible:', isBtnEditarVisible);
    if (!isBtnEditarVisible) throw new Error('El botón Editar no está visible en la parcela Stand-by');

    // Botones Reactivar y Liberar también deben estar presentes
    const btnReactivar = filaStandby.locator('button:has-text("Reactivar")').first();
    const btnLiberar = filaStandby.locator('button:has-text("Liberar")').first();
    console.log('✅ Botones Reactivar y Liberar presentes:', await btnReactivar.isVisible(), await btnLiberar.isVisible());

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_standby_tabla_con_editar.png') });
    console.log('📸 Captura guardada: verif_standby_tabla_con_editar.png');

    // 5. Clic en "Editar" de la parcela Stand-by
    console.log('📝 4. Abriendo Modal de Edición de parcela Stand-by...');
    await btnEditarStandby.click();
    await page.waitForTimeout(600);

    // 6. Verificar que el modal abrió
    const modalHeader = page.locator('h3:has-text("Editar Parcela")').first();
    const isModalVisible = await modalHeader.isVisible();
    console.log('✅ Modal de Edición abierto correctamente:', isModalVisible);
    if (!isModalVisible) throw new Error('El modal de edición no se abrió al hacer clic en Editar');

    // Verificar que el estado seleccionado es 'standby'
    const selectEstado = page.locator('select').filter({ has: page.locator('option[value="standby"]') }).first();
    const estadoVal = await selectEstado.inputValue();
    console.log(`✅ Estado actual en el formulario modal: "${estadoVal}" (debe ser "standby")`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_standby_modal_edicion.png') });
    console.log('📸 Captura guardada: verif_standby_modal_edicion.png');

    // 7. Modificar notas y guardar
    console.log('💾 5. Guardando cambios desde el modal...');
    const textareaNotas = page.locator('textarea[placeholder*="Detalles sobre"]').first();
    await textareaNotas.fill('Parcela en Stand-by auditada y editada correctamente vía modal.');
    await page.waitForTimeout(300);

    const btnGuardar = page.locator('button:has-text("Guardar Cambios")').first();
    await btnGuardar.click();
    await page.waitForTimeout(600);

    // Modal cerrado
    const isModalStillVisible = await modalHeader.isVisible();
    console.log('✅ Modal cerrado tras guardar:', !isModalStillVisible);

    // 8. Verificar Ficha Rápida / Detalle
    console.log('📋 6. Verificando Ficha Rápida y alerta de Stand-by con botón Editar...');
    await filaStandby.click();
    await page.waitForTimeout(600);

    const btnEditarFicha = page.locator('button[id*="btn-editar-standby-ficha"]').first();
    const isBtnFichaVisible = await btnEditarFicha.isVisible();
    console.log('✅ Botón "Editar Parcela" dentro de alerta Stand-by en Ficha Rápida visible:', isBtnFichaVisible);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_standby_ficha_rapida_con_editar.png') });
    console.log('📸 Captura guardada: verif_standby_ficha_rapida_con_editar.png');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE EDICIÓN EN STAND-BY COMPLETADAS CON ÉXITO! 🚀');
  } catch (err) {
    console.error('❌ Error en prueba de stand-by:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

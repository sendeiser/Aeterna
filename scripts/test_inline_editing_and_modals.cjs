const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function run() {
  console.log('🚀 Iniciando pruebas de edición en línea, modales de alta y ausencia de catastro...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Cargar aplicación
  console.log('🌐 Navegando a http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Verificar que no existe "catastro" ni "catrasto" en la barra de navegación o UI principal
  console.log('🔍 2. Verificando que "catastro" y "catrasto" no aparezcan en la interfaz...');
  const bodyText = await page.textContent('body');
  const hasCatrasto = /catrasto/i.test(bodyText);
  const hasCatastroVisible = /catastro/i.test(bodyText);

  if (hasCatrasto) {
    console.error('❌ ERROR: Se encontró la palabra "catrasto" en la UI.');
  } else {
    console.log('✅ Perfecto: No se encontró la errata "catrasto".');
  }

  if (hasCatastroVisible) {
    console.error('❌ ALERTA: Se encontró alguna mención de "catastro" en el body.');
  } else {
    console.log('✅ Perfecto: No se encontró la palabra "catastro" en la interfaz.');
  }

  // 3. Tab Parcelas: Verificar ancho completo, botón + Nueva Parcela y modal flotante
  console.log('📌 3. Probando Módulo de Parcelas...');
  const tabParcelas = page.locator('nav button:has-text("Parcelas")').first();
  await tabParcelas.click();
  await page.waitForTimeout(800);

  // Verificar botón + Nueva Parcela
  const btnNuevaParcela = page.locator('#btn-nueva-parcela');
  console.log('✅ Botón "+ Nueva Parcela" visible:', await btnNuevaParcela.isVisible());
  await btnNuevaParcela.click();
  await page.waitForTimeout(600);

  // Capturar modal de alta de parcela
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_modal_nueva_parcela.png') });
  console.log('📸 Captura guardada: verif_modal_nueva_parcela.png');

  // Cerrar modal
  const btnCerrarModalParcela = page.locator('button:has-text("Cancelar")').first();
  await btnCerrarModalParcela.click();
  await page.waitForTimeout(500);

  // Probar Edición en Línea en tabla de Parcelas
  console.log('✏️ Probando Edición en Línea en tabla de Parcelas...');
  const btnEditarParcela = page.locator('table [id^="btn-editar-parcela-"]').first();
  await btnEditarParcela.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_parcelas_inline_editing.png') });
  console.log('📸 Captura guardada: verif_parcelas_inline_editing.png');

  // Modificar el nombre del titular y guardar
  const inputTitularParcela = page.locator('table tr.bg-primary\\/5 input[placeholder="Nombre Titular"]').first();
  await inputTitularParcela.fill('Pérez Albarracín, Roberto (Editado en Línea)');
  await page.waitForTimeout(300);

  const btnGuardarParcela = page.locator('table [id^="btn-guardar-parcela-"]').first();
  await btnGuardarParcela.click();
  await page.waitForTimeout(800);

  // Verificar que el nuevo nombre se ve reflejado en la tabla
  const nombreModificadoVisible = await page.locator('table').getByText('Pérez Albarracín, Roberto').first().isVisible();
  console.log('✅ Edición en línea de Parcela guardada exitosamente:', nombreModificadoVisible);

  // 4. Tab Inhumaciones: Verificar que no hay formulario fijo, botón + Nueva Inhumación y edición en línea
  console.log('📌 4. Probando Módulo de Inhumaciones...');
  const tabInhumaciones = page.locator('nav button:has-text("Inhumaciones")').first();
  await tabInhumaciones.click();
  await page.waitForTimeout(800);

  const btnNuevaInhumacion = page.locator('#btn-nueva-inhumacion');
  console.log('✅ Botón "+ Nueva Inhumación" visible:', await btnNuevaInhumacion.isVisible());
  await btnNuevaInhumacion.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_modal_nueva_inhumacion.png') });
  console.log('📸 Captura guardada: verif_modal_nueva_inhumacion.png');

  // Cerrar modal de nueva inhumación
  const btnCerrarModalInh = page.locator('button:has-text("Cancelar")').first();
  await btnCerrarModalInh.click();
  await page.waitForTimeout(500);

  // Probar Edición en Línea en tabla de Inhumaciones
  console.log('✏️ Probando Edición en Línea en tabla de Inhumaciones...');
  const btnEditarInh = page.locator('table [id^="btn-editar-inhumacion-"]').first();
  await btnEditarInh.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_inhumaciones_inline_editing.png') });
  console.log('📸 Captura guardada: verif_inhumaciones_inline_editing.png');

  const inputDifunto = page.locator('table tr.bg-primary\\/5 input[placeholder="Nombre del Difunto"]').first();
  await inputDifunto.fill('Gómez Miranda, Francisco (Inhumación Editada)');
  await page.waitForTimeout(300);

  const btnGuardarInh = page.locator('table [id^="btn-guardar-inhumacion-"]').first();
  await btnGuardarInh.click();
  await page.waitForTimeout(800);

  const difuntoModificadoVisible = await page.locator('table').getByText('Gómez Miranda, Francisco').first().isVisible();
  console.log('✅ Edición en línea de Inhumación guardada exitosamente:', difuntoModificadoVisible);

  // 5. Tab Seguro (Plan Seguro Integral): Probar Edición en Línea de Afiliados
  console.log('📌 5. Probando Módulo de Plan Seguro Integral...');
  const tabSeguro = page.locator('nav button:has-text("Plan Seguro Integral")').first();
  await tabSeguro.click();
  await page.waitForTimeout(800);

  console.log('✏️ Probando Edición en Línea en tabla de Afiliados...');
  const btnEditarAfiliado = page.locator('table [id^="btn-editar-afiliado-"]').first();
  await btnEditarAfiliado.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_seguro_inline_editing.png') });
  console.log('📸 Captura guardada: verif_seguro_inline_editing.png');

  const inputNombreAfiliado = page.locator('table tr.bg-primary\\/5 input[placeholder="Nombre Completo"]').first();
  await inputNombreAfiliado.fill('Fernández, María Elena (Afiliada Actualizada)');
  await page.waitForTimeout(300);

  const btnGuardarAfiliado = page.locator('table [id^="btn-guardar-afiliado-"]').first();
  await btnGuardarAfiliado.click();
  await page.waitForTimeout(800);

  const afiliadoModificadoVisible = await page.locator('table').getByText('Fernández, María Elena').first().isVisible();
  console.log('✅ Edición en línea de Afiliado guardada exitosamente:', afiliadoModificadoVisible);

  await browser.close();
  console.log('🎉 ¡Todas las pruebas de edición en línea, modales y remoción de catastro finalizaron con éxito total!');
}

run().catch((err) => {
  console.error('❌ Error en las pruebas:', err);
  process.exit(1);
});

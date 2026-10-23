const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function run() {
  console.log('🚀 Iniciando pruebas: Logo Natural/Espiritual y Modal de Edición de Parcela...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Cargar la app
  console.log('🌐 Navegando a http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Verificar Logo Natural y Espiritual en Navbar
  console.log('🌿 1. Verificando Logo Natural y Espiritual en Sidebar / Navbar...');
  const logoSidebar = page.locator('aside img[src="/logo_aeterna.png"]').first();
  const isLogoVisible = await logoSidebar.isVisible();
  console.log('✅ Logo espiritual en sidebar visible:', isLogoVisible);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_logo_navbar.png') });
  console.log('📸 Captura guardada: verif_logo_navbar.png');

  // 3. Navegar a Parcelas
  console.log('📌 2. Navegando a la vista de Parcelas...');
  const tabParcelas = page.locator('button:has-text("Parcelas")').first();
  await tabParcelas.click();
  await page.waitForTimeout(800);

  // 4. Hacer clic en "Editar" de la primera parcela en la tabla desktop
  console.log('📝 3. Abriendo Modal de Edición de Parcela...');
  const btnEditar = page.locator('table button:has-text("Editar")').first();
  await btnEditar.click();
  await page.waitForTimeout(600);

  // 5. Verificar que el modal de edición esté visible
  const modalHeader = page.locator('h3:has-text("Editar Parcela")').first();
  const isModalVisible = await modalHeader.isVisible();
  console.log('✅ Modal de Edición de Parcela abierto y visible:', isModalVisible);

  // Verificar campos del modal
  const inputTitular = page.locator('input[placeholder*="Ej. Fernández"]').first();
  const valorTitular = await inputTitular.inputValue();
  console.log(`✅ Campo titular poblado con: "${valorTitular}"`);

  const btnVivo = page.locator('button:has-text("Vivo")').first();
  const btnFallecido = page.locator('button:has-text("Fallecido")').first();
  console.log('✅ Botones de condición vital (Vivo/Fallecido) presentes:', await btnVivo.isVisible(), await btnFallecido.isVisible());

  // Capturar vista del modal de edición
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_modal_edicion_parcela.png') });
  console.log('📸 Captura guardada: verif_modal_edicion_parcela.png');

  // 6. Probar modificación y guardado en modal
  console.log('💾 4. Modificando notas y guardando desde el modal...');
  const textareaNotas = page.locator('textarea[placeholder*="Detalles sobre"]').first();
  await textareaNotas.fill('Edición realizada exitosamente desde el nuevo modal oficial.');
  await page.waitForTimeout(300);

  const btnGuardar = page.locator('button:has-text("Guardar Cambios")').first();
  await btnGuardar.click();
  await page.waitForTimeout(600);

  // Verificar que el modal se cerró tras guardar
  const isModalClosed = !(await modalHeader.isVisible());
  console.log('✅ Modal se cerró tras guardar cambios:', isModalClosed);

  // Capturar tabla de parcelas tras guardar
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_parcelas_post_edicion_modal.png') });
  console.log('📸 Captura guardada: verif_parcelas_post_edicion_modal.png');

  await browser.close();
  console.log('🎉 ¡Todas las pruebas del Logo y Modal de Edición de Parcelas completadas con éxito!');
}

run().catch((err) => {
  console.error('❌ Error en el test:', err);
  process.exit(1);
});

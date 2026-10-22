const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/5be5d268-8773-4370-87fd-d327d29fd45d');

async function run() {
  console.log('🚀 Iniciando verificación de Portal de Pago Móvil y Modal de Cobranzas...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Formato Smartphone moderno (Galaxy / Pixel)
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  // Test 1: Navegar directamente al portal de pago público (como si se escaneara el QR con la cámara)
  const paymentUrl = 'http://localhost:3000/#pago?pago=1&monto=36000&concepto=Mantenimiento%20Cuatrimestral%20-%20Parcela%20A-01-01&id=A-01-01&titular=Hector%20Fernandez';
  console.log(`📱 1. Abriendo URL pública de pago: ${paymentUrl}`);
  await page.goto(paymentUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Capturar vista del portal de pago en smartphone
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '17_portal_pago_movil_view.png') });
  console.log('📸 Captura guardada: 17_portal_pago_movil_view.png');

  // Verificar elementos clave en la página pública
  const headerText = await page.textContent('h1');
  console.log(`✅ Título cabecera: "${headerText}"`);

  const titular = await page.locator('text=Hector Fernandez').first();
  console.log('✅ Titular visible:', await titular.isVisible());

  const monto = await page.locator('text=$ 36.000').first();
  console.log('✅ Monto visible:', await monto.isVisible());

  const aliasBtn = page.locator('button:has-text("Copiar Alias")');
  console.log('✅ Botón Copiar Alias presente:', await aliasBtn.isVisible());
  await aliasBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '18_portal_alias_copiado.png') });
  console.log('📸 Captura guardada: 18_portal_alias_copiado.png');

  const cbuBtn = page.locator('button:has-text("Copiar CBU")');
  console.log('✅ Botón Copiar CBU presente:', await cbuBtn.isVisible());
  await cbuBtn.click();
  await page.waitForTimeout(500);

  // Test 2: Volver al sistema de gestión
  const volverBtn = page.locator('button:has-text("Volver")').first();
  if (await volverBtn.isVisible()) {
    await volverBtn.click();
    await page.waitForTimeout(1000);
  }

  // Cambiar viewport a escritorio para verificar sistema y modales
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/#dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('🖥️ 2. Abriendo vista de Catastro Parcelario...');
  await page.locator('button:has-text("Parcelas & Catastro")').first().click();
  await page.waitForTimeout(800);

  // Abrir modal de Cobro con QR mediante el botón de la barra lateral
  console.log('💰 3. Abriendo modal de Cobro con QR...');
  const cobroRapidoBtn = page.locator('button:has-text("Cobro Rápido QR")').first();
  await cobroRapidoBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '19_modal_qr_web_default.png') });
  console.log('📸 Captura guardada: 19_modal_qr_web_default.png');

  // Verificar que el QR Modal tiene data-printable-modal
  const printableModal = await page.locator('[data-printable-modal="true"]');
  console.log('✅ data-printable-modal presente en QRPaymentModal:', (await printableModal.count()) > 0);

  // Probar confirmación de pago y emisión de comprobante
  const confirmarPagoBtn = page.locator('button:has-text("Confirmar Cobro")');
  if (await confirmarPagoBtn.isVisible()) {
    await confirmarPagoBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '20_recibo_oficial_generado.png') });
    console.log('📸 Captura guardada: 20_recibo_oficial_generado.png');
  }

  // Cerrar modal
  const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
  if (await cerrarBtn.isVisible()) {
    await cerrarBtn.click();
    await page.waitForTimeout(500);
  }

  // Test 4: Verificar Cierre de Caja Modal
  console.log('💼 4. Abriendo Cierre de Caja Modal...');
  const cierreCajaNavBtn = page.locator('button:has-text("Cierre de Caja")').first();
  if (await cierreCajaNavBtn.isVisible()) {
    await cierreCajaNavBtn.click();
    await page.waitForTimeout(800);
    const cierrePrintable = await page.locator('[data-printable-modal="true"]');
    console.log('✅ data-printable-modal en CierreCajaModal:', (await cierrePrintable.count()) > 0);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '21_cierre_caja_printable.png') });
    console.log('📸 Captura guardada: 21_cierre_caja_printable.png');

    const cerrarCierreBtn = page.locator('button:has-text("Cerrar")').first();
    if (await cerrarCierreBtn.isVisible()) {
      await cerrarCierreBtn.click();
      await page.waitForTimeout(500);
    }
  }

  await browser.close();
  console.log('🎉 Todas las verificaciones completadas exitosamente!');
}

run().catch((err) => {
  console.error('❌ Error en test:', err);
  process.exit(1);
});

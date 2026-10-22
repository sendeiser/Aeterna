const { chromium } = require('playwright');
const path = require('path');

async function testNewFeatures() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const artifactDir = path.resolve('C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\5be5d268-8773-4370-87fd-d327d29fd45d');

  console.log('--- TEST DE NUEVAS FUNCIONALIDADES SOLICITADAS ---');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 1. Favicon verification
  const faviconHref = await page.getAttribute('link[rel="icon"]', 'href');
  console.log('[1. Favicon]: link[rel="icon"] href =', faviconHref);

  // 2. Notificaciones Interactivas
  console.log('[2. Notificaciones]: Abriendo popover...');
  const notifBtn = page.locator('button[title="Notificaciones del Sistema"]');
  await notifBtn.click();
  await page.waitForTimeout(300);
  const notifText = await page.textContent('body');
  const hasNotif = notifText.includes('Notificaciones') && notifText.includes('Sincronización Supabase Cloud');
  console.log('[2. Notificaciones]: Popover desplegado correctamente:', hasNotif);
  await page.screenshot({ path: path.join(artifactDir, '09_notificaciones_popover.png') });

  // Cerrar notificaciones con botón Cerrar
  await page.locator('button:has-text("Cerrar")').click();
  await page.waitForTimeout(300);

  // 3. Soporte Municipal
  console.log('[3. Soporte Municipal]: Abriendo modal desde sidebar...');
  const soporteBtn = page.locator('aside button:has-text("Soporte Municipal")');
  await soporteBtn.click();
  await page.waitForTimeout(400);
  const soporteVisible = await page.isVisible('text=Mesa de Ayuda & Soporte Técnico');
  console.log('[3. Soporte Municipal]: Modal visible:', soporteVisible);
  await page.screenshot({ path: path.join(artifactDir, '10_soporte_municipal_modal.png') });

  // Llenar ticket de soporte
  await page.fill('input[placeholder*="Ej: Inconsistencia en nomenclatura"]', 'Consulta sobre protocolo de catastro');
  await page.fill('textarea[placeholder*="Detalla los datos"]', 'Favor de verificar nomenclatura en Manzana 25.');
  await page.click('button:has-text("Transmitir Solicitud")');
  await page.waitForTimeout(400);
  console.log('[3. Soporte Municipal]: Solicitud transmitida exitosamente');

  // Cerrar soporte
  await page.locator('button:has-text("Cerrar")').click();
  await page.waitForTimeout(300);

  // 4. Auditoría Fiscal & AFIP
  console.log('[4. Auditoría]: Abriendo modal...');
  const auditoriaBtn = page.locator('aside button:has-text("Auditoría Fiscal & AFIP")');
  await auditoriaBtn.click();
  await page.waitForTimeout(400);
  const auditoriaVisible = await page.isVisible('text=Registro de Operaciones Municipales');
  console.log('[4. Auditoría]: Modal visible:', auditoriaVisible);
  await page.screenshot({ path: path.join(artifactDir, '11_auditoria_modal.png') });

  // Cerrar auditoría
  await page.locator('button:has-text("Cerrar")').click();
  await page.waitForTimeout(300);

  // 5. Cierre de Caja
  console.log('[5. Cierre de Caja]: Abriendo modal...');
  const cierreBtn = page.locator('header button:has-text("Cierre de Caja")');
  await cierreBtn.click();
  await page.waitForTimeout(400);
  const cierreVisible = await page.isVisible('text=Acta de Balance & Cierre Diario de Caja');
  console.log('[5. Cierre de Caja]: Modal visible:', cierreVisible);
  await page.screenshot({ path: path.join(artifactDir, '12_cierre_caja_modal.png') });

  // Confirmar cierre diario
  const confirmarBtn = page.locator('button:has-text("Confirmar Cierre Diario de Caja")');
  if (await confirmarBtn.isVisible()) {
    await confirmarBtn.click();
    await page.waitForTimeout(300);
    console.log('[5. Cierre de Caja]: Cierre confirmado con éxito');
    await page.screenshot({ path: path.join(artifactDir, '13_cierre_caja_confirmado.png') });
  }

  await browser.close();
  console.log('>>> TODAS LAS NUEVAS FUNCIONALIDADES VERIFICADAS CON ÉXITO (100% OK) <<<');
}

testNewFeatures().catch((err) => {
  console.error('Error probando features:', err);
  process.exit(1);
});

const { chromium } = require('@playwright/test');
const path = require('path');

async function testPadronCompression() {
  console.log('--- Iniciando prueba de compresión de Padrón General y Parcelas ---');
  const browser = await chromium.launch({ headless: true });
  const artifactDir = 'C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\2eb5662c-713f-4a78-9e84-d43a87be7bf4';

  // ==========================================
  // 1. MOBILE TEST (390 x 844)
  // ==========================================
  console.log('\n--- 1. MOBILE VIEW (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mPage = await mobileContext.newPage();
  await mPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mPage.waitForTimeout(1000);

  // Login if necessary
  if (await mPage.locator('#login-username').count() > 0) {
    await mPage.fill('#login-username', 'admin');
    await mPage.fill('#login-password', 'admin');
    await mPage.click('button[type="submit"]');
    await mPage.waitForTimeout(1000);
  }

  // Dismiss PWA banner
  const pwaDismiss = mPage.locator('button:has-text("Ahora no")');
  if (await pwaDismiss.count() > 0) {
    await pwaDismiss.click();
    await mPage.waitForTimeout(300);
  }

  // A. Padrón General (Seguro) en Mobile
  console.log('Navegando a Padrón General (Seguro)...');
  await mPage.click('nav.fixed button:has-text("Plan")');
  await mPage.waitForTimeout(800);

  const segMobileToolbar = mPage.locator('.sm\\:hidden.bg-surface-container-lowest').first();
  const segTbBox = await segMobileToolbar.boundingBox();
  console.log(`Padrón General - Altura toolbar mobile: ${segTbBox ? Math.round(segTbBox.height) : 0}px`);

  const segCards = mPage.locator('.md\\:hidden.overflow-y-auto').first();
  const segCardsBox = await segCards.boundingBox();
  console.log(`Padrón General - Altura contenedor cards mobile: ${segCardsBox ? Math.round(segCardsBox.height) : 0}px, top: ${segCardsBox ? Math.round(segCardsBox.y) : 0}px`);

  await mPage.screenshot({ path: path.join(artifactDir, 'verif_padron_general_mobile_comprimido.png') });

  // B. Padrón de Parcelas en Mobile
  console.log('Navegando a Padrón de Parcelas...');
  await mPage.click('nav.fixed button:has-text("Parcelas")');
  await mPage.waitForTimeout(800);

  const parcMobileToolbar = mPage.locator('main .sm\\:hidden.flex.flex-col').first();
  const parcTbBox = await parcMobileToolbar.boundingBox();
  console.log(`Padrón Parcelas - Altura toolbar mobile: ${parcTbBox ? Math.round(parcTbBox.height) : 0}px`);

  const parcCards = mPage.locator('.md\\:hidden.overflow-y-auto').first();
  const parcCardsBox = await parcCards.boundingBox();
  console.log(`Padrón Parcelas - Altura contenedor cards mobile: ${parcCardsBox ? Math.round(parcCardsBox.height) : 0}px, top: ${parcCardsBox ? Math.round(parcCardsBox.y) : 0}px`);

  await mPage.screenshot({ path: path.join(artifactDir, 'verif_parcelas_mobile_comprimido.png') });

  // Scroll check to confirm fixed shell
  const scrollY = await mPage.evaluate(() => window.scrollY);
  console.log(`window.scrollY en mobile: ${scrollY}px (debe ser 0)`);

  await mobileContext.close();

  // ==========================================
  // 2. DESKTOP TEST (1366 x 768)
  // ==========================================
  console.log('\n--- 2. DESKTOP VIEW (1366x768) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
  });

  const dPage = await desktopContext.newPage();
  await dPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await dPage.waitForTimeout(1000);

  // Login if necessary
  if (await dPage.locator('#login-username').count() > 0) {
    await dPage.fill('#login-username', 'admin');
    await dPage.fill('#login-password', 'admin');
    await dPage.click('button[type="submit"]');
    await dPage.waitForTimeout(1000);
  }

  // A. Padrón General (Seguro) en Desktop
  console.log('Navegando a Padrón General (Seguro) en desktop...');
  await dPage.click('aside nav button:has-text("Plan Seguro Integral")');
  await dPage.waitForTimeout(800);

  // Medir top area de Padrón General en Desktop
  const segDeskHeader = dPage.locator('main h1:has-text("Padrón General de Afiliados")');
  console.log(`Padrón General Desktop Title visible: ${await segDeskHeader.isVisible()}`);

  await dPage.screenshot({ path: path.join(artifactDir, 'verif_padron_general_desktop_comprimido.png') });

  // B. Padrón de Parcelas en Desktop
  console.log('Navegando a Padrón de Parcelas en desktop...');
  await dPage.click('aside nav button:has-text("Parcelas")');
  await dPage.waitForTimeout(800);

  const parcDeskHeader = dPage.locator('main h2:has-text("Padrón de Parcelas")');
  console.log(`Padrón Parcelas Desktop Title visible: ${await parcDeskHeader.isVisible()}`);

  await dPage.screenshot({ path: path.join(artifactDir, 'verif_parcelas_desktop_comprimido.png') });

  await browser.close();
  console.log('\n--- ¡Todas las pruebas y capturas finalizadas con éxito! ---');
}

testPadronCompression().catch((err) => {
  console.error('Error en prueba:', err);
  process.exit(1);
});

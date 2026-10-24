const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function testMobileFixedLayout() {
  console.log('--- Iniciando prueba de Layout Fijo y Máxima Altura en Mobile ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14/15 viewport
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check login
  const loginInput = page.locator('#login-username');
  if (await loginInput.count() > 0) {
    console.log('Iniciando sesión como admin...');
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }

  // Dismiss PWA banner if present
  const pwaDismiss = page.locator('button:has-text("Ahora no")');
  if (await pwaDismiss.count() > 0) {
    await pwaDismiss.click();
    await page.waitForTimeout(300);
  }

  // 1. Navegar a Parcelas
  console.log('Navegando a Padrón de Parcelas...');
  const parcelasTabBtn = page.locator('nav.fixed button:has-text("Parcelas")');
  await parcelasTabBtn.click();
  await page.waitForTimeout(800);

  // 2. Medir Toolbar comprimido
  const toolbar = page.locator('main .bg-surface-container-lowest.rounded.border').first();
  const tbBox = await toolbar.boundingBox();
  console.log(`Altura del Toolbar en mobile: ${tbBox ? Math.round(tbBox.height) : 0}px (esperado <= 85px)`);

  // 3. Medir Cards Container y altura vertical
  const cardsContainer = page.locator('.md\\:hidden.overflow-y-auto').first();
  const cBox = await cardsContainer.boundingBox();
  console.log(`Posición del listado de cards: top=${cBox ? Math.round(cBox.y) : 0}px, height=${cBox ? Math.round(cBox.height) : 0}px, bottom=${cBox ? Math.round(cBox.y + cBox.height) : 0}px`);

  // Capturar screenshot inicial de Parcelas en mobile
  const artifactDir = 'C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\2eb5662c-713f-4a78-9e84-d43a87be7bf4';
  const parcelasShot = path.join(artifactDir, 'verif_parcelas_mobile_fijo_maximo.png');
  await page.screenshot({ path: parcelasShot });
  console.log(`Screenshot guardado en ${parcelasShot}`);

  // 4. Probar scroll dentro de la lista de cards
  const scrollYBefore = await page.evaluate(() => window.scrollY);
  console.log(`window.scrollY antes de scroll: ${scrollYBefore}px`);

  // Desplazar 300px la lista de cards
  await cardsContainer.evaluate((el) => {
    el.scrollTop = 300;
  });
  await page.waitForTimeout(300);

  const listScrollTop = await cardsContainer.evaluate((el) => el.scrollTop);
  const scrollYAfter = await page.evaluate(() => window.scrollY);
  console.log(`List scrollTop después de scroll: ${listScrollTop}px (debe ser > 0)`);
  console.log(`window.scrollY después de scroll: ${scrollYAfter}px (debe ser 0, pantalla fija)`);

  if (scrollYAfter !== 0) {
    throw new Error(`¡ERROR! window.scrollY es ${scrollYAfter}, la pantalla no está fija`);
  }

  // 5. Navegar a Inhumaciones
  console.log('Navegando a Inhumaciones...');
  const inhTabBtn = page.locator('nav.fixed button:has-text("Inhumaciones")');
  await inhTabBtn.click();
  await page.waitForTimeout(800);

  const inhCardsContainer = page.locator('.md\\:hidden.overflow-y-auto').first();
  const inhBox = await inhCardsContainer.boundingBox();
  console.log(`Inhumaciones cards height: ${inhBox ? Math.round(inhBox.height) : 0}px`);

  const inhShot = path.join(artifactDir, 'verif_inhumaciones_mobile_fijo.png');
  await page.screenshot({ path: inhShot });

  // 6. Navegar a Seguro (en mobile el shortLabel es 'Plan' con icono 'security')
  console.log('Navegando a Seguro (Plan)...');
  const segTabBtn = page.locator('nav.fixed button:has-text("Plan")');
  await segTabBtn.click();
  await page.waitForTimeout(800);

  const segCardsContainer = page.locator('.md\\:hidden.overflow-y-auto').first();
  const segBox = await segCardsContainer.boundingBox();
  console.log(`Seguro cards height: ${segBox ? Math.round(segBox.height) : 0}px`);

  const segShot = path.join(artifactDir, 'verif_seguro_mobile_fijo.png');
  await page.screenshot({ path: segShot });

  await browser.close();
  console.log('--- ¡Prueba exitosa! Pantalla fija comprobada y altura maximizada ---');
}

testMobileFixedLayout().catch((err) => {
  console.error('Error en prueba mobile:', err);
  process.exit(1);
});

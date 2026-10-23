const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Verify Parcelas Table
  console.log('Checking Parcelas view...');
  // Ensure we are on Parcelas tab
  const parcelasTab = page.locator('button:has-text("Parcelas"), a:has-text("Parcelas")').first();
  if (await parcelasTab.isVisible()) {
    await parcelasTab.click();
    await page.waitForTimeout(1000);
  }

  // Get first 10 titular text contents from the table
  const titularCells = await page.locator('tbody tr td:nth-child(2)').allTextContents();
  console.log('First 10 parcel titulares displayed:', titularCells.slice(0, 10));

  const screenshotDir = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');
  await page.screenshot({ path: path.join(screenshotDir, 'verif_parcelas_nombres_limpios.png'), fullPage: false });
  console.log('Captured verif_parcelas_nombres_limpios.png');

  // Check if any titular is all uppercase or stuck together
  const hasStuckTogether = titularCells.some(t => /^[A-Z]{12,}$/.test(t.replace(/\s+/g, '')));
  console.log('Any stuck-together all-caps name in first 10?', hasStuckTogether);

  // 2. Verify Seguro / Afiliados View
  console.log('Navigating to Seguro view...');
  const seguroBtn = page.locator('button:has-text("Seguro"), a:has-text("Seguro")').first();
  await seguroBtn.click();
  await page.waitForTimeout(1000);

  const afiTitulares = await page.locator('tbody tr td:nth-child(2)').allTextContents();
  console.log('Afiliados titulares displayed:', afiTitulares);

  await page.screenshot({ path: path.join(screenshotDir, 'verif_seguro_nombres_limpios.png'), fullPage: false });
  console.log('Captured verif_seguro_nombres_limpios.png');

  // 3. Verify Inhumaciones View
  console.log('Navigating to Inhumaciones view...');
  const inhBtn = page.locator('button:has-text("Inhumaciones"), a:has-text("Inhumaciones")').first();
  await inhBtn.click();
  await page.waitForTimeout(1000);

  const inhTitulares = await page.locator('tbody tr td:nth-child(2)').allTextContents();
  console.log('First 8 Inhumaciones displayed:', inhTitulares.slice(0, 8));

  await page.screenshot({ path: path.join(screenshotDir, 'verif_inhumaciones_nombres_limpios.png'), fullPage: false });
  console.log('Captured verif_inhumaciones_nombres_limpios.png');

  await browser.close();
  console.log('Verification finished successfully!');
})();

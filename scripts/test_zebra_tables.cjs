const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000');

  // Login
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);

  const artifactDir = 'C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\2eb5662c-713f-4a78-9e84-d43a87be7bf4';

  // Mobile view test
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.click('nav.lg\\:hidden button:has-text("Parcelas")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'verif_tablas_parcelas_mobile_zebra.png') });
  console.log('Saved verif_tablas_parcelas_mobile_zebra.png');

  await browser.close();
})();

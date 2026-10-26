const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (await page.locator('#login-username').count() > 0) {
    await page.fill('#login-username', 'admin');
    await page.fill('#login-password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }
  await page.click('aside nav button:has-text("Inhumaciones")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4/verif_inhumaciones_sin_banner.png' });
  await browser.close();
  console.log('OK');
})();

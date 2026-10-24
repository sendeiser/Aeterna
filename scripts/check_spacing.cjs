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

  // Navigate to Parcelas
  await page.click('button:has-text("Parcelas")');
  await page.waitForTimeout(600);

  // Check buttons with id btn-toggle-sidebar and btn-topbar-toggle-sidebar
  const topbarToggleCount = await page.locator('#btn-topbar-toggle-sidebar').count();
  const sidebarToggleCount = await page.locator('#btn-toggle-sidebar').count();
  console.log('Topbar toggle button count (should be 0):', topbarToggleCount);
  console.log('Sidebar toggle button count (should be 1):', sidebarToggleCount);

  const headerBox = await page.locator('header').boundingBox();
  const toolbarCard = await page.locator('.bg-surface-container-lowest.rounded.border').first().boundingBox();
  const gap = toolbarCard.y - (headerBox.y + headerBox.height);
  console.log('Current gap between header and first component:', gap, 'px');

  // Screenshot with expanded sidebar
  const artifactDir = 'C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\2eb5662c-713f-4a78-9e84-d43a87be7bf4';
  await page.screenshot({ path: path.join(artifactDir, 'verif_espaciado_compacto_navbar_unico.png') });
  console.log('Saved verif_espaciado_compacto_navbar_unico.png');

  // Click toggle button to collapse sidebar
  await page.click('#btn-toggle-sidebar');
  await page.waitForTimeout(500);

  // Screenshot with collapsed sidebar
  await page.screenshot({ path: path.join(artifactDir, 'verif_navbar_minimizado_compacto.png') });
  console.log('Saved verif_navbar_minimizado_compacto.png');

  // Click toggle button again to expand
  await page.click('#btn-toggle-sidebar');
  await page.waitForTimeout(500);

  await browser.close();
})();

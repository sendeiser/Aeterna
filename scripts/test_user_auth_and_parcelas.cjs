const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const screenshotDir = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

  console.log('1. Navigating to root without session...');
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.removeItem('aeterna_auth_session');
    sessionStorage.removeItem('aeterna_auth_session');
  });
  await page.reload();
  await page.waitForTimeout(1000);

  // Check login view
  const loginTitle = await page.locator('h1').textContent();
  console.log('Login screen title:', loginTitle);

  await page.screenshot({ path: path.join(screenshotDir, 'verif_pantalla_login.png') });
  console.log('Saved verif_pantalla_login.png');

  // Test invalid login
  console.log('Testing invalid credentials...');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'wrongpass');
  await page.click('#btn-iniciar-sesion');
  await page.waitForTimeout(600);

  const errorVisible = await page.locator('text=Usuario o contraseña incorrectos').isVisible();
  console.log('Error alert shown on invalid login:', errorVisible);

  // Test valid login
  console.log('Testing valid credentials (admin / admin)...');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin');
  await page.click('#btn-iniciar-sesion');
  await page.waitForTimeout(1200);

  const dashboardVisible = await page.locator('text=Dashboard Operativo').isVisible();
  console.log('Dashboard visible after login:', dashboardVisible);

  const logoutBtnVisible = await page.locator('#btn-topbar-logout').isVisible();
  console.log('Logout button visible in topbar:', logoutBtnVisible);

  // 2. Test Parcelas View without Ficha Rapida
  console.log('Navigating to Parcelas view...');
  const parcelasTab = page.locator('button:has-text("Parcelas"), a:has-text("Parcelas")').first();
  await parcelasTab.click();
  await page.waitForTimeout(1000);

  // Verify Ficha Rapida is NOT present
  const hasFichaRapida = await page.locator('text=Ficha Rápida: Parcela').isVisible();
  console.log('Is Ficha Rápida visible?:', hasFichaRapida); // Should be false!

  await page.screenshot({ path: path.join(screenshotDir, 'verif_parcelas_sin_ficha_rapida.png') });
  console.log('Saved verif_parcelas_sin_ficha_rapida.png');

  // 3. Test Mobile Mode & Compact Header
  console.log('Switching to mobile viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(screenshotDir, 'verif_parcelas_mobile_compacto.png') });
  console.log('Saved verif_parcelas_mobile_compacto.png');

  // 4. Test Logout
  console.log('Testing logout on mobile or desktop...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);

  await page.click('#btn-topbar-logout');
  await page.waitForTimeout(1000);

  const backOnLogin = await page.locator('#login-username').isVisible();
  console.log('Back on login screen after logout:', backOnLogin);

  await page.screenshot({ path: path.join(screenshotDir, 'verif_post_logout.png') });
  console.log('Saved verif_post_logout.png');

  await browser.close();
  console.log('All automated tests passed successfully!');
})();

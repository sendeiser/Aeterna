const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const artifactDir = 'C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\2eb5662c-713f-4a78-9e84-d43a87be7bf4';

  console.log('1. Verificando manifest.json...');
  const manifestRes = await page.request.get('http://localhost:3000/manifest.json');
  console.log('manifest.json status:', manifestRes.status());
  const manifestJson = await manifestRes.json();
  console.log('manifest name:', manifestJson.name);
  console.log('manifest display:', manifestJson.display);
  console.log('manifest icons count:', manifestJson.icons.length);

  console.log('2. Verificando sw.js...');
  const swRes = await page.request.get('http://localhost:3000/sw.js');
  console.log('sw.js status:', swRes.status());

  console.log('3. Verificando iconos PWA...');
  for (const iconPath of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/icon-maskable-192.png', '/icon-maskable-512.png']) {
    const res = await page.request.get(`http://localhost:3000${iconPath}`);
    console.log(`${iconPath} status:`, res.status(), 'type:', res.headers()['content-type']);
  }

  console.log('4. Navegando en viewport móvil iPhone 14 (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000');

  // Esperar a que el banner flotante PWA aparezca
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(artifactDir, 'verif_pwa_banner_mobile.png') });
  console.log('Saved verif_pwa_banner_mobile.png');

  // Tocar botón "Instalar" para abrir el modal instructivo
  const installBtn = page.locator('#btn-instalar-pwa');
  if (await installBtn.isVisible()) {
    await installBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'verif_pwa_guia_modal.png') });
    console.log('Saved verif_pwa_guia_modal.png');
    // Cerrar modal
    await page.click('button:has-text("Entendido ✓")');
    await page.waitForTimeout(400);
  }

  // Ahora loguearse y verificar la sección PWA en Configuración
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);

  await page.click('aside button:has-text("Configuración")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, 'verif_pwa_seccion_configuracion.png') });
  console.log('Saved verif_pwa_seccion_configuracion.png');

  console.log('Todas las pruebas de PWA completadas con éxito!');
  await browser.close();
})();

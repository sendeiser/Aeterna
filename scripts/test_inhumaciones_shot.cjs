const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Si estamos en la pantalla de login, loguearse con admin/admin
  const btnLogin = page.locator('button:has-text("Iniciar Sesión"), button:has-text("Ingresar")').first();
  if (await btnLogin.isVisible()) {
    const userField = page.locator('input[type="text"]').first();
    const passField = page.locator('input[type="password"]').first();
    await userField.fill('admin');
    await passField.fill('admin');
    await btnLogin.click();
    await page.waitForTimeout(1500);
  }

  // Click on Inhumaciones nav/pill
  const inhNav = page.locator('button:has-text("Inhumaciones"), a:has-text("Inhumaciones"), #filter-btn-inhumaciones').first();
  await inhNav.click();
  await page.waitForTimeout(2000);

  const shotPath = path.resolve('scripts/verif_inhumaciones_corregidas.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved screenshot to:', shotPath);

  // Obtener filas de la tabla
  const rows = await page.locator('table tbody tr').count();
  console.log(`Total filas visibles en tabla: ${rows}`);

  // Tomar muestra de las primeras 8 filas
  for (let i = 0; i < Math.min(rows, 8); i++) {
    const tr = page.locator('table tbody tr').nth(i);
    const difunto = await tr.locator('td:nth-child(2) div.font-semibold').innerText().catch(() => '');
    const parcela = await tr.locator('td:nth-child(3)').innerText().catch(() => '');
    console.log(`Fila ${i+1}: Difunto: "${difunto.trim()}" | Parcela: "${parcela.replace(/\s+/g, ' ').trim()}"`);
  }

  await browser.close();
}

test().catch(console.error);

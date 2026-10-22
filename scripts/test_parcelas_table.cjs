const { chromium } = require('playwright');
const path = require('path');

async function testParcelasTable() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const artifactDir = path.resolve('C:\\Users\\TinChoX\\.gemini\\antigravity-ide\\brain\\5be5d268-8773-4370-87fd-d327d29fd45d');

  console.log('--- TEST DE TABLA DE PARCELAS (TODAS 398 Y SECTOR E) ---');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Ir a la pestaña Parcelas & Catastro
  await page.click('button:has-text("Parcelas & Catastro")');
  await page.waitForTimeout(500);

  // 1. Verificar conteo de filas en el DOM
  const tableRows = page.locator('tbody tr');
  const countInitial = await tableRows.count();
  console.log(`[Todos (398)]: Filas renderizadas en la tabla: ${countInitial}`);

  // 2. Verificar presencia de Sector E en la lista completa
  const hasSectorE = await page.locator('tbody tr:has-text("E-13-")').count();
  console.log(`[Todos (398)]: Filas de Sector E encontradas en "Todos": ${hasSectorE}`);

  // Tomar captura de la vista inicial
  await page.screenshot({ path: path.join(artifactDir, '14_parcelas_todos_398.png') });

  // 3. Probar filtro "Sector E (57)"
  console.log('Filtrando por Sector E...');
  await page.click('button:has-text("Sector E (57)")');
  await page.waitForTimeout(400);

  const countSecE = await tableRows.count();
  console.log(`[Sector E (57)]: Filas mostradas en tabla: ${countSecE}`);
  await page.screenshot({ path: path.join(artifactDir, '15_parcelas_sector_e.png') });

  // 4. Volver a "Todos (398)" y hacer scroll hacia Sector E
  console.log('Volviendo a Todos (398)...');
  await page.click('button:has-text("Todos (398)")');
  await page.waitForTimeout(400);

  const scrollContainer = page.locator('.max-h-\\[460px\\]');
  await scrollContainer.evaluate((el) => {
    el.scrollTop = el.scrollHeight; // Scroll al final
  });
  await page.waitForTimeout(400);

  // Captura mostrando el final con Sector E y el header sólido sin solapamiento
  await page.screenshot({ path: path.join(artifactDir, '16_parcelas_scroll_sector_e.png') });

  await browser.close();
  console.log('>>> TEST TABLA PARCELAS COMPLETADO EXITOSAMENTE <<<');
}

testParcelasTable().catch((err) => {
  console.error('Error en test:', err);
  process.exit(1);
});

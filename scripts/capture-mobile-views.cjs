const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 320, height: 640 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Dashboard
  console.log('Capturing Dashboard at 320px...');
  await page.screenshot({ path: '.mobile_320_dashboard.png', fullPage: true });

  // 2. Click Parcelas tab in bottom nav
  console.log('Switching to Parcelas tab...');
  const parcelasBtn = page.locator('nav.fixed button:has-text("Parcelas")');
  await parcelasBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Parcelas cards view at 320px...');
  await page.screenshot({ path: '.mobile_320_parcelas_cards.png', fullPage: true });

  // Click Formulario toggle
  const formToggle = page.locator('button:has-text("Ficha / Formulario")');
  if (await formToggle.count() > 0) {
    await formToggle.click();
    await page.waitForTimeout(500);
    console.log('Capturing Parcelas form view at 320px...');
    await page.screenshot({ path: '.mobile_320_parcelas_form.png', fullPage: true });
    // Switch back to lista
    await page.locator('button:has-text("Lista de Parcelas")').click();
    await page.waitForTimeout(500);
  }

  // 3. Click Inhumaciones tab
  console.log('Switching to Inhumaciones tab...');
  const inhumacionesBtn = page.locator('nav.fixed button:has-text("Inhumaciones")');
  await inhumacionesBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Inhumaciones at 320px...');
  await page.screenshot({ path: '.mobile_320_inhumaciones.png', fullPage: true });

  // 4. Click Seguro tab
  console.log('Switching to Seguro tab...');
  const seguroBtn = page.locator('nav.fixed button:has-text("Seguro")');
  await seguroBtn.click();
  await page.waitForTimeout(800);
  console.log('Capturing Seguro at 320px...');
  await page.screenshot({ path: '.mobile_320_seguro.png', fullPage: true });

  // 5. Open QR Modal
  console.log('Opening Cobro QR Modal...');
  const qrBtn = page.locator('header button[title="Escanear Código QR"]');
  await qrBtn.click();
  await page.waitForTimeout(600);
  console.log('Capturing Cobro QR Modal at 320px...');
  await page.screenshot({ path: '.mobile_320_qr_modal.png' });

  await browser.close();
  console.log('All 320px mobile screenshots captured successfully.');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});

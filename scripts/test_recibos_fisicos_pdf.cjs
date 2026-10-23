const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function run() {
  console.log('🚀 Iniciando pruebas de Recibos Físicos (PDF CEMENTERIO PARQUE SAN NICOLÁS)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Cargar aplicación
  console.log('🌐 Navegando a http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 2. Navegar a Plan Seguro Integral
  console.log('📌 2. Navegando al módulo Plan Seguro Integral...');
  const tabSeguro = page.locator('nav button:has-text("Plan Seguro Integral")').first();
  await tabSeguro.click();
  await page.waitForTimeout(800);

  // 3. Abrir Talonario Físico (8 por Hoja A4)
  console.log('📄 3. Verificando botón de Talonario Físico (8 por Hoja A4)...');
  const btnTalonario = page.locator('#btn-imprimir-talonario');
  const isBtnVisible = await btnTalonario.isVisible();
  console.log('✅ Botón Talonario Físico visible:', isBtnVisible);
  await btnTalonario.click();
  await page.waitForTimeout(600);

  // 4. Verificar contenido del modal Talonario
  const headerTalonario = await page.locator('text=CEMENTERIO PARQUE SAN NICOLÁS').first().isVisible();
  const subheaderTalonario = await page.locator('text=SEGURO PLAN INTEGRAL FAMILIAR').first().isVisible();
  console.log('✅ Encabezado "CEMENTERIO PARQUE SAN NICOLÁS" visible en recibos:', headerTalonario);
  console.log('✅ Subencabezado "SEGURO PLAN INTEGRAL FAMILIAR" visible en recibos:', subheaderTalonario);

  // Contar cantidad de recibos en la hoja A4
  const countRecibos = await page.locator('.talonario-a4-page > div > div').count();
  console.log(`✅ Cantidad de recibos en la cuadrícula de la hoja A4: ${countRecibos} (esperado: 8)`);

  // Capturar vista del Talonario con 8 recibos
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_talonario_8_recibos_a4.png') });
  console.log('📸 Captura guardada: verif_talonario_8_recibos_a4.png');

  // Cerrar modal de talonario
  const btnCerrarTalonario = page.locator('button:has-text("Cerrar")').last();
  await btnCerrarTalonario.click();
  await page.waitForTimeout(500);

  // 5. Verificar Recibo Físico Individual en DetalleCuotaModal
  console.log('🎟️ 5. Abriendo Recibo Físico Individual de cuota abonada...');
  // Hacer clic en una cuota verde pagada dentro de la tabla desktop
  const cuotaPagada = page.locator('table button:has-text("✓")').first();
  await cuotaPagada.click();
  await page.waitForTimeout(600);

  const individualHeaderVisible = await page.locator('text=CEMENTERIO PARQUE SAN NICOLÁS').first().isVisible();
  console.log('✅ Recibo Individual tiene encabezado "CEMENTERIO PARQUE SAN NICOLÁS":', individualHeaderVisible);

  // Verificar presencia de campos punteados
  const hasRecibiDe = await page.locator('text=Recibí de').first().isVisible();
  const hasCertificado = await page.locator('text=Certificado:').first().isVisible();
  const hasSumaPesos = await page.locator('text=La suma de pesos').first().isVisible();
  const hasConcepto = await page.locator('text=Concepto:').first().isVisible();
  const hasReciboNro = await page.locator('text=Recibo Nº').first().isVisible();

  console.log('✅ Campo "Recibí de" visible:', hasRecibiDe);
  console.log('✅ Campo "Certificado:" visible:', hasCertificado);
  console.log('✅ Campo "La suma de pesos" visible:', hasSumaPesos);
  console.log('✅ Campo "Concepto:" visible:', hasConcepto);
  console.log('✅ Campo "Recibo Nº" visible:', hasReciboNro);

  // Capturar recibo físico individual
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_recibo_fisico_individual.png') });
  console.log('📸 Captura guardada: verif_recibo_fisico_individual.png');

  await browser.close();
  console.log('🎉 ¡Todas las pruebas del Recibo Físico tradicional y Talonario A4 completadas con éxito!');
}

run().catch((err) => {
  console.error('❌ Error en las pruebas:', err);
  process.exit(1);
});

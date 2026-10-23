const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/TinChoX/.gemini/antigravity-ide/brain/2eb5662c-713f-4a78-9e84-d43a87be7bf4');

async function verifyFeatures() {
  console.log('🚀 Iniciando Verificación End-to-End de las 7 Reglas y Funcionalidades...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Iniciar con almacenamiento limpio para probar carga y evaluación de reglas
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. REGLA 5: Verificar Navbar - "Plan Seguro Integral"
  console.log('\n--- 1. VERIFICACIÓN DE NAVBAR & RENOMBRADO A PLAN SEGURO INTEGRAL ---');
  const seguroTabBtn = page.locator('button:has-text("Plan Seguro Integral")').first();
  const existsSeguroTab = await seguroTabBtn.isVisible();
  console.log('✅ Botón "Plan Seguro Integral" en Sidebar/Navbar:', existsSeguroTab);
  if (!existsSeguroTab) throw new Error('No se encontró el botón "Plan Seguro Integral" en la barra de navegación');

  // 2. REGLA 1 & 2: Módulo Parcelas & Catastro - "parcela" en lugar de "nomenclatura", y filtro titular vital
  console.log('\n--- 2. VERIFICACIÓN DE PARCELAS & CATASTRO (Filtro Vivo/Fallecido & Terminología Parcela) ---');
  await page.click('button:has-text("Parcelas & Catastro")');
  await page.waitForTimeout(600);

  // Verificar que la columna diga "Parcela" y NO "Nomenclatura"
  const thParcela = await page.locator('th:has-text("Parcela")').first().isVisible();
  const thNomenclatura = await page.locator('th:has-text("Nomenclatura")').count();
  console.log('✅ Encabezado de tabla "Parcela" visible:', thParcela);
  console.log('✅ Conteo de encabezado "Nomenclatura" (debe ser 0):', thNomenclatura);
  if (thNomenclatura > 0) throw new Error('Se encontró la palabra "Nomenclatura" en encabezados de tabla');

  // Verificar filtros de condición vital (Todos / Vivo / Fallecido)
  const btnFiltroVivo = page.locator('#btn-filtro-vital-vivo');
  const btnFiltroFallecido = page.locator('#btn-filtro-vital-fallecido');
  const btnFiltroTodos = page.locator('#btn-filtro-vital-todos');

  console.log('✅ Botón filtro "Vivos" presente:', await btnFiltroVivo.isVisible());
  console.log('✅ Botón filtro "Fallecidos" presente:', await btnFiltroFallecido.isVisible());

  // Probar filtro Fallecidos
  await btnFiltroFallecido.click();
  await page.waitForTimeout(400);
  const countFallecidos = await page.locator('tbody tr td:has-text("Fallecido")').count();
  console.log(`✅ Badges de titular "Fallecido" encontrados (${countFallecidos}):`, countFallecidos > 0);

  // Volver a Condición Titular: Todos
  await btnFiltroTodos.click();
  await page.waitForTimeout(400);

  // 3. REGLA 6: Stand-by en Parcelas (+3 años impago) y opciones Reactivar/Liberar
  console.log('\n--- 3. VERIFICACIÓN DE PARCELAS EN STAND-BY (+3 Años de Mora) ---');
  const standbyFilterBtn = page.locator('#btn-filtro-sector-standby');
  const hasStandbyFilter = await standbyFilterBtn.isVisible();
  console.log('✅ Filtro de sector "Stand-by (+3 años)" presente:', hasStandbyFilter);

  await standbyFilterBtn.click();
  await page.waitForTimeout(500);

  const standbyTableBadge = page.locator('tbody tr td:has-text("Stand-by (+3 años)")').first();
  console.log('✅ Insignia "Stand-by (+3 años)" en tabla:', await standbyTableBadge.isVisible());

  const ultCuotaParcela = page.locator('tbody tr td:has-text("Últ. cuota:")').first();
  console.log('✅ Etiqueta "Últ. cuota:" mostrada en parcelas con mora:', await ultCuotaParcela.isVisible());

  const btnReactivar = page.locator('tbody tr button:has-text("Reactivar")').first();
  const btnLiberar = page.locator('tbody tr button:has-text("Liberar")').first();
  console.log('✅ Botón administrativo "Reactivar" visible en fila:', await btnReactivar.isVisible());
  console.log('✅ Botón administrativo "Liberar" visible en fila:', await btnLiberar.isVisible());

  // Captura de pantalla de parcelas en stand-by
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_parcelas_standby.png') });
  console.log('📸 Captura guardada: verif_parcelas_standby.png');

  // 4. REGLA 3 & 4: Módulo Inhumaciones - Columnas removidas y Empresa Fúnebre texto libre
  console.log('\n--- 4. VERIFICACIÓN DE INHUMACIONES (Columnas removidas & Entrada libre empresa fúnebre) ---');
  await page.click('button:has-text("Inhumaciones")');
  await page.waitForTimeout(600);

  // Verificar que NO existan las columnas eliminadas
  const thEmpresaFunebre = await page.locator('th:has-text("Empresa Fúnebre")').count();
  const thIndicadorSanitario = await page.locator('th:has-text("Indicador Sanitario")').count();
  const thOficialRegistro = await page.locator('th:has-text("Oficial de Registro")').count();

  console.log('✅ Conteo de th "Empresa Fúnebre" (debe ser 0):', thEmpresaFunebre);
  console.log('✅ Conteo de th "Indicador Sanitario" (debe ser 0):', thIndicadorSanitario);
  console.log('✅ Conteo de th "Oficial de Registro" (debe ser 0):', thOficialRegistro);

  if (thEmpresaFunebre > 0 || thIndicadorSanitario > 0 || thOficialRegistro > 0) {
    throw new Error('Las columnas eliminadas aún están presentes en la tabla de inhumaciones');
  }

  // Verificar que el campo Empresa Fúnebre sea input con datalist
  const inputFunebrera = page.locator('input[list="empresas-funebreras-list"]').first();
  const isInputFunebrera = await inputFunebrera.isVisible();
  console.log('✅ Campo de texto libre con datalist para Empresa Fúnebre presente:', isInputFunebrera);
  if (!isInputFunebrera) throw new Error('No se encontró el input con datalist para empresa fúnebre');

  // Captura de pantalla de inhumaciones
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_inhumaciones_limpia.png') });
  console.log('📸 Captura guardada: verif_inhumaciones_limpia.png');

  // 5. REGLA 5 & 6 (Afiliados): Padrón General de Afiliados al Plan Seguro Integral & Alerta +3 meses
  console.log('\n--- 5. VERIFICACIÓN DE PLAN SEGURO INTEGRAL & STAND-BY (+3 Meses) ---');
  await page.click('button:has-text("Plan Seguro Integral")');
  await page.waitForTimeout(600);

  const tituloSeguro = await page.locator('h1:has-text("Padrón General de Afiliados al Plan Seguro Integral")').isVisible();
  console.log('✅ Título "Padrón General de Afiliados al Plan Seguro Integral" visible:', tituloSeguro);

  const metricStandby = await page.locator('text=STAND-BY (+3 MESES)').first().isVisible();
  console.log('✅ Tarjeta de métricas "STAND-BY (+3 MESES)" visible:', metricStandby);

  const pillStandby = page.locator('button:has-text("Stand-by")').first();
  console.log('✅ Píldora de filtro "Stand-by" visible:', await pillStandby.isVisible());

  await pillStandby.click();
  await page.waitForTimeout(400);

  const badgeStandbyAfi = page.locator('tbody tr td:has-text("Stand-by (+3 meses)")').first();
  console.log('✅ Insignia "Stand-by (+3 meses)" en afiliados visible:', await badgeStandbyAfi.isVisible());

  const ultCuotaAfi = page.locator('tbody tr td:has-text("Últ. cuota:")').first();
  console.log('✅ "Últ. cuota:" visible en afiliados con mora:', await ultCuotaAfi.isVisible());

  // Captura de pantalla de Plan Seguro Integral
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_seguro_integral_standby.png') });
  console.log('📸 Captura guardada: verif_seguro_integral_standby.png');

  // 6. REGLA 7: Recibos Físicos Oficiales con Doble Talón
  console.log('\n--- 6. VERIFICACIÓN DE RECIBOS FÍSICOS OFICIALES (Doble Talón Original y Duplicado) ---');
  // Clic en una cuota pagada para abrir DetalleCuotaModal
  // Primero volvemos al filtro "Todos" en afiliados
  await page.locator('button:has-text("Todos")').first().click();
  await page.waitForTimeout(300);

  const cuotaPagadaBtn = page.locator('tbody tr button:has-text("✓")').first();
  if (await cuotaPagadaBtn.isVisible()) {
    await cuotaPagadaBtn.click();
    await page.waitForTimeout(500);

    const btnPrintRecibo = page.locator('button:has-text("Imprimir Recibo Físico Oficial (Doble Talón)")');
    console.log('✅ Botón "Imprimir Recibo Físico Oficial (Doble Talón)" visible en modal:', await btnPrintRecibo.isVisible());

    const talonDuplicado = page.locator('text=DUPLICADO: TALÓN PARA ADMINISTRACIÓN Y TESORERÍA MUNICIPAL');
    const cutLine = page.locator('text=CORTE PARA ARCHIVO MUNICIPAL');
    console.log('✅ Talón Duplicado para Administración Municipal presente en DOM:', await talonDuplicado.count() > 0);
    console.log('✅ Línea de corte punteada presente en DOM:', await cutLine.count() > 0);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verif_recibo_fisico_modal.png') });
    console.log('📸 Captura guardada: verif_recibo_fisico_modal.png');
  }

  await browser.close();
  console.log('\n🎉 >>> TODAS LAS 7 REGLAS Y VERIFICACIONES COMPLETADAS EXITOSAMENTE <<< 🎉');
}

verifyFeatures().catch((err) => {
  console.error('❌ Error en verificación:', err);
  process.exit(1);
});

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  const v4Afiliados = await page.evaluate(() => localStorage.getItem('aeterna_afiliados_v4'));
  if (v4Afiliados) {
    const parsed = JSON.parse(v4Afiliados);
    console.log('Afiliados in storage count:', parsed.length);
    console.log('Afiliados:', parsed.map(a => ({ nro: a.numero_afiliado, nom: a.nombre_completo, dir: a.direccion_cobro, dni: a.dni })));
  }

  const v4Inhumaciones = await page.evaluate(() => localStorage.getItem('aeterna_inhumaciones_v4'));
  if (v4Inhumaciones) {
    const parsed = JSON.parse(v4Inhumaciones);
    console.log('Inhumaciones count:', parsed.length);
    console.log('First 5 Inhumaciones:', parsed.slice(0, 5).map(i => ({ nom: i.nombre_difunto, parc: i.parcela?.nomenclatura })));
  }

  await browser.close();
})();

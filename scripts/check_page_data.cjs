const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  const keys = await page.evaluate(() => Object.keys(localStorage));
  console.log('LocalStorage keys:', keys);
  
  const v4Parcelas = await page.evaluate(() => localStorage.getItem('aeterna_parcelas_v4'));
  console.log('v4 parcelas in storage length:', v4Parcelas ? JSON.parse(v4Parcelas).length : null);
  if (v4Parcelas) {
    const parsed = JSON.parse(v4Parcelas);
    console.log('First 3 parcelas in storage:', parsed.slice(0, 3).map(p => ({ nom: p.nomenclatura, tit: p.titular?.nombre_completo })));
  }

  const v3Parcelas = await page.evaluate(() => localStorage.getItem('aeterna_parcelas_v3'));
  console.log('v3 parcelas exists?:', !!v3Parcelas);

  await browser.close();
})();

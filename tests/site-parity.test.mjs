import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const parity=fs.readFileSync(path.join(root,'site-parity.js'),'utf8');
const switcher=fs.readFileSync(path.join(root,'language-switcher.js'),'utf8');
const langs=['en','no','sv','de','es','fr'];
const routes={
  home:{en:'index.html',no:'no/index.html',sv:'sv/index.html',de:'de/index.html',es:'es/index.html',fr:'fr/index.html'},
  hub:{en:'business-calculators/index.html',no:'no/kalkulatorer/index.html',sv:'sv/kalkylatorer/index.html',de:'de/rechner/index.html',es:'es/calculadoras/index.html',fr:'fr/calculateurs/index.html'},
  margin:{en:'profit-margin-calculator/index.html',no:'no/fortjenestemargin-kalkulator/index.html',sv:'sv/vinstmarginal-kalkylator/index.html',de:'de/gewinnmargen-rechner/index.html',es:'es/calculadora-margen-beneficio/index.html',fr:'fr/calculateur-marge-beneficiaire/index.html'},
  breakEven:{en:'break-even-calculator/index.html',no:'no/nullpunkt-kalkulator/index.html',sv:'sv/nollpunkts-kalkylator/index.html',de:'de/break-even-rechner/index.html',es:'es/calculadora-punto-equilibrio/index.html',fr:'fr/calculateur-seuil-rentabilite/index.html'},
  hourly:{en:'hourly-rate-calculator/index.html',no:'no/timepris-kalkulator/index.html',sv:'sv/timpris-kalkylator/index.html',de:'de/stundensatz-rechner/index.html',es:'es/calculadora-tarifa-hora/index.html',fr:'fr/calculateur-taux-horaire/index.html'},
  invoice:{en:'invoice-generator/index.html',no:'no/fakturagenerator/index.html',sv:'sv/fakturagenerator/index.html',de:'de/rechnungsgenerator/index.html',es:'es/generador-facturas/index.html',fr:'fr/generateur-factures/index.html'}
};

test('site parity runtime parses',()=>{
  assert.doesNotThrow(()=>new Function(parity));
});

test('all six languages use the same shared renderer families',()=>{
  for(const family of Object.keys(routes)){
    assert.match(parity,new RegExp(`${family}:\\{`),`missing ${family} route map`);
    for(const lang of langs)assert.match(parity,new RegExp(`${lang}:'[^']+'`),`missing ${lang} in parity map`);
  }
  for(const renderer of ['renderHome','renderHub','renderMargin','renderBreakEven','renderHourly','hydrateInvoice'])assert.match(parity,new RegExp(`function ${renderer}\\(`),`missing ${renderer}`);
});

test('every parity route exists and loads the language switcher',()=>{
  for(const [family,map] of Object.entries(routes))for(const [lang,file] of Object.entries(map)){
    const absolute=path.join(root,file);
    assert.ok(fs.existsSync(absolute),`${family}/${lang} route missing: ${file}`);
    const html=fs.readFileSync(absolute,'utf8');
    assert.match(html,/language-switcher\.js/,`${file} must load language-switcher.js`);
  }
});

test('language switcher always loads the shared parity runtime',()=>{
  assert.match(switcher,/site-parity\.js/);
  assert.match(switcher,/sbkRelocalizeLinks/);
  assert.match(switcher,/MutationObserver/);
});

test('localized calculator hub is rendered from the complete shared catalog',()=>{
  const required=[
    '/profit-margin-calculator/','/break-even-calculator/','/roi-calculator/','/markup-calculator/','/gross-profit-calculator/','/target-profit-margin-calculator/',
    '/roas-calculator/','/customer-acquisition-cost-calculator/','/customer-lifetime-value-calculator/','/cpm-calculator/','/cpc-calculator/','/conversion-rate-calculator/',
    '/percentage-increase-calculator/','/percentage-change-calculator/','/discount-calculator/','/price-increase-calculator/',
    '/business-loan-calculator/','/cash-flow-calculator/','/invoice-generator/','/hourly-rate-calculator/','/freelance-day-rate-calculator/','/consultant-hourly-rate-calculator/',
    '/cleaning-business-profit-calculator/','/restaurant-profit-margin-calculator/','/ecommerce-profit-margin-calculator/','/ecommerce-conversion-rate-calculator/','/saas-cac-calculator/','/ecommerce-customer-lifetime-value-calculator/','/google-ads-cpc-calculator/','/social-media-cpm-calculator/','/ecommerce-roas-calculator/','/price-increase-calculator-for-small-business/'
  ];
  for(const route of required)assert.ok(parity.includes(`'${route}'`),`shared hub missing ${route}`);
});

test('localized invoice routes hydrate the exact canonical invoice generator',()=>{
  assert.match(parity,/fetch\('\/invoice-generator\/'/);
  assert.match(parity,/invoice-i18n\.js/);
  assert.match(parity,/replaceMain\(sourceMain\.outerHTML\)/);
});

test('shared public tools remain single-base runtime-localized',()=>{
  const publicI18n=fs.readFileSync(path.join(root,'public-i18n.js'),'utf8');
  for(const lang of ['no','sv','de','es','fr'])assert.match(publicI18n,new RegExp(`${lang}:\\{`));
  assert.match(publicI18n,/MutationObserver/);
  assert.match(publicI18n,/attributeFilter:\['placeholder','aria-label','title','alt'\]/);
});

test('Pro remains a single base with six-language runtime localization',()=>{
  const pro=fs.readFileSync(path.join(root,'pro/pro-i18n.js'),'utf8');
  for(const lang of langs)assert.ok(pro.includes(`${lang}:{name:`),`Pro missing ${lang}`);
});

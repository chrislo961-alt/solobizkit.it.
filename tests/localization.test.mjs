import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const site='https://solobizkit.it.com';
const langs=['en','no','sv','de','es','fr'];
const groups={
  home:{en:'/',no:'/no/',sv:'/sv/',de:'/de/',es:'/es/',fr:'/fr/'},
  calculators:{en:'/business-calculators/',no:'/no/kalkulatorer/',sv:'/sv/kalkylatorer/',de:'/de/rechner/',es:'/es/calculadoras/',fr:'/fr/calculateurs/'},
  margin:{en:'/profit-margin-calculator/',no:'/no/fortjenestemargin-kalkulator/',sv:'/sv/vinstmarginal-kalkylator/',de:'/de/gewinnmargen-rechner/',es:'/es/calculadora-margen-beneficio/',fr:'/fr/calculateur-marge-beneficiaire/'},
  breakEven:{en:'/break-even-calculator/',no:'/no/nullpunkt-kalkulator/',sv:'/sv/nollpunkts-kalkylator/',de:'/de/break-even-rechner/',es:'/es/calculadora-punto-equilibrio/',fr:'/fr/calculateur-seuil-rentabilite/'},
  hourly:{en:'/hourly-rate-calculator/',no:'/no/timepris-kalkulator/',sv:'/sv/timpris-kalkylator/',de:'/de/stundensatz-rechner/',es:'/es/calculadora-tarifa-hora/',fr:'/fr/calculateur-taux-horaire/'},
  invoice:{en:'/invoice-generator/',no:'/no/fakturagenerator/',sv:'/sv/fakturagenerator/',de:'/de/rechnungsgenerator/',es:'/es/generador-facturas/',fr:'/fr/generateur-factures/'}
};
const fileFor=(route)=>route==='/'?'index.html':`${route.replace(/^\//,'')}index.html`;
const read=(route)=>fs.readFileSync(path.join(root,fileFor(route)),'utf8');
const hasAlternate=(html,lang,route)=>html.includes(`hreflang="${lang}" href="${site}${route}"`)||html.includes(`href="${site}${route}" hreflang="${lang}"`);

for(const [name,group] of Object.entries(groups)){
  test(`${name} has complete six-language canonical and hreflang coverage`,()=>{
    for(const lang of langs){
      const route=group[lang];
      assert.ok(fs.existsSync(path.join(root,fileFor(route))),`${route} is missing`);
      const html=read(route);
      assert.ok(html.includes(`<link rel="canonical" href="${site}${route}">`),`${route} self canonical missing`);
      for(const alternate of langs)assert.ok(hasAlternate(html,alternate,group[alternate]),`${route} missing ${alternate} hreflang`);
      assert.ok(hasAlternate(html,'x-default',group.en),`${route} missing x-default`);
      if(lang!=='en')assert.match(html,new RegExp(`<html lang="${lang}"`),`${route} has wrong html lang`);
    }
  });
}

test('localized calculator hubs link only to their local core calculators',()=>{
  for(const lang of langs.filter((x)=>x!=='en')){
    const html=read(groups.calculators[lang]);
    for(const key of ['margin','breakEven','hourly'])assert.ok(html.includes(`href="${groups[key][lang]}"`),`${groups.calculators[lang]} missing ${key}`);
  }
});

test('localized home pages link to local calculator and invoice destinations',()=>{
  for(const lang of langs.filter((x)=>x!=='en')){
    const html=read(groups.home[lang]);
    assert.ok(html.includes(`href="${groups.calculators[lang]}"`),`${groups.home[lang]} should link local calculator hub`);
    assert.ok(html.includes(`href="${groups.invoice[lang]}"`),`${groups.home[lang]} should link local invoice landing`);
  }
});

test('localized calculator pages remain functional, not translation-only shells',()=>{
  for(const lang of langs.filter((x)=>x!=='en')){
    const margin=read(groups.margin[lang]);
    const breakEven=read(groups.breakEven[lang]);
    const hourly=read(groups.hourly[lang]);
    for(const id of ['cost','price','target','profit','margin'])assert.ok(margin.includes(`id="${id}"`),`${groups.margin[lang]} missing ${id}`);
    for(const id of ['fixed','price','variable','units','revenue'])assert.ok(breakEven.includes(`id="${id}"`),`${groups.breakEven[lang]} missing ${id}`);
    for(const id of ['income','expenses','billable','rate','revenue'])assert.ok(hourly.includes(`id="${id}"`),`${groups.hourly[lang]} missing ${id}`);
    assert.match(margin,/function calc\(\)/);assert.match(breakEven,/function calc\(\)/);assert.match(hourly,/function calc\(\)/);
  }
});

test('invoice flow has six-language routing and robust runtime localization',()=>{
  const generator=read(groups.invoice.en);
  const switcher=fs.readFileSync(path.join(root,'language-switcher.js'),'utf8');
  const invoiceI18n=fs.readFileSync(path.join(root,'invoice-i18n.js'),'utf8');
  assert.match(generator,/\/invoice-i18n\.js/,'invoice generator must load invoice-i18n.js');
  for(const lang of langs.filter((x)=>x!=='en')){
    assert.ok(switcher.includes(`'${groups.invoice.en}':'${groups.invoice[lang]}'`),`language switcher missing invoice mapping for ${lang}`);
    assert.ok(invoiceI18n.includes(`${lang}:{`),`invoice dictionary missing ${lang}`);
  }
  for(const capability of ['placeholder','OPTION','MutationObserver','window.confirm','pDates'])assert.ok(invoiceI18n.includes(capability),`invoice i18n missing ${capability} handling`);
});

test('Pro workspace localization supports all six languages and dynamic attributes',()=>{
  const pro=fs.readFileSync(path.join(root,'pro/pro-i18n.js'),'utf8');
  for(const lang of langs)assert.ok(pro.includes(`${lang}:{name:`),`Pro language metadata missing ${lang}`);
  for(const capability of ['placeholder','aria-label','title','MutationObserver'])assert.ok(pro.includes(capability),`Pro i18n missing ${capability}`);
});

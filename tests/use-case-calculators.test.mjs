import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const slugs=['cleaning-business-profit-calculator','restaurant-profit-margin-calculator','ecommerce-profit-margin-calculator','ecommerce-conversion-rate-calculator','saas-cac-calculator','ecommerce-customer-lifetime-value-calculator','google-ads-cpc-calculator','social-media-cpm-calculator','ecommerce-roas-calculator','price-increase-calculator-for-small-business'];

test('industry use-case calculator pages have complete SEO and product structure',()=>{
  const sitemap=fs.readFileSync('sitemap.xml','utf8');
  for(const slug of slugs){
    const html=fs.readFileSync(`${slug}/index.html`,'utf8');
    assert.match(html,new RegExp(`<link rel="canonical" href="https://solobizkit\\.it\\.com/${slug}/">`));
    assert.match(html,/<h1>[^<]+Calculator[^<]*<\/h1>/);
    assert.match(html,/type="application\/ld\+json"/);
    assert.match(html,/"@type":"FAQPage"/);
    assert.match(html,/function calculate\(\)/);
    assert.match(html,/Related tools/);
    assert.match(sitemap,new RegExp(`<loc>https://solobizkit\\.it\\.com/${slug}/<\/loc>`));
  }
});

test('business calculator hub links to every industry calculator',()=>{
  const hub=fs.readFileSync('business-calculators/index.html','utf8');
  for(const slug of slugs)assert.match(hub,new RegExp(`href="/${slug}/"`));
  assert.match(hub,/"numberOfItems":31/);
});

const defaultResults=[
  ['cleaning-business-profit-calculator','profit','$85.76'],
  ['restaurant-profit-margin-calculator','profit','$14,000.00'],
  ['ecommerce-profit-margin-calculator','profit','$15,500.00'],
  ['ecommerce-conversion-rate-calculator','rate','2%'],
  ['saas-cac-calculator','cac','$200.00'],
  ['ecommerce-customer-lifetime-value-calculator','profitClv','$429.00'],
  ['google-ads-cpc-calculator','cpc','$1.39'],
  ['social-media-cpm-calculator','cpm','$3.43'],
  ['ecommerce-roas-calculator','roas','4.5×'],
  ['price-increase-calculator-for-small-business','newPrice','$54.00']
];

for(const [slug,resultId,expected] of defaultResults){
  test(`${slug} calculates its default example`,()=>{
    const html=fs.readFileSync(`${slug}/index.html`,'utf8');
    const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
    assert.ok(code,'calculator script is present');
    const elements={};
    for(const match of html.matchAll(/\bid="([^"]+)"/g))elements[match[1]]={value:'',textContent:'',addEventListener(){},focus(){}};
    for(const match of html.matchAll(/<input[^>]*\bid="([^"]+)"[^>]*\bvalue="([^"]*)"[^>]*>/g))elements[match[1]].value=match[2];
    elements.currency.value='USD';
    const document={getElementById(id){return elements[id]??={value:'',textContent:'',addEventListener(){},focus(){}}},querySelectorAll(){return Object.values(elements)}};
    vm.runInNewContext(code,{document,Intl,Number,Object,Math,parseFloat});
    assert.equal(elements[resultId].textContent,expected);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const cases = [
  ['percentage-increase-calculator','112.5'],
  ['percentage-change-calculator','+15.00%'],
  ['discount-calculator','$90.00'],
  ['roas-calculator','5.00×'],
  ['customer-acquisition-cost-calculator','$40.00'],
  ['customer-lifetime-value-calculator','$792.00'],
  ['cpm-calculator','$3.40'],
  ['cpc-calculator','$1.50'],
  ['conversion-rate-calculator','2.50%'],
  ['price-increase-calculator','$52.92']
];

for (const [slug,expected] of cases) {
  test(`${slug} renders the expected default result`,()=>{
    const html = fs.readFileSync(path.join(root,slug,'index.html'),'utf8');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    const code = scripts.at(-1)?.[1];
    assert.ok(code,'calculator script is present');
    const elements = {};
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
      elements[match[1]] = {value:'',textContent:'',addEventListener(){},focus(){}};
    }
    for (const match of html.matchAll(/<input[^>]*\bid="([^"]+)"[^>]*\bvalue="([^"]*)"[^>]*>/g)) {
      elements[match[1]].value = match[2];
    }
    const document = {
      getElementById(id){ return elements[id] ??= {value:'',textContent:'',addEventListener(){},focus(){}}; },
      querySelectorAll(){ return Object.values(elements); }
    };
    vm.runInNewContext(code,{document,Intl,Number,Object,Math,parseFloat});
    assert.equal(elements.main.textContent,expected);
  });
}

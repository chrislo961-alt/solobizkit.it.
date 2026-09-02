import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html','utf8');

test('homepage search routes new calculator terms to the calculator hub',()=>{
  const hub = html.match(/<a class="quick-card searchable"[^>]+href="\/business-calculators\/"[^>]*>/)?.[0] || '';
  for (const term of ['roas','cac','clv','cpm','cpc','conversion','discount']) assert.match(hub,new RegExp(`\\b${term}\\b`));
});

test('homepage search counts every matching result type',()=>{
  assert.match(html,/if\(show\)visible\+\+/);
  assert.doesNotMatch(html,/show&&card\.classList\.contains\('tool-card'\)/);
});

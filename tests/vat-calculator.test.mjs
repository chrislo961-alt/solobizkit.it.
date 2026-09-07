import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vat = fs.readFileSync('vat-calculator/index.html', 'utf8');
const calculators = fs.readFileSync('business-calculators/index.html', 'utf8');
const tools = fs.readFileSync('tools/index.html', 'utf8');
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const translations = fs.readFileSync('public-i18n-extra.js', 'utf8');

test('Pinterest VAT route has a real indexable calculator page', () => {
  assert.match(vat, /<link rel="canonical" href="https:\/\/solobizkit\.it\.com\/vat-calculator\/">/);
  assert.match(vat, /<h1>VAT Calculator<\/h1>/);
  assert.match(vat, /id="addMode"/);
  assert.match(vat, /id="removeMode"/);
});

test('VAT arithmetic implements add and remove formulas', () => {
  assert.match(vat, /vat=net\*r\/100;total=net\+vat/);
  assert.match(vat, /net=r===0\?total:total\/\(1\+r\/100\);vat=total-net/);
});

test('VAT calculator remains discoverable from both public hubs and sitemap', () => {
  assert.match(calculators, /href="\/vat-calculator\/"/);
  assert.match(calculators, /32 focused calculators/);
  assert.match(tools, /href="\/vat-calculator\/"/);
  assert.match(sitemap, /https:\/\/solobizkit\.it\.com\/vat-calculator\//);
});

test('VAT controls and FAQ prompts stay in the shared translation catalog', () => {
  for (const source of ['VAT Calculator','Calculation type','Add VAT','Remove VAT','VAT rate','Custom VAT %','Calculate VAT','How do I add 25% VAT?','Why can’t I remove VAT by simply subtracting 25%?','Can I use another VAT rate?']) {
    assert.ok(translations.includes(JSON.stringify(source)), `missing VAT translation source: ${source}`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://solobizkit.it.com';
const pairs = [
  ['/', '/no/', 'index.html', 'no/index.html'],
  ['/business-calculators/', '/no/kalkulatorer/', 'business-calculators/index.html', 'no/kalkulatorer/index.html'],
  ['/profit-margin-calculator/', '/no/fortjenestemargin-kalkulator/', 'profit-margin-calculator/index.html', 'no/fortjenestemargin-kalkulator/index.html'],
  ['/break-even-calculator/', '/no/nullpunkt-kalkulator/', 'break-even-calculator/index.html', 'no/nullpunkt-kalkulator/index.html'],
  ['/hourly-rate-calculator/', '/no/timepris-kalkulator/', 'hourly-rate-calculator/index.html', 'no/timepris-kalkulator/index.html']
];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function hasAlternate(html, lang, href) {
  return html.includes(`hreflang="${lang}" href="${href}"`) || html.includes(`href="${href}" hreflang="${lang}"`);
}

test('English and Norwegian SEO routes have reciprocal hreflang and self canonicals', () => {
  for (const [enRoute, noRoute, enFile, noFile] of pairs) {
    const en = read(enFile);
    const no = read(noFile);
    assert.match(en, new RegExp(`<link rel="canonical" href="${site.replaceAll('.', '\\.')}${enRoute.replaceAll('/', '\\/')}"`));
    assert.match(no, new RegExp(`<link rel="canonical" href="${site.replaceAll('.', '\\.')}${noRoute.replaceAll('/', '\\/')}"`));
    assert.ok(hasAlternate(en, 'en', `${site}${enRoute}`), `${enRoute} should reference English`);
    assert.ok(hasAlternate(en, 'no', `${site}${noRoute}`), `${enRoute} should reference Norwegian`);
    assert.ok(hasAlternate(no, 'en', `${site}${enRoute}`), `${noRoute} should reference English`);
    assert.ok(hasAlternate(no, 'no', `${site}${noRoute}`), `${noRoute} should reference Norwegian`);
  }
});

test('Norwegian pages declare Norwegian language and localized navigation', () => {
  for (const [, , , noFile] of pairs) {
    const html = read(noFile);
    assert.match(html, /<html lang="no">/);
    assert.match(html, /href="\/no\/kalkulatorer\/"/);
    assert.match(html, /language-switcher\.js/);
  }
});

test('Norwegian calculator routes contain working calculator inputs and scripts', () => {
  const margin = read('no/fortjenestemargin-kalkulator/index.html');
  const breakEven = read('no/nullpunkt-kalkulator/index.html');
  const hourly = read('no/timepris-kalkulator/index.html');
  for (const id of ['cost', 'price', 'target', 'profit', 'margin']) assert.ok(margin.includes(`id="${id}"`));
  for (const id of ['fixed', 'price', 'variable', 'units', 'revenue']) assert.ok(breakEven.includes(`id="${id}"`));
  for (const id of ['income', 'expenses', 'billable', 'rate', 'revenue']) assert.ok(hourly.includes(`id="${id}"`));
  assert.match(margin, /function calc\(\)/);
  assert.match(breakEven, /function calc\(\)/);
  assert.match(hourly, /function calc\(\)/);
});

test('Norwegian sitemap contains only Norwegian routes and all localized routes', () => {
  const xml = read('sitemap-no.xml');
  for (const [, noRoute] of pairs) assert.ok(xml.includes(`<loc>${site}${noRoute}</loc>`), `${noRoute} missing from sitemap-no.xml`);
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  assert.ok(locations.length >= pairs.length);
  assert.ok(locations.every((route) => route === '/no/' || route.startsWith('/no/')));
});
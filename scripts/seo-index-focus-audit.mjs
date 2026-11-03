import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CORE_ROUTES = [
  '/',
  '/business-calculators/',
  '/profit-margin-calculator/',
  '/break-even-calculator/',
  '/cash-flow-calculator/',
  '/business-loan-calculator/',
  '/hourly-rate-calculator/',
  '/invoice-generator/',
  '/freelancer-toolkit/',
  '/small-business-toolkit/',
  '/guides/',
  '/no/',
  '/sv/',
  '/de/',
  '/es/',
  '/fr/',
];


const HERO_ROUTES = [
  '/profit-margin-calculator/',
  '/break-even-calculator/',
  '/cash-flow-calculator/',
  '/business-loan-calculator/',
  '/hourly-rate-calculator/',
  '/invoice-generator/',
  '/business-calculators/',
  '/invoice-tools/',
  '/freelancer-toolkit/',
  '/small-business-toolkit/',
  '/customer-acquisition-cost-calculator/',
  '/roas-calculator/',
];

const AUTHORITY_HUBS = [
  '/',
  '/business-calculators/',
  '/invoice-tools/',
  '/freelancer-toolkit/',
  '/small-business-toolkit/',
];

const RETIRED_INTERNAL_ROUTES = [
  '/freelance-hourly-rate-calculator/',
  '/free-invoice-generator/',
];

function walkHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walkHtml(full) : entry.name === 'index.html' ? [full] : [];
  });
}

const SUPPORT_UTILITY_ROUTES = [
  '/freelance-hourly-rate-calculator/',
  '/free-invoice-generator/',
  '/compress-pdf/',
  '/merge-pdf/',
  '/split-pdf/',
  '/pdf-to-word/',
  '/wifi-qr-code-generator/',
  '/qr-code-with-logo/',
  '/small-business-name-generator/',
  '/salary-paycheck-calculator/',
];

function html(route) {
  const file = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(file)) throw new Error(`Missing route: ${route}`);
  return fs.readFileSync(file, 'utf8');
}
function robots(markup) {
  return markup.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
}

const failures = [];
for (const route of CORE_ROUTES) {
  if (/noindex/i.test(robots(html(route)))) failures.push(`${route} must remain indexable`);
}
for (const route of SUPPORT_UTILITY_ROUTES) {
  if (!/noindex/i.test(robots(html(route)))) failures.push(`${route} must be noindex,follow`);
}

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const route of CORE_ROUTES) {
  const url = `https://solobizkit.it.com${route}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`${route} missing from sitemap`);
}
for (const route of SUPPORT_UTILITY_ROUTES) {
  const url = `https://solobizkit.it.com${route}`;
  if (sitemap.includes(`<loc>${url}</loc>`)) failures.push(`${route} must not be in sitemap`);
}

for (const route of HERO_ROUTES) {
  const url = `https://solobizkit.it.com${route}`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`Hero route missing from sitemap: ${route}`);
  const linkedFromAuthorityHub = AUTHORITY_HUBS.some((hub) => html(hub).includes(`href="${route}"`) || html(hub).includes(`href='${route}'`));
  if (!linkedFromAuthorityHub) failures.push(`Hero route has no authority-hub link: ${route}`);
}

for (const file of walkHtml(ROOT)) {
  const markup = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  for (const retired of RETIRED_INTERNAL_ROUTES) {
    if (markup.includes(`href="${retired}"`) || markup.includes(`href='${retired}'`)) {
      failures.push(`${relative} still links to retired route ${retired}`);
    }
  }
}

if (failures.length) {
  console.error('SEO index focus audit failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('SEO index focus audit passed.');

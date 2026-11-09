import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://solobizkit.it.com';
const leading = ['/', '/no/', '/tools/', '/business-calculators/', '/invoice-tools/', '/no/kalkulatorer/', '/small-business-toolkit/', '/freelancer-toolkit/', '/consultant-toolkit/', '/agency-toolkit/', '/ecommerce-toolkit/', '/self-employed-toolkit/', '/pdf-tools/', '/guides/'];
const redirectedRoutes = new Set(['/free-invoice-generator/', '/freelance-hourly-rate-calculator/']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function isPublicHtmlRoute(file) {
  const html = fs.readFileSync(file, 'utf8');
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  return !/(?:^|,)\s*noindex\b/i.test(robots);
}

const discoveredRoutes = new Set(walk(root)
  .filter((file) => file === path.join(root, 'index.html') || file.endsWith(`${path.sep}index.html`))
  .filter(isPublicHtmlRoute)
  .map((file) => {
    const relative = path.relative(root, file);
    return relative === 'index.html' ? '/' : `/${path.dirname(relative).split(path.sep).join('/')}/`;
  })
  .filter((route) => !redirectedRoutes.has(route)));

const priorityRoutes = [
  "/",
  "/tools/",
  "/business-calculators/",
  "/invoice-tools/",
  "/pdf-tools/",
  "/guides/",
  "/small-business-toolkit/",
  "/freelancer-toolkit/",
  "/profit-margin-calculator/",
  "/break-even-calculator/",
  "/roi-calculator/",
  "/business-loan-calculator/",
  "/cash-flow-calculator/",
  "/cash-runway-calculator/",
  "/hourly-rate-calculator/",
  "/markup-calculator/",
  "/customer-acquisition-cost-calculator/",
  "/customer-lifetime-value-calculator/",
  "/roas-calculator/",
  "/invoice-generator/",
  "/invoice-due-date-calculator/",
  "/invoice-number-generator/",
  "/invoice-reminder-templates/",
  "/late-invoice-fee-calculator/",
  "/business-name-generator/",
  "/qr-code-generator/",
  "/wifi-qr-code-generator/",
  "/compress-pdf/",
  "/merge-pdf/",
  "/pdf-to-word/",
  "/guides/cash-flow-basics/",
  "/guides/price-freelance-services/",
  "/guides/late-paying-clients/",
  "/guides/freelance-invoice-checklist/",
  "/guides/start-small-business/",
  "/no/",
  "/no/kalkulatorer/",
  "/no/fortjenestemargin-kalkulator/",
  "/no/nullpunkt-kalkulator/",
  "/no/timepris-kalkulator/",
  "/no/fakturagenerator/",
  "/sv/",
  "/sv/kalkylatorer/",
  "/sv/vinstmarginal-kalkylator/",
  "/sv/nollpunkts-kalkylator/",
  "/sv/timpris-kalkylator/",
  "/sv/fakturagenerator/"
];
const routes = priorityRoutes.filter((route) => discoveredRoutes.has(route));
const missingPriorityRoutes = priorityRoutes.filter((route) => !discoveredRoutes.has(route));
if (missingPriorityRoutes.length) {
  throw new Error(`Priority sitemap routes are missing or noindex: ${missingPriorityRoutes.join(', ')}`);
}

routes.sort((a, b) => {
  const ai = leading.indexOf(a);
  const bi = leading.indexOf(b);
  if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  return a.localeCompare(b);
});

function priority(route) {
  if (route === '/' || route === '/no/') return '1.0';
  if (leading.includes(route)) return '0.9';
  if (/\/(about|contact|privacy|terms|methodology|security)\//.test(route)) return '0.5';
  if (/\/guides\//.test(route) || /how-to|template|without-uploading|editable-word/.test(route)) return '0.7';
  return '0.8';
}

function xmlFor(list) {
  // Build time is not a page modification date. Omit optional lastmod until
  // a reliable per-page content-change date is available.
  const urls = list.map((route) => `  <url><loc>${site}${route}</loc><changefreq>${route === '/' || route === '/no/' || leading.includes(route) ? 'weekly' : 'monthly'}</changefreq><priority>${priority(route)}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

fs.writeFileSync(path.join(root, 'sitemap.xml'), xmlFor(routes));
const norwegianRoutes = routes.filter((route) => route === '/no/' || route.startsWith('/no/'));
fs.writeFileSync(path.join(root, 'sitemap-no.xml'), xmlFor(norwegianRoutes));
console.log(`Generated curated sitemap.xml with ${routes.length} priority routes and sitemap-no.xml with ${norwegianRoutes.length} Norwegian priority routes.`);

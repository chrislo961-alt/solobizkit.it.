import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const site = 'https://solobizkit.it.com';
const lastModified = '2026-09-05';
const leading = ['/', '/tools/', '/business-calculators/', '/small-business-toolkit/', '/freelancer-toolkit/', '/pdf-tools/', '/guides/'];

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

const routes = walk(root)
  .filter((file) => file === path.join(root, 'index.html') || file.endsWith(`${path.sep}index.html`))
  .filter(isPublicHtmlRoute)
  .map((file) => {
    const relative = path.relative(root, file);
    return relative === 'index.html' ? '/' : `/${path.dirname(relative).split(path.sep).join('/')}/`;
  });

routes.sort((a, b) => {
  const ai = leading.indexOf(a);
  const bi = leading.indexOf(b);
  if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  return a.localeCompare(b);
});

function priority(route) {
  if (route === '/') return '1.0';
  if (leading.includes(route)) return '0.9';
  if (/\/(about|contact|privacy|terms|methodology|security)\//.test(route)) return '0.5';
  if (/\/guides\//.test(route) || /how-to|template|without-uploading|editable-word/.test(route)) return '0.7';
  return '0.8';
}

const urls = routes.map((route) => `  <url><loc>${site}${route}</loc><lastmod>${lastModified}</lastmod><changefreq>${route === '/' || leading.includes(route) ? 'weekly' : 'monthly'}</changefreq><priority>${priority(route)}</priority></url>`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
console.log(`Generated sitemap.xml with ${routes.length} public routes.`);

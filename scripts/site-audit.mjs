import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://solobizkit.it.com';
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function match(html, expression) {
  return html.match(expression)?.[1]?.trim() || '';
}

const files = walk(ROOT).filter((file) => file === path.join(ROOT, 'index.html') || file.endsWith(`${path.sep}index.html`));
const pages = files.map((file) => {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  const route = relative === 'index.html' ? '/' : `/${path.dirname(relative).split(path.sep).join('/')}/`;
  const structural = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<textarea\b[\s\S]*?<\/textarea>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '');
  const robots = match(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  return {
    file,
    html,
    structural,
    route,
    robots,
    privateApp: /(?:^|,)\s*noindex\b/i.test(robots),
    title: match(html, /<title>([^<]+)<\/title>/i),
    description: match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
    canonical: match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
    links: [...structural.matchAll(/<a\b[^>]*href=["']([^"'#?]+)[^"']*["']/gi)].map((item) => item[1])
  };
});

const publicPages = pages.filter((page) => !page.privateApp);
const routes = new Set(pages.map((page) => page.route));
const publicRoutes = new Set(publicPages.map((page) => page.route));
const inbound = new Map(publicPages.map((page) => [page.route, 0]));
const titleOwners = new Map();
const descriptionOwners = new Map();

for (const page of pages) {
  const label = page.route;
  if (!page.title) errors.push(`${label}: missing title`);
  if ((page.structural.match(/<h1\b/gi) || []).length !== 1) errors.push(`${label}: must contain exactly one structural H1`);

  if (!page.privateApp) {
    if (!page.description) errors.push(`${label}: missing meta description`);
    if (page.title.length > 80) errors.push(`${label}: title exceeds 80 characters`);
    if (page.description.length > 220) errors.push(`${label}: meta description exceeds 220 characters`);
    if (page.canonical !== `${SITE}${page.route}`) errors.push(`${label}: incorrect canonical URL`);

    for (const [name, expression] of Object.entries({
      robots: /<meta[^>]+name=["']robots["']/i,
      themeColor: /<meta[^>]+name=["']theme-color["']/i,
      favicon: /<link[^>]+rel=["']icon["']/i,
      manifest: /<link[^>]+rel=["']manifest["']/i,
      ogTitle: /<meta[^>]+property=["']og:title["']/i,
      ogDescription: /<meta[^>]+property=["']og:description["']/i,
      ogImage: /<meta[^>]+property=["']og:image["']/i,
      twitterCard: /<meta[^>]+name=["']twitter:card["']/i,
      analytics: /<script[^>]+src=["']\/analytics\.js["']/i,
      consentStyles: /<link[^>]+href=["']\/analytics-consent\.css["']/i,
      globalShell: /<link[^>]+href=["']\/global-shell\.css["']/i,
      visualPolish: /<link[^>]+href=["']\/visual-polish\.css["']/i,
      structuredData: /<script[^>]+type=["']application\/ld\+json["']/i
    })) {
      if (!expression.test(page.html)) errors.push(`${label}: missing ${name}`);
    }

    const headers = page.structural.match(/<header\b[^>]*>[\s\S]*?<\/header>/gi) || [];
    if (headers.length !== 1 || !/class=["'][^"']*sbk-global-header/.test(headers[0] || '')) {
      errors.push(`${label}: must use exactly one shared global header`);
    } else {
      for (const href of ['/business-calculators/', '/invoice-generator/', '/pdf-tools/', '/qr-code-generator/', '/about/', '/tools/']) {
        if (!new RegExp(`href=["']${href.replaceAll('/', '\\/')}["']`).test(headers[0])) {
          errors.push(`${label}: shared header is missing ${href}`);
        }
      }
      if (!/class=["']sbk-brand-icon["'][^>]+src=["']\/favicon\.svg["']/.test(headers[0])) {
        errors.push(`${label}: shared header is missing the brand icon`);
      }
    }
  } else if (!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(page.html)) {
    errors.push(`${label}: private app route must explicitly declare noindex`);
  }

  if (['/', '/tools/'].includes(label)) {
    for (const icon of page.structural.matchAll(/<div class=["']quick-icon["']>([\s\S]*?)<\/div>/gi)) {
      if (!/<svg\b/.test(icon[1])) errors.push(`${label}: quick-card icon must be SVG`);
    }
  }

  for (const json of page.html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(json[1]); } catch { errors.push(`${label}: invalid JSON-LD`); }
  }

  if (!page.privateApp) {
    titleOwners.set(page.title, [...(titleOwners.get(page.title) || []), label]);
    descriptionOwners.set(page.description, [...(descriptionOwners.get(page.description) || []), label]);
  }

  for (const url of page.links) {
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    const target = url.endsWith('/') ? url : url.replace(/\.html$/, '/');
    if (publicRoutes.has(target)) inbound.set(target, inbound.get(target) + 1);
    else if (routes.has(target)) continue;
    else if (!fs.existsSync(path.join(ROOT, url)) && !fs.existsSync(path.join(ROOT, url, 'index.html'))) {
      errors.push(`${label}: broken internal link ${url}`);
    }
  }

  for (const asset of page.html.matchAll(/(?:src|href)=["'](\/[^"'#?]+)["']/gi)) {
    const url = asset[1];
    if (url.endsWith('/')) continue;
    if (!fs.existsSync(path.join(ROOT, url))) errors.push(`${label}: missing local asset ${url}`);
  }
}

for (const [title, owners] of titleOwners) if (title && owners.length > 1) errors.push(`duplicate title: ${title}`);
for (const [description, owners] of descriptionOwners) if (description && owners.length > 1) errors.push(`duplicate description: ${owners.join(', ')}`);
for (const [route, count] of inbound) if (route !== '/' && count === 0) errors.push(`${route}: orphan route with no internal links`);

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const sitemapRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => new URL(item[1]).pathname);
if (new Set(sitemapRoutes).size !== sitemapRoutes.length) errors.push('sitemap contains duplicate URLs');
for (const route of publicRoutes) if (!sitemapRoutes.includes(route)) errors.push(`${route}: missing from sitemap`);
for (const route of sitemapRoutes) if (!publicRoutes.has(route)) errors.push(`${route}: sitemap URL has no public HTML route`);

for (const required of ['favicon.svg', 'favicon.ico', 'favicon-192.png', 'favicon-512.png', 'site.webmanifest', 'robots.txt', 'ads.txt']) {
  if (!fs.existsSync(path.join(ROOT, required))) errors.push(`missing required root asset ${required}`);
}
const socialImage = path.join(ROOT, 'assets/images/solobizkit-social-preview.png');
if (!fs.existsSync(socialImage)) errors.push('missing social preview image');
else if (fs.statSync(socialImage).size > 250_000) errors.push('social preview image exceeds 250 KB');
const allHtml = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
if (/analytics-consent\.js/.test(allHtml)) errors.push('obsolete analytics-consent.js reference remains');
if (/href=["']\/#tools/.test(allHtml)) errors.push('obsolete /#tools link remains');
if (/api\.qrserver\.com/i.test(allHtml)) errors.push('QR payloads must not be sent to a remote image endpoint');
const visualCss = fs.readFileSync(path.join(ROOT, 'visual-polish.css'), 'utf8');
if (!/@media\(max-width:600px\)/.test(visualCss)) errors.push('visual polish is missing its mobile breakpoint');
if (!/#sbk-accept\{background:#2563eb!important/.test(visualCss)) errors.push('analytics consent button does not use the brand color');
const ads = fs.readFileSync(path.join(ROOT, 'ads.txt'), 'utf8');
if (!/google\.com\s*,\s*pub-9212084765206199\s*,\s*DIRECT\s*,\s*f08c47fec0942fa0/i.test(ads)) errors.push('ads.txt publisher line is incorrect');
for (const manifest of ['site.webmanifest', 'manifest.webmanifest']) {
  try { JSON.parse(fs.readFileSync(path.join(ROOT, manifest), 'utf8')); }
  catch { errors.push(`${manifest} is not valid JSON`); }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Verified ${publicPages.length} public routes, ${pages.length - publicPages.length} private app routes, ${sitemapRoutes.length} sitemap URLs, metadata, structured data, local assets and internal links.`);

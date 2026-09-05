import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://solobizkit.it.com';
const SOCIAL_IMAGE = `${SITE}/assets/images/solobizkit-social-preview.png`;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function value(html, expression) {
  return html.match(expression)?.[1]?.trim() || '';
}

function attr(text) {
  return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function routeForFile(file) {
  const relative = path.relative(ROOT, file);
  return relative === 'index.html' ? '/' : `/${path.dirname(relative).split(path.sep).join('/')}/`;
}

function isPrivate(html) {
  const robots = value(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  return /(?:^|,)\s*noindex\b/i.test(robots);
}

function currentAttr(route, href) {
  if (href === '/guides/' && route.startsWith('/guides/')) return ' aria-current="page"';
  if (href === '/about/' && route === '/about/') return ' aria-current="page"';
  if (href === '/invoice-generator/' && route === '/invoice-generator/') return ' aria-current="page"';
  if (href === '/pdf-tools/' && route === '/pdf-tools/') return ' aria-current="page"';
  if (href === '/qr-code-generator/' && route === '/qr-code-generator/') return ' aria-current="page"';
  if (href === '/business-calculators/' && route === '/business-calculators/') return ' aria-current="page"';
  return '';
}

function sharedHeader(route) {
  const links = [
    ['/business-calculators/', 'Calculators'],
    ['/invoice-generator/', 'Invoices'],
    ['/pdf-tools/', 'PDF Tools'],
    ['/qr-code-generator/', 'QR Codes'],
    ['/guides/', 'Guides'],
    ['/about/', 'About']
  ].map(([href, label]) => `<a href="${href}"${currentAttr(route, href)}>${label}</a>`).join('');
  const toolsCurrent = route === '/tools/' ? ' aria-current="page"' : '';
  return `<header class="sbk-global-header"><div class="sbk-global-nav"><a class="sbk-global-brand" href="/" aria-label="SoloBizKit home"><img class="sbk-brand-icon" src="/favicon.svg" width="29" height="29" alt="">SoloBiz<span>Kit</span></a><nav class="sbk-global-links" aria-label="Primary navigation">${links}</nav><a class="sbk-global-tools" href="/tools/"${toolsCurrent}>All Tools</a></div></header>`;
}

for (const file of walk(ROOT).filter((name) => name === path.join(ROOT, 'index.html') || name.endsWith(`${path.sep}index.html`))) {
  let html = fs.readFileSync(file, 'utf8');
  const route = routeForFile(file);

  if (route.startsWith('/pro/') && !/<script[^>]+src=["']\/pro\/leads-nav\.js["']/i.test(html)) {
    html = html.replace('</body>', '<script src="/pro/leads-nav.js" defer></script></body>');
  }

  const title = value(html, /<title>([^<]+)<\/title>/i);
  const description = value(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const canonical = value(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (!title || !description || !canonical) {
    fs.writeFileSync(file, html);
    continue;
  }

  html = html
    .replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']icon["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:site_name["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["']og:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi, '')
    .replace(/<script[^>]+src=["']\/analytics-consent\.js["'][^>]*><\/script>/gi, '<script src="/analytics.js" defer></script>');

  if (!/<meta[^>]+name=["']robots["']/i.test(html)) {
    html = html.replace(/(<link[^>]+rel=["']canonical["'][^>]*>)/i, '$1<meta name="robots" content="index,follow,max-image-preview:large">');
  }
  if (!/<meta[^>]+property=["']og:title["']/i.test(html)) {
    html = html.replace('</head>', `<meta property="og:title" content="${attr(title)}"></head>`);
  }
  if (!/<meta[^>]+property=["']og:description["']/i.test(html)) {
    html = html.replace('</head>', `<meta property="og:description" content="${attr(description)}"></head>`);
  }
  if (!/<meta[^>]+property=["']og:type["']/i.test(html)) {
    html = html.replace('</head>', '<meta property="og:type" content="website"></head>');
  }
  if (!/<meta[^>]+property=["']og:url["']/i.test(html)) {
    html = html.replace('</head>', `<meta property="og:url" content="${canonical}"></head>`);
  }
  if (!/<meta[^>]+name=["']twitter:title["']/i.test(html)) {
    html = html.replace('</head>', `<meta name="twitter:title" content="${attr(title)}"></head>`);
  }
  if (!/<meta[^>]+name=["']twitter:description["']/i.test(html)) {
    html = html.replace('</head>', `<meta name="twitter:description" content="${attr(description)}"></head>`);
  }
  if (!/application\/ld\+json/i.test(html)) {
    const schema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title.replace(/\s*\|\s*SoloBizKit\s*$/i, ''),
      url: canonical,
      description,
      isPartOf: { '@type': 'WebSite', name: 'SoloBizKit', url: `${SITE}/` }
    });
    html = html.replace('</head>', `<script type="application/ld+json">${schema}</script></head>`);
  }

  const standard = `<meta name="theme-color" content="#2563eb"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="manifest" href="/site.webmanifest"><meta property="og:site_name" content="SoloBizKit"><meta property="og:image" content="${SOCIAL_IMAGE}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SOCIAL_IMAGE}">`;
  html = html.replace('</head>', `${standard}</head>`);

  if (!/<link[^>]+href=["']\/analytics-consent\.css["']/i.test(html)) {
    html = html.replace('</head>', '<link rel="stylesheet" href="/analytics-consent.css"></head>');
  }
  if (!/<script[^>]+src=["']\/analytics\.js["']/i.test(html)) {
    html = html.replace('</head>', '<script src="/analytics.js" defer></script></head>');
  }

  if (route.startsWith('/guides/') && route !== '/guides/' && !/<script[^>]+src=["']\/guides\/guide-interactions\.js["']/i.test(html)) {
    html = html.replace('</body>', '<script src="/guides/guide-interactions.js" defer></script></body>');
  }

  if (!isPrivate(html)) {
    const header = sharedHeader(route);
    if (/<header\b[^>]*class=["'][^"']*sbk-global-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i.test(html)) {
      html = html.replace(/<header\b[^>]*class=["'][^"']*sbk-global-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i, header);
    } else {
      html = html.replace(/<body([^>]*)>/i, `<body$1>${header}`);
    }
  }

  fs.writeFileSync(file, html);
}

console.log('Normalized route metadata, shared assets, guide interactions, Pro Leads navigation and public navigation.');

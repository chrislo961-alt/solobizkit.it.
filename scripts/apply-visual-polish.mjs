import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NAV = [
  { label: 'Calculators', href: '/business-calculators/', key: 'calculators' },
  { label: 'Invoices', href: '/invoice-generator/', key: 'invoices' },
  { label: 'PDF Tools', href: '/pdf-tools/', key: 'pdf' },
  { label: 'QR Codes', href: '/qr-code-generator/', key: 'qr' },
  { label: 'About', href: '/about/', key: 'about' }
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function routeFor(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function activeKey(route) {
  if (route === '/tools/') return 'tools';
  if (/invoice/.test(route)) return 'invoices';
  if (/pdf/.test(route)) return 'pdf';
  if (/qr-code|\/qr-/.test(route)) return 'qr';
  if (/about|methodology|privacy|terms|contact/.test(route)) return 'about';
  if (/calculator|markup|gross-profit|break-even|hourly-rate|business-calculators/.test(route)) return 'calculators';
  return '';
}

function header(route) {
  const active = activeKey(route);
  const links = NAV.map(({ label, href, key }) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');
  return `<header class="sbk-global-header"><div class="sbk-global-nav"><a class="sbk-global-brand" href="/" aria-label="SoloBizKit home"><img class="sbk-brand-icon" src="/favicon.svg" width="29" height="29" alt="">SoloBiz<span>Kit</span></a><nav class="sbk-global-links" aria-label="Primary navigation">${links}</nav><a class="sbk-global-tools" href="/tools/"${active === 'tools' ? ' aria-current="page"' : ''}>All Tools</a></div></header>`;
}

const htmlFiles = walk(ROOT).filter((file) => file.endsWith('.html'));
let changed = 0;

for (const file of htmlFiles) {
  let html = fs.readFileSync(file, 'utf8');
  if (!/<header\b/i.test(html) || !/<\/head>/i.test(html)) continue;
  const before = html;
  const route = routeFor(file);

  html = html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i, header(route));

  if (!/href=["']\/global-shell\.css["']/i.test(html)) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/global-shell.css">\n</head>');
  }
  if (!/href=["']\/visual-polish\.css["']/i.test(html)) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/visual-polish.css">\n</head>');
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed++;
  }
}

console.log(`Applied the shared SoloBizKit navigation and visual layer to ${changed} HTML files.`);

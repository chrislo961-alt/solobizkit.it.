import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SUPPORT_UTILITY_ROUTES = new Set([
  '/biweekly-paycheck-calculator/',
  '/hourly-paycheck-calculator/',
  '/monthly-paycheck-calculator/',
  '/salary-paycheck-calculator/',
  '/cleaning-business-name-generator/',
  '/consulting-business-name-generator/',
  '/llc-name-generator/',
  '/photography-business-name-generator/',
  '/small-business-name-generator/',
  '/compress-pdf/',
  '/convert-multiple-pdfs-to-word/',
  '/crop-pdf/',
  '/delete-pdf-pages/',
  '/edit-pdf/',
  '/extract-pdf-pages/',
  '/html-to-pdf/',
  '/jpg-to-pdf/',
  '/merge-pdf/',
  '/number-pages/',
  '/pdf-to-editable-word/',
  '/pdf-to-excel/',
  '/pdf-to-html/',
  '/pdf-to-jpg/',
  '/pdf-to-png/',
  '/pdf-to-text/',
  '/pdf-to-word/',
  '/pdf-to-word-without-uploading/',
  '/png-to-pdf/',
  '/protect-pdf/',
  '/reorder-pdf/',
  '/rotate-pdf/',
  '/sign-pdf/',
  '/split-pdf/',
  '/unlock-pdf/',
  '/watermark-pdf/',
  '/word-to-pdf/',
  '/email-qr-code-generator/',
  '/qr-code-for-business-card/',
  '/qr-code-for-menu/',
  '/qr-code-with-logo/',
  '/sms-qr-code-generator/',
  '/url-qr-code-generator/',
  '/wifi-qr-code-generator/',
]);

function fileForRoute(route) {
  return path.join(ROOT, route.replace(/^\//, ''), 'index.html');
}

function setNoindex(html) {
  const robots = /<meta[^>]+name=["']robots["'][^>]*>/i;
  if (robots.test(html)) return html.replace(robots, '<meta name="robots" content="noindex,follow">');
  const canonical = /(<link[^>]+rel=["']canonical["'][^>]*>)/i;
  if (canonical.test(html)) return html.replace(canonical, '$1<meta name="robots" content="noindex,follow">');
  return html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>');
}

for (const route of SUPPORT_UTILITY_ROUTES) {
  const file = fileForRoute(route);
  if (!fs.existsSync(file)) throw new Error(`Missing support utility route: ${route}`);
  const before = fs.readFileSync(file, 'utf8');
  const after = setNoindex(before);
  if (after !== before) fs.writeFileSync(file, after);
}

console.log(`Applied noindex,follow to ${SUPPORT_UTILITY_ROUTES.size} support utility routes so the public search surface stays focused on small-business calculators, invoices, toolkits and guides.`);

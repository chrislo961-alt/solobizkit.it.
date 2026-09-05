import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://solobizkit.it.com';
const SOCIAL_IMAGE = `${SITE}/assets/images/solobizkit-social-preview.png`;
const ROOT_LANGUAGE_ROUTES = { en: '/', no: '/no/', sv: '/sv/', de: '/de/', es: '/es/', fr: '/fr/' };
const LANGUAGE_GROUPS = [
  { en:'/business-calculators/', no:'/no/kalkulatorer/', sv:'/sv/kalkylatorer/', de:'/de/rechner/', es:'/es/calculadoras/', fr:'/fr/calculateurs/' },
  { en:'/profit-margin-calculator/', no:'/no/fortjenestemargin-kalkulator/', sv:'/sv/vinstmarginal-kalkylator/', de:'/de/gewinnmargen-rechner/', es:'/es/calculadora-margen-beneficio/', fr:'/fr/calculateur-marge-beneficiaire/' },
  { en:'/break-even-calculator/', no:'/no/nullpunkt-kalkulator/', sv:'/sv/nollpunkts-kalkylator/', de:'/de/break-even-rechner/', es:'/es/calculadora-punto-equilibrio/', fr:'/fr/calculateur-seuil-rentabilite/' },
  { en:'/hourly-rate-calculator/', no:'/no/timepris-kalkulator/', sv:'/sv/timpris-kalkylator/', de:'/de/stundensatz-rechner/', es:'/es/calculadora-tarifa-hora/', fr:'/fr/calculateur-taux-horaire/' },
  { en:'/invoice-generator/', no:'/no/fakturagenerator/', sv:'/sv/fakturagenerator/', de:'/de/rechnungsgenerator/', es:'/es/generador-facturas/', fr:'/fr/generateur-factures/' }
];
const PUBLIC_LANGUAGE_HEADERS = {
  no: { home: '/no/', homeLabel: 'SoloBizKit hjem', navLabel: 'Hovedmeny', tools: 'Alle verktøy', links: [['/no/kalkulatorer/','Kalkulatorer'],['/no/fakturagenerator/','Faktura'],['/pdf-tools/','PDF-verktøy'],['/qr-code-generator/','QR-koder'],['/guides/','Guider'],['/about/','Om']] },
  sv: { home: '/sv/', homeLabel: 'SoloBizKit hem', navLabel: 'Huvudmeny', tools: 'Alla verktyg', links: [['/sv/kalkylatorer/','Kalkylatorer'],['/sv/fakturagenerator/','Fakturor'],['/pdf-tools/','PDF-verktyg'],['/qr-code-generator/','QR-koder'],['/guides/','Guider'],['/about/','Om']] },
  de: { home: '/de/', homeLabel: 'SoloBizKit Startseite', navLabel: 'Hauptnavigation', tools: 'Alle Tools', links: [['/de/rechner/','Rechner'],['/de/rechnungsgenerator/','Rechnungen'],['/pdf-tools/','PDF-Tools'],['/qr-code-generator/','QR-Codes'],['/guides/','Guides'],['/about/','Über uns']] },
  es: { home: '/es/', homeLabel: 'Inicio de SoloBizKit', navLabel: 'Navegación principal', tools: 'Todas las herramientas', links: [['/es/calculadoras/','Calculadoras'],['/es/generador-facturas/','Facturas'],['/pdf-tools/','PDF'],['/qr-code-generator/','Códigos QR'],['/guides/','Guías'],['/about/','Acerca de']] },
  fr: { home: '/fr/', homeLabel: 'Accueil SoloBizKit', navLabel: 'Navigation principale', tools: 'Tous les outils', links: [['/fr/calculateurs/','Calculateurs'],['/fr/generateur-factures/','Factures'],['/pdf-tools/','Outils PDF'],['/qr-code-generator/','Codes QR'],['/guides/','Guides'],['/about/','À propos']] }
};

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
function value(html, expression) { return html.match(expression)?.[1]?.trim() || ''; }
function attr(text) { return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;'); }
function routeForFile(file) { const relative = path.relative(ROOT, file); return relative === 'index.html' ? '/' : `/${path.dirname(relative).split(path.sep).join('/')}/`; }
function isPrivate(html) { const robots = value(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i); return /(?:^|,)\s*noindex\b/i.test(robots); }
function routeLanguage(route) { const match=route.match(/^\/(no|sv|de|es|fr)(?:\/|$)/); return match?.[1] || 'en'; }

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
  const lang=routeLanguage(route);
  const localized=PUBLIC_LANGUAGE_HEADERS[lang];
  if(localized){
    const links=localized.links.map(([href,label])=>`<a href="${href}"${route===href?' aria-current="page"':''}>${label}</a>`).join('');
    return `<header class="sbk-global-header"><div class="sbk-global-nav"><a class="sbk-global-brand" href="${localized.home}" aria-label="${localized.homeLabel}"><img class="sbk-brand-icon" src="/favicon.svg" width="29" height="29" alt="">SoloBiz<span>Kit</span></a><nav class="sbk-global-links" aria-label="${localized.navLabel}">${links}</nav><a class="sbk-global-tools" href="/tools/">${localized.tools}</a></div></header>`;
  }
  const links = [['/business-calculators/','Calculators'],['/invoice-generator/','Invoices'],['/pdf-tools/','PDF Tools'],['/qr-code-generator/','QR Codes'],['/guides/','Guides'],['/about/','About']].map(([href,label])=>`<a href="${href}"${currentAttr(route,href)}>${label}</a>`).join('');
  const toolsCurrent=route==='/tools/'?' aria-current="page"':'';
  return `<header class="sbk-global-header"><div class="sbk-global-nav"><a class="sbk-global-brand" href="/" aria-label="SoloBizKit home"><img class="sbk-brand-icon" src="/favicon.svg" width="29" height="29" alt="">SoloBiz<span>Kit</span></a><nav class="sbk-global-links" aria-label="Primary navigation">${links}</nav><a class="sbk-global-tools" href="/tools/"${toolsCurrent}>All Tools</a></div></header>`;
}

function injectLanguageAlternates(html, route) {
  if(Object.values(ROOT_LANGUAGE_ROUTES).includes(route)){
    html=html.replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'][^"']+["'][^>]*>/gi,'');
    const alternates=Object.entries(ROOT_LANGUAGE_ROUTES).map(([code,r])=>`<link rel="alternate" hreflang="${code}" href="${SITE}${r}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
    return html.replace('</head>',`${alternates}</head>`);
  }
  const group=LANGUAGE_GROUPS.find((candidate)=>Object.values(candidate).includes(route));
  if(!group)return html;
  html=html.replace(/<link[^>]+rel=["']alternate["'][^>]+hreflang=["'](?:en|no|sv|de|es|fr|x-default)["'][^>]*>/gi,'');
  const alternates=Object.entries(group).map(([code,r])=>`<link rel="alternate" hreflang="${code}" href="${SITE}${r}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${SITE}${group.en}">`;
  return html.replace('</head>',`${alternates}</head>`);
}

for (const file of walk(ROOT).filter((name)=>name===path.join(ROOT,'index.html')||name.endsWith(`${path.sep}index.html`))) {
  let html=fs.readFileSync(file,'utf8');
  const route=routeForFile(file);

  if(route.startsWith('/pro/')){
    if(!/<script[^>]+src=["']\/pro\/leads-nav\.js["']/i.test(html))html=html.replace('</body>','<script src="/pro/leads-nav.js" defer></script></body>');
    if(!/<link[^>]+href=["']\/pro\/pro-i18n\.css["']/i.test(html))html=html.replace('</head>','<link rel="stylesheet" href="/pro/pro-i18n.css"></head>');
    if(!/<script[^>]+src=["']\/pro\/pro-i18n\.js["']/i.test(html))html=html.replace('</body>','<script src="/pro/pro-i18n.js" defer></script></body>');
  }

  if(route==='/invoice-generator/'&&!/<script[^>]+src=["']\/invoice-i18n\.js["']/i.test(html))html=html.replace('</body>','<script src="/invoice-i18n.js" defer></script></body>');

  const title=value(html,/<title>([^<]+)<\/title>/i);
  const description=value(html,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const canonical=value(html,/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if(!title||!description||!canonical){fs.writeFileSync(file,html);continue;}

  html=html.replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi,'').replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi,'').replace(/<link[^>]+rel=["']icon["'][^>]*>/gi,'').replace(/<meta[^>]+property=["']og:site_name["'][^>]*>/gi,'').replace(/<meta[^>]+property=["']og:image["'][^>]*>/gi,'').replace(/<meta[^>]+name=["']twitter:image["'][^>]*>/gi,'').replace(/<meta[^>]+name=["']twitter:card["'][^>]*>/gi,'').replace(/<script[^>]+src=["']\/analytics-consent\.js["'][^>]*><\/script>/gi,'<script src="/analytics.js" defer></script>');
  if(!/<meta[^>]+name=["']robots["']/i.test(html))html=html.replace(/(<link[^>]+rel=["']canonical["'][^>]*>)/i,'$1<meta name="robots" content="index,follow,max-image-preview:large">');
  if(!/<meta[^>]+property=["']og:title["']/i.test(html))html=html.replace('</head>',`<meta property="og:title" content="${attr(title)}"></head>`);
  if(!/<meta[^>]+property=["']og:description["']/i.test(html))html=html.replace('</head>',`<meta property="og:description" content="${attr(description)}"></head>`);
  if(!/<meta[^>]+property=["']og:type["']/i.test(html))html=html.replace('</head>','<meta property="og:type" content="website"></head>');
  if(!/<meta[^>]+property=["']og:url["']/i.test(html))html=html.replace('</head>',`<meta property="og:url" content="${canonical}"></head>`);
  if(!/<meta[^>]+name=["']twitter:title["']/i.test(html))html=html.replace('</head>',`<meta name="twitter:title" content="${attr(title)}"></head>`);
  if(!/<meta[^>]+name=["']twitter:description["']/i.test(html))html=html.replace('</head>',`<meta name="twitter:description" content="${attr(description)}"></head>`);
  if(!/application\/ld\+json/i.test(html)){
    const lang=routeLanguage(route);
    const schema=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:title.replace(/\s*\|\s*SoloBizKit\s*$/i,''),url:canonical,description,...(lang!=='en'?{inLanguage:lang}:{}),isPartOf:{'@type':'WebSite',name:'SoloBizKit',url:`${SITE}/`}});
    html=html.replace('</head>',`<script type="application/ld+json">${schema}</script></head>`);
  }
  const standard=`<meta name="theme-color" content="#2563eb"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="manifest" href="/site.webmanifest"><meta property="og:site_name" content="SoloBizKit"><meta property="og:image" content="${SOCIAL_IMAGE}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SOCIAL_IMAGE}">`;
  html=html.replace('</head>',`${standard}</head>`);
  if(!/<link[^>]+href=["']\/analytics-consent\.css["']/i.test(html))html=html.replace('</head>','<link rel="stylesheet" href="/analytics-consent.css"></head>');
  if(!/<script[^>]+src=["']\/analytics\.js["']/i.test(html))html=html.replace('</head>','<script src="/analytics.js" defer></script></head>');

  if(!isPrivate(html)){
    if(!/<link[^>]+href=["']\/visual-polish\.css["']/i.test(html))html=html.replace('</head>','<link rel="stylesheet" href="/visual-polish.css"></head>');
    if(!/<link[^>]+href=["']\/language-switcher\.css["']/i.test(html))html=html.replace('</head>','<link rel="stylesheet" href="/language-switcher.css"></head>');
    if(!/<script[^>]+src=["']\/language-switcher\.js["']/i.test(html))html=html.replace('</head>','<script src="/language-switcher.js" defer></script></head>');
    html=injectLanguageAlternates(html,route);
  }
  if(route.startsWith('/guides/')&&route!=='/guides/'&&!/<script[^>]+src=["']\/guides\/guide-interactions\.js["']/i.test(html))html=html.replace('</body>','<script src="/guides/guide-interactions.js" defer></script></body>');
  if(!isPrivate(html)){
    const header=sharedHeader(route);
    if(/<header\b[^>]*class=["'][^"']*sbk-global-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i.test(html))html=html.replace(/<header\b[^>]*class=["'][^"']*sbk-global-header[^"']*["'][^>]*>[\s\S]*?<\/header>/i,header);
    else html=html.replace(/<body([^>]*)>/i,`<body$1>${header}`);
  }
  fs.writeFileSync(file,html);
}

console.log('Normalized metadata, six-language navigation, calculator/invoice hreflang, visual polish, guide interactions and Pro i18n.');
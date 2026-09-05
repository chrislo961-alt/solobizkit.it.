(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;

  const parityRoutes=new Set([
    '/',
    '/business-calculators/','/profit-margin-calculator/','/break-even-calculator/','/hourly-rate-calculator/','/invoice-generator/',
    '/no/','/no/kalkulatorer/','/no/fortjenestemargin-kalkulator/','/no/nullpunkt-kalkulator/','/no/timepris-kalkulator/','/no/fakturagenerator/',
    '/sv/','/sv/kalkylatorer/','/sv/vinstmarginal-kalkylator/','/sv/nollpunkts-kalkylator/','/sv/timpris-kalkylator/','/sv/fakturagenerator/',
    '/de/','/de/rechner/','/de/gewinnmargen-rechner/','/de/break-even-rechner/','/de/stundensatz-rechner/','/de/rechnungsgenerator/',
    '/es/','/es/calculadoras/','/es/calculadora-margen-beneficio/','/es/calculadora-punto-equilibrio/','/es/calculadora-tarifa-hora/','/es/generador-facturas/',
    '/fr/','/fr/calculateurs/','/fr/calculateur-marge-beneficiaire/','/fr/calculateur-seuil-rentabilite/','/fr/calculateur-taux-horaire/','/fr/generateur-factures/'
  ]);
  const localizedInvoiceRoutes=new Set([
    '/no/fakturagenerator/','/sv/fakturagenerator/','/de/rechnungsgenerator/','/es/generador-facturas/','/fr/generateur-factures/'
  ]);
  if(parityRoutes.has(location.pathname))document.documentElement.classList.add('sbk-parity-loading');

  function loadScript(src,marker){
    if(document.querySelector(`script[${marker}]`))return Promise.resolve();
    return new Promise((resolve)=>{const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(marker,'1');s.onload=s.onerror=()=>resolve();document.head.appendChild(s)});
  }

  const bootPromise=(async()=>{
    await loadScript('/public-i18n-extra.js?v=20260905-1','data-sbk-public-i18n-extra');
    await loadScript('/public-i18n.js?v=20260905-4','data-sbk-public-i18n');
    await loadScript('/site-parity.js?v=20260905-2','data-sbk-site-parity');
    if(localizedInvoiceRoutes.has(location.pathname))await loadScript('/invoice-payment-details.js?v=20260905-1','data-sbk-invoice-payment-details');
  })();

  const nav=document.querySelector('.sbk-global-nav');
  if(!nav||nav.querySelector('.sbk-language-switcher'))return;

  const STORAGE_KEY='sbk_language';
  const languages={
    en:{name:'English',short:'EN',root:'/'},
    no:{name:'Norsk',short:'NO',root:'/no/'},
    sv:{name:'Svenska',short:'SV',root:'/sv/'},
    de:{name:'Deutsch',short:'DE',root:'/de/'},
    es:{name:'Español',short:'ES',root:'/es/'},
    fr:{name:'Français',short:'FR',root:'/fr/'}
  };
  const maps={
    no:{'/':'/no/','/business-calculators/':'/no/kalkulatorer/','/profit-margin-calculator/':'/no/fortjenestemargin-kalkulator/','/break-even-calculator/':'/no/nullpunkt-kalkulator/','/hourly-rate-calculator/':'/no/timepris-kalkulator/','/invoice-generator/':'/no/fakturagenerator/'},
    sv:{'/':'/sv/','/business-calculators/':'/sv/kalkylatorer/','/profit-margin-calculator/':'/sv/vinstmarginal-kalkylator/','/break-even-calculator/':'/sv/nollpunkts-kalkylator/','/hourly-rate-calculator/':'/sv/timpris-kalkylator/','/invoice-generator/':'/sv/fakturagenerator/'},
    de:{'/':'/de/','/business-calculators/':'/de/rechner/','/profit-margin-calculator/':'/de/gewinnmargen-rechner/','/break-even-calculator/':'/de/break-even-rechner/','/hourly-rate-calculator/':'/de/stundensatz-rechner/','/invoice-generator/':'/de/rechnungsgenerator/'},
    es:{'/':'/es/','/business-calculators/':'/es/calculadoras/','/profit-margin-calculator/':'/es/calculadora-margen-beneficio/','/break-even-calculator/':'/es/calculadora-punto-equilibrio/','/hourly-rate-calculator/':'/es/calculadora-tarifa-hora/','/invoice-generator/':'/es/generador-facturas/'},
    fr:{'/':'/fr/','/business-calculators/':'/fr/calculateurs/','/profit-margin-calculator/':'/fr/calculateur-marge-beneficiaire/','/break-even-calculator/':'/fr/calculateur-seuil-rentabilite/','/hourly-rate-calculator/':'/fr/calculateur-taux-horaire/','/invoice-generator/':'/fr/generateur-factures/'}
  };
  const reverse={};
  for(const map of Object.values(maps))for(const [en,local] of Object.entries(map))reverse[local]=en;

  function urlLanguage(){const match=location.pathname.match(/^\/(no|sv|de|es|fr)(?:\/|$)/);return match?match[1]:null}
  function savedLanguage(){try{const v=localStorage.getItem(STORAGE_KEY);return languages[v]?v:null}catch(_){return null}}
  function activeLanguage(){return urlLanguage()||savedLanguage()||'en'}
  function englishEquivalent(){return reverse[location.pathname]||location.pathname||'/'}
  function pathFor(code){const english=englishEquivalent();if(code==='en')return english;return maps[code]?.[english]||location.pathname}
  function save(code){try{localStorage.setItem(STORAGE_KEY,code)}catch(_){}}
  function localizeKnownLinks(code){
    if(code==='en'||!maps[code])return;
    document.querySelectorAll('a[href]').forEach((link)=>{
      const raw=link.getAttribute('href');if(!raw||!raw.startsWith('/'))return;
      const mapped=maps[code][raw];if(mapped&&mapped!==raw)link.setAttribute('href',mapped);
    });
  }
  function clarifyPaymentOptions(){
    const pathLang=urlLanguage()||'en';
    const labels={en:'BANK / STRIPE',no:'BANK / STRIPE',sv:'BANK / STRIPE',de:'BANK / STRIPE',es:'BANCO / STRIPE',fr:'BANQUE / STRIPE'};
    const bullets={
      en:'✓ Recurring billing & bank / Stripe payments',
      no:'✓ Fast fakturering og bank / Stripe-betalinger',
      sv:'✓ Återkommande fakturering och bank / Stripe-betalningar',
      de:'✓ Wiederkehrende Abrechnung und Bank- / Stripe-Zahlungen',
      es:'✓ Facturación recurrente y pagos por banco / Stripe',
      fr:'✓ Facturation récurrente et paiements banque / Stripe'
    };
    const flowTags=document.querySelectorAll('.hero-product-flow em');
    if(flowTags.length)flowTags[flowTags.length-1].textContent=labels[pathLang]||labels.en;
    document.querySelectorAll('.product-choice-card.pro li').forEach((item)=>{
      const text=(item.textContent||'').toLowerCase();
      if(text.includes('stripe')||text.includes('betaling')||text.includes('betalning')||text.includes('zahlung')||text.includes('pago')||text.includes('paiement')){
        if(text.includes('recurr')||text.includes('fast fakturering')||text.includes('återkommande')||text.includes('wiederkehrende')||text.includes('facturación recurrente')||text.includes('facturation récurrente'))item.textContent=bullets[pathLang]||bullets.en;
      }
    });
  }

  window.sbkRelocalizeLinks=function(){localizeKnownLinks(activeLanguage());clarifyPaymentOptions()};

  const active=activeLanguage();
  if(urlLanguage())save(active);
  localizeKnownLinks(active);
  const wrap=document.createElement('div');
  wrap.className='sbk-language-switcher';
  wrap.innerHTML=`<button type="button" class="sbk-language-button" aria-haspopup="true" aria-expanded="false" aria-label="Language"><span class="sbk-language-globe" aria-hidden="true">🌐</span><span class="sbk-language-name">${languages[active].name}</span><span aria-hidden="true">▾</span></button><div class="sbk-language-menu" role="menu">${Object.entries(languages).map(([code,language])=>`<a role="menuitem" href="${pathFor(code)}" data-language="${code}" ${code===active?'aria-current="true"':''}><span>${language.name}</span><small>${language.short}</small></a>`).join('')}</div>`;
  const tools=nav.querySelector('.sbk-global-tools');if(tools)nav.insertBefore(wrap,tools);else nav.appendChild(wrap);
  const button=wrap.querySelector('button');
  function close(){wrap.classList.remove('is-open');button.setAttribute('aria-expanded','false')}
  button.addEventListener('click',()=>{const open=!wrap.classList.contains('is-open');wrap.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open))});
  wrap.querySelectorAll('[data-language]').forEach(link=>link.addEventListener('click',(event)=>{const code=link.dataset.language;save(code);const target=link.getAttribute('href')||location.pathname;if(target===location.pathname){event.preventDefault();location.reload()}}));
  document.addEventListener('click',(event)=>{if(!wrap.contains(event.target))close()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});

  let relocalizeQueued=false;
  const observer=new MutationObserver(()=>{
    if(relocalizeQueued)return;
    relocalizeQueued=true;
    requestAnimationFrame(()=>{relocalizeQueued=false;localizeKnownLinks(activeLanguage());clarifyPaymentOptions()});
  });
  observer.observe(document.body,{childList:true,subtree:true});
  bootPromise.then(()=>{window.sbkPublicI18n?.apply?.();window.sbkRelocalizeLinks?.();clarifyPaymentOptions()});
})();
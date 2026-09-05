(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;

  if(!document.querySelector('script[data-sbk-public-i18n]')){
    const i18n=document.createElement('script');
    i18n.src='/public-i18n.js?v=20260905-1';
    i18n.defer=true;
    i18n.dataset.sbkPublicI18n='1';
    document.head.appendChild(i18n);
  }

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
    no:{
      '/':'/no/','/business-calculators/':'/no/kalkulatorer/','/profit-margin-calculator/':'/no/fortjenestemargin-kalkulator/','/break-even-calculator/':'/no/nullpunkt-kalkulator/','/hourly-rate-calculator/':'/no/timepris-kalkulator/'
    },
    sv:{'/':'/sv/','/profit-margin-calculator/':'/sv/vinstmarginal-kalkylator/'},
    de:{'/':'/de/','/profit-margin-calculator/':'/de/gewinnmargen-rechner/'},
    es:{'/':'/es/','/profit-margin-calculator/':'/es/calculadora-margen-beneficio/'},
    fr:{'/':'/fr/','/profit-margin-calculator/':'/fr/calculateur-marge-beneficiaire/'}
  };
  const reverse={};
  for(const [code,map] of Object.entries(maps))for(const [en,local] of Object.entries(map))reverse[local]={code,en};

  function urlLanguage(){const match=location.pathname.match(/^\/(no|sv|de|es|fr)(?:\/|$)/);return match?match[1]:null}
  function savedLanguage(){try{const v=localStorage.getItem(STORAGE_KEY);return languages[v]?v:null}catch(_){return null}}
  function activeLanguage(){return urlLanguage()||savedLanguage()||'en'}
  function englishEquivalent(){return reverse[location.pathname]?.en||location.pathname||'/'}
  function pathFor(code){
    const english=englishEquivalent();
    if(code==='en')return english;
    const mapped=maps[code]?.[english];
    if(mapped)return mapped;
    return location.pathname;
  }
  function save(code){try{localStorage.setItem(STORAGE_KEY,code)}catch(_){}}

  const active=activeLanguage();
  if(urlLanguage())save(active);
  const wrap=document.createElement('div');
  wrap.className='sbk-language-switcher';
  wrap.innerHTML=`<button type="button" class="sbk-language-button" aria-haspopup="true" aria-expanded="false" aria-label="Language"><span class="sbk-language-globe" aria-hidden="true">🌐</span><span class="sbk-language-name">${languages[active].name}</span><span aria-hidden="true">▾</span></button><div class="sbk-language-menu" role="menu">${Object.entries(languages).map(([code,language])=>`<a role="menuitem" href="${pathFor(code)}" data-language="${code}" ${code===active?'aria-current="true"':''}><span>${language.name}</span><small>${language.short}</small></a>`).join('')}</div>`;
  const tools=nav.querySelector('.sbk-global-tools');
  if(tools)nav.insertBefore(wrap,tools);else nav.appendChild(wrap);
  const button=wrap.querySelector('button');
  function close(){wrap.classList.remove('is-open');button.setAttribute('aria-expanded','false')}
  button.addEventListener('click',()=>{
    const open=!wrap.classList.contains('is-open');wrap.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));
  });
  wrap.querySelectorAll('[data-language]').forEach(link=>link.addEventListener('click',(event)=>{
    const code=link.dataset.language;save(code);
    const target=link.getAttribute('href')||location.pathname;
    if(target===location.pathname){event.preventDefault();location.reload()}
  }));
  document.addEventListener('click',(event)=>{if(!wrap.contains(event.target))close()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});
})();
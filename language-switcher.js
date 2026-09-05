(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;
  const nav=document.querySelector('.sbk-global-nav');
  if(!nav||nav.querySelector('.sbk-language-switcher'))return;

  const languages={
    en:{name:'English',short:'EN',root:'/'},
    no:{name:'Norsk',short:'NO',root:'/no/'},
    sv:{name:'Svenska',short:'SV',root:'/sv/'},
    de:{name:'Deutsch',short:'DE',root:'/de/'},
    es:{name:'Español',short:'ES',root:'/es/'},
    fr:{name:'Français',short:'FR',root:'/fr/'}
  };
  const norwegianMap={
    '/':'/no/',
    '/business-calculators/':'/no/kalkulatorer/',
    '/profit-margin-calculator/':'/no/fortjenestemargin-kalkulator/',
    '/break-even-calculator/':'/no/nullpunkt-kalkulator/',
    '/hourly-rate-calculator/':'/no/timepris-kalkulator/'
  };
  const englishMap=Object.fromEntries(Object.entries(norwegianMap).map(([en,no])=>[no,en]));
  function currentLanguage(){
    const match=location.pathname.match(/^\/(no|sv|de|es|fr)(?:\/|$)/);
    return match?match[1]:'en';
  }
  function englishEquivalent(){
    const lang=currentLanguage();
    if(lang==='no')return englishMap[location.pathname]||'/';
    if(lang!=='en')return '/';
    return location.pathname||'/';
  }
  function pathFor(code){
    const lang=currentLanguage();
    if(code==='en')return englishEquivalent();
    if(code==='no'){
      if(lang==='no')return location.pathname;
      if(lang==='en')return norwegianMap[location.pathname]||'/no/';
      return '/no/';
    }
    if(lang===code)return location.pathname;
    return languages[code].root;
  }

  const active=currentLanguage();
  const wrap=document.createElement('div');
  wrap.className='sbk-language-switcher';
  wrap.innerHTML=`<button type="button" class="sbk-language-button" aria-haspopup="true" aria-expanded="false" aria-label="Language"><span class="sbk-language-globe" aria-hidden="true">🌐</span><span class="sbk-language-name">${languages[active].name}</span><span aria-hidden="true">▾</span></button><div class="sbk-language-menu" role="menu">${Object.entries(languages).map(([code,language])=>`<a role="menuitem" href="${pathFor(code)}" data-language="${code}" ${code===active?'aria-current="true"':''}><span>${language.name}</span><small>${language.short}</small></a>`).join('')}</div>`;
  const tools=nav.querySelector('.sbk-global-tools');
  if(tools)nav.insertBefore(wrap,tools);else nav.appendChild(wrap);
  const button=wrap.querySelector('button');
  function close(){wrap.classList.remove('is-open');button.setAttribute('aria-expanded','false')}
  button.addEventListener('click',()=>{
    const open=!wrap.classList.contains('is-open');
    wrap.classList.toggle('is-open',open);
    button.setAttribute('aria-expanded',String(open));
  });
  wrap.querySelectorAll('[data-language]').forEach(link=>link.addEventListener('click',()=>{try{localStorage.setItem('sbk_language',link.dataset.language)}catch(_){}}));
  document.addEventListener('click',(event)=>{if(!wrap.contains(event.target))close()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});
})();
(function(){
  'use strict';
  if(location.pathname.startsWith('/pro/')||location.pathname.startsWith('/lead/'))return;
  const nav=document.querySelector('.sbk-global-nav');
  if(!nav||nav.querySelector('.sbk-language-switcher'))return;

  const norwegianMap={
    '/':'/no/',
    '/business-calculators/':'/no/kalkulatorer/',
    '/profit-margin-calculator/':'/no/fortjenestemargin-kalkulator/',
    '/break-even-calculator/':'/no/nullpunkt-kalkulator/',
    '/hourly-rate-calculator/':'/no/timepris-kalkulator/'
  };
  const englishMap=Object.fromEntries(Object.entries(norwegianMap).map(([en,no])=>[no,en]));
  const isNorwegian=location.pathname==='/no/'||location.pathname.startsWith('/no/');
  const englishPath=isNorwegian?(englishMap[location.pathname]||'/'):(location.pathname||'/');
  const norwegianPath=isNorwegian?(location.pathname):(norwegianMap[location.pathname]||'/no/');

  const wrap=document.createElement('div');
  wrap.className='sbk-language-switcher';
  wrap.innerHTML=`<button type="button" class="sbk-language-button" aria-haspopup="true" aria-expanded="false"><span class="sbk-language-globe" aria-hidden="true">🌐</span><span class="sbk-language-name">${isNorwegian?'Norsk':'English'}</span><span aria-hidden="true">▾</span></button><div class="sbk-language-menu" role="menu"><a role="menuitem" href="${englishPath}" ${!isNorwegian?'aria-current="true"':''}><span>English</span><small>EN</small></a><a role="menuitem" href="${norwegianPath}" ${isNorwegian?'aria-current="true"':''}><span>Norsk</span><small>NO</small></a></div>`;
  const tools=nav.querySelector('.sbk-global-tools');
  if(tools)nav.insertBefore(wrap,tools);else nav.appendChild(wrap);
  const button=wrap.querySelector('button');
  function close(){wrap.classList.remove('is-open');button.setAttribute('aria-expanded','false')}
  button.addEventListener('click',()=>{
    const open=!wrap.classList.contains('is-open');
    wrap.classList.toggle('is-open',open);
    button.setAttribute('aria-expanded',String(open));
  });
  document.addEventListener('click',(event)=>{if(!wrap.contains(event.target))close()});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape')close()});
})();
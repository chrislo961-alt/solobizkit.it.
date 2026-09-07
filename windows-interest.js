// SoloBizKit Windows CRM + invoicing demand validation
(function(){
  const path=location.pathname.replace(/\/+$/,'/')||'/';
  const isHome=['/','/no/','/sv/','/de/','/es/','/fr/'].includes(path);
  const isHighIntent=isHome||path.includes('/invoice-generator/')||path.startsWith('/pro-pricing/')||path.startsWith('/pro/');
  if(!isHighIntent||document.getElementById('sbkWindowsInterest'))return;

  const locale=(()=>{
    const p=location.pathname.split('/').filter(Boolean)[0];
    if(['no','sv','de','es','fr'].includes(p))return p;
    try{const saved=localStorage.getItem('sbk_language');if(['en','no','sv','de','es','fr'].includes(saved))return saved}catch(_){}
    const html=(document.documentElement.lang||'en').toLowerCase().split('-')[0];
    return ['en','no','sv','de','es','fr'].includes(html)?html:'en';
  })();

  const text={
    en:{badge:'COMING SOON',product:'SoloBizKit CRM & Invoicing for Windows',cta:"I'm interested →",recorded:'Interest recorded ✓',title:'Would you use SoloBizKit on Windows?',copy:"We're considering a Windows desktop version of SoloBizKit CRM & Invoicing. This is only a demand test — there is no download yet and no email is required.",no:'Not now',yes:"Yes, I'd use it",thanks:'Thanks — your interest is recorded.',close:'Close'},
    no:{badge:'KOMMER SNART',product:'SoloBizKit CRM og fakturering for Windows',cta:'Jeg er interessert →',recorded:'Interesse registrert ✓',title:'Ville du brukt SoloBizKit på Windows?',copy:'Vi vurderer en Windows-versjon av SoloBizKit CRM og fakturering. Dette er kun en interessetest — det finnes ingen nedlasting ennå, og vi ber ikke om e-post.',no:'Ikke nå',yes:'Ja, jeg ville brukt den',thanks:'Takk — interessen din er registrert.',close:'Lukk'},
    sv:{badge:'KOMMER SNART',product:'SoloBizKit CRM och fakturering för Windows',cta:'Jag är intresserad →',recorded:'Intresse registrerat ✓',title:'Skulle du använda SoloBizKit på Windows?',copy:'Vi överväger en Windows-version av SoloBizKit CRM och fakturering. Detta är bara ett intressetest — det finns ingen nedladdning ännu och ingen e-post krävs.',no:'Inte nu',yes:'Ja, jag skulle använda den',thanks:'Tack — ditt intresse är registrerat.',close:'Stäng'},
    de:{badge:'DEMNÄCHST',product:'SoloBizKit CRM & Rechnungen für Windows',cta:'Ich bin interessiert →',recorded:'Interesse erfasst ✓',title:'Würden Sie SoloBizKit unter Windows nutzen?',copy:'Wir prüfen eine Windows-Desktopversion von SoloBizKit CRM & Rechnungen. Dies ist nur ein Interessen-Test — es gibt noch keinen Download und keine E-Mail ist erforderlich.',no:'Nicht jetzt',yes:'Ja, würde ich nutzen',thanks:'Danke — Ihr Interesse wurde erfasst.',close:'Schließen'},
    es:{badge:'PRÓXIMAMENTE',product:'SoloBizKit CRM y facturación para Windows',cta:'Me interesa →',recorded:'Interés registrado ✓',title:'¿Usarías SoloBizKit en Windows?',copy:'Estamos valorando una versión de escritorio para Windows de SoloBizKit CRM y facturación. Esto es solo una prueba de interés: todavía no hay descarga y no pedimos tu email.',no:'Ahora no',yes:'Sí, lo usaría',thanks:'Gracias — hemos registrado tu interés.',close:'Cerrar'},
    fr:{badge:'BIENTÔT',product:'SoloBizKit CRM & facturation pour Windows',cta:'Je suis intéressé →',recorded:'Intérêt enregistré ✓',title:'Utiliseriez-vous SoloBizKit sur Windows ?',copy:'Nous envisageons une version Windows de SoloBizKit CRM & facturation. Il s’agit seulement de mesurer l’intérêt — aucun téléchargement n’est encore disponible et aucun e-mail n’est demandé.',no:'Pas maintenant',yes:"Oui, je l'utiliserais",thanks:'Merci — votre intérêt est enregistré.',close:'Fermer'}
  };
  const t=text[locale]||text.en;
  const KEY='sbk_windows_crm_invoice_interest_v1';
  const hasInterest=()=>{try{return localStorage.getItem(KEY)==='yes'}catch(_){return false}};
  const track=(name,extra)=>window.sbkTrack?.(name,Object.assign({interest_product:'windows_crm_invoice',interest_locale:locale},extra||{}));

  const style=document.createElement('style');
  style.id='sbkWindowsInterestStyle';
  style.textContent=`
    #sbkWindowsInterest{position:relative;z-index:9990;width:100%;min-height:36px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:10px;padding:7px 16px;background:#f4faf8;border-bottom:1px solid #d8e8e2;color:#17211f;font:600 13px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
    #sbkWindowsInterest .sbk-win-badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;background:#d9f1ea;color:#086b61;font-size:11px;font-weight:850;letter-spacing:.05em;white-space:nowrap}
    #sbkWindowsInterest .sbk-win-product{font-weight:650}
    #sbkWindowsInterest .sbk-win-cta{border:0;background:transparent;padding:2px 0;color:#087a70;font:800 13px/1.2 inherit;cursor:pointer;white-space:nowrap}
    #sbkWindowsInterest .sbk-win-cta:hover{text-decoration:underline}
    #sbkWindowsInterest .sbk-win-cta[disabled]{cursor:default;color:#4a746e;text-decoration:none}
    #sbkWindowsInterestDialog{width:min(520px,calc(100vw - 28px));border:0;border-radius:18px;padding:0;background:#fff;color:#16211f;box-shadow:0 24px 80px rgba(13,32,29,.24);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #sbkWindowsInterestDialog::backdrop{background:rgba(8,18,16,.42);backdrop-filter:blur(2px)}
    #sbkWindowsInterestDialog .sbk-win-dialog{padding:24px}
    #sbkWindowsInterestDialog h2{margin:0 0 9px;font-size:23px;line-height:1.18}
    #sbkWindowsInterestDialog p{margin:0;color:#5f706c;font-size:14px;line-height:1.55}
    #sbkWindowsInterestDialog .sbk-win-dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}
    #sbkWindowsInterestDialog button{border-radius:10px;padding:10px 14px;font:750 13px/1 system-ui;cursor:pointer}
    #sbkWindowsInterestDialog .sbk-win-no{border:1px solid #d7e2de;background:#fff;color:#344541}
    #sbkWindowsInterestDialog .sbk-win-yes{border:1px solid #087a70;background:#087a70;color:#fff}
    #sbkWindowsInterestDialog .sbk-win-thanks{padding:28px 24px;text-align:center}
    #sbkWindowsInterestDialog .sbk-win-thanks strong{display:block;margin-bottom:14px;font-size:18px}
    @media(max-width:620px){#sbkWindowsInterest{gap:7px;padding:7px 10px;font-size:12px;flex-wrap:wrap}#sbkWindowsInterest .sbk-win-product{flex:1 1 auto}#sbkWindowsInterestDialog .sbk-win-dialog-actions{flex-direction:column-reverse}#sbkWindowsInterestDialog button{width:100%}}
  `;
  document.head.appendChild(style);

  const bar=document.createElement('div');
  bar.id='sbkWindowsInterest';
  bar.setAttribute('role','region');
  bar.setAttribute('aria-label',t.product);
  bar.innerHTML=`<span class="sbk-win-badge">${t.badge}</span><span class="sbk-win-product">${t.product}</span><button class="sbk-win-cta" type="button">${hasInterest()?t.recorded:t.cta}</button>`;
  const anchor=document.body.firstElementChild;
  document.body.insertBefore(bar,anchor||null);
  const cta=bar.querySelector('.sbk-win-cta');
  if(hasInterest())cta.disabled=true;

  let dialog=document.getElementById('sbkWindowsInterestDialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='sbkWindowsInterestDialog';
    document.body.appendChild(dialog);
  }
  const renderQuestion=()=>{
    dialog.innerHTML=`<div class="sbk-win-dialog"><h2>${t.title}</h2><p>${t.copy}</p><div class="sbk-win-dialog-actions"><button type="button" class="sbk-win-no">${t.no}</button><button type="button" class="sbk-win-yes">${t.yes}</button></div></div>`;
    dialog.querySelector('.sbk-win-no').onclick=()=>{track('windows_interest_not_now');dialog.close()};
    dialog.querySelector('.sbk-win-yes').onclick=()=>{
      try{localStorage.setItem(KEY,'yes')}catch(_){}
      track('windows_interest_yes');
      cta.textContent=t.recorded;cta.disabled=true;
      dialog.innerHTML=`<div class="sbk-win-thanks"><strong>${t.thanks}</strong><button type="button" class="sbk-win-yes">${t.close}</button></div>`;
      dialog.querySelector('button').onclick=()=>dialog.close();
    };
  };
  cta.addEventListener('click',()=>{if(hasInterest())return;track('windows_interest_open');renderQuestion();if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')});
  track('windows_interest_view',{interest_recorded:hasInterest()});
})();
(function(){
  'use strict';
  if(!location.pathname.startsWith('/pro/'))return;

  const STORAGE_KEY='sbk_language';
  const lang=(()=>{try{const v=localStorage.getItem(STORAGE_KEY);return ['en','no','sv','de','es','fr'].includes(v)?v:'en'}catch{return'en'}})();
  const copy={
    en:{secure:'Secure account',stripe:'Checkout by Stripe',trial:'Cancel during trial',loading:'Loading your workspace',loadingSub:'Securely syncing your business data…',errorTitle:'We hit a snag',successTitle:'Done'},
    no:{secure:'Sikker konto',stripe:'Betaling via Stripe',trial:'Avslutt i prøveperioden',loading:'Laster arbeidsområdet',loadingSub:'Synkroniserer bedriftsdata sikkert…',errorTitle:'Noe gikk galt',successTitle:'Ferdig'},
    sv:{secure:'Säkert konto',stripe:'Betalning via Stripe',trial:'Avsluta under provperioden',loading:'Laddar arbetsytan',loadingSub:'Synkroniserar företagsdata säkert…',errorTitle:'Något gick fel',successTitle:'Klart'},
    de:{secure:'Sicheres Konto',stripe:'Checkout über Stripe',trial:'In der Testphase kündbar',loading:'Arbeitsbereich wird geladen',loadingSub:'Geschäftsdaten werden sicher synchronisiert…',errorTitle:'Etwas ist schiefgelaufen',successTitle:'Erledigt'},
    es:{secure:'Cuenta segura',stripe:'Pago con Stripe',trial:'Cancela durante la prueba',loading:'Cargando tu espacio',loadingSub:'Sincronizando tus datos de forma segura…',errorTitle:'Algo salió mal',successTitle:'Listo'},
    fr:{secure:'Compte sécurisé',stripe:'Paiement via Stripe',trial:'Annulation pendant l’essai',loading:'Chargement de votre espace',loadingSub:'Synchronisation sécurisée de vos données…',errorTitle:'Un problème est survenu',successTitle:'Terminé'}
  }[lang];

  let stack=null;
  const pending=[];

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}

  function ensureStack(){
    if(stack&&stack.isConnected)return stack;
    if(!document.body)return null;
    stack=document.createElement('div');
    stack.className='sbk-toast-stack';
    stack.setAttribute('aria-live','polite');
    document.body.appendChild(stack);
    return stack;
  }

  function toast(message,type='error'){
    const target=ensureStack();
    if(!target){pending.push([message,type]);return}
    const el=document.createElement('div');
    el.className=`sbk-toast ${type}`;
    const title=type==='success'?copy.successTitle:copy.errorTitle;
    el.innerHTML=`<div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(String(message||''))}</p></div><button type="button" aria-label="Close">×</button>`;
    el.querySelector('button').onclick=()=>el.remove();
    target.appendChild(el);
    setTimeout(()=>el.remove(),7000);
  }

  // Install this immediately so Pro never falls back to the browser's native alert UI.
  window.alert=(message)=>toast(message,'error');
  window.sbkToast=(message,type='success')=>toast(message,type);

  function decoratePaywall(){
    const card=document.querySelector('.paywall-card');
    if(!card||card.querySelector('.paywall-trust'))return;
    const foot=card.querySelector('.paywall-foot');
    const trust=document.createElement('div');
    trust.className='paywall-trust';
    trust.innerHTML=`<span><i></i>${escapeHtml(copy.secure)}</span><span><i></i>${escapeHtml(copy.stripe)}</span><span><i></i>${escapeHtml(copy.trial)}</span>`;
    foot?.insertAdjacentElement('beforebegin',trust);
  }

  function decorateLoading(){
    const app=document.querySelector('#app');
    if(!app||app.querySelector('.sbk-loading-shell'))return;
    const text=(app.textContent||'').toLowerCase();
    if(!text.includes('loading your workspace')&&!text.includes('laster arbeidsområdet')&&!text.includes('laddar arbetsytan')&&!text.includes('arbeitsbereich')&&!text.includes('cargando tu espacio')&&!text.includes('chargement de votre espace'))return;
    app.innerHTML=`<div class="auth-stage"><section class="auth-card sbk-loading-shell"><p class="eyebrow">SOLOBIZKIT PRO</p><div class="sbk-loading-head"><span class="sbk-spinner" aria-hidden="true"></span><div class="sbk-loading-copy"><strong>${escapeHtml(copy.loading)}…</strong><span>${escapeHtml(copy.loadingSub)}</span></div></div><div class="sbk-skeleton" aria-hidden="true"><span></span><span></span><span></span></div></section></div>`;
  }

  function apply(){decoratePaywall();decorateLoading()}

  function boot(){
    ensureStack();
    while(pending.length){const [message,type]=pending.shift();toast(message,type)}
    new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
    apply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

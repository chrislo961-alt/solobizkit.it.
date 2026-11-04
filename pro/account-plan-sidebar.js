import { getSession, getWorkspaceContext, supabase } from './backend.js';

const language=(()=>{try{return localStorage.getItem('sbk_language')||'en'}catch{return'en'}})();
const copy={
  en:{title:'Account & plan',manage:'Manage subscription',upgrade:'Upgrade to Pro',settings:'Account settings',opening:'Opening billing…',error:'Could not open billing.'},
  no:{title:'Konto & abonnement',manage:'Administrer abonnement',upgrade:'Oppgrader til Pro',settings:'Kontoinnstillinger',opening:'Åpner fakturering…',error:'Kunne ikke åpne fakturering.'},
  sv:{title:'Konto & abonnemang',manage:'Hantera abonnemang',upgrade:'Uppgradera till Pro',settings:'Kontoinställningar',opening:'Öppnar fakturering…',error:'Kunde inte öppna fakturering.'},
  de:{title:'Konto & Tarif',manage:'Abo verwalten',upgrade:'Auf Pro upgraden',settings:'Kontoeinstellungen',opening:'Abrechnung wird geöffnet…',error:'Abrechnung konnte nicht geöffnet werden.'},
  es:{title:'Cuenta y plan',manage:'Gestionar suscripción',upgrade:'Mejorar a Pro',settings:'Ajustes de cuenta',opening:'Abriendo facturación…',error:'No se pudo abrir la facturación.'},
  fr:{title:'Compte et formule',manage:'Gérer l’abonnement',upgrade:'Passer à Pro',settings:'Paramètres du compte',opening:'Ouverture de la facturation…',error:'Impossible d’ouvrir la facturation.'}
};
const t=copy[language]||copy.en;
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

async function loadSummary(){
  const session=await getSession();
  if(!session?.user?.id)return null;
  const [workspace,result]=await Promise.all([
    getWorkspaceContext(),
    supabase.rpc('get_workspace_subscription_summary')
  ]);
  if(result.error)throw result.error;
  const sub=Array.isArray(result.data)?result.data[0]:result.data;
  return{session,workspace,sub:sub||{}};
}

async function openPortal(button,message){
  button.disabled=true;
  if(message)message.textContent=t.opening;
  try{
    const{data,error}=await supabase.functions.invoke('create-solobizkit-billing-portal',{body:{}});
    if(error)throw error;
    if(!data?.url)throw new Error(data?.error||t.error);
    window.location.assign(data.url);
  }catch(error){
    console.error(error);
    if(message)message.textContent=error?.message||t.error;
    button.disabled=false;
  }
}

async function render(){
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar||sidebar.querySelector('[data-account-plan]'))return;
  const summary=await loadSummary().catch(error=>{console.error('Account plan sidebar failed',error);return null});
  if(!summary)return;
  const{session,workspace,sub}=summary;
  const status=String(sub.status||'').toLowerCase();
  const pro=['active','trialing'].includes(status)&&String(sub.plan||'').toLowerCase()==='pro';
  const card=document.createElement('div');
  card.className='sidebar-account-plan';
  card.dataset.accountPlan='1';
  card.innerHTML=`<div class="sap-head"><span class="sap-title">${esc(t.title)}</span><span class="sap-plan">${pro?'PRO':'FREE'}</span></div><div class="sap-email">${esc(session.user.email||workspace?.name||'Account')}</div>${workspace?.isOwner?(pro?'<button class="sap-action" type="button" data-manage-subscription>'+esc(t.manage)+'</button>':'<a class="sap-action" href="/pro-pricing/">'+esc(t.upgrade)+'</a>'):''}<a class="sap-action secondary" href="/pro/settings/#billing">${esc(t.settings)}</a><div class="sap-message" data-account-plan-message></div>`;
  sidebar.appendChild(card);
  const button=card.querySelector('[data-manage-subscription]');
  const message=card.querySelector('[data-account-plan-message]');
  if(button)button.addEventListener('click',()=>openPortal(button,message));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void render(),{once:true});else void render();
new MutationObserver(()=>void render()).observe(document.body,{childList:true,subtree:true});

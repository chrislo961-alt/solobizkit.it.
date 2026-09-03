import { getSession, supabase } from '../backend.js';

let session=null;
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const formatDate=(value)=>{if(!value)return '—';try{return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date(value))}catch{return String(value)}};
const daysLeft=(value)=>{if(!value)return null;return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000));};

async function loadSubscription(){
  if(!session)session=await getSession();
  if(!session?.user?.id)return null;
  const {data,error}=await supabase.from('subscriptions').select('plan,status,current_period_end,cancel_at_period_end,stripe_customer_id,stripe_subscription_id,trial_started_at,trial_end_at').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;
  return data;
}

async function openPortal(button,message){
  button.disabled=true;message.textContent='Opening Stripe billing portal…';
  try{
    const {data,error}=await supabase.functions.invoke('create-solobizkit-billing-portal',{body:{}});
    if(error)throw error;
    if(!data?.url)throw new Error(data?.error||'Could not open billing portal.');
    window.location.assign(data.url);
  }catch(error){console.error(error);message.textContent=error?.message||'Could not open billing portal.';button.disabled=false;}
}

async function renderBilling(){
  const grid=document.querySelector('#app .settings-grid');
  if(!grid||grid.querySelector('[data-billing-account]'))return;
  try{
    const sub=await loadSubscription();
    if(!sub)return;
    const status=String(sub.status||'').toLowerCase();
    const active=['active','trialing'].includes(status);
    const trialing=status==='trialing';
    const trialDays=daysLeft(sub.trial_end_at);
    const section=document.createElement('section');
    section.className='settings-card';section.dataset.billingAccount='true';section.id='billing';
    const renewalLabel=sub.cancel_at_period_end?'Access until':trialing?'First charge':'Next renewal';
    const renewalDate=trialing?(sub.trial_end_at||sub.current_period_end):sub.current_period_end;
    const statusLabel=trialing?'trialing':String(sub.status||'unknown').replace(/_/g,' ');
    const trialNotice=trialing?`<div class="trial-billing-note"><strong>Your 14-day Pro trial is active.</strong><span>${trialDays===null?'Trial active':`${trialDays} day${trialDays===1?'':'s'} left`} · ends ${esc(formatDate(sub.trial_end_at))}. You keep full Pro access during the trial.</span></div>`:'';
    const cancelNotice=sub.cancel_at_period_end?'<div class="paywall-notice"><strong>Cancellation scheduled.</strong> Your Pro access remains active until the date shown below.</div>':'';
    section.innerHTML=`<div class="split"><div><p class="eyebrow">ACCOUNT & BILLING</p><h2>SoloBizKit subscription</h2></div><span class="status ${active?'paid':'draft'}">${esc(statusLabel)}</span></div>${trialNotice}<div class="billing-summary"><div><span>Plan</span><strong>${esc(String(sub.plan||'free').toUpperCase())}</strong></div><div><span>${renewalLabel}</span><strong>${esc(formatDate(renewalDate))}</strong></div><div><span>Account</span><strong>${esc(session?.user?.email||'—')}</strong></div></div>${cancelNotice}<p class="muted">Manage payment method, invoices, cancellation and subscription details securely in Stripe.</p><div class="save-row"><span class="save-state" data-billing-message>${new URLSearchParams(location.search).get('billing')==='return'?'Billing portal closed. Your latest status will sync automatically.':''}</span><button class="btn secondary" type="button" data-manage-billing>Manage subscription</button></div>`;
    grid.appendChild(section);
    const button=section.querySelector('[data-manage-billing]');const message=section.querySelector('[data-billing-message]');
    button.onclick=()=>openPortal(button,message);
  }catch(error){console.error('Billing panel failed',error);}
}

const style=document.createElement('style');style.textContent='.billing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.billing-summary>div{padding:14px;border:1px solid var(--line);border-radius:12px;background:#fafbfc}.billing-summary span{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.billing-summary strong{font-size:14px}.paywall-notice,.trial-billing-note{margin:14px 0;padding:12px 14px;border-radius:10px;font-size:13px}.paywall-notice{background:#f2f4f7;color:#344054}.trial-billing-note{background:#f1fbf4;border:1px solid #b7dfc4;color:#1f5134}.trial-billing-note strong,.trial-billing-note span{display:block}.trial-billing-note span{margin-top:4px;color:#4f6758}@media(max-width:700px){.billing-summary{grid-template-columns:1fr}}';document.head.appendChild(style);
new MutationObserver(()=>renderBilling()).observe(document.querySelector('#app'),{childList:true,subtree:true});
renderBilling();

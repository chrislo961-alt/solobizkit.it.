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
  button.disabled=true;message.textContent='Opening secure Stripe billing…';
  try{
    const {data,error}=await supabase.functions.invoke('create-solobizkit-billing-portal',{body:{}});
    if(error)throw error;
    if(!data?.url)throw new Error(data?.error||'Could not open billing portal.');
    window.sbkTrack?.('pro_billing_portal_opened');
    window.location.assign(data.url);
  }catch(error){console.error(error);message.textContent=error?.message||'Could not open billing portal.';button.disabled=false;}
}

function statusCopy(status,sub){
  if(status==='trialing')return ['Trial active','Your card is on file, but you will not be charged until the trial ends.'];
  if(status==='active')return ['Active','Your Pro subscription is active.'];
  if(status==='past_due')return ['Payment issue','Stripe could not complete the latest payment. Update your payment method to avoid losing Pro access.'];
  if(status==='unpaid')return ['Payment required','Your latest subscription payment is still unpaid. Open billing to resolve it.'];
  if(status==='canceled'||status==='cancelled')return ['Canceled',sub?.current_period_end?'Your subscription has ended or is scheduled to end.':'Your subscription is canceled.'];
  if(status==='incomplete'||status==='incomplete_expired')return ['Setup incomplete','Subscription setup was not completed. You can retry from the Pro workspace.'];
  return [String(status||'Account').replace(/_/g,' '),'Manage subscription details securely through Stripe.'];
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
    const [statusLabel,statusMessage]=statusCopy(status,sub);
    const section=document.createElement('section');
    section.className='settings-card';section.dataset.billingAccount='true';section.id='billing';
    const renewalLabel=sub.cancel_at_period_end?'Access until':trialing?'First charge':'Next renewal';
    const renewalDate=trialing?(sub.trial_end_at||sub.current_period_end):sub.current_period_end;
    const trialNotice=trialing?`<div class="trial-billing-note"><strong>Your 14-day Pro trial is active.</strong><span>${trialDays===null?'Trial active':`${trialDays} day${trialDays===1?'':'s'} left`} · ends ${esc(formatDate(sub.trial_end_at))}. Cancel before then to avoid the first charge.</span></div>`:'';
    const cancelNotice=sub.cancel_at_period_end?'<div class="paywall-notice"><strong>Cancellation scheduled.</strong> Your Pro access remains active until the date shown below. You can manage or reverse this in Stripe while access is still active.</div>':'';
    const attention=['past_due','unpaid','incomplete','incomplete_expired'].includes(status)?`<div class="billing-attention"><strong>${esc(statusLabel)}</strong><span>${esc(statusMessage)}</span></div>`:'';
    section.innerHTML=`<div class="split"><div><p class="eyebrow">ACCOUNT & BILLING</p><h2>SoloBizKit subscription</h2></div><span class="status ${active?'paid':'draft'}">${esc(statusLabel)}</span></div>${trialNotice}${attention}<div class="billing-summary"><div><span>Plan</span><strong>${esc(String(sub.plan||'free').toUpperCase())}</strong></div><div><span>${renewalLabel}</span><strong>${esc(formatDate(renewalDate))}</strong></div><div><span>Account</span><strong>${esc(session?.user?.email||'—')}</strong></div></div>${cancelNotice}<p class="muted">${esc(statusMessage)} Payment method, receipts, cancellation and subscription details are handled securely in Stripe.</p><div class="billing-trust"><span>✓ Card details stay with Stripe</span><span>✓ Cancel during trial</span><span>✓ Billing receipts in Stripe</span></div><div class="save-row"><span class="save-state" data-billing-message>${new URLSearchParams(location.search).get('billing')==='return'?'Billing portal closed. Refresh if your latest status is not shown yet.':''}</span><button class="btn secondary" type="button" data-manage-billing>Manage subscription</button></div>`;
    grid.appendChild(section);
    const button=section.querySelector('[data-manage-billing]');const message=section.querySelector('[data-billing-message]');
    button.onclick=()=>openPortal(button,message);
  }catch(error){console.error('Billing panel failed',error);}
}

const style=document.createElement('style');style.textContent='.billing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.billing-summary>div{padding:14px;border:1px solid var(--line);border-radius:12px;background:#fafbfc}.billing-summary span{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.billing-summary strong{font-size:14px}.paywall-notice,.trial-billing-note,.billing-attention{margin:14px 0;padding:12px 14px;border-radius:10px;font-size:13px}.paywall-notice{background:#f2f4f7;color:#344054}.trial-billing-note{background:#f1fbf4;border:1px solid #b7dfc4;color:#1f5134}.billing-attention{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}.trial-billing-note strong,.trial-billing-note span,.billing-attention strong,.billing-attention span{display:block}.trial-billing-note span,.billing-attention span{margin-top:4px}.billing-trust{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.billing-trust span{padding:7px 9px;border-radius:999px;background:#f2f6fd;color:#53647f;font-size:11px;font-weight:750}@media(max-width:700px){.billing-summary{grid-template-columns:1fr}}';document.head.appendChild(style);
new MutationObserver(()=>renderBilling()).observe(document.querySelector('#app'),{childList:true,subtree:true});
renderBilling();

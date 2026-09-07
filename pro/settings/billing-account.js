import { getSession, getWorkspaceContext, supabase } from '../backend.js';

let session=null,workspace=null,renderInFlight=false;
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const formatDate=(value)=>{if(!value)return '—';try{return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date(value))}catch{return String(value)}};
const daysLeft=(value)=>{if(!value)return null;return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000));};

async function loadSubscription(){
  if(!session)session=await getSession();if(!session?.user?.id)return null;
  workspace=await getWorkspaceContext();
  const{data,error}=await supabase.rpc('get_workspace_subscription_summary');if(error)throw error;
  return Array.isArray(data)?data[0]:data;
}
async function openPortal(button,message){
  button.disabled=true;message.textContent='Opening secure Stripe billing…';
  try{const{data,error}=await supabase.functions.invoke('create-solobizkit-billing-portal',{body:{}});if(error)throw error;if(!data?.url)throw new Error(data?.error||'Could not open billing portal.');window.sbkTrack?.('pro_billing_portal_opened');window.location.assign(data.url);}catch(error){console.error(error);message.textContent=error?.message||'Could not open billing portal.';button.disabled=false;}
}
function statusCopy(status,sub){if(status==='trialing')return['Trial active','The workspace Pro trial is active.'];if(status==='active')return['Active','The workspace Pro subscription is active.'];if(status==='past_due')return['Payment issue','The latest workspace payment could not be completed.'];if(status==='unpaid')return['Payment required','The latest workspace subscription payment is unpaid.'];if(status==='canceled'||status==='cancelled')return['Canceled',sub?.current_period_end?'The subscription has ended or is scheduled to end.':'The subscription is canceled.'];if(status==='incomplete'||status==='incomplete_expired')return['Setup incomplete','Subscription setup was not completed.'];return[String(status||'Account').replace(/_/g,' '),'Subscription details are managed securely through Stripe.'];}

async function renderBilling(){
  const initialGrid=document.querySelector('#app .settings-grid');if(!initialGrid||initialGrid.querySelector('[data-billing-account]')||renderInFlight)return;renderInFlight=true;
  try{
    const sub=await loadSubscription();if(!sub)return;const grid=document.querySelector('#app .settings-grid');if(!grid||grid.querySelector('[data-billing-account]'))return;
    const status=String(sub.status||'').toLowerCase(),active=['active','trialing'].includes(status),trialing=status==='trialing',trialDays=daysLeft(sub.trial_end_at),[statusLabel,statusMessage]=statusCopy(status,sub),isOwner=Boolean(workspace?.isOwner);
    const section=document.createElement('section');section.className='settings-card';section.dataset.billingAccount='true';section.id='billing';
    const renewalLabel=sub.cancel_at_period_end?'Access until':trialing?'First charge':'Next renewal',renewalDate=trialing?(sub.trial_end_at||sub.current_period_end):sub.current_period_end;
    const trialNotice=trialing?`<div class="trial-billing-note"><strong>Your 14-day Pro trial is active.</strong><span>${trialDays===null?'Trial active':`${trialDays} day${trialDays===1?'':'s'} left`} · ends ${esc(formatDate(sub.trial_end_at))}. Cancel before then to avoid the first charge.</span></div>`:'';
    const cancelNotice=sub.cancel_at_period_end?'<div class="paywall-notice"><strong>Cancellation scheduled.</strong> Pro access remains active until the date shown below.</div>':'';
    const attention=['past_due','unpaid','incomplete','incomplete_expired'].includes(status)?`<div class="billing-attention"><strong>${esc(statusLabel)}</strong><span>${esc(statusMessage)}</span></div>`:'';
    section.innerHTML=`<div class="split"><div><p class="eyebrow">ACCOUNT & BILLING</p><h2>Workspace subscription</h2></div><span class="status ${active?'paid':'draft'}">${esc(statusLabel)}</span></div>${trialNotice}${attention}<div class="billing-summary"><div><span>Plan</span><strong>${esc(String(sub.plan||'free').toUpperCase())}</strong></div><div><span>${renewalLabel}</span><strong>${esc(formatDate(renewalDate))}</strong></div><div><span>Workspace</span><strong>${esc(workspace?.name||'SoloBizKit')}</strong></div></div>${cancelNotice}<p class="muted">${esc(statusMessage)} ${isOwner?'Payment method, receipts and cancellation are handled by the workspace owner through Stripe.':'Only the workspace owner can change billing or open the Stripe billing portal.'}</p><div class="billing-trust"><span>✓ Card details stay with Stripe</span><span>✓ Shared Pro access for members</span><span>✓ Owner controls billing</span></div><div class="save-row"><span class="save-state" data-billing-message></span>${isOwner?'<button class="btn secondary" type="button" data-manage-billing>Manage subscription</button>':'<span class="status draft">Owner only</span>'}</div>`;
    grid.appendChild(section);const button=section.querySelector('[data-manage-billing]'),message=section.querySelector('[data-billing-message]');if(button)button.onclick=()=>openPortal(button,message);
  }catch(error){console.error('Billing panel failed',error);}finally{renderInFlight=false;}
}
const style=document.createElement('style');style.textContent='.billing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}.billing-summary>div{padding:14px;border:1px solid var(--line);border-radius:12px;background:#fafbfc}.billing-summary span{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.billing-summary strong{font-size:14px}.paywall-notice,.trial-billing-note,.billing-attention{margin:14px 0;padding:12px 14px;border-radius:10px;font-size:13px}.paywall-notice{background:#f2f4f7;color:#344054}.trial-billing-note{background:#f1fbf4;border:1px solid #b7dfc4;color:#1f5134}.billing-attention{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412}.trial-billing-note strong,.trial-billing-note span,.billing-attention strong,.billing-attention span{display:block}.trial-billing-note span,.billing-attention span{margin-top:4px}.billing-trust{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.billing-trust span{padding:7px 9px;border-radius:999px;background:#f2f6fd;color:#53647f;font-size:11px;font-weight:750}@media(max-width:700px){.billing-summary{grid-template-columns:1fr}}';document.head.appendChild(style);
new MutationObserver(()=>renderBilling()).observe(document.querySelector('#app'),{childList:true,subtree:true});renderBilling();

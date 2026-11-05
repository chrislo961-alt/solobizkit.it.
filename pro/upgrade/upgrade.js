import { getSession, getWorkspaceContext, supabase } from '../backend.js';

const app=document.querySelector('#app');
const shell=document.querySelector('#shell');
const authActions=document.querySelector('#authActions');
const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function hasPro(summary){
  const status=String(summary?.status||'').toLowerCase();
  return ['active','trialing'].includes(status)&&String(summary?.plan||'').toLowerCase()==='pro';
}

async function startCheckout(billing,button,message){
  button.disabled=true;
  button.textContent='Opening Stripe…';
  message.textContent='';
  try{
    const {data,error}=await supabase.functions.invoke('create-solobizkit-checkout',{body:{billing}});
    if(error)throw error;
    if(data?.alreadyPro){location.assign('/pro/');return;}
    if(!data?.url)throw new Error(data?.error||'Could not start checkout.');
    location.assign(data.url);
  }catch(error){
    console.error(error);
    message.textContent=error?.message||'Could not start checkout.';
    button.disabled=false;
    button.textContent=billing==='annual'?'Choose annual':'Choose monthly';
  }
}

async function render(){
  const session=await getSession();
  if(!session){
    shell.classList.add('signed-out');
    authActions.innerHTML='';
    app.innerHTML='<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT ACCOUNT</p><h2>Sign in to upgrade your workspace.</h2><p class="muted">Your upgrade stays connected to the workspace owner account.</p><a class="btn primary" href="/pro/?intent=login">Sign in</a></section></div>';
    return;
  }

  shell.classList.remove('signed-out');
  authActions.innerHTML='';
  const [workspace,result]=await Promise.all([
    getWorkspaceContext(true),
    supabase.rpc('get_workspace_subscription_summary')
  ]);
  const summary=Array.isArray(result.data)?result.data[0]:result.data;
  if(result.error)throw result.error;

  if(hasPro(summary)){
    app.innerHTML='<div class="paywall-wrap"><section class="paywall-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Your workspace is already Pro ✓</h2><p class="paywall-lead">All Pro sections are unlocked.</p><a class="btn primary" href="/pro/">Back to workspace</a></section></div>';
    return;
  }

  const ownerNote=workspace?.isOwner===false?'<div class="paywall-notice">Only the workspace owner can start or change the subscription.</div>':'';
  app.innerHTML=`<div class="paywall-wrap"><section class="paywall-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Upgrade without leaving your workspace.</h2><p class="paywall-lead">Keep the same sidebar, customers and workflow. Pro unlocks the sections already visible in the app.</p>${ownerNote}<div class="paywall-features"><span>✓ CRM & customer history</span><span>✓ Estimates & invoices</span><span>✓ Recurring billing</span><span>✓ Catalog & business settings</span></div><div class="paywall-plans"><button class="paywall-plan" data-billing="monthly" ${workspace?.isOwner===false?'disabled':''}><small>MONTHLY</small><strong>€9.99 / month</strong><span>14-day trial for eligible new subscriptions</span></button><button class="paywall-plan featured" data-billing="annual" ${workspace?.isOwner===false?'disabled':''}><small>ANNUAL</small><strong>€99 / year</strong><span>Best value</span></button></div><p class="paywall-foot">Secure checkout is handled by Stripe. After payment you return to the same SoloBizKit workspace.</p><p class="paywall-notice" id="upgradeMessage" hidden></p></section></div>`;

  const message=app.querySelector('#upgradeMessage');
  app.querySelectorAll('[data-billing]').forEach(button=>button.addEventListener('click',()=>{
    message.hidden=false;
    startCheckout(button.dataset.billing,button,message);
  }));
}

render().catch(error=>{
  console.error(error);
  app.innerHTML=`<div class="auth-stage"><section class="auth-card"><h2>Could not load upgrade options</h2><p class="muted">${esc(error?.message||'Please try again.')}</p><a class="btn primary" href="/pro/">Back to workspace</a></section></div>`;
});
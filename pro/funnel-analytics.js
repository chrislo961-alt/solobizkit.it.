import { getSession, supabase } from './backend.js';

const PREFIX='sbk:funnel:';
function markOnce(key,event,params={}){
  if(!window.sbkTrack)return;
  const storageKey=PREFIX+key;
  if(localStorage.getItem(storageKey))return;
  window.sbkTrack(event,params);
  localStorage.setItem(storageKey,'1');
}

async function run(){
  try{
    const session=await getSession();
    const user=session?.user;
    if(!user)return;
    const uid=user.id;
    const created=Date.parse(user.created_at||'');
    const lastSignIn=Date.parse(user.last_sign_in_at||'');
    if(Number.isFinite(created)&&Number.isFinite(lastSignIn)&&Math.abs(lastSignIn-created)<10*60*1000) markOnce(`${uid}:signup`,'pro_signup_completed');

    const [sub,customers,estimates,invoices,payments]=await Promise.all([
      supabase.from('subscriptions').select('status,plan').eq('user_id',uid).maybeSingle(),
      supabase.from('customers').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('crm_archived',false),
      supabase.from('estimates').select('id',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('invoices').select('id',{count:'exact',head:true}).eq('user_id',uid),
      supabase.from('payments').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('status','paid')
    ]);
    if([sub,customers,estimates,invoices,payments].some(r=>r.error))return;
    if(['trialing','active'].includes(String(sub.data?.status||'').toLowerCase())&&String(sub.data?.plan||'').toLowerCase()==='pro') markOnce(`${uid}:trial`,'pro_trial_started');
    if((customers.count||0)>0) markOnce(`${uid}:customer`,'pro_first_customer');
    if((estimates.count||0)>0) markOnce(`${uid}:estimate`,'pro_first_estimate');
    if((invoices.count||0)>0) markOnce(`${uid}:invoice`,'pro_first_invoice');
    if((payments.count||0)>0) markOnce(`${uid}:payment`,'pro_first_payment');
    const checkout=new URLSearchParams(location.search).get('checkout');
    if(checkout==='success') markOnce(`${uid}:checkout-success`,'pro_checkout_success');
  }catch(error){console.warn('Funnel analytics unavailable',error)}
}

window.addEventListener('focus',run);
window.addEventListener('solobizkit:workspace-updated',run);
supabase.auth.onAuthStateChange(()=>setTimeout(run,100));
setTimeout(run,350);

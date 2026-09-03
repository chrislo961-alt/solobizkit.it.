import { getCompanySettings, getSession, onAuthChange, signOut, supabase } from '../backend.js';

const app=document.querySelector('#app');
const shell=document.querySelector('#shell');
const authActions=document.querySelector('#authActions');
const newButton=document.querySelector('#newRecurring');
const modal=document.querySelector('#modal');
const modalForm=document.querySelector('#modalForm');
const modalTitle=document.querySelector('#modalTitle');
const modalBody=document.querySelector('#modalBody');
let session=null,subscription=null,settings=null,state={customers:[],profiles:[]},editing=null;

const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const money=(v,c='USD')=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(Number(v)||0)}catch{return `${Number(v||0).toFixed(2)} ${c}`}};
const today=()=>new Date().toISOString().slice(0,10);
const hasPro=()=>['active','trialing'].includes(String(subscription?.status||'').toLowerCase())&&String(subscription?.plan||'').toLowerCase()==='pro';
const customerName=(id)=>state.customers.find(c=>c.id===id)?.name||'No customer';

async function loadData(){
  if(!session?.user?.id)return;
  const [sub,customers,profiles,company]=await Promise.all([
    supabase.from('subscriptions').select('status,plan').eq('user_id',session.user.id).maybeSingle(),
    supabase.from('customers').select('id,name,company,email').eq('user_id',session.user.id).eq('crm_archived',false).order('name'),
    supabase.from('recurring_invoice_profiles').select('*, recurring_invoice_items(*)').eq('user_id',session.user.id).order('created_at',{ascending:false}),
    getCompanySettings(session.user.id),
  ]);
  for(const result of [sub,customers,profiles])if(result.error)throw result.error;
  subscription=sub.data;settings=company;state.customers=customers.data||[];state.profiles=(profiles.data||[]).map(p=>({...p,recurring_invoice_items:[...(p.recurring_invoice_items||[])].sort((a,b)=>a.position-b.position)}));
}

function renderAuth(){shell.classList.add('signed-out');newButton.hidden=true;authActions.innerHTML='';app.innerHTML='<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Sign in to manage recurring invoices.</h2><p class="muted">Open the Pro workspace to sign in, then return here.</p><a class="btn primary" href="/pro/">Go to Pro workspace</a></section></div>';}
function renderLocked(){shell.classList.remove('signed-out');newButton.hidden=true;app.innerHTML='<div class="auth-stage"><section class="auth-card pro-lock"><div class="lock-icon">🔒</div><h2>Recurring invoices are a Pro feature.</h2><p class="muted">Upgrade from the Pro workspace to automate repeat invoicing.</p><a class="btn primary" href="/pro/">Open Pro</a></section></div>';}
function renderAccount(){authActions.innerHTML=`<span class="account-chip"><strong>${esc(session?.user?.email||'Account')}</strong><small>PRO</small></span><button class="mini-btn" id="signOutBtn">Sign out</button>`;authActions.querySelector('#signOutBtn').onclick=()=>signOut();}

function profileTotal(profile){return (profile.recurring_invoice_items||[]).reduce((sum,i)=>sum+Number(i.quantity||0)*Number(i.unit_price||0)*(1+Number(i.tax_rate||0)/100),0)*(1-Number(profile.discount_rate||0)/100)}
function monthlyEquivalent(profile){const total=profileTotal(profile);const interval=Math.max(1,Number(profile.interval_count||1));if(profile.frequency==='weekly')return total*(52/12)/interval;if(profile.frequency==='monthly')return total/interval;if(profile.frequency==='quarterly')return total/(3*interval);if(profile.frequency==='yearly')return total/(12*interval);return 0;}
function freqLabel(p){const n=Number(p.interval_count||1);const base=p.frequency==='weekly'?'week':p.frequency==='monthly'?'month':p.frequency==='quarterly'?'quarter':'year';return n===1?`Every ${base}`:`Every ${n} ${base}s`;}
function render(){
  if(!session)return renderAuth();if(!hasPro())return renderLocked();shell.classList.remove('signed-out');newButton.hidden=false;renderAccount();
  const active=state.profiles.filter(p=>p.active).length;
  const monthlyValue=state.profiles.filter(p=>p.active).reduce((s,p)=>s+monthlyEquivalent(p),0);
  const next=state.profiles.filter(p=>p.active).sort((a,b)=>String(a.next_issue_date).localeCompare(String(b.next_issue_date)))[0];
  app.innerHTML=`<div class="grid stats"><div class="stat"><div class="label">Active recurring</div><div class="value">${active}</div></div><div class="stat"><div class="label">Monthly equivalent</div><div class="value">${money(monthlyValue,settings?.defaultCurrency||'USD')}</div></div><div class="stat"><div class="label">Next invoice</div><div class="value" style="font-size:18px">${esc(next?.next_issue_date||'—')}</div></div><div class="stat"><div class="label">Automation</div><div class="value" style="font-size:18px">Daily</div></div></div><section class="card"><div class="card-head"><div><h2>Recurring profiles</h2><p class="muted" style="margin:5px 0 0">SoloBizKit generates draft invoices automatically on the scheduled date.</p></div><button class="btn primary" id="newRecurringInner">+ Recurring invoice</button></div>${state.profiles.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Customer</th><th>Schedule</th><th>Next</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${state.profiles.map(p=>`<tr><td><strong>${esc(p.name)}</strong>${p.last_generated_at?`<br><span class="muted">Last generated ${esc(String(p.last_generated_at).slice(0,10))}</span>`:''}</td><td>${esc(customerName(p.customer_id))}</td><td>${esc(freqLabel(p))}</td><td>${esc(p.next_issue_date||'—')}</td><td>${money(profileTotal(p),p.currency)}</td><td><span class="status ${p.active?'paid':'draft'}">${p.active?'Active':'Paused'}</span></td><td><button class="mini-btn" data-edit="${p.id}">Edit</button> <button class="mini-btn" data-toggle="${p.id}">${p.active?'Pause':'Activate'}</button>${p.last_invoice_id?` <a class="mini-btn" href="/pro/?view=invoices&invoice=${encodeURIComponent(p.last_invoice_id)}">Last invoice</a>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No recurring invoices yet.</div>'}</section>`;
  app.querySelector('#newRecurringInner').onclick=()=>openModal();
  app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit));
  app.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggleProfile(b.dataset.toggle));
}

function lineMarkup(item={description:'',quantity:1,unit_price:0,tax_rate:0}){return `<div class="invoice-line recurring-line"><input class="input" name="description" placeholder="Description" value="${esc(item.description||'')}"><input class="input" name="quantity" type="number" min="0.01" step="0.01" value="${Number(item.quantity||1)}"><input class="input" name="unit_price" type="number" min="0" step="0.01" value="${Number(item.unit_price||0)}"><input class="input" name="tax_rate" type="number" min="0" max="100" step="0.01" value="${Number(item.tax_rate||0)}"><button class="mini-btn remove-line" type="button">×</button></div>`;}

function openModal(id=null){
  if(!state.customers.length){alert('Add a customer first.');return;}
  editing=id?state.profiles.find(p=>p.id===id):null;
  const p=editing||{name:'Monthly service',customer_id:state.customers[0].id,active:true,frequency:'monthly',interval_count:1,next_issue_date:today(),payment_terms_days:Number(settings?.paymentTermsDays??14),currency:settings?.defaultCurrency||'USD',discount_rate:0,notes:'',recurring_invoice_items:[{description:'Service',quantity:1,unit_price:0,tax_rate:Number(settings?.defaultTax??0)}]};
  modalTitle.textContent=editing?`Edit ${p.name}`:'New recurring invoice';
  modalBody.innerHTML=`<div class="form-grid"><div class="field"><label>Name *</label><input class="input" name="name" required value="${esc(p.name)}"></div><div class="field"><label>Customer *</label><select class="select" name="customerId">${state.customers.map(c=>`<option value="${c.id}" ${c.id===p.customer_id?'selected':''}>${esc(c.name)}${c.company?` · ${esc(c.company)}`:''}</option>`).join('')}</select></div><div class="field"><label>Frequency</label><select class="select" name="frequency">${['weekly','monthly','quarterly','yearly'].map(f=>`<option value="${f}" ${f===p.frequency?'selected':''}>${f[0].toUpperCase()+f.slice(1)}</option>`).join('')}</select></div><div class="field"><label>Every</label><input class="input" type="number" min="1" max="24" name="intervalCount" value="${Number(p.interval_count||1)}"></div><div class="field"><label>Next invoice date</label><input class="input" type="date" name="nextIssueDate" value="${esc(p.next_issue_date||today())}"></div><div class="field"><label>Payment terms (days)</label><input class="input" type="number" min="0" max="365" name="paymentTermsDays" value="${Number(p.payment_terms_days??14)}"></div><div class="field"><label>Currency</label><select class="select" name="currency">${['USD','EUR','GBP','NOK','SEK','DKK'].map(c=>`<option ${c===p.currency?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label>Discount %</label><input class="input" type="number" min="0" max="100" step="0.01" name="discountRate" value="${Number(p.discount_rate||0)}"></div><div class="field full"><div class="split"><label>Line items</label><button class="mini-btn" type="button" id="addLine">+ Line</button></div><div class="invoice-lines" id="recurringLines">${(p.recurring_invoice_items||[]).map(lineMarkup).join('')}</div><small class="muted">Description · Qty · Unit price · VAT %</small></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(p.notes||'')}</textarea></div></div>`;
  const lines=modalBody.querySelector('#recurringLines');
  const bind=()=>lines.querySelectorAll('.remove-line').forEach(b=>b.onclick=()=>{if(lines.children.length>1)b.closest('.invoice-line').remove()});
  modalBody.querySelector('#addLine').onclick=()=>{lines.insertAdjacentHTML('beforeend',lineMarkup());bind()};bind();modal.showModal();
}

async function saveProfile(){
  const form=new FormData(modalForm);const lines=[...modalBody.querySelectorAll('.invoice-line')].map((row,pos)=>({description:row.querySelector('[name="description"]').value.trim()||'Service',quantity:Number(row.querySelector('[name="quantity"]').value)||1,unit_price:Number(row.querySelector('[name="unit_price"]').value)||0,tax_rate:Number(row.querySelector('[name="tax_rate"]').value)||0,position:pos}));
  const paymentTermsRaw=form.get('paymentTermsDays');
  const payload={user_id:session.user.id,customer_id:String(form.get('customerId')),name:String(form.get('name')||'').trim(),active:editing?.active??true,frequency:String(form.get('frequency')||'monthly'),interval_count:Math.max(1,Number(form.get('intervalCount')||1)),next_issue_date:String(form.get('nextIssueDate')||today()),payment_terms_days:Math.max(0,Number(paymentTermsRaw??14)),currency:String(form.get('currency')||'USD'),language:'en',discount_rate:Math.max(0,Math.min(100,Number(form.get('discountRate')||0))),notes:String(form.get('notes')||'').trim()||null,country_code:null,vat_mode:'standard',updated_at:new Date().toISOString()};
  if(!payload.name)throw new Error('Name is required.');
  let profile;
  if(editing){const{data,error}=await supabase.from('recurring_invoice_profiles').update(payload).eq('id',editing.id).eq('user_id',session.user.id).select('*').single();if(error)throw error;profile=data;const{error:delError}=await supabase.from('recurring_invoice_items').delete().eq('recurring_profile_id',editing.id).eq('user_id',session.user.id);if(delError)throw delError;}else{const{data,error}=await supabase.from('recurring_invoice_profiles').insert(payload).select('*').single();if(error)throw error;profile=data;}
  const itemRows=lines.map(i=>({...i,recurring_profile_id:profile.id,user_id:session.user.id}));const{error:itemError}=await supabase.from('recurring_invoice_items').insert(itemRows);if(itemError)throw itemError;
  await loadData();render();return true;
}

async function toggleProfile(id){const p=state.profiles.find(x=>x.id===id);if(!p)return;const{error}=await supabase.from('recurring_invoice_profiles').update({active:!p.active,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',session.user.id);if(error)return alert(error.message);await loadData();render();}

newButton.onclick=()=>hasPro()&&openModal();
modalForm.addEventListener('submit',async e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();try{if(await saveProfile())modal.close()}catch(error){console.error(error);alert(error?.message||'Could not save recurring invoice.')}});
onAuthChange(async(_event,next)=>{session=next;if(session){await loadData();render()}else renderAuth()});
(async()=>{try{session=await getSession();if(session){await loadData();render()}else renderAuth()}catch(error){console.error(error);app.innerHTML=`<div class="auth-stage"><section class="auth-card"><h2>Could not load recurring invoices</h2><p class="muted">${esc(error?.message||'Please try again.')}</p></section></div>`}})();

import { getCompanySettings, getSession, onAuthChange, signOut, supabase } from '../backend.js';

const app=document.querySelector('#app');
const shell=document.querySelector('#shell');
const authActions=document.querySelector('#authActions');
const newButton=document.querySelector('#newProduct');
const modal=document.querySelector('#modal');
const modalForm=document.querySelector('#modalForm');
const modalTitle=document.querySelector('#modalTitle');
const modalBody=document.querySelector('#modalBody');
let session=null,subscription=null,settings=null,items=[],editing=null;

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=(v,c='USD')=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c}).format(Number(v)||0)}catch{return `${Number(v||0).toFixed(2)} ${c}`}};
const hasPro=()=>['active','trialing'].includes(String(subscription?.status||'').toLowerCase())&&String(subscription?.plan||'').toLowerCase()==='pro';
function showError(error){console.error(error);alert(error?.message||'Something went wrong.');}

async function loadData(){
  if(!session?.user?.id)return;
  const [sub,products,company]=await Promise.all([
    supabase.from('subscriptions').select('status,plan').eq('user_id',session.user.id).maybeSingle(),
    supabase.from('products').select('*').eq('user_id',session.user.id).order('active',{ascending:false}).order('name'),
    getCompanySettings(session.user.id),
  ]);
  if(sub.error)throw sub.error;if(products.error)throw products.error;
  subscription=sub.data;items=products.data||[];settings=company;
}

function renderAccount(){authActions.innerHTML=`<span class="account-chip"><strong>${esc(session?.user?.email||'Account')}</strong><small>${hasPro()?'PRO':'ACCOUNT'}</small></span><button class="mini-btn" id="signOutBtn">Sign out</button>`;authActions.querySelector('#signOutBtn').onclick=()=>signOut();}
function renderAuth(){shell.classList.add('signed-out');newButton.hidden=true;authActions.innerHTML='';app.innerHTML='<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Sign in to manage your catalog.</h2><p class="muted">Open the Pro workspace to sign in, then return here.</p><a class="btn primary" href="/pro/">Go to Pro workspace</a></section></div>';}
function renderLocked(){shell.classList.remove('signed-out');newButton.hidden=true;renderAccount();app.innerHTML='<div class="auth-stage"><section class="auth-card pro-lock"><div class="lock-icon">🔒</div><h2>Products & services are part of Pro.</h2><p class="muted">Save reusable items and add them to invoices, estimates and recurring work in one click.</p><a class="btn primary" href="/pro/">Open Pro</a></section></div>';}

function render(){
  if(!session)return renderAuth();if(!hasPro())return renderLocked();
  shell.classList.remove('signed-out','paywalled');newButton.hidden=false;renderAccount();
  app.innerHTML=`<section class="card"><div class="catalog-filter"><input class="input" id="catalogSearch" type="search" placeholder="Search products and services…"><select class="select" id="kindFilter"><option value="">All types</option><option value="service">Services</option><option value="product">Products</option></select><select class="select" id="activeFilter"><option value="active">Active</option><option value="all">All</option><option value="archived">Archived</option></select><button class="btn primary" id="newProductInner">+ Item</button></div><div id="catalogResults"></div></section>`;
  const search=app.querySelector('#catalogSearch'),kind=app.querySelector('#kindFilter'),active=app.querySelector('#activeFilter'),results=app.querySelector('#catalogResults');
  const update=()=>{
    const q=search.value.trim().toLowerCase();
    const filtered=items.filter(i=>!kind.value||i.kind===kind.value).filter(i=>active.value==='all'||(active.value==='active'?i.active:!i.active)).filter(i=>`${i.name} ${i.description||''} ${i.sku||''}`.toLowerCase().includes(q));
    results.innerHTML=filtered.length?`<div class="catalog-grid">${filtered.map(card).join('')}</div>`:'<div class="catalog-empty">No catalog items found.</div>';
    results.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>openModal(b.dataset.editItem));
    results.querySelectorAll('[data-toggle-item]').forEach(b=>b.onclick=()=>toggleItem(b.dataset.toggleItem));
  };
  search.oninput=update;kind.onchange=update;active.onchange=update;app.querySelector('#newProductInner').onclick=()=>openModal();update();
}

function card(i){return `<article class="catalog-card"><div class="split"><div><h3>${esc(i.name)}</h3><span class="muted">${esc(i.description||'No description')}</span></div><span class="status ${i.active?'paid':'draft'}">${i.active?'Active':'Archived'}</span></div><div class="catalog-meta"><span class="catalog-chip">${esc(i.kind)}</span><span class="catalog-chip">${esc(i.unit||'item')}</span>${i.sku?`<span class="catalog-chip">${esc(i.sku)}</span>`:''}<span class="catalog-chip">VAT ${Number(i.tax_rate||0)}%</span></div><div class="catalog-price">${money(i.unit_price,i.currency)}</div><div class="catalog-actions"><button class="mini-btn" data-edit-item="${i.id}">Edit</button><button class="mini-btn" data-toggle-item="${i.id}">${i.active?'Archive':'Activate'}</button></div></article>`;}

function openModal(id=null){
  editing=id?items.find(i=>i.id===id):null;
  const i=editing||{name:'',description:'',kind:'service',sku:'',unit:'hour',unit_price:0,tax_rate:Number(settings?.defaultTax||0),currency:settings?.defaultCurrency||'USD',active:true};
  modalTitle.textContent=editing?`Edit ${i.name}`:'New catalog item';
  modalBody.innerHTML=`<div class="form-grid"><div class="field"><label>Name *</label><input class="input" name="name" required value="${esc(i.name)}"></div><div class="field"><label>Type</label><select class="select" name="kind"><option value="service" ${i.kind==='service'?'selected':''}>Service</option><option value="product" ${i.kind==='product'?'selected':''}>Product</option></select></div><div class="field full"><label>Description</label><textarea class="textarea" name="description">${esc(i.description||'')}</textarea></div><div class="field"><label>SKU / code</label><input class="input" name="sku" value="${esc(i.sku||'')}"></div><div class="field"><label>Unit</label><select class="select" name="unit">${['item','hour','day','project','month','kg','m','m²'].map(u=>`<option ${u===i.unit?'selected':''}>${u}</option>`).join('')}</select></div><div class="field"><label>Unit price</label><input class="input" name="unitPrice" type="number" min="0" step="0.01" value="${Number(i.unit_price||0)}"></div><div class="field"><label>VAT / tax %</label><input class="input" name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(i.tax_rate||0)}"></div><div class="field"><label>Currency</label><select class="select" name="currency">${['USD','EUR','GBP','NOK','SEK','DKK'].map(c=>`<option ${c===i.currency?'selected':''}>${c}</option>`).join('')}</select></div></div>`;
  modal.showModal();
}

async function saveItem(){
  const form=new FormData(modalForm);const name=String(form.get('name')||'').trim();if(!name)throw new Error('Name is required.');
  const payload={user_id:session.user.id,name,description:String(form.get('description')||'').trim()||null,kind:String(form.get('kind')||'service'),sku:String(form.get('sku')||'').trim()||null,unit:String(form.get('unit')||'item'),unit_price:Math.max(0,Number(form.get('unitPrice')||0)),tax_rate:Math.max(0,Math.min(100,Number(form.get('taxRate')||0))),currency:String(form.get('currency')||'USD'),active:editing?.active??true,updated_at:new Date().toISOString()};
  const query=editing?supabase.from('products').update(payload).eq('id',editing.id).eq('user_id',session.user.id):supabase.from('products').insert(payload);
  const {error}=await query;if(error)throw error;await loadData();render();return true;
}
async function toggleItem(id){const item=items.find(i=>i.id===id);if(!item)return;const{error}=await supabase.from('products').update({active:!item.active,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',session.user.id);if(error)return showError(error);await loadData();render();}

newButton.onclick=()=>hasPro()&&openModal();
modalForm.addEventListener('submit',async e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();try{if(await saveItem())modal.close()}catch(error){showError(error)}});
onAuthChange(async(_event,next)=>{session=next;if(session){await loadData();render()}else renderAuth()});
(async()=>{try{session=await getSession();if(session){await loadData();render()}else renderAuth()}catch(error){showError(error);renderAuth()}})();
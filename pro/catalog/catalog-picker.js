import { getSession, supabase } from '../backend.js';

let products=[];
let loadedForUser='';
const observer=new MutationObserver(()=>enhance());
observer.observe(document.body,{childList:true,subtree:true});
enhance();

async function loadProducts(){
  const session=await getSession();
  const userId=session?.user?.id||'';
  if(!userId)return [];
  if(loadedForUser===userId)return products;
  const {data,error}=await supabase.from('products').select('id,name,description,unit,unit_price,tax_rate,currency,active').eq('user_id',userId).eq('active',true).order('name');
  if(error)throw error;
  products=data||[];loadedForUser=userId;return products;
}

function enhance(){
  const modalBody=document.querySelector('#modalBody');
  if(!modalBody||!modalBody.children.length)return;
  const addLine=modalBody.querySelector('#addLine');
  if(!addLine||modalBody.querySelector('[data-catalog-picker]'))return;
  const wrap=document.createElement('span');
  wrap.dataset.catalogPicker='1';
  wrap.style.display='inline-flex';wrap.style.gap='6px';wrap.style.alignItems='center';
  const select=document.createElement('select');
  select.className='select';select.style.maxWidth='210px';select.innerHTML='<option value="">Add from catalog…</option>';
  wrap.appendChild(select);addLine.parentElement?.insertBefore(wrap,addLine);
  loadProducts().then(()=>refreshOptions(select,modalBody)).catch(()=>{select.innerHTML='<option value="">Catalog unavailable</option>';select.disabled=true;});
  const currency=modalBody.querySelector('[name="currency"]');
  if(currency)currency.addEventListener('change',()=>refreshOptions(select,modalBody));
  select.addEventListener('change',()=>{const item=products.find(p=>p.id===select.value);if(item)addProduct(item,modalBody,addLine);select.value='';});
}

function refreshOptions(select,root){
  const currency=root.querySelector('[name="currency"]')?.value||'';
  const matching=products.filter(p=>!currency||p.currency===currency);
  select.innerHTML=`<option value="">Add from catalog…</option>${matching.map(p=>`<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)} · ${escapeHtml(p.currency)} ${Number(p.unit_price||0).toFixed(2)}</option>`).join('')}`;
  select.disabled=!matching.length;
  if(!matching.length)select.innerHTML='<option value="">No items in this currency</option>';
}

function addProduct(item,root,addLine){
  addLine.click();
  const rows=root.querySelectorAll('.estimate-line, .invoice-line');
  const row=rows[rows.length-1];if(!row)return;
  const description=row.querySelector('[name="description"]');
  const qty=row.querySelector('[name="qty"], [name="quantity"]');
  const rate=row.querySelector('[name="rate"], [name="unit_price"]');
  const tax=row.querySelector('[name="tax_rate"]');
  if(description){description.value=item.description?`${item.name} — ${item.description}`:item.name;description.dispatchEvent(new Event('input',{bubbles:true}));}
  if(qty){qty.value='1';qty.dispatchEvent(new Event('input',{bubbles:true}));}
  if(rate){rate.value=String(Number(item.unit_price||0));rate.dispatchEvent(new Event('input',{bubbles:true}));}
  if(tax){tax.value=String(Number(item.tax_rate||0));tax.dispatchEvent(new Event('input',{bubbles:true}));}
  else{
    const globalTax=root.querySelector('[name="taxRate"]');
    if(globalTax&&Number(globalTax.value||0)===0&&Number(item.tax_rate||0)>0){globalTax.value=String(Number(item.tax_rate||0));globalTax.dispatchEvent(new Event('input',{bubbles:true}));}
  }
}

function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function escapeAttr(v=''){return escapeHtml(v);}

import { getSession, loadWorkspace } from './backend.js';

const modal=document.querySelector('#modal');
const modalForm=document.querySelector('#modalForm');
const modalBody=document.querySelector('#modalBody');
const modalTitle=document.querySelector('#modalTitle');
let cache=null;

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function money(value,currency){try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(value||0));}catch{return `${currency} ${Number(value||0).toFixed(2)}`;}}
async function workspace(){if(cache)return cache;const session=await getSession();if(!session?.user?.id)return null;cache=await loadWorkspace(session.user.id);return cache;}
function currentCurrency(){return modalBody.querySelector('[name="currency"]')?.value||'USD';}
function currentCustomerLabel(){const select=modalBody.querySelector('[name="customerId"]');return select?.selectedOptions?.[0]?.textContent?.trim()||'—';}
function currentStatus(){const select=modalBody.querySelector('[name="status"]');return select?.selectedOptions?.[0]?.textContent?.trim()||'Draft';}
function currentNumber(){return modalBody.querySelector('[name="number"]')?.value?.trim()||'New document';}
function rows(){return [...modalBody.querySelectorAll('.invoice-line,.estimate-line')];}
function lineAmount(row){const qty=Number(row.querySelector('[name="qty"], [name="quantity"]')?.value||0);const rate=Number(row.querySelector('[name="rate"], [name="unit_price"]')?.value||0);return qty*rate;}
function renumber(){rows().forEach((row,i)=>row.dataset.lineNumber=String(i+1));}
function addLineAmount(row){if(row.querySelector('.doc-line-amount'))return;const remove=row.querySelector('.remove-line');if(!remove)return;const amount=document.createElement('div');amount.className='doc-line-amount';remove.before(amount);const copy=document.createElement('button');copy.type='button';copy.className='doc-line-copy';copy.title='Duplicate line';copy.setAttribute('aria-label','Duplicate line');copy.textContent='⧉';remove.before(copy);copy.onclick=()=>duplicateRow(row);}
function updateLineAmounts(){const currency=currentCurrency();rows().forEach(row=>{addLineAmount(row);const amount=row.querySelector('.doc-line-amount');if(amount)amount.textContent=money(lineAmount(row),currency);});renumber();updateSummary();}
function duplicateRow(row){const add=modalBody.querySelector('#addLine');if(!add)return;const source={description:row.querySelector('[name="description"]')?.value||'',qty:row.querySelector('[name="qty"], [name="quantity"]')?.value||'1',rate:row.querySelector('[name="rate"], [name="unit_price"]')?.value||'0'};add.click();const target=rows().at(-1);if(!target)return;const d=target.querySelector('[name="description"]'),q=target.querySelector('[name="qty"], [name="quantity"]'),r=target.querySelector('[name="rate"], [name="unit_price"]');if(d)d.value=source.description;if(q)q.value=source.qty;if(r)r.value=source.rate;[d,q,r].filter(Boolean).forEach(el=>el.dispatchEvent(new Event('input',{bubbles:true})));updateLineAmounts();}
function updateSummary(){const summary=modalBody.querySelector('.doc-editor-summary');if(!summary)return;summary.innerHTML=`<div><small>Document</small><strong>${esc(currentNumber())}</strong></div><div><small>Customer</small><strong>${esc(currentCustomerLabel())}</strong></div><div><small>Status</small><strong>${esc(currentStatus())}</strong></div><div><small>Currency</small><strong>${esc(currentCurrency())}</strong></div>`;}
function installSummary(){if(modalBody.querySelector('.doc-editor-summary'))return;const summary=document.createElement('div');summary.className='doc-editor-summary';modalBody.prepend(summary);updateSummary();}
function installLineSection(){const lines=modalBody.querySelector('.invoice-lines,.estimate-lines');if(!lines||lines.previousElementSibling?.classList.contains('doc-editor-section-title'))return;const title=document.createElement('div');title.className='doc-editor-section-title';title.innerHTML='<strong>Line items</strong><span>Use the catalog or add a custom line</span>';lines.before(title);const tip=document.createElement('div');tip.className='doc-editor-tip';tip.innerHTML='<span>Tip:</span><span>Duplicate a line with ⧉. Catalog items can fill description, price and tax defaults automatically.</span>';lines.after(tip);}
function enhance(){if(!modal?.open||!modalBody?.children.length)return;modalForm?.classList.add('doc-editor-v3');installSummary();installLineSection();updateLineAmounts();modalTitle?.closest('.modal-head')?.querySelector('.eyebrow')?.replaceChildren(document.createTextNode('DOCUMENT EDITOR V3'));}
modalBody?.addEventListener('input',event=>{if(event.target.matches('input,select,textarea'))requestAnimationFrame(updateLineAmounts);});
modalBody?.addEventListener('change',event=>{if(event.target.matches('select'))requestAnimationFrame(updateLineAmounts);});
const observer=new MutationObserver(()=>{clearTimeout(observer.t);observer.t=setTimeout(enhance,10);});observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('solobizkit:workspace-updated',()=>{cache=null;});
enhance();

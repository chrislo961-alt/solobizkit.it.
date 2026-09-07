import { getSession, loadWorkspace } from './backend.js';

const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
let cache = null;
let currentCustomerId = null;

function esc(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[c]); }
function initials(name='') { return String(name).trim().split(/\s+/).slice(0,2).map((p)=>p[0]||'').join('').toUpperCase() || 'C'; }
function daysSince(value) { const d = new Date(value || 0); if (Number.isNaN(d.getTime())) return 0; return Math.max(0, Math.floor((Date.now()-d.getTime())/86400000)); }
function invoiceStatus(invoice){ const s=String(invoice.status||'draft').toLowerCase(); if(s==='sent'&&invoice.dueDate&&invoice.dueDate<new Date().toISOString().slice(0,10)) return 'overdue'; return s; }
function total(doc){ const subtotal=(doc.lines||[]).reduce((s,l)=>s+Number(l.qty||0)*Number(l.rate||0),0); return subtotal*(1+Number(doc.taxRate||0)/100); }
function money(value,currency='USD'){ try{return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:0}).format(value)}catch{return `${currency} ${Number(value||0).toFixed(0)}`} }
function totalsByCurrency(items){ const m=new Map(); items.forEach((i)=>m.set(i.currency||'USD',(m.get(i.currency||'USD')||0)+total(i))); return [...m.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([c,v])=>money(v,c)).join(' · ')||'—'; }

async function getWorkspace(){
  const session = await getSession();
  if(!session?.user?.id) return null;
  if(cache) return cache;
  cache = await loadWorkspace(session.user.id);
  return cache;
}

function nextAction(customer, invoices, estimates){
  const overdue=invoices.filter((i)=>invoiceStatus(i)==='overdue');
  if(overdue.length) return `${overdue.length} overdue invoice${overdue.length===1?'':'s'} need attention`;
  const sentEstimate=estimates.find((e)=>String(e.status).toLowerCase()==='sent');
  if(sentEstimate) return `Follow up on ${sentEstimate.number}`;
  if(customer.status!=='client'&&daysSince(customer.updatedAt||customer.createdAt)>=14) return `Follow up — ${daysSince(customer.updatedAt||customer.createdAt)} days since last update`;
  if(!estimates.length&&!invoices.length) return 'Create the first estimate or invoice';
  return 'Customer is up to date';
}

function documentHref(doc){
  return doc.type==='Invoice'
    ? `/pro/?view=invoices&invoice=${encodeURIComponent(doc.id)}`
    : `/pro/estimates/?estimate=${encodeURIComponent(doc.id)}`;
}

function renderPanel(data, customerId){
  const customer=data.customers.find((c)=>c.id===customerId);
  const panel=app.querySelector('#crmCustomerPanel');
  if(!panel||!customer) return;
  currentCustomerId=customerId;
  app.querySelectorAll('#customerResults tbody tr[data-customer-id]').forEach((row)=>row.classList.toggle('crm-selected',row.dataset.customerId===customerId));
  const invoices=data.invoices.filter((i)=>i.customerId===customerId);
  const estimates=data.estimates.filter((e)=>e.customerId===customerId);
  const openInvoices=invoices.filter((i)=>['sent','overdue'].includes(invoiceStatus(i)));
  const paidInvoices=invoices.filter((i)=>invoiceStatus(i)==='paid');
  const canWrite=Boolean(data.workspace?.canWrite);
  const docs=[
    ...invoices.map((i)=>({id:i.id,type:'Invoice',number:i.number,status:invoiceStatus(i),date:i.issueDate,currency:i.currency,amount:total(i)})),
    ...estimates.map((e)=>({id:e.id,type:'Estimate',number:e.number,status:e.status,date:e.issueDate,currency:e.currency,amount:total(e)})),
  ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
  panel.innerHTML=`<div class="crm-profile-head"><div class="crm-profile-top"><div class="crm-avatar">${esc(initials(customer.name))}</div><div class="crm-profile-name"><h3>${esc(customer.name)}</h3><p>${esc(customer.company||customer.email||'Customer')}</p></div><span class="crm-profile-status">${esc(customer.status||'lead')}</span></div><div class="crm-next-action"><small>Next best action</small><strong>${esc(nextAction(customer,invoices,estimates))}</strong></div></div><div class="crm-profile-body"><div class="crm-contact-grid"><div class="crm-contact-item"><small>Email</small>${customer.email?`<a href="mailto:${esc(customer.email)}">${esc(customer.email)}</a>`:'<span>Not added</span>'}</div><div class="crm-contact-item"><small>Phone</small>${customer.phone?`<a href="tel:${esc(customer.phone)}">${esc(customer.phone)}</a>`:'<span>Not added</span>'}</div></div><div class="crm-metrics"><div class="crm-metric"><small>Open</small><strong>${openInvoices.length}</strong></div><div class="crm-metric"><small>Outstanding</small><strong>${esc(totalsByCurrency(openInvoices))}</strong></div><div class="crm-metric"><small>Paid</small><strong>${esc(totalsByCurrency(paidInvoices))}</strong></div></div><div class="crm-actions">${canWrite?`<button type="button" data-crm-edit="${customer.id}">Edit customer</button><a class="primary" href="/pro/?view=invoices&new=1&customer=${encodeURIComponent(customer.id)}">+ Invoice</a><a href="/pro/estimates/?new=1&customer=${encodeURIComponent(customer.id)}">+ Estimate</a>`:'<span class="muted">Read only workspace access</span>'}<a href="/pro/?view=invoices">View invoices</a><a href="/pro/estimates/">View estimates</a></div>${customer.notes?`<div class="crm-doc-section"><h4>Notes</h4><div class="crm-notes">${esc(customer.notes)}</div></div>`:''}<div class="crm-doc-section"><h4>Recent documents</h4><div class="crm-doc-list">${docs.length?docs.map((d)=>`<a class="crm-doc" href="${documentHref(d)}"><div><strong>${esc(d.type)} ${esc(d.number)}</strong><span>${esc(d.status||'draft')} · ${esc(d.date||'')}</span></div><b>${esc(money(d.amount,d.currency))}</b></a>`).join(''):'<div class="crm-customer-empty" style="padding:14px">No documents yet.</div>'}</div></div><div class="crm-age">Last CRM update ${daysSince(customer.updatedAt||customer.createdAt)} day${daysSince(customer.updatedAt||customer.createdAt)===1?'':'s'} ago</div></div>`;
  if(canWrite){
    panel.querySelector('[data-crm-edit]')?.addEventListener('click',()=>app.querySelector(`[data-customer-actions][data-customer-id="${CSS.escape(customer.id)}"] [data-edit-customer]`)?.click());
  }
}

async function enhance(){
  if(pageTitle?.textContent!=='Customers') return;
  const results=app.querySelector('#customerResults');
  const card=results?.closest('.card');
  if(!results||!card) return;
  const data=await getWorkspace();
  if(!data) return;
  let shell=app.querySelector('.crm-v3-shell');
  if(!shell){
    shell=document.createElement('div'); shell.className='crm-v3-shell';
    card.parentNode.insertBefore(shell,card); shell.appendChild(card);
    const panel=document.createElement('aside'); panel.id='crmCustomerPanel'; panel.className='crm-customer-panel';
    panel.innerHTML='<div class="crm-customer-empty"><strong>Customer workspace</strong>Select a customer to see contact details, documents, money and the next action.</div>';
    shell.appendChild(panel);
    const bindRows=()=>{
      results.querySelectorAll('tbody tr[data-customer-id]').forEach((row)=>{
        const id=row.dataset.customerId;
        if(!id||row.dataset.crmV3Bound) return;
        row.dataset.crmV3Bound='1';
        row.addEventListener('click',(event)=>{ if(event.target.closest('button,a,input,select')) return; renderPanel(data,id); });
      });
      if(currentCustomerId) renderPanel(data,currentCustomerId);
    };
    const rowObserver=new MutationObserver(bindRows); rowObserver.observe(results,{childList:true,subtree:true}); bindRows();
  }
  const firstId=currentCustomerId||results.querySelector('tbody tr[data-customer-id]')?.dataset.customerId||data.customers[0]?.id;
  if(firstId) renderPanel(data,firstId);
}

async function refresh(){cache=null;try{await enhance();}catch{} }
const observer=new MutationObserver(()=>requestAnimationFrame(()=>enhance().catch(()=>{})));
observer.observe(app,{childList:true,subtree:true});
observer.observe(pageTitle,{childList:true,subtree:true,characterData:true});
window.addEventListener('focus',refresh);
window.addEventListener('solobizkit:workspace-updated',refresh);
enhance().catch(()=>{});

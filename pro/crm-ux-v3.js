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
function totalsByCurrency(items){ const m=new Map(); items.forEach((i)=>m.set(i.currency||'USD',(m.get(i.currency||'USD')||0)+total(i))); return [...m.entries()].map(([c,v])=>money(v,c)).join(' · ')||'—'; }

async function getWorkspace(){
  const { data:{ session } } = await (await import('./backend.js')).supabase.auth.getSession();
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

function renderPanel(data, customerId){
  const customer=data.customers.find((c)=>c.id===customerId);
  const panel=app.querySelector('#crmCustomerPanel');
  if(!panel||!customer) return;
  currentCustomerId=customerId;
  app.querySelectorAll('#customerResults tbody tr').forEach((row)=>{
    const btn=row.querySelector('[data-edit-customer]');
    row.classList.toggle('crm-selected',btn?.dataset.editCustomer===customerId);
  });
  const invoices=data.invoices.filter((i)=>i.customerId===customerId);
  const estimates=data.estimates.filter((e)=>e.customerId===customerId);
  const openInvoices=invoices.filter((i)=>['sent','overdue'].includes(invoiceStatus(i)));
  const paidInvoices=invoices.filter((i)=>invoiceStatus(i)==='paid');
  const docs=[
    ...invoices.map((i)=>({type:'Invoice',number:i.number,status:invoiceStatus(i),date:i.issueDate,currency:i.currency,amount:total(i)})),
    ...estimates.map((e)=>({type:'Estimate',number:e.number,status:e.status,date:e.issueDate,currency:e.currency,amount:total(e)})),
  ].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,6);
  panel.innerHTML=`
    <div class="crm-profile-head">
      <div class="crm-profile-top"><div class="crm-avatar">${esc(initials(customer.name))}</div><div class="crm-profile-name"><h3>${esc(customer.name)}</h3><p>${esc(customer.company||customer.email||'Customer')}</p></div><span class="crm-profile-status">${esc(customer.status||'lead')}</span></div>
      <div class="crm-next-action"><small>Next best action</small><strong>${esc(nextAction(customer,invoices,estimates))}</strong></div>
    </div>
    <div class="crm-profile-body">
      <div class="crm-contact-grid">
        <div class="crm-contact-item"><small>Email</small>${customer.email?`<a href="mailto:${esc(customer.email)}">${esc(customer.email)}</a>`:'<span>Not added</span>'}</div>
        <div class="crm-contact-item"><small>Phone</small>${customer.phone?`<a href="tel:${esc(customer.phone)}">${esc(customer.phone)}</a>`:'<span>Not added</span>'}</div>
      </div>
      <div class="crm-metrics">
        <div class="crm-metric"><small>Open</small><strong>${openInvoices.length}</strong></div>
        <div class="crm-metric"><small>Outstanding</small><strong>${esc(totalsByCurrency(openInvoices))}</strong></div>
        <div class="crm-metric"><small>Paid</small><strong>${esc(totalsByCurrency(paidInvoices))}</strong></div>
      </div>
      <div class="crm-actions">
        <button type="button" data-crm-edit="${customer.id}">Edit customer</button>
        <button class="primary" type="button" data-crm-invoice="${customer.id}">+ Invoice</button>
        <a href="/pro/estimates/?new=1">+ Estimate</a>
        <a href="/pro/?view=invoices">View invoices</a>
      </div>
      ${customer.notes?`<div class="crm-doc-section"><h4>Notes</h4><div class="crm-notes">${esc(customer.notes)}</div></div>`:''}
      <div class="crm-doc-section"><h4>Recent documents</h4><div class="crm-doc-list">${docs.length?docs.map((d)=>`<div class="crm-doc"><div><strong>${esc(d.type)} ${esc(d.number)}</strong><span>${esc(d.status||'draft')} · ${esc(d.date||'')}</span></div><b>${esc(money(d.amount,d.currency))}</b></div>`).join(''):'<div class="crm-customer-empty" style="padding:14px">No documents yet.</div>'}</div></div>
      <div class="crm-age">Last CRM update ${daysSince(customer.updatedAt||customer.createdAt)} day${daysSince(customer.updatedAt||customer.createdAt)===1?'':'s'} ago</div>
    </div>`;
  panel.querySelector('[data-crm-edit]')?.addEventListener('click',()=>app.querySelector(`[data-edit-customer="${customer.id}"]`)?.click());
  panel.querySelector('[data-crm-invoice]')?.addEventListener('click',()=>app.querySelector(`[data-invoice-customer="${customer.id}"]`)?.click());
}

async function enhance(){
  if(pageTitle?.textContent!=='Customers') return;
  const results=app.querySelector('#customerResults');
  const card=results?.closest('.card');
  if(!results||!card||app.querySelector('.crm-v3-shell')) return;
  const data=await getWorkspace();
  if(!data) return;
  const shell=document.createElement('div'); shell.className='crm-v3-shell';
  card.parentNode.insertBefore(shell,card); shell.appendChild(card);
  const panel=document.createElement('aside'); panel.id='crmCustomerPanel'; panel.className='crm-customer-panel';
  panel.innerHTML='<div class="crm-customer-empty"><strong>Customer workspace</strong>Select a customer to see contact details, documents, money and the next action.</div>';
  shell.appendChild(panel);
  const bindRows=()=>{
    results.querySelectorAll('tbody tr').forEach((row)=>{
      const id=row.querySelector('[data-edit-customer]')?.dataset.editCustomer;
      if(!id||row.dataset.crmV3Bound) return;
      row.dataset.crmV3Bound='1';
      row.addEventListener('click',(event)=>{ if(event.target.closest('button,a,input,select')) return; renderPanel(data,id); });
    });
    if(currentCustomerId) renderPanel(data,currentCustomerId);
  };
  const observer=new MutationObserver(bindRows); observer.observe(results,{childList:true,subtree:true}); bindRows();
  const first=data.customers[0]; if(first) renderPanel(data,first.id);
}

const observer=new MutationObserver(()=>requestAnimationFrame(()=>enhance().catch(()=>{})));
observer.observe(app,{childList:true,subtree:true});
observer.observe(pageTitle,{childList:true,subtree:true,characterData:true});
window.addEventListener('focus',()=>{cache=null;enhance().catch(()=>{})});
window.addEventListener('solobizkit:workspace-updated',()=>{cache=null;enhance().catch(()=>{})});
enhance().catch(()=>{});

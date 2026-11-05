import { getDataOwnerId, getSession, getWorkspaceContext, supabase } from '../backend.js';

const app=document.querySelector('#app');
const shell=document.querySelector('#shell');
const addButton=document.querySelector('#addButton');
const authActions=document.querySelector('#authActions');
const editor=document.querySelector('#editor');
const editorForm=document.querySelector('#editorForm');
const editorTitle=document.querySelector('#editorTitle');
const editorBody=document.querySelector('#editorBody');

const tabs=[
  ['bookings','Booking'],
  ['contracts','Contracts'],
  ['time','Time'],
  ['projects','Projects'],
  ['expenses','Expenses'],
  ['portal','Client Portal'],
  ['integrations','Integrations'],
];
let activeTab=(location.hash||'#bookings').slice(1);
if(!tabs.some(([key])=>key===activeTab))activeTab='bookings';
let session=null,workspace=null,dataOwner=null,subscription=null,customers=[];
let data={bookings:[],contracts:[],time:[],projects:[],tasks:[],expenses:[],portal:[],integrations:[]};
let saveHandler=null;

const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=(value,currency='EUR')=>new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'EUR'}).format(Number(value||0));
const dateTime=v=>v?new Date(v).toLocaleString():'—';
const today=()=>new Date().toISOString().slice(0,10);
const customerName=id=>customers.find(c=>c.id===id)?.name||'No customer';
const hasPro=()=>['active','trialing'].includes(String(subscription?.status||'').toLowerCase())&&String(subscription?.plan||'').toLowerCase()==='pro';
const canWrite=()=>workspace?.canWrite!==false;

function customerOptions(selected=''){
  return '<option value="">No customer</option>'+customers.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.name)}</option>`).join('');
}
function projectOptions(selected=''){
  return '<option value="">No project</option>'+data.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('');
}
function openEditor(title,body,onSave){
  editorTitle.textContent=title;
  editorBody.innerHTML=body;
  saveHandler=onSave;
  editor.showModal();
}
function toast(message){
  if(window.sbkToast)return window.sbkToast(message);
  const el=document.createElement('div');el.className='workspace-toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2600);
}
async function insert(table,payload){
  const {error}=await supabase.from(table).insert({...payload,user_id:dataOwner});
  if(error)throw error;
}
async function update(table,id,payload){
  const {error}=await supabase.from(table).update(payload).eq('id',id).eq('user_id',dataOwner);
  if(error)throw error;
}
async function remove(table,id){
  const {error}=await supabase.from(table).delete().eq('id',id).eq('user_id',dataOwner);
  if(error)throw error;
}

async function loadAll(){
  const [
    bookingR,contractR,timeR,projectR,taskR,expenseR,portalR,integrationR,customerR
  ]=await Promise.all([
    supabase.from('sbk_bookings').select('*').eq('user_id',dataOwner).order('starts_at'),
    supabase.from('sbk_contracts').select('*').eq('user_id',dataOwner).order('created_at',{ascending:false}),
    supabase.from('sbk_time_entries').select('*').eq('user_id',dataOwner).order('started_at',{ascending:false}),
    supabase.from('sbk_projects').select('*').eq('user_id',dataOwner).order('updated_at',{ascending:false}),
    supabase.from('sbk_project_tasks').select('*').eq('user_id',dataOwner).order('position'),
    supabase.from('sbk_expenses').select('*').eq('user_id',dataOwner).order('expense_date',{ascending:false}),
    supabase.from('sbk_portal_messages').select('*').eq('user_id',dataOwner).order('created_at',{ascending:false}),
    supabase.from('sbk_integrations').select('*').eq('user_id',dataOwner),
    supabase.from('customers').select('id,name,email,company').eq('user_id',dataOwner).eq('crm_archived',false).order('name'),
  ]);
  for(const result of [bookingR,contractR,timeR,projectR,taskR,expenseR,portalR,integrationR,customerR])if(result.error)throw result.error;
  data.bookings=bookingR.data||[];
  data.contracts=contractR.data||[];
  data.time=timeR.data||[];
  data.projects=projectR.data||[];
  data.tasks=taskR.data||[];
  data.expenses=expenseR.data||[];
  data.portal=portalR.data||[];
  data.integrations=integrationR.data||[];
  customers=customerR.data||[];
}

function tabsMarkup(){
  return '<div class="ops-tabs">'+tabs.map(([key,label])=>`<button class="ops-tab ${activeTab===key?'active':''}" data-tab="${key}">${label}</button>`).join('')+'</div>';
}
function bindTabs(){
  app.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{activeTab=button.dataset.tab;location.hash=activeTab;render();});
}

function googleCalendarUrl(booking){
  const fmt=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const params=new URLSearchParams({
    action:'TEMPLATE',
    text:booking.title,
    dates:`${fmt(booking.starts_at)}/${fmt(booking.ends_at)}`,
    details:booking.notes||'',
  });
  return 'https://calendar.google.com/calendar/render?'+params.toString();
}

function renderBookings(){
  const upcoming=data.bookings.filter(b=>new Date(b.ends_at)>=new Date()&&b.status!=='cancelled');
  app.innerHTML=tabsMarkup()+`<div class="ops-summary"><div class="stat"><div class="label">Upcoming</div><div class="value">${upcoming.length}</div></div><div class="stat"><div class="label">Completed</div><div class="value">${data.bookings.filter(b=>b.status==='completed').length}</div></div><div class="stat"><div class="label">Customers</div><div class="value">${customers.length}</div></div><div class="stat"><div class="label">Calendar</div><div class="value" style="font-size:16px">Ready</div></div></div><div class="ops-head"><div><h2>Booking & calendar</h2><p>Create appointments and add them directly to Google Calendar.</p></div><button class="btn primary" data-new-booking>+ Booking</button></div>${data.bookings.length?'<div class="ops-grid two">'+data.bookings.map(b=>`<article class="ops-card"><h3>${esc(b.title)}</h3><p class="muted">${esc(customerName(b.customer_id))}</p><div class="ops-meta"><span class="ops-chip">${esc(b.status)}</span><span class="ops-chip">${esc(dateTime(b.starts_at))}</span></div><div class="ops-actions"><a class="mini-btn ops-link" target="_blank" rel="noopener" href="${googleCalendarUrl(b)}">Google Calendar</a>${canWrite()?'<button class="mini-btn" data-booking-done="'+b.id+'">Complete</button><button class="mini-btn" data-booking-delete="'+b.id+'">Delete</button>':''}</div></article>`).join('')+'</div>':'<div class="ops-empty">No bookings yet.</div>'}`;
  bindTabs();
  app.querySelector('[data-new-booking]')?.addEventListener('click',()=>openEditor('New booking',`<div class="ops-form-grid"><div class="field full"><label>Title</label><input class="input" name="title" required></div><div class="field"><label>Customer</label><select class="select" name="customer_id">${customerOptions()}</select></div><div class="field"><label>Status</label><select class="select" name="status"><option>scheduled</option><option>completed</option><option>cancelled</option></select></div><div class="field"><label>Starts</label><input class="input" type="datetime-local" name="starts_at" required></div><div class="field"><label>Ends</label><input class="input" type="datetime-local" name="ends_at" required></div><div class="field full"><label>Meeting URL</label><input class="input" type="url" name="meeting_url"></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes"></textarea></div></div>`,async form=>insert('sbk_bookings',{title:form.title.value.trim(),customer_id:form.customer_id.value||null,status:form.status.value,starts_at:new Date(form.starts_at.value).toISOString(),ends_at:new Date(form.ends_at.value).toISOString(),meeting_url:form.meeting_url.value.trim()||null,notes:form.notes.value.trim()||null})));
  app.querySelectorAll('[data-booking-done]').forEach(b=>b.onclick=()=>mutate(()=>update('sbk_bookings',b.dataset.bookingDone,{status:'completed'})));
  app.querySelectorAll('[data-booking-delete]').forEach(b=>b.onclick=()=>mutate(()=>remove('sbk_bookings',b.dataset.bookingDelete)));
}

function renderContracts(){
  app.innerHTML=tabsMarkup()+`<div class="ops-head"><div><h2>Contracts & e-signature</h2><p>Create agreements, send them through your workflow and capture a signature name.</p></div><button class="btn primary" data-new-contract>+ Contract</button></div>${data.contracts.length?'<div class="ops-grid two">'+data.contracts.map(c=>`<article class="ops-card"><h3>${esc(c.title)}</h3><p class="muted">${esc(customerName(c.customer_id))}</p><div class="ops-meta"><span class="ops-chip">${esc(c.status)}</span>${c.signed_at?'<span class="ops-chip">Signed '+esc(dateTime(c.signed_at))+'</span>':''}</div><p class="ops-note">${esc((c.content||'').slice(0,180))}</p><div class="ops-actions">${c.status!=='signed'&&canWrite()?'<button class="mini-btn" data-sign-contract="'+c.id+'">Sign</button>':''}${canWrite()?'<button class="mini-btn" data-delete-contract="'+c.id+'">Delete</button>':''}</div>${c.signature_name?'<p class="ops-note">Signed by <strong>'+esc(c.signature_name)+'</strong></p>':''}</article>`).join('')+'</div>':'<div class="ops-empty">No contracts yet.</div>'}`;
  bindTabs();
  app.querySelector('[data-new-contract]')?.addEventListener('click',()=>openEditor('New contract',`<div class="ops-form-grid"><div class="field full"><label>Title</label><input class="input" name="title" required></div><div class="field"><label>Customer</label><select class="select" name="customer_id">${customerOptions()}</select></div><div class="field"><label>Project</label><select class="select" name="project_id">${projectOptions()}</select></div><div class="field full"><label>Contract text</label><textarea class="textarea" name="content" style="min-height:220px" required></textarea></div></div>`,async form=>insert('sbk_contracts',{title:form.title.value.trim(),customer_id:form.customer_id.value||null,project_id:form.project_id.value||null,content:form.content.value.trim(),status:'draft'})));
  app.querySelectorAll('[data-sign-contract]').forEach(b=>b.onclick=async()=>{const name=prompt('Signature name');if(!name)return;await mutate(()=>update('sbk_contracts',b.dataset.signContract,{status:'signed',signature_name:name.trim(),signed_at:new Date().toISOString()}));});
  app.querySelectorAll('[data-delete-contract]').forEach(b=>b.onclick=()=>mutate(()=>remove('sbk_contracts',b.dataset.deleteContract)));
}

function runningEntry(){return data.time.find(t=>!t.ended_at);}
function renderTime(){
  const running=runningEntry();
  const totalMinutes=data.time.reduce((s,t)=>s+Number(t.duration_minutes||0),0);
  const billable=data.time.reduce((s,t)=>s+(t.billable?Number(t.duration_minutes||0)*Number(t.hourly_rate||0)/60:0),0);
  app.innerHTML=tabsMarkup()+`${running?`<div class="ops-timer"><div><span class="muted">Timer running</span><strong>${esc(running.description||'Working')}</strong><span class="muted">Started ${esc(dateTime(running.started_at))}</span></div><button class="btn primary" data-stop-timer>Stop timer</button></div>`:`<div class="ops-head"><div><h2>Time tracking</h2><p>Track billable time against customers and projects.</p></div><button class="btn primary" data-start-timer>▶ Start timer</button></div>`}<div class="ops-summary"><div class="stat"><div class="label">Tracked hours</div><div class="value">${(totalMinutes/60).toFixed(1)}</div></div><div class="stat"><div class="label">Billable value</div><div class="value" style="font-size:18px">${money(billable,'EUR')}</div></div><div class="stat"><div class="label">Entries</div><div class="value">${data.time.length}</div></div><div class="stat"><div class="label">Running</div><div class="value">${running?'1':'0'}</div></div></div>${data.time.length?'<div class="ops-grid">'+data.time.map(t=>`<article class="ops-card integration-card"><div><h3>${esc(t.description||'Time entry')}</h3><span>${esc(customerName(t.customer_id))} · ${esc(t.project_id?data.projects.find(p=>p.id===t.project_id)?.name||'Project':'No project')} · ${t.duration_minutes} min</span></div><div><strong>${money(Number(t.duration_minutes||0)*Number(t.hourly_rate||0)/60,t.currency)}</strong></div></article>`).join('')+'</div>':'<div class="ops-empty">No time entries yet.</div>'}`;
  bindTabs();
  app.querySelector('[data-start-timer]')?.addEventListener('click',()=>openEditor('Start timer',`<div class="ops-form-grid"><div class="field full"><label>Description</label><input class="input" name="description" required></div><div class="field"><label>Customer</label><select class="select" name="customer_id">${customerOptions()}</select></div><div class="field"><label>Project</label><select class="select" name="project_id">${projectOptions()}</select></div><div class="field"><label>Hourly rate</label><input class="input" type="number" min="0" step="0.01" name="hourly_rate" value="0"></div><div class="field"><label>Currency</label><select class="select" name="currency"><option>EUR</option><option>USD</option><option>NOK</option><option>SEK</option><option>DKK</option><option>GBP</option></select></div></div>`,async form=>insert('sbk_time_entries',{description:form.description.value.trim(),customer_id:form.customer_id.value||null,project_id:form.project_id.value||null,hourly_rate:Number(form.hourly_rate.value||0),currency:form.currency.value,billable:true,started_at:new Date().toISOString(),duration_minutes:0})));
  app.querySelector('[data-stop-timer]')?.addEventListener('click',()=>{const end=new Date();const mins=Math.max(1,Math.round((end-new Date(running.started_at))/60000));mutate(()=>update('sbk_time_entries',running.id,{ended_at:end.toISOString(),duration_minutes:mins}));});
}

function renderProjects(){
  const statuses=[['todo','To do'],['in_progress','In progress'],['waiting','Waiting'],['done','Done']];
  app.innerHTML=tabsMarkup()+`<div class="ops-head"><div><h2>Projects & simple Kanban</h2><p>Keep work visible without turning SoloBizKit into project-management bloat.</p></div><button class="btn primary" data-new-project>+ Project</button></div><div class="ops-kanban">${statuses.map(([status,label])=>`<div class="ops-column"><h3>${label}</h3>${data.projects.filter(p=>p.status===status).map(p=>`<article class="ops-card"><h3>${esc(p.name)}</h3><p class="muted">${esc(customerName(p.customer_id))}</p><div class="ops-meta"><span class="ops-chip">${money(p.budget,p.currency)}</span></div><div class="ops-actions">${statuses.filter(([s])=>s!==status).slice(0,2).map(([s,l])=>`<button class="mini-btn" data-project-status="${p.id}" data-status="${s}">${l}</button>`).join('')}<button class="mini-btn" data-delete-project="${p.id}">Delete</button></div></article>`).join('')||'<div class="ops-note">No projects</div>'}</div>`).join('')}</div>`;
  bindTabs();
  app.querySelector('[data-new-project]')?.addEventListener('click',()=>openEditor('New project',`<div class="ops-form-grid"><div class="field full"><label>Name</label><input class="input" name="name" required></div><div class="field"><label>Customer</label><select class="select" name="customer_id">${customerOptions()}</select></div><div class="field"><label>Status</label><select class="select" name="status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="done">Done</option></select></div><div class="field"><label>Budget</label><input class="input" type="number" min="0" step="0.01" name="budget" value="0"></div><div class="field"><label>Currency</label><select class="select" name="currency"><option>EUR</option><option>USD</option><option>NOK</option><option>SEK</option><option>DKK</option><option>GBP</option></select></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes"></textarea></div></div>`,async form=>insert('sbk_projects',{name:form.name.value.trim(),customer_id:form.customer_id.value||null,status:form.status.value,budget:Number(form.budget.value||0),currency:form.currency.value,notes:form.notes.value.trim()||null})));
  app.querySelectorAll('[data-project-status]').forEach(b=>b.onclick=()=>mutate(()=>update('sbk_projects',b.dataset.projectStatus,{status:b.dataset.status,updated_at:new Date().toISOString()})));
  app.querySelectorAll('[data-delete-project]').forEach(b=>b.onclick=()=>mutate(()=>remove('sbk_projects',b.dataset.deleteProject)));
}

function renderExpenses(){
  const total=data.expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const billable=data.expenses.reduce((s,e)=>s+(e.billable?Number(e.amount||0):0),0);
  app.innerHTML=tabsMarkup()+`<div class="ops-head"><div><h2>Expenses & profitability</h2><p>Track business costs and mark customer/project expenses as billable.</p></div><button class="btn primary" data-new-expense>+ Expense</button></div><div class="ops-summary"><div class="stat"><div class="label">Expenses</div><div class="value" style="font-size:18px">${money(total,'EUR')}</div></div><div class="stat"><div class="label">Billable</div><div class="value" style="font-size:18px">${money(billable,'EUR')}</div></div><div class="stat"><div class="label">Entries</div><div class="value">${data.expenses.length}</div></div><div class="stat"><div class="label">Receipt-ready</div><div class="value">${data.expenses.filter(e=>e.receipt_url).length}</div></div></div>${data.expenses.length?'<div class="ops-grid two">'+data.expenses.map(e=>`<article class="ops-card"><h3>${esc(e.description)}</h3><p class="muted">${esc(e.supplier||'No supplier')} · ${esc(e.expense_date)}</p><div class="ops-meta"><span class="ops-chip">${money(e.amount,e.currency)}</span><span class="ops-chip">${esc(e.category)}</span>${e.billable?'<span class="ops-chip">Billable</span>':''}</div><div class="ops-actions"><button class="mini-btn" data-delete-expense="${e.id}">Delete</button></div></article>`).join('')+'</div>':'<div class="ops-empty">No expenses yet.</div>'}`;
  bindTabs();
  app.querySelector('[data-new-expense]')?.addEventListener('click',()=>openEditor('New expense',`<div class="ops-form-grid"><div class="field full"><label>Description</label><input class="input" name="description" required></div><div class="field"><label>Supplier</label><input class="input" name="supplier"></div><div class="field"><label>Date</label><input class="input" type="date" name="expense_date" value="${today()}"></div><div class="field"><label>Amount</label><input class="input" type="number" min="0" step="0.01" name="amount" required></div><div class="field"><label>Tax amount</label><input class="input" type="number" min="0" step="0.01" name="tax_amount" value="0"></div><div class="field"><label>Currency</label><select class="select" name="currency"><option>EUR</option><option>USD</option><option>NOK</option><option>SEK</option><option>DKK</option><option>GBP</option></select></div><div class="field"><label>Category</label><select class="select" name="category"><option>software</option><option>travel</option><option>materials</option><option>office</option><option>marketing</option><option>other</option></select></div><div class="field"><label>Customer</label><select class="select" name="customer_id">${customerOptions()}</select></div><div class="field"><label>Project</label><select class="select" name="project_id">${projectOptions()}</select></div><div class="field full"><label><input type="checkbox" name="billable"> Billable to customer</label></div></div>`,async form=>insert('sbk_expenses',{description:form.description.value.trim(),supplier:form.supplier.value.trim()||null,expense_date:form.expense_date.value||today(),amount:Number(form.amount.value||0),tax_amount:Number(form.tax_amount.value||0),currency:form.currency.value,category:form.category.value,customer_id:form.customer_id.value||null,project_id:form.project_id.value||null,billable:form.billable.checked})));
  app.querySelectorAll('[data-delete-expense]').forEach(b=>b.onclick=()=>mutate(()=>remove('sbk_expenses',b.dataset.deleteExpense)));
}

function renderPortal(){
  app.innerHTML=tabsMarkup()+`<div class="ops-head"><div><h2>Client Portal</h2><p>Keep customer communication next to estimates and invoices. Secure public file/message exchange can build on this same timeline.</p></div><button class="btn primary" data-new-message>+ Message</button></div>${data.portal.length?'<div class="ops-grid">'+data.portal.map(m=>`<article class="ops-card"><h3>${esc(customerName(m.customer_id))}</h3><p>${esc(m.message)}</p><div class="ops-meta"><span class="ops-chip">${esc(m.author_type)}</span><span class="ops-chip">${esc(dateTime(m.created_at))}</span></div></article>`).join('')+'</div>':'<div class="ops-empty">No portal messages yet.</div>'}`;
  bindTabs();
  app.querySelector('[data-new-message]')?.addEventListener('click',()=>openEditor('New client portal message',`<div class="ops-form-grid"><div class="field full"><label>Customer</label><select class="select" name="customer_id" required>${customerOptions()}</select></div><div class="field full"><label>Message</label><textarea class="textarea" name="message" required></textarea></div></div>`,async form=>insert('sbk_portal_messages',{customer_id:form.customer_id.value,author_type:'business',message:form.message.value.trim()})));
}

function integrationStatus(provider){return data.integrations.find(i=>i.provider===provider);}
function renderIntegrations(){
  const providers=[
    ['google_calendar','Google Calendar','Booking links and calendar workflow'],
    ['zapier','Zapier','Prepare outbound automation connection'],
    ['make','Make','Prepare scenario/webhook automation'],
    ['webhook','Webhook','Store a workspace webhook endpoint'],
  ];
  app.innerHTML=tabsMarkup()+`<div class="ops-head"><div><h2>Integrations</h2><p>Connection registry for calendar and automation providers.</p></div></div><div class="ops-grid two">${providers.map(([key,name,copy])=>{const row=integrationStatus(key);return`<article class="ops-card integration-card"><div><strong>${name}</strong><span>${copy}</span></div><div><span class="ops-chip">${row?.status||'disconnected'}</span><div class="ops-actions"><button class="mini-btn" data-integration="${key}" data-connected="${row?.status==='connected'?'1':'0'}">${row?.status==='connected'?'Disconnect':'Configure'}</button></div></div></article>`}).join('')}</div><p class="ops-note" style="margin-top:12px">Google Calendar uses direct event links today. Zapier/Make/webhook entries store connection state/config; provider OAuth/webhook delivery can be added without changing the workspace data model.</p>`;
  bindTabs();
  app.querySelectorAll('[data-integration]').forEach(button=>button.onclick=()=>{const provider=button.dataset.integration;const row=integrationStatus(provider);if(row?.status==='connected')return mutate(()=>update('sbk_integrations',row.id,{status:'disconnected',connected_at:null}));openEditor('Configure '+provider.replaceAll('_',' '),`<div class="ops-form-grid"><div class="field full"><label>Webhook / connection URL</label><input class="input" type="url" name="url" placeholder="https://..."></div><div class="field full"><p class="ops-note">For Google Calendar this can be left blank; booking items already generate Google Calendar event links.</p></div></div>`,async form=>{if(row)return update('sbk_integrations',row.id,{status:'connected',connected_at:new Date().toISOString(),config:{url:form.url.value.trim()}});return insert('sbk_integrations',{provider,status:'connected',connected_at:new Date().toISOString(),config:{url:form.url.value.trim()}});});});
}

function render(){
  addButton.hidden=true;
  if(activeTab==='contracts')return renderContracts();
  if(activeTab==='time')return renderTime();
  if(activeTab==='projects')return renderProjects();
  if(activeTab==='expenses')return renderExpenses();
  if(activeTab==='portal')return renderPortal();
  if(activeTab==='integrations')return renderIntegrations();
  return renderBookings();
}

async function mutate(fn){
  try{await fn();await loadAll();render();toast('Saved');}
  catch(error){console.error(error);alert(error?.message||'Could not save.');}
}

editorForm.addEventListener('submit',async event=>{
  if(event.submitter?.value==='cancel')return;
  event.preventDefault();
  if(!saveHandler)return;
  const button=document.querySelector('#saveEditor');button.disabled=true;
  try{await saveHandler(editorForm);editor.close();editorForm.reset();saveHandler=null;await loadAll();render();toast('Saved');}
  catch(error){console.error(error);alert(error?.message||'Could not save.');}
  finally{button.disabled=false;}
});

async function boot(){
  session=await getSession();
  if(!session){
    shell.classList.add('signed-out');
    authActions.innerHTML='';
    app.innerHTML='<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT ACCOUNT</p><h2>Sign in to open Operations.</h2><a class="btn primary" href="/pro/?intent=login">Sign in</a></section></div>';
    return;
  }
  shell.classList.remove('signed-out');
  authActions.innerHTML='';
  workspace=await getWorkspaceContext(true);
  dataOwner=await getDataOwnerId();
  const sub=await supabase.rpc('get_workspace_subscription_summary');
  if(sub.error)throw sub.error;
  subscription=Array.isArray(sub.data)?sub.data[0]:sub.data;
  if(!hasPro()){
    app.innerHTML='<div class="paywall-wrap"><section class="paywall-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Operations is ready when you upgrade.</h2><p class="paywall-lead">Booking, contracts, time tracking, projects, expenses, client portal and integrations all live inside this workspace.</p><a class="btn primary" href="/pro/upgrade/">Upgrade to Pro</a></section></div>';
    return;
  }
  await loadAll();
  render();
}
boot().catch(error=>{console.error(error);app.innerHTML=`<div class="auth-stage"><section class="auth-card"><h2>Could not load Operations</h2><p class="muted">${esc(error?.message||'Please try again.')}</p></section></div>`;});

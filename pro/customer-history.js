import { getSession, supabase } from './backend.js';

let session = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}

function money(value, currency = 'USD') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0); }
  catch { return `${(Number(value) || 0).toFixed(2)} ${currency}`; }
}

function ensureDialog() {
  let dialog = document.querySelector('#customerHistoryDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'customerHistoryDialog';
  dialog.className = 'history-dialog';
  dialog.innerHTML = `<div class="history-card"><div class="history-head"><div><p class="eyebrow">CUSTOMER HISTORY</p><h2 id="historyTitle">Customer</h2></div><button class="icon-btn" type="button" id="closeHistory" aria-label="Close">×</button></div><div id="historyBody"></div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('#closeHistory').onclick = () => dialog.close();
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  if (!document.querySelector('#customerHistoryStyles')) {
    const style = document.createElement('style');
    style.id = 'customerHistoryStyles';
    style.textContent = `.history-dialog{border:0;padding:0;background:transparent;width:min(900px,calc(100vw - 28px));max-width:none}.history-dialog::backdrop{background:rgba(10,15,20,.48);backdrop-filter:blur(3px)}.history-card{background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.24);max-height:86vh;overflow:auto}.history-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:24px 26px;border-bottom:1px solid #e7e9ed}.history-head h2{margin:2px 0 0}.history-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:20px 26px}.history-summary>div{border:1px solid #e7e9ed;border-radius:12px;padding:14px}.history-summary small{display:block;color:#68707a;margin-bottom:5px}.history-summary strong{font-size:18px}.history-contact{padding:0 26px 20px;color:#626a73}.timeline{padding:4px 26px 28px}.timeline-item{position:relative;margin-left:12px;padding:0 0 22px 28px;border-left:2px solid #e5e7eb}.timeline-item:last-child{border-left-color:transparent;padding-bottom:0}.timeline-dot{position:absolute;left:-7px;top:4px;width:12px;height:12px;border-radius:50%;background:#111;border:2px solid #fff;box-shadow:0 0 0 1px #d5d8dd}.timeline-top{display:flex;justify-content:space-between;gap:16px}.timeline-top strong{font-size:14px}.timeline-date{color:#737b85;font-size:12px;white-space:nowrap}.timeline-meta{color:#68707a;font-size:13px;margin-top:4px}.timeline-status{display:inline-block;margin-top:7px;border-radius:999px;background:#f1f3f5;padding:3px 8px;font-size:11px;font-weight:700;text-transform:uppercase}.timeline-empty{padding:30px 26px;color:#737b85}.history-actions{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}@media(max-width:720px){.history-summary{grid-template-columns:1fr 1fr}.timeline-top{display:block}.timeline-date{margin-top:2px}.history-card{max-height:92vh}}`;
    document.head.appendChild(style);
  }
  return dialog;
}

async function loadHistory(customerId) {
  if (!session?.user?.id) session = await getSession();
  if (!session?.user?.id) throw new Error('Sign in to view customer history.');
  const userId = session.user.id;
  const [customerResult, invoicesResult, estimatesResult, deliveriesResult] = await Promise.all([
    supabase.from('customers').select('*').eq('id', customerId).eq('user_id', userId).maybeSingle(),
    supabase.from('invoices').select('id,invoice_number,status,currency,total,issue_date,due_date,paid_date,sent_date,created_at,updated_at').eq('customer_id', customerId).eq('user_id', userId),
    supabase.from('estimates').select('id,estimate_number,status,currency,total,issue_date,valid_until,converted_invoice_id,created_at,updated_at,responded_at').eq('customer_id', customerId).eq('user_id', userId),
    supabase.from('email_deliveries').select('id,invoice_id,estimate_id,kind,recipient,subject,status,sent_at,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  for (const result of [customerResult, invoicesResult, estimatesResult, deliveriesResult]) if (result.error) throw result.error;
  const customer = customerResult.data;
  if (!customer) throw new Error('Customer not found.');
  const invoices = invoicesResult.data || [];
  const estimates = estimatesResult.data || [];
  const invoiceIds = new Set(invoices.map((item) => item.id));
  const estimateIds = new Set(estimates.map((item) => item.id));
  const deliveries = (deliveriesResult.data || []).filter((item) => invoiceIds.has(item.invoice_id) || estimateIds.has(item.estimate_id));
  return { customer, invoices, estimates, deliveries };
}

function buildEvents({ customer, invoices, estimates, deliveries }) {
  const events = [{ date: customer.created_at, type: 'customer', title: 'Customer created', meta: customer.company || customer.email || 'Added to CRM', status: customer.crm_status || 'lead' }];
  if (customer.crm_updated_at && customer.crm_updated_at !== customer.created_at) events.push({ date: customer.crm_updated_at, type: 'crm', title: 'CRM updated', meta: customer.crm_notes || customer.notes || 'Customer details or status changed', status: customer.crm_status || 'lead' });
  for (const estimate of estimates) {
    events.push({ date: estimate.created_at || estimate.issue_date, type: 'estimate', title: `Estimate ${estimate.estimate_number}`, meta: `${money(estimate.total, estimate.currency)} · valid until ${estimate.valid_until || '—'}`, status: estimate.status, link: '/pro/estimates/' });
    if (estimate.responded_at) events.push({ date: estimate.responded_at, type: 'response', title: `Estimate ${estimate.status}`, meta: `${estimate.estimate_number} · ${money(estimate.total, estimate.currency)}`, status: estimate.status, link: '/pro/estimates/' });
    if (estimate.converted_invoice_id) events.push({ date: estimate.updated_at, type: 'converted', title: 'Estimate converted to invoice', meta: estimate.estimate_number, status: 'converted', link: '/pro/estimates/' });
  }
  for (const invoice of invoices) {
    events.push({ date: invoice.created_at || invoice.issue_date, type: 'invoice', title: `Invoice ${invoice.invoice_number}`, meta: `${money(invoice.total, invoice.currency)} · due ${invoice.due_date || '—'}`, status: invoice.status, link: '/pro/' });
    if (invoice.sent_date) events.push({ date: invoice.sent_date, type: 'sent', title: `Invoice sent`, meta: invoice.invoice_number, status: 'sent', link: '/pro/' });
    if (invoice.paid_date) events.push({ date: invoice.paid_date, type: 'paid', title: `Payment recorded`, meta: `${invoice.invoice_number} · ${money(invoice.total, invoice.currency)}`, status: 'paid', link: '/pro/' });
  }
  for (const delivery of deliveries) {
    events.push({ date: delivery.sent_at || delivery.created_at, type: 'email', title: delivery.kind === 'estimate' ? 'Estimate email' : delivery.kind === 'reminder' ? 'Payment reminder' : 'Invoice email', meta: `${delivery.recipient || 'Recipient'}${delivery.subject ? ` · ${delivery.subject}` : ''}`, status: delivery.status });
  }
  return events.filter((event) => event.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function renderHistory(data) {
  const { customer, invoices, estimates } = data;
  const events = buildEvents(data);
  const dialog = ensureDialog();
  dialog.querySelector('#historyTitle').textContent = customer.name || customer.company || 'Customer';
  const paid = invoices.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.total || 0), 0);
  const outstanding = invoices.filter((item) => !['paid', 'draft', 'void'].includes(item.status)).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const accepted = estimates.filter((item) => ['accepted', 'converted'].includes(item.status)).length;
  const currency = invoices[0]?.currency || estimates[0]?.currency || 'USD';
  dialog.querySelector('#historyBody').innerHTML = `<div class="history-summary"><div><small>Invoices</small><strong>${invoices.length}</strong></div><div><small>Estimates</small><strong>${estimates.length}</strong></div><div><small>Paid</small><strong>${money(paid,currency)}</strong></div><div><small>Outstanding</small><strong>${money(outstanding,currency)}</strong></div></div><div class="history-contact">${[customer.company,customer.email,customer.phone].filter(Boolean).map(esc).join(' · ')}${accepted ? ` · ${accepted} accepted estimate${accepted===1?'':'s'}` : ''}</div>${events.length ? `<div class="timeline">${events.map((event) => `<div class="timeline-item"><span class="timeline-dot"></span><div class="timeline-top"><strong>${esc(event.title)}</strong><span class="timeline-date">${esc(new Date(event.date).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:event.type==='customer'?'2-digit':undefined,minute:event.type==='customer'?'2-digit':undefined}))}</span></div><div class="timeline-meta">${esc(event.meta || '')}</div><span class="timeline-status">${esc(event.status || event.type)}</span>${event.link ? `<div class="history-actions"><a class="mini-btn" href="${event.link}">Open</a></div>` : ''}</div>`).join('')}</div>` : '<div class="timeline-empty">No history yet.</div>';
  dialog.showModal();
}

async function openHistory(customerId) {
  const dialog = ensureDialog();
  dialog.querySelector('#historyTitle').textContent = 'Loading…';
  dialog.querySelector('#historyBody').innerHTML = '<div class="timeline-empty">Loading customer history…</div>';
  dialog.showModal();
  try { renderHistory(await loadHistory(customerId)); }
  catch (error) { dialog.querySelector('#historyBody').innerHTML = `<div class="timeline-empty">${esc(error?.message || 'Could not load customer history.')}</div>`; }
}

function addHistoryButtons() {
  document.querySelectorAll('[data-edit-customer]').forEach((edit) => {
    const cell = edit.parentElement;
    if (!cell || cell.querySelector('[data-history-customer]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.historyCustomer = edit.dataset.editCustomer;
    button.textContent = 'History';
    cell.insertBefore(button, edit);
    cell.insertBefore(document.createTextNode(' '), edit);
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-history-customer]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openHistory(button.dataset.historyCustomer);
}, true);

const observer = new MutationObserver(addHistoryButtons);
observer.observe(document.body, { childList: true, subtree: true });
addHistoryButtons();

(async () => { try { session = await getSession(); } catch {} })();

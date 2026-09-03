import { calculateInvoice, customerOutstanding, money, nextInvoiceNumber, normalizeInvoiceStatus } from './pro-core.js';

const STORAGE_KEY = 'solobizkit_pro_v1';
const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
const modal = document.querySelector('#modal');
const modalForm = document.querySelector('#modalForm');
const modalTitle = document.querySelector('#modalTitle');
const modalBody = document.querySelector('#modalBody');
const modalSave = document.querySelector('#modalSave');
let currentView = 'dashboard';
let modalAction = null;

const defaultState = { customers: [], invoices: [], settings: { currency: 'USD', taxRate: 0 } };
let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...structuredClone(defaultState), ...saved, settings: { ...defaultState.settings, ...(saved?.settings || {}) } };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function customerName(customerId) {
  const customer = state.customers.find((item) => item.id === customerId);
  return customer ? customer.name : 'Unknown customer';
}

function render() {
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.view === currentView));
  const titles = { dashboard: 'Dashboard', customers: 'Customers', invoices: 'Invoices' };
  pageTitle.textContent = titles[currentView];
  if (currentView === 'customers') renderCustomers();
  else if (currentView === 'invoices') renderInvoices();
  else renderDashboard();
}

function renderDashboard() {
  const currency = state.settings.currency;
  const paid = state.invoices.filter((i) => normalizeInvoiceStatus(i) === 'paid').reduce((sum, i) => sum + calculateInvoice(i).total, 0);
  const outstanding = state.invoices.filter((i) => ['sent', 'overdue'].includes(normalizeInvoiceStatus(i))).reduce((sum, i) => sum + calculateInvoice(i).total, 0);
  const openCount = state.invoices.filter((i) => ['sent', 'overdue'].includes(normalizeInvoiceStatus(i))).length;
  const recent = [...state.invoices].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 6);
  const followUps = state.customers.filter((c) => c.status !== 'client').slice(0, 6);

  app.innerHTML = `
    <div class="grid stats">
      <div class="stat"><div class="label">Customers</div><div class="value">${state.customers.length}</div></div>
      <div class="stat"><div class="label">Paid revenue</div><div class="value">${money(paid, currency)}</div></div>
      <div class="stat"><div class="label">Outstanding</div><div class="value">${money(outstanding, currency)}</div></div>
      <div class="stat"><div class="label">Open invoices</div><div class="value">${openCount}</div></div>
    </div>
    <div class="grid dashboard-grid">
      <section class="card">
        <div class="card-head"><h2>Recent invoices</h2><button class="mini-btn" data-jump="invoices">View all</button></div>
        ${recent.length ? invoiceTable(recent, true) : '<div class="empty">No invoices yet. Create your first invoice to start tracking revenue.</div>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>CRM follow-up</h2><button class="mini-btn" data-jump="customers">Customers</button></div>
        <div class="activity">
          ${followUps.length ? followUps.map((c) => `<div class="activity-item"><strong>${esc(c.name)}</strong><span>${esc(c.company || c.email || 'No company')} · <span class="status ${esc(c.status)}">${esc(c.status)}</span></span></div>`).join('') : '<div class="empty">No leads waiting. Add a customer to begin.</div>'}
        </div>
      </section>
    </div>`;

  app.querySelectorAll('[data-jump]').forEach((button) => button.addEventListener('click', () => { currentView = button.dataset.jump; render(); }));
  bindInvoiceActions();
}

function renderCustomers() {
  app.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <input class="input search" id="customerSearch" type="search" placeholder="Search customers…" />
        <select class="select" id="customerStatus" style="max-width:160px"><option value="">All statuses</option><option value="lead">Lead</option><option value="active">Active</option><option value="client">Client</option></select>
        <button class="btn primary" id="newCustomer">+ Customer</button>
      </div>
      <div id="customerResults"></div>
    </section>`;

  const search = app.querySelector('#customerSearch');
  const status = app.querySelector('#customerStatus');
  const results = app.querySelector('#customerResults');

  const update = () => {
    const q = search.value.trim().toLowerCase();
    const items = state.customers.filter((c) => !status.value || c.status === status.value).filter((c) => [c.name, c.company, c.email, c.phone].some((v) => String(v || '').toLowerCase().includes(q)));
    results.innerHTML = items.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Customer</th><th>Contact</th><th>Status</th><th>Outstanding</th><th></th></tr></thead><tbody>${items.map((c) => `<tr><td><strong>${esc(c.name)}</strong><br><span class="muted">${esc(c.company || '—')}</span></td><td>${esc(c.email || '—')}<br><span class="muted">${esc(c.phone || '')}</span></td><td><span class="status ${esc(c.status)}">${esc(c.status)}</span></td><td>${money(customerOutstanding(c.id, state.invoices), state.settings.currency)}</td><td><button class="mini-btn" data-edit-customer="${c.id}">Edit</button> <button class="mini-btn" data-invoice-customer="${c.id}">Invoice</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No customers found.</div>';
    results.querySelectorAll('[data-edit-customer]').forEach((b) => b.addEventListener('click', () => openCustomerModal(b.dataset.editCustomer)));
    results.querySelectorAll('[data-invoice-customer]').forEach((b) => b.addEventListener('click', () => openInvoiceModal(null, b.dataset.invoiceCustomer)));
  };

  search.addEventListener('input', update);
  status.addEventListener('change', update);
  app.querySelector('#newCustomer').addEventListener('click', () => openCustomerModal());
  update();
}

function invoiceTable(items, compact = false) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${items.map((invoice) => {
    const total = calculateInvoice(invoice).total;
    const status = normalizeInvoiceStatus(invoice);
    return `<tr><td><strong>${esc(invoice.number)}</strong><br><span class="muted">${esc(invoice.issueDate || '')}</span></td><td>${esc(customerName(invoice.customerId))}</td><td>${esc(invoice.dueDate || '—')}</td><td><span class="status ${status}">${status}</span></td><td>${money(total, invoice.currency || state.settings.currency)}</td><td>${compact ? '' : `<button class="mini-btn" data-edit-invoice="${invoice.id}">Edit</button> <button class="mini-btn" data-print-invoice="${invoice.id}">Print</button>${status !== 'paid' ? ` <button class="mini-btn" data-paid-invoice="${invoice.id}">Paid</button>` : ''}`}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function renderInvoices() {
  const invoices = [...state.invoices].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  app.innerHTML = `
    <section class="card">
      <div class="toolbar">
        <input class="input search" id="invoiceSearch" type="search" placeholder="Search invoice or customer…" />
        <select class="select" id="invoiceStatus" style="max-width:160px"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select>
        <button class="btn primary" id="newInvoice">+ Invoice</button>
      </div>
      <div id="invoiceResults"></div>
    </section>`;

  const search = app.querySelector('#invoiceSearch');
  const status = app.querySelector('#invoiceStatus');
  const results = app.querySelector('#invoiceResults');
  const update = () => {
    const q = search.value.trim().toLowerCase();
    const filtered = invoices.filter((i) => !status.value || normalizeInvoiceStatus(i) === status.value).filter((i) => `${i.number} ${customerName(i.customerId)}`.toLowerCase().includes(q));
    results.innerHTML = filtered.length ? invoiceTable(filtered) : '<div class="empty">No invoices found.</div>';
    bindInvoiceActions(results);
  };
  search.addEventListener('input', update);
  status.addEventListener('change', update);
  app.querySelector('#newInvoice').addEventListener('click', () => openInvoiceModal());
  update();
}

function openCustomerModal(customerId = null) {
  const existing = state.customers.find((c) => c.id === customerId);
  modalTitle.textContent = existing ? 'Edit customer' : 'New customer';
  modalBody.innerHTML = `<div class="form-grid">
    <div class="field"><label>Name *</label><input class="input" name="name" required value="${esc(existing?.name || '')}" /></div>
    <div class="field"><label>Company</label><input class="input" name="company" value="${esc(existing?.company || '')}" /></div>
    <div class="field"><label>Email</label><input class="input" name="email" type="email" value="${esc(existing?.email || '')}" /></div>
    <div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(existing?.phone || '')}" /></div>
    <div class="field"><label>Status</label><select class="select" name="status"><option value="lead" ${existing?.status === 'lead' ? 'selected' : ''}>Lead</option><option value="active" ${existing?.status === 'active' ? 'selected' : ''}>Active</option><option value="client" ${existing?.status === 'client' ? 'selected' : ''}>Client</option></select></div>
    <div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(existing?.notes || '')}</textarea></div>
  </div>`;
  modalAction = () => {
    const form = new FormData(modalForm);
    const name = String(form.get('name') || '').trim();
    if (!name) return false;
    const data = { id: existing?.id || id('cus'), name, company: String(form.get('company') || '').trim(), email: String(form.get('email') || '').trim(), phone: String(form.get('phone') || '').trim(), status: String(form.get('status') || 'lead'), notes: String(form.get('notes') || '').trim(), createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (existing) state.customers = state.customers.map((c) => c.id === existing.id ? data : c); else state.customers.unshift(data);
    saveState(); render();
    return true;
  };
  modal.showModal();
}

function invoiceLineMarkup(line = { description: '', qty: 1, rate: 0 }) {
  return `<div class="invoice-line"><input class="input" name="description" placeholder="Description" value="${esc(line.description || '')}" /><input class="input" name="qty" type="number" min="0" step="0.01" value="${Number(line.qty) || 1}" /><input class="input" name="rate" type="number" min="0" step="0.01" value="${Number(line.rate) || 0}" /><button type="button" class="mini-btn remove-line" aria-label="Remove">×</button></div>`;
}

function openInvoiceModal(invoiceId = null, presetCustomerId = null) {
  const existing = state.invoices.find((i) => i.id === invoiceId);
  if (!state.customers.length) {
    openCustomerModal();
    return;
  }
  const invoice = existing || { customerId: presetCustomerId || state.customers[0].id, number: nextInvoiceNumber(state.invoices), issueDate: todayISO(), dueDate: plusDaysISO(14), status: 'draft', currency: state.settings.currency, taxRate: state.settings.taxRate, lines: [{ description: '', qty: 1, rate: 0 }], notes: '' };
  modalTitle.textContent = existing ? `Edit ${existing.number}` : 'New invoice';
  modalBody.innerHTML = `<div class="form-grid">
    <div class="field"><label>Customer *</label><select class="select" name="customerId">${state.customers.map((c) => `<option value="${c.id}" ${c.id === invoice.customerId ? 'selected' : ''}>${esc(c.name)}${c.company ? ` — ${esc(c.company)}` : ''}</option>`).join('')}</select></div>
    <div class="field"><label>Invoice number *</label><input class="input" name="number" required value="${esc(invoice.number)}" /></div>
    <div class="field"><label>Issue date</label><input class="input" name="issueDate" type="date" value="${esc(invoice.issueDate)}" /></div>
    <div class="field"><label>Due date</label><input class="input" name="dueDate" type="date" value="${esc(invoice.dueDate)}" /></div>
    <div class="field"><label>Status</label><select class="select" name="status"><option value="draft" ${invoice.status === 'draft' ? 'selected' : ''}>Draft</option><option value="sent" ${invoice.status === 'sent' ? 'selected' : ''}>Sent</option><option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Paid</option></select></div>
    <div class="field"><label>Currency</label><select class="select" name="currency">${['USD','EUR','GBP','NOK','SEK','DKK'].map((c) => `<option ${c === invoice.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field full"><div class="split"><label>Line items</label><button type="button" class="mini-btn" id="addLine">+ Line</button></div><div class="invoice-lines" id="invoiceLines">${(invoice.lines || []).map(invoiceLineMarkup).join('')}</div></div>
    <div class="field"><label>Tax / VAT %</label><input class="input" name="taxRate" type="number" min="0" step="0.01" value="${Number(invoice.taxRate) || 0}" /></div>
    <div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(invoice.notes || '')}</textarea></div>
    <div class="field full"><div class="totals" id="liveTotals"></div></div>
  </div>`;

  const linesEl = modalBody.querySelector('#invoiceLines');
  const totalsEl = modalBody.querySelector('#liveTotals');
  const updateTotals = () => {
    const lines = [...linesEl.querySelectorAll('.invoice-line')].map((row) => ({ qty: row.querySelector('[name="qty"]').value, rate: row.querySelector('[name="rate"]').value }));
    const { subtotal, tax, total } = calculateInvoice({ lines, taxRate: modalBody.querySelector('[name="taxRate"]').value });
    const currency = modalBody.querySelector('[name="currency"]').value;
    totalsEl.innerHTML = `<div><span class="muted">Subtotal</span><strong>${money(subtotal, currency)}</strong></div><div><span class="muted">Tax</span><strong>${money(tax, currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(total, currency)}</strong></div>`;
  };
  const bindLines = () => {
    linesEl.querySelectorAll('.remove-line').forEach((button) => button.onclick = () => { if (linesEl.children.length > 1) button.closest('.invoice-line').remove(); updateTotals(); });
    linesEl.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateTotals));
  };
  modalBody.querySelector('#addLine').onclick = () => { linesEl.insertAdjacentHTML('beforeend', invoiceLineMarkup()); bindLines(); updateTotals(); };
  modalBody.querySelector('[name="taxRate"]').addEventListener('input', updateTotals);
  modalBody.querySelector('[name="currency"]').addEventListener('change', updateTotals);
  bindLines(); updateTotals();

  modalAction = () => {
    const form = new FormData(modalForm);
    const number = String(form.get('number') || '').trim();
    if (!number) return false;
    const lines = [...linesEl.querySelectorAll('.invoice-line')].map((row) => ({ description: row.querySelector('[name="description"]').value.trim(), qty: Number(row.querySelector('[name="qty"]').value) || 0, rate: Number(row.querySelector('[name="rate"]').value) || 0 })).filter((line) => line.description || line.qty || line.rate);
    const data = { id: existing?.id || id('inv'), customerId: String(form.get('customerId')), number, issueDate: String(form.get('issueDate') || ''), dueDate: String(form.get('dueDate') || ''), status: String(form.get('status') || 'draft'), currency: String(form.get('currency') || state.settings.currency), taxRate: Number(form.get('taxRate')) || 0, lines: lines.length ? lines : [{ description: 'Service', qty: 1, rate: 0 }], notes: String(form.get('notes') || '').trim(), createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (existing) state.invoices = state.invoices.map((i) => i.id === existing.id ? data : i); else state.invoices.unshift(data);
    saveState(); render();
    return true;
  };
  modal.showModal();
}

function bindInvoiceActions(root = app) {
  root.querySelectorAll('[data-edit-invoice]').forEach((b) => b.addEventListener('click', () => openInvoiceModal(b.dataset.editInvoice)));
  root.querySelectorAll('[data-paid-invoice]').forEach((b) => b.addEventListener('click', () => {
    state.invoices = state.invoices.map((i) => i.id === b.dataset.paidInvoice ? { ...i, status: 'paid', updatedAt: new Date().toISOString() } : i);
    saveState(); render();
  }));
  root.querySelectorAll('[data-print-invoice]').forEach((b) => b.addEventListener('click', () => printInvoice(b.dataset.printInvoice)));
}

function printInvoice(invoiceId) {
  const invoice = state.invoices.find((i) => i.id === invoiceId);
  const customer = state.customers.find((c) => c.id === invoice?.customerId);
  if (!invoice || !customer) return;
  const totals = calculateInvoice(invoice);
  const popup = window.open('', '_blank', 'width=900,height=800');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${esc(invoice.number)}</title><style>body{font:14px Arial,sans-serif;color:#111;margin:48px}header{display:flex;justify-content:space-between;margin-bottom:46px}h1{font-size:34px;margin:0}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:11px;border-bottom:1px solid #ddd;text-align:left}th{text-transform:uppercase;font-size:11px}.right{text-align:right}.totals{width:320px;margin:22px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px 0}.grand{font-size:18px;font-weight:bold;border-top:2px solid #111;margin-top:5px;padding-top:10px!important}@media print{body{margin:24px}}</style></head><body><header><div><strong>SoloBizKit Pro</strong><p class="muted">Invoice</p></div><div class="right"><h1>${esc(invoice.number)}</h1><p>Issued ${esc(invoice.issueDate)}<br>Due ${esc(invoice.dueDate)}</p></div></header><section><strong>Bill to</strong><p>${esc(customer.name)}${customer.company ? `<br>${esc(customer.company)}` : ''}${customer.email ? `<br>${esc(customer.email)}` : ''}</p></section><table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${invoice.lines.map((line) => `<tr><td>${esc(line.description)}</td><td class="right">${line.qty}</td><td class="right">${money(line.rate, invoice.currency)}</td><td class="right">${money(line.qty * line.rate, invoice.currency)}</td></tr>`).join('')}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(totals.subtotal, invoice.currency)}</strong></div><div><span>Tax</span><strong>${money(totals.tax, invoice.currency)}</strong></div><div class="grand"><span>Total</span><span>${money(totals.total, invoice.currency)}</span></div></div>${invoice.notes ? `<p style="margin-top:40px"><strong>Notes</strong><br>${esc(invoice.notes)}</p>` : ''}<script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { currentView = button.dataset.view; render(); }));
document.querySelector('#newCustomerTop').addEventListener('click', () => openCustomerModal());
document.querySelector('#newInvoiceTop').addEventListener('click', () => openInvoiceModal());
modalForm.addEventListener('submit', (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  if (modalAction?.()) modal.close();
});
modalSave.addEventListener('click', () => {});
render();

import { calculateInvoice, customerOutstanding, money, nextInvoiceNumber, normalizeInvoiceStatus } from './pro-core.js';
import { getSession, loadWorkspace, markInvoicePaid, onAuthChange, saveCustomer, saveInvoice, signIn, signOut, signUp, supabase } from './backend.js';

const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
const modal = document.querySelector('#modal');
const modalForm = document.querySelector('#modalForm');
const modalTitle = document.querySelector('#modalTitle');
const modalBody = document.querySelector('#modalBody');
const authActions = document.querySelector('#authActions');
const shell = document.querySelector('.app-shell');
const topCustomer = document.querySelector('#newCustomerTop');
const topInvoice = document.querySelector('#newInvoiceTop');

let currentView = 'dashboard';
let session = null;
let profile = null;
let subscription = null;
let modalAction = null;
let state = { customers: [], invoices: [], settings: { currency: 'USD', taxRate: 0 } };

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function customerName(id) { return state.customers.find((c) => c.id === id)?.name || 'Unknown customer'; }
function setBusy(message = 'Loading…') { app.innerHTML = `<div class="auth-stage"><div class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>${esc(message)}</h2></div></div>`; }
function showError(error) { console.error(error); alert(error?.message || 'Something went wrong. Please try again.'); }
function hasProAccess() { return ['active', 'trialing'].includes(String(subscription?.status || '').toLowerCase()) && String(subscription?.plan || '').toLowerCase() === 'pro'; }

async function hydrate() {
  if (!session?.user?.id) return;
  setBusy('Loading your workspace…');
  const workspace = await loadWorkspace(session.user.id);
  state.customers = workspace.customers.map((c) => ({ ...c, persisted: true }));
  state.invoices = workspace.invoices.map((i) => ({ ...i, persisted: true }));
  profile = workspace.profile;
  subscription = workspace.subscription;
  renderAuthActions();
  render();
}

function renderAuth() {
  shell.classList.add('signed-out');
  shell.classList.remove('paywalled');
  pageTitle.textContent = 'Pro workspace';
  authActions.innerHTML = '';
  topCustomer.hidden = true;
  topInvoice.hidden = true;
  app.innerHTML = `<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>CRM and invoicing for your business.</h2><p class="muted auth-copy">Sign in to keep customers, invoices and revenue securely synced to your account.</p><form id="authForm" class="auth-form"><label>Email<input class="input" name="email" type="email" autocomplete="email" required></label><label>Password<input class="input" name="password" type="password" autocomplete="current-password" minlength="8" required></label><button class="btn primary" type="submit">Sign in</button><button class="btn secondary" type="button" id="createAccount">Create account</button><p class="auth-message" id="authMessage"></p></form></section></div>`;
  const form = app.querySelector('#authForm');
  const message = app.querySelector('#authMessage');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = 'Signing in…';
    try { await signIn(form.email.value.trim(), form.password.value); }
    catch (error) { message.textContent = error.message; }
  });
  app.querySelector('#createAccount').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    message.textContent = 'Creating account…';
    try {
      const data = await signUp(form.email.value.trim(), form.password.value);
      message.textContent = data.session ? 'Account created.' : 'Check your email to confirm your account, then sign in.';
    } catch (error) { message.textContent = error.message; }
  });
}

function renderAuthActions() {
  shell.classList.remove('signed-out');
  const label = hasProAccess() ? 'PRO' : 'ACCOUNT';
  authActions.innerHTML = `<span class="account-chip"><strong>${esc(session?.user?.email || 'Account')}</strong><small>${label}</small></span><button class="mini-btn" id="signOutBtn">Sign out</button>`;
  document.querySelector('#signOutBtn').addEventListener('click', () => signOut().catch(showError));
}

async function startCheckout(billing) {
  const button = app.querySelector(`[data-checkout="${billing}"]`);
  if (button) { button.disabled = true; button.textContent = 'Opening secure checkout…'; }
  try {
    const { data, error } = await supabase.functions.invoke('create-solobizkit-checkout', { body: { billing } });
    if (error) throw error;
    if (data?.alreadyPro) { await hydrate(); return; }
    if (!data?.url) throw new Error(data?.error || 'Could not start checkout.');
    window.location.assign(data.url);
  } catch (error) {
    showError(error);
    renderPaywall();
  }
}

function renderPaywall() {
  shell.classList.add('paywalled');
  topCustomer.hidden = true;
  topInvoice.hidden = true;
  document.querySelectorAll('.nav-item').forEach((button) => { button.disabled = true; });
  pageTitle.textContent = 'Upgrade to Pro';
  const params = new URLSearchParams(window.location.search);
  const checkoutState = params.get('checkout');
  const notice = checkoutState === 'success'
    ? '<div class="paywall-notice success">Payment completed. If access is not active yet, refresh below while Stripe finishes the update.</div>'
    : checkoutState === 'cancelled'
      ? '<div class="paywall-notice">Checkout was cancelled. Nothing was charged.</div>'
      : '';
  app.innerHTML = `<div class="paywall-wrap"><section class="paywall-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Run your business from one simple workspace.</h2><p class="paywall-lead">Customers, CRM follow-up, invoices and revenue tracking are part of SoloBizKit Pro. There is no permanent free CRM tier.</p>${notice}<div class="paywall-features"><span>✓ Customer CRM</span><span>✓ Synced invoices</span><span>✓ Revenue & outstanding dashboard</span><span>✓ Secure account storage</span></div><div class="paywall-plans"><button class="paywall-plan" data-checkout="monthly"><small>MONTHLY</small><strong>Start Pro monthly</strong><span>Cancel anytime</span></button><button class="paywall-plan featured" data-checkout="annual"><small>ANNUAL</small><strong>Start Pro annually</strong><span>Best value</span></button></div><button class="mini-btn refresh-access" id="refreshAccess">Refresh access</button><p class="paywall-foot">Payments are handled securely by Stripe. Your business data remains tied to your own account.</p></section></div>`;
  app.querySelectorAll('[data-checkout]').forEach((button) => button.addEventListener('click', () => startCheckout(button.dataset.checkout)));
  app.querySelector('#refreshAccess').addEventListener('click', () => hydrate().catch(showError));
}

function render() {
  if (!session) return renderAuth();
  if (!hasProAccess()) return renderPaywall();
  shell.classList.remove('paywalled');
  topCustomer.hidden = false;
  topInvoice.hidden = false;
  document.querySelectorAll('.nav-item').forEach((button) => { button.disabled = false; button.classList.toggle('active', button.dataset.view === currentView); });
  pageTitle.textContent = { dashboard: 'Dashboard', customers: 'Customers', invoices: 'Invoices' }[currentView];
  if (currentView === 'customers') renderCustomers();
  else if (currentView === 'invoices') renderInvoices();
  else renderDashboard();
}

function renderDashboard() {
  const currency = state.settings.currency;
  const paid = state.invoices.filter((i) => normalizeInvoiceStatus(i) === 'paid').reduce((sum, invoice) => sum + calculateInvoice(invoice).total, 0);
  const outstanding = state.invoices.filter((i) => ['sent', 'overdue'].includes(normalizeInvoiceStatus(i))).reduce((sum, invoice) => sum + calculateInvoice(invoice).total, 0);
  const openCount = state.invoices.filter((i) => ['sent', 'overdue'].includes(normalizeInvoiceStatus(i))).length;
  const recent = state.invoices.slice(0, 6);
  const followUps = state.customers.filter((customer) => customer.status !== 'client').slice(0, 6);
  app.innerHTML = `<div class="grid stats"><div class="stat"><div class="label">Customers</div><div class="value">${state.customers.length}</div></div><div class="stat"><div class="label">Paid revenue</div><div class="value">${money(paid, currency)}</div></div><div class="stat"><div class="label">Outstanding</div><div class="value">${money(outstanding, currency)}</div></div><div class="stat"><div class="label">Open invoices</div><div class="value">${openCount}</div></div></div><div class="grid dashboard-grid"><section class="card"><div class="card-head"><h2>Recent invoices</h2><button class="mini-btn" data-jump="invoices">View all</button></div>${recent.length ? invoiceTable(recent, true) : '<div class="empty">No invoices yet.</div>'}</section><section class="card"><div class="card-head"><h2>CRM follow-up</h2><button class="mini-btn" data-jump="customers">Customers</button></div><div class="activity">${followUps.length ? followUps.map((customer) => `<div class="activity-item"><strong>${esc(customer.name)}</strong><span>${esc(customer.company || customer.email || 'No company')} · <span class="status ${esc(customer.status)}">${esc(customer.status)}</span></span></div>`).join('') : '<div class="empty">No leads waiting.</div>'}</div></section></div>`;
  app.querySelectorAll('[data-jump]').forEach((button) => button.onclick = () => { currentView = button.dataset.jump; render(); });
}

function renderCustomers() {
  app.innerHTML = `<section class="card"><div class="toolbar"><input class="input search" id="customerSearch" type="search" placeholder="Search customers…"><select class="select" id="customerStatus" style="max-width:160px"><option value="">All statuses</option><option value="lead">Lead</option><option value="active">Active</option><option value="client">Client</option></select><button class="btn primary" id="newCustomer">+ Customer</button></div><div id="customerResults"></div></section>`;
  const search = app.querySelector('#customerSearch');
  const status = app.querySelector('#customerStatus');
  const results = app.querySelector('#customerResults');
  const update = () => {
    const q = search.value.trim().toLowerCase();
    const items = state.customers.filter((customer) => !status.value || customer.status === status.value).filter((customer) => [customer.name, customer.company, customer.email, customer.phone].some((value) => String(value || '').toLowerCase().includes(q)));
    results.innerHTML = items.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Customer</th><th>Contact</th><th>Status</th><th>Outstanding</th><th></th></tr></thead><tbody>${items.map((customer) => `<tr><td><strong>${esc(customer.name)}</strong><br><span class="muted">${esc(customer.company || '—')}</span></td><td>${esc(customer.email || '—')}<br><span class="muted">${esc(customer.phone || '')}</span></td><td><span class="status ${esc(customer.status)}">${esc(customer.status)}</span></td><td>${money(customerOutstanding(customer.id, state.invoices), state.settings.currency)}</td><td><button class="mini-btn" data-edit-customer="${customer.id}">Edit</button> <button class="mini-btn" data-invoice-customer="${customer.id}">Invoice</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No customers found.</div>';
    results.querySelectorAll('[data-edit-customer]').forEach((button) => button.onclick = () => openCustomerModal(button.dataset.editCustomer));
    results.querySelectorAll('[data-invoice-customer]').forEach((button) => button.onclick = () => openInvoiceModal(null, button.dataset.invoiceCustomer));
  };
  search.oninput = update;
  status.onchange = update;
  app.querySelector('#newCustomer').onclick = () => openCustomerModal();
  update();
}

function invoiceTable(items, compact = false) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${items.map((invoice) => { const total = calculateInvoice(invoice).total; const status = normalizeInvoiceStatus(invoice); return `<tr><td><strong>${esc(invoice.number)}</strong><br><span class="muted">${esc(invoice.issueDate || '')}</span></td><td>${esc(customerName(invoice.customerId))}</td><td>${esc(invoice.dueDate || '—')}</td><td><span class="status ${status}">${status}</span></td><td>${money(total, invoice.currency || state.settings.currency)}</td><td>${compact ? '' : `<button class="mini-btn" data-edit-invoice="${invoice.id}">Edit</button> <button class="mini-btn" data-print-invoice="${invoice.id}">Print</button>${status !== 'paid' ? ` <button class="mini-btn" data-paid-invoice="${invoice.id}">Paid</button>` : ''}`}</td></tr>`; }).join('')}</tbody></table></div>`;
}

function renderInvoices() {
  app.innerHTML = `<section class="card"><div class="toolbar"><input class="input search" id="invoiceSearch" type="search" placeholder="Search invoice or customer…"><select class="select" id="invoiceStatus" style="max-width:160px"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select><button class="btn primary" id="newInvoice">+ Invoice</button></div><div id="invoiceResults"></div></section>`;
  const search = app.querySelector('#invoiceSearch');
  const status = app.querySelector('#invoiceStatus');
  const results = app.querySelector('#invoiceResults');
  const update = () => {
    const q = search.value.trim().toLowerCase();
    const items = state.invoices.filter((invoice) => !status.value || normalizeInvoiceStatus(invoice) === status.value).filter((invoice) => `${invoice.number} ${customerName(invoice.customerId)}`.toLowerCase().includes(q));
    results.innerHTML = items.length ? invoiceTable(items) : '<div class="empty">No invoices found.</div>';
    bindInvoiceActions(results);
  };
  search.oninput = update;
  status.onchange = update;
  app.querySelector('#newInvoice').onclick = () => openInvoiceModal();
  update();
}

function openCustomerModal(customerId = null) {
  if (!hasProAccess()) return renderPaywall();
  const existing = state.customers.find((customer) => customer.id === customerId);
  modalTitle.textContent = existing ? 'Edit customer' : 'New customer';
  modalBody.innerHTML = `<div class="form-grid"><div class="field"><label>Name *</label><input class="input" name="name" required value="${esc(existing?.name || '')}"></div><div class="field"><label>Company</label><input class="input" name="company" value="${esc(existing?.company || '')}"></div><div class="field"><label>Email</label><input class="input" name="email" type="email" value="${esc(existing?.email || '')}"></div><div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(existing?.phone || '')}"></div><div class="field"><label>Status</label><select class="select" name="status">${['lead', 'active', 'client'].map((status) => `<option value="${status}" ${existing?.status === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('')}</select></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(existing?.notes || '')}</textarea></div></div>`;
  modalAction = async () => {
    const form = new FormData(modalForm);
    const name = String(form.get('name') || '').trim();
    if (!name) return false;
    const draft = { ...(existing || {}), name, company: String(form.get('company') || '').trim(), email: String(form.get('email') || '').trim(), phone: String(form.get('phone') || '').trim(), status: String(form.get('status') || 'lead'), notes: String(form.get('notes') || '').trim() };
    const saved = await saveCustomer(session.user.id, draft);
    if (existing) state.customers = state.customers.map((customer) => customer.id === existing.id ? saved : customer); else state.customers.unshift(saved);
    render();
    return true;
  };
  modal.showModal();
}

function invoiceLineMarkup(line = { description: '', qty: 1, rate: 0 }) {
  return `<div class="invoice-line"><input class="input" name="description" placeholder="Description" value="${esc(line.description || '')}"><input class="input" name="qty" type="number" min="0.01" step="0.01" value="${Number(line.qty) || 1}"><input class="input" name="rate" type="number" min="0" step="0.01" value="${Number(line.rate) || 0}"><button type="button" class="mini-btn remove-line">×</button></div>`;
}

function openInvoiceModal(invoiceId = null, presetCustomerId = null) {
  if (!hasProAccess()) return renderPaywall();
  const existing = state.invoices.find((invoice) => invoice.id === invoiceId);
  if (!state.customers.length) { openCustomerModal(); return; }
  const invoice = existing || { customerId: presetCustomerId || state.customers[0].id, number: nextInvoiceNumber(state.invoices), issueDate: todayISO(), dueDate: plusDaysISO(14), status: 'draft', currency: state.settings.currency, taxRate: 0, lines: [{ description: '', qty: 1, rate: 0 }], notes: '' };
  modalTitle.textContent = existing ? `Edit ${existing.number}` : 'New invoice';
  modalBody.innerHTML = `<div class="form-grid"><div class="field"><label>Customer *</label><select class="select" name="customerId">${state.customers.map((customer) => `<option value="${customer.id}" ${customer.id === invoice.customerId ? 'selected' : ''}>${esc(customer.name)}</option>`).join('')}</select></div><div class="field"><label>Invoice number *</label><input class="input" name="number" required value="${esc(invoice.number)}"></div><div class="field"><label>Issue date</label><input class="input" name="issueDate" type="date" value="${esc(invoice.issueDate)}"></div><div class="field"><label>Due date</label><input class="input" name="dueDate" type="date" value="${esc(invoice.dueDate)}"></div><div class="field"><label>Status</label><select class="select" name="status">${['draft', 'sent', 'paid'].map((status) => `<option value="${status}" ${invoice.status === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('')}</select></div><div class="field"><label>Currency</label><select class="select" name="currency">${['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK'].map((currency) => `<option ${currency === invoice.currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></div><div class="field full"><div class="split"><label>Line items</label><button type="button" class="mini-btn" id="addLine">+ Line</button></div><div class="invoice-lines" id="invoiceLines">${invoice.lines.map(invoiceLineMarkup).join('')}</div></div><div class="field"><label>Tax / VAT %</label><input class="input" name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(invoice.taxRate) || 0}"></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(invoice.notes || '')}</textarea></div><div class="field full"><div class="totals" id="liveTotals"></div></div></div>`;
  const linesEl = modalBody.querySelector('#invoiceLines');
  const totalsEl = modalBody.querySelector('#liveTotals');
  const updateTotals = () => {
    const lines = [...linesEl.querySelectorAll('.invoice-line')].map((row) => ({ qty: row.querySelector('[name="qty"]').value, rate: row.querySelector('[name="rate"]').value }));
    const totals = calculateInvoice({ lines, taxRate: modalBody.querySelector('[name="taxRate"]').value });
    const currency = modalBody.querySelector('[name="currency"]').value;
    totalsEl.innerHTML = `<div><span class="muted">Subtotal</span><strong>${money(totals.subtotal, currency)}</strong></div><div><span class="muted">Tax</span><strong>${money(totals.tax, currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(totals.total, currency)}</strong></div>`;
  };
  const bindLines = () => {
    linesEl.querySelectorAll('.remove-line').forEach((button) => button.onclick = () => { if (linesEl.children.length > 1) button.closest('.invoice-line').remove(); updateTotals(); });
    linesEl.querySelectorAll('input').forEach((input) => input.oninput = updateTotals);
  };
  modalBody.querySelector('#addLine').onclick = () => { linesEl.insertAdjacentHTML('beforeend', invoiceLineMarkup()); bindLines(); updateTotals(); };
  modalBody.querySelector('[name="taxRate"]').oninput = updateTotals;
  modalBody.querySelector('[name="currency"]').onchange = updateTotals;
  bindLines();
  updateTotals();
  modalAction = async () => {
    const form = new FormData(modalForm);
    const number = String(form.get('number') || '').trim();
    if (!number) return false;
    const lines = [...linesEl.querySelectorAll('.invoice-line')].map((row) => ({ description: row.querySelector('[name="description"]').value.trim() || 'Service', qty: Number(row.querySelector('[name="qty"]').value) || 1, rate: Number(row.querySelector('[name="rate"]').value) || 0 }));
    const draft = { ...(existing || {}), customerId: String(form.get('customerId')), number, issueDate: String(form.get('issueDate') || todayISO()), dueDate: String(form.get('dueDate') || ''), status: String(form.get('status') || 'draft'), currency: String(form.get('currency') || 'USD'), taxRate: Number(form.get('taxRate')) || 0, lines, notes: String(form.get('notes') || '').trim() };
    const saved = await saveInvoice(session.user.id, draft);
    if (existing) state.invoices = state.invoices.map((item) => item.id === existing.id ? saved : item); else state.invoices.unshift(saved);
    render();
    return true;
  };
  modal.showModal();
}

function bindInvoiceActions(root = app) {
  root.querySelectorAll('[data-edit-invoice]').forEach((button) => button.onclick = () => openInvoiceModal(button.dataset.editInvoice));
  root.querySelectorAll('[data-paid-invoice]').forEach((button) => button.onclick = async () => {
    try {
      await markInvoicePaid(session.user.id, button.dataset.paidInvoice);
      state.invoices = state.invoices.map((invoice) => invoice.id === button.dataset.paidInvoice ? { ...invoice, status: 'paid' } : invoice);
      render();
    } catch (error) { showError(error); }
  });
  root.querySelectorAll('[data-print-invoice]').forEach((button) => button.onclick = () => printInvoice(button.dataset.printInvoice));
}

function printInvoice(invoiceId) {
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  const customer = state.customers.find((item) => item.id === invoice?.customerId);
  if (!invoice || !customer) return;
  const totals = calculateInvoice(invoice);
  const popup = window.open('', '_blank', 'width=900,height=800');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${esc(invoice.number)}</title><style>body{font:14px Arial,sans-serif;color:#111;margin:48px}header{display:flex;justify-content:space-between;margin-bottom:46px}h1{font-size:34px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:11px;border-bottom:1px solid #ddd;text-align:left}.right{text-align:right}.totals{width:320px;margin:22px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:6px}.grand{font-size:18px;font-weight:bold;border-top:2px solid #111}</style></head><body><header><div><strong>SoloBizKit Pro</strong><p class="muted">Invoice</p></div><div class="right"><h1>${esc(invoice.number)}</h1><p>Issued ${esc(invoice.issueDate)}<br>Due ${esc(invoice.dueDate)}</p></div></header><strong>Bill to</strong><p>${esc(customer.name)}${customer.company ? `<br>${esc(customer.company)}` : ''}${customer.email ? `<br>${esc(customer.email)}` : ''}</p><table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${invoice.lines.map((line) => `<tr><td>${esc(line.description)}</td><td class="right">${line.qty}</td><td class="right">${money(line.rate, invoice.currency)}</td><td class="right">${money(line.qty * line.rate, invoice.currency)}</td></tr>`).join('')}</tbody></table><div class="totals"><div><span>Subtotal</span><strong>${money(totals.subtotal, invoice.currency)}</strong></div><div><span>Tax</span><strong>${money(totals.tax, invoice.currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(totals.total, invoice.currency)}</strong></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

document.querySelectorAll('.nav-item').forEach((button) => button.onclick = () => { if (!session || !hasProAccess()) return; currentView = button.dataset.view; render(); });
topCustomer.onclick = () => session && hasProAccess() && openCustomerModal();
topInvoice.onclick = () => session && hasProAccess() && openInvoiceModal();
modalForm.addEventListener('submit', async (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  try { const ok = await modalAction?.(); if (ok) modal.close(); }
  catch (error) { showError(error); }
});

onAuthChange(async (_event, nextSession) => {
  session = nextSession;
  if (session) {
    try { await hydrate(); } catch (error) { showError(error); }
  } else {
    profile = null;
    subscription = null;
    state = { customers: [], invoices: [], settings: { currency: 'USD', taxRate: 0 } };
    renderAuth();
  }
});

(async () => {
  try {
    session = await getSession();
    if (session) await hydrate(); else renderAuth();
  } catch (error) {
    showError(error);
    renderAuth();
  }
})();

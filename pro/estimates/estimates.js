import { calculateInvoice, money, nextInvoiceNumber } from '../pro-core.js';
import { convertEstimateToInvoice, getSession, loadWorkspace, onAuthChange, saveEstimate, signIn, signOut, signUp, supabase } from '../backend.js';

const app = document.querySelector('#app');
const shell = document.querySelector('#shell');
const authActions = document.querySelector('#authActions');
const newEstimateButton = document.querySelector('#newEstimate');
const modal = document.querySelector('#modal');
const modalForm = document.querySelector('#modalForm');
const modalTitle = document.querySelector('#modalTitle');
const modalBody = document.querySelector('#modalBody');

let session = null;
let subscription = null;
let state = { customers: [], invoices: [], estimates: [] };
let modalAction = null;

function esc(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function hasProAccess() { return ['active', 'trialing'].includes(String(subscription?.status || '').toLowerCase()) && String(subscription?.plan || '').toLowerCase() === 'pro'; }
function customerName(id) { return state.customers.find((customer) => customer.id === id)?.name || 'Unknown customer'; }
function nextEstimateNumber() {
  const used = state.estimates.map((estimate) => Number(String(estimate.number || '').match(/(\d+)$/)?.[1] || 0));
  return `EST-${String(Math.max(1000, ...used) + 1).padStart(4, '0')}`;
}
function setBusy(message) { app.innerHTML = `<div class="auth-stage"><div class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>${esc(message)}</h2></div></div>`; }
function showError(error) { console.error(error); alert(error?.message || 'Something went wrong.'); }

async function hydrate() {
  if (!session?.user?.id) return;
  setBusy('Loading estimates…');
  const workspace = await loadWorkspace(session.user.id);
  state = {
    customers: workspace.customers.map((item) => ({ ...item, persisted: true })),
    invoices: workspace.invoices.map((item) => ({ ...item, persisted: true })),
    estimates: workspace.estimates.map((item) => ({ ...item, persisted: true })),
  };
  subscription = workspace.subscription;
  renderAccount();
  render();
}

function renderAccount() {
  const label = hasProAccess() ? 'PRO' : 'ACCOUNT';
  authActions.innerHTML = `<span class="account-chip"><strong>${esc(session?.user?.email || 'Account')}</strong><small>${label}</small></span><button class="mini-btn" id="signOutBtn">Sign out</button>`;
  authActions.querySelector('#signOutBtn').onclick = () => signOut().catch(showError);
}

function renderAuth() {
  shell.classList.add('signed-out');
  newEstimateButton.hidden = true;
  authActions.innerHTML = '';
  app.innerHTML = `<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Sign in to manage estimates.</h2><p class="muted auth-copy">Quotes and estimates stay synced with your customers and invoices.</p><form id="authForm" class="auth-form"><label>Email<input class="input" name="email" type="email" required></label><label>Password<input class="input" name="password" type="password" minlength="8" required></label><button class="btn primary" type="submit">Sign in</button><button class="btn secondary" id="createAccount" type="button">Create account</button><p class="auth-message" id="authMessage"></p></form></section></div>`;
  const form = app.querySelector('#authForm');
  const message = app.querySelector('#authMessage');
  form.onsubmit = async (event) => { event.preventDefault(); try { await signIn(form.email.value.trim(), form.password.value); } catch (error) { message.textContent = error.message; } };
  app.querySelector('#createAccount').onclick = async () => {
    if (!form.reportValidity()) return;
    try { const data = await signUp(form.email.value.trim(), form.password.value); message.textContent = data.session ? 'Account created.' : 'Check your email, then sign in.'; }
    catch (error) { message.textContent = error.message; }
  };
}

async function startCheckout(billing) {
  try {
    const { data, error } = await supabase.functions.invoke('create-solobizkit-checkout', { body: { billing } });
    if (error) throw error;
    if (data?.alreadyPro) return hydrate();
    if (!data?.url) throw new Error(data?.error || 'Could not start checkout.');
    window.location.assign(data.url);
  } catch (error) { showError(error); }
}

function renderPaywall() {
  shell.classList.add('paywalled');
  newEstimateButton.hidden = true;
  app.innerHTML = `<div class="paywall-wrap"><section class="paywall-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Estimates are part of Pro.</h2><p class="paywall-lead">Create quotes, track acceptance and convert accepted work into invoices without retyping anything.</p><div class="paywall-features"><span>✓ Estimates and quotes</span><span>✓ Draft / Sent / Accepted tracking</span><span>✓ One-click invoice conversion</span><span>✓ Shared customer history</span></div><div class="paywall-plans"><button class="paywall-plan" data-checkout="monthly"><small>MONTHLY</small><strong>Start Pro monthly</strong></button><button class="paywall-plan featured" data-checkout="annual"><small>ANNUAL</small><strong>Start Pro annually</strong></button></div></section></div>`;
  app.querySelectorAll('[data-checkout]').forEach((button) => button.onclick = () => startCheckout(button.dataset.checkout));
}

function render() {
  if (!session) return renderAuth();
  if (!hasProAccess()) return renderPaywall();
  shell.classList.remove('signed-out', 'paywalled');
  newEstimateButton.hidden = false;
  const estimates = [...state.estimates].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  app.innerHTML = `<section class="card"><div class="toolbar"><input class="input search" id="estimateSearch" type="search" placeholder="Search estimate or customer…"><select class="select" id="estimateStatus" style="max-width:170px"><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="converted">Converted</option></select><button class="btn primary" id="newEstimateInner">+ Estimate</button></div><div id="estimateResults"></div></section>`;
  const search = app.querySelector('#estimateSearch');
  const status = app.querySelector('#estimateStatus');
  const results = app.querySelector('#estimateResults');
  const update = () => {
    const q = search.value.trim().toLowerCase();
    const filtered = estimates.filter((estimate) => !status.value || estimate.status === status.value).filter((estimate) => `${estimate.number} ${customerName(estimate.customerId)}`.toLowerCase().includes(q));
    results.innerHTML = filtered.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Estimate</th><th>Customer</th><th>Valid until</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${filtered.map(estimateRow).join('')}</tbody></table></div>` : '<div class="empty">No estimates found.</div>';
    bindActions(results);
  };
  search.oninput = update;
  status.onchange = update;
  app.querySelector('#newEstimateInner').onclick = () => openEstimateModal();
  update();
}

function estimateRow(estimate) {
  const total = calculateInvoice({ lines: estimate.lines, taxRate: estimate.taxRate }).total;
  const converted = estimate.status === 'converted' || estimate.convertedInvoiceId;
  return `<tr><td><strong>${esc(estimate.number)}</strong><br><span class="muted">${esc(estimate.issueDate || '')}</span></td><td>${esc(customerName(estimate.customerId))}</td><td>${esc(estimate.validUntil || '—')}</td><td><span class="estimate-status ${esc(estimate.status)}">${esc(estimate.status)}</span></td><td>${money(total, estimate.currency)}</td><td><div class="estimate-actions"><button class="mini-btn" data-edit="${estimate.id}" ${converted ? 'disabled' : ''}>Edit</button>${converted ? '<span class="converted-note">Invoice created</span>' : `<button class="mini-btn" data-convert="${estimate.id}">Convert to invoice</button>`}</div></td></tr>`;
}

function bindActions(root) {
  root.querySelectorAll('[data-edit]').forEach((button) => button.onclick = () => openEstimateModal(button.dataset.edit));
  root.querySelectorAll('[data-convert]').forEach((button) => button.onclick = async () => {
    const estimate = state.estimates.find((item) => item.id === button.dataset.convert);
    if (!estimate) return;
    button.disabled = true;
    button.textContent = 'Converting…';
    try {
      const invoice = await convertEstimateToInvoice(session.user.id, estimate, nextInvoiceNumber(state.invoices));
      state.invoices.unshift(invoice);
      state.estimates = state.estimates.map((item) => item.id === estimate.id ? { ...item, status: 'converted', convertedInvoiceId: invoice.id } : item);
      render();
    } catch (error) { showError(error); render(); }
  });
}

function lineMarkup(line = { description: '', qty: 1, rate: 0 }) {
  return `<div class="estimate-line"><input class="input" name="description" placeholder="Description" value="${esc(line.description || '')}"><input class="input" name="qty" type="number" min="0.01" step="0.01" value="${Number(line.qty) || 1}"><input class="input" name="rate" type="number" min="0" step="0.01" value="${Number(line.rate) || 0}"><button class="mini-btn remove-line" type="button">×</button></div>`;
}

function openEstimateModal(estimateId = null) {
  if (!state.customers.length) { alert('Add a customer first from the Pro dashboard.'); return; }
  const existing = state.estimates.find((estimate) => estimate.id === estimateId);
  const estimate = existing || { customerId: state.customers[0].id, number: nextEstimateNumber(), issueDate: todayISO(), validUntil: plusDaysISO(30), status: 'draft', currency: 'USD', taxRate: 0, lines: [{ description: '', qty: 1, rate: 0 }], notes: '' };
  modalTitle.textContent = existing ? `Edit ${estimate.number}` : 'New estimate';
  modalBody.innerHTML = `<div class="form-grid"><div class="field"><label>Customer *</label><select class="select" name="customerId">${state.customers.map((customer) => `<option value="${customer.id}" ${customer.id === estimate.customerId ? 'selected' : ''}>${esc(customer.name)}</option>`).join('')}</select></div><div class="field"><label>Estimate number *</label><input class="input" name="number" required value="${esc(estimate.number)}"></div><div class="field"><label>Issue date</label><input class="input" name="issueDate" type="date" value="${esc(estimate.issueDate)}"></div><div class="field"><label>Valid until</label><input class="input" name="validUntil" type="date" value="${esc(estimate.validUntil)}"></div><div class="field"><label>Status</label><select class="select" name="status">${['draft','sent','accepted','declined'].map((status) => `<option value="${status}" ${estimate.status === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('')}</select></div><div class="field"><label>Currency</label><select class="select" name="currency">${['USD','EUR','GBP','NOK','SEK','DKK'].map((currency) => `<option ${currency === estimate.currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></div><div class="field full"><div class="split"><label>Line items</label><button class="mini-btn" type="button" id="addLine">+ Line</button></div><div class="estimate-lines" id="estimateLines">${estimate.lines.map(lineMarkup).join('')}</div></div><div class="field"><label>Tax / VAT %</label><input class="input" name="taxRate" type="number" min="0" max="100" step="0.01" value="${Number(estimate.taxRate) || 0}"></div><div class="field full"><label>Notes</label><textarea class="textarea" name="notes">${esc(estimate.notes || '')}</textarea></div><div class="field full"><div class="estimate-summary" id="estimateSummary"></div></div></div>`;
  const linesEl = modalBody.querySelector('#estimateLines');
  const summary = modalBody.querySelector('#estimateSummary');
  const updateTotals = () => {
    const lines = [...linesEl.querySelectorAll('.estimate-line')].map((row) => ({ qty: Number(row.querySelector('[name="qty"]').value) || 0, rate: Number(row.querySelector('[name="rate"]').value) || 0 }));
    const totals = calculateInvoice({ lines, taxRate: Number(modalBody.querySelector('[name="taxRate"]').value) || 0 });
    const currency = modalBody.querySelector('[name="currency"]').value;
    summary.innerHTML = `<div><span class="muted">Subtotal</span><strong>${money(totals.subtotal, currency)}</strong></div><div><span class="muted">Tax</span><strong>${money(totals.tax, currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(totals.total, currency)}</strong></div>`;
  };
  const bindLines = () => {
    linesEl.querySelectorAll('.remove-line').forEach((button) => button.onclick = () => { if (linesEl.children.length > 1) button.closest('.estimate-line').remove(); updateTotals(); });
    linesEl.querySelectorAll('input').forEach((input) => input.oninput = updateTotals);
  };
  modalBody.querySelector('#addLine').onclick = () => { linesEl.insertAdjacentHTML('beforeend', lineMarkup()); bindLines(); updateTotals(); };
  modalBody.querySelector('[name="taxRate"]').oninput = updateTotals;
  modalBody.querySelector('[name="currency"]').onchange = updateTotals;
  bindLines(); updateTotals();

  modalAction = async () => {
    const form = new FormData(modalForm);
    const number = String(form.get('number') || '').trim();
    if (!number) return false;
    const lines = [...linesEl.querySelectorAll('.estimate-line')].map((row) => ({ description: row.querySelector('[name="description"]').value.trim() || 'Service', qty: Number(row.querySelector('[name="qty"]').value) || 1, rate: Number(row.querySelector('[name="rate"]').value) || 0 }));
    const draft = { ...(existing || {}), customerId: String(form.get('customerId')), number, issueDate: String(form.get('issueDate') || todayISO()), validUntil: String(form.get('validUntil') || ''), status: String(form.get('status') || 'draft'), currency: String(form.get('currency') || 'USD'), taxRate: Number(form.get('taxRate')) || 0, lines, notes: String(form.get('notes') || '').trim() };
    const saved = await saveEstimate(session.user.id, draft);
    if (existing) state.estimates = state.estimates.map((item) => item.id === existing.id ? saved : item); else state.estimates.unshift(saved);
    render();
    return true;
  };
  modal.showModal();
}

newEstimateButton.onclick = () => hasProAccess() && openEstimateModal();
modalForm.addEventListener('submit', async (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  try { const ok = await modalAction?.(); if (ok) modal.close(); } catch (error) { showError(error); }
});

onAuthChange(async (_event, nextSession) => {
  session = nextSession;
  if (session) { try { await hydrate(); } catch (error) { showError(error); } }
  else { subscription = null; state = { customers: [], invoices: [], estimates: [] }; renderAuth(); }
});

(async () => {
  try { session = await getSession(); if (session) await hydrate(); else renderAuth(); }
  catch (error) { showError(error); renderAuth(); }
})();

import { getSession, loadWorkspace } from './backend.js';

const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');

let cache = null;
let cacheUserId = null;
let loading = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}

function invoiceTotal(invoice) {
  const subtotal = (invoice.lines || []).reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
  return subtotal * (1 + Number(invoice.taxRate || 0) / 100);
}

function estimateTotal(estimate) {
  const subtotal = (estimate.lines || []).reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0), 0);
  return subtotal * (1 + Number(estimate.taxRate || 0) / 100);
}

function normalizedInvoiceStatus(invoice) {
  const raw = String(invoice.status || 'draft').toLowerCase();
  if (raw === 'paid' || raw === 'void') return raw;
  if (raw === 'sent' && invoice.dueDate && invoice.dueDate < new Date().toISOString().slice(0, 10)) return 'overdue';
  return raw;
}

function monthKey(value) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

function daysSince(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function moneyByCurrency(items, amountForItem, fallback = 'USD') {
  const totals = new Map();
  items.forEach((item) => {
    const currency = item.currency || fallback;
    totals.set(currency, (totals.get(currency) || 0) + amountForItem(item));
  });
  if (!totals.size) return '—';
  return [...totals.entries()].map(([currency, amount]) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return `${currency} ${amount.toFixed(0)}`; }
  }).join(' · ');
}

async function workspace() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  if (cache && cacheUserId === session.user.id) return cache;
  if (loading) return loading;
  loading = loadWorkspace(session.user.id)
    .then((data) => {
      cache = data;
      cacheUserId = session.user.id;
      return data;
    })
    .finally(() => { loading = null; });
  return loading;
}

function customerName(data, id) {
  return data.customers.find((customer) => customer.id === id)?.name || 'Unknown customer';
}

function injectDashboard(data) {
  if (pageTitle?.textContent !== 'Dashboard' || app.querySelector('.dashboard-v2')) return;
  const baseStats = app.querySelector('.stats');
  if (!baseStats) return;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = data.invoices.filter((invoice) => normalizedInvoiceStatus(invoice) === 'paid' && monthKey(invoice.updatedAt || invoice.issueDate) === thisMonth);
  const overdue = data.invoices.filter((invoice) => normalizedInvoiceStatus(invoice) === 'overdue');
  const openEstimates = data.estimates.filter((estimate) => ['draft', 'sent', 'viewed'].includes(String(estimate.status || '').toLowerCase()));
  const decidedEstimates = data.estimates.filter((estimate) => ['accepted', 'declined'].includes(String(estimate.status || '').toLowerCase()));
  const accepted = decidedEstimates.filter((estimate) => String(estimate.status).toLowerCase() === 'accepted').length;
  const winRate = decidedEstimates.length ? Math.round((accepted / decidedEstimates.length) * 100) : null;

  const staleCustomers = data.customers
    .filter((customer) => customer.status !== 'client' && daysSince(customer.updatedAt || customer.createdAt) >= 14)
    .sort((a, b) => daysSince(b.updatedAt || b.createdAt) - daysSince(a.updatedAt || a.createdAt));

  const overdueSorted = [...overdue].sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  const nextActions = [
    ...overdueSorted.slice(0, 3).map((invoice) => ({
      tone: 'danger',
      title: `${invoice.number} is overdue`,
      detail: `${customerName(data, invoice.customerId)} · due ${invoice.dueDate || '—'}`,
      href: `/pro/?view=invoices&invoice=${encodeURIComponent(invoice.id)}`,
      action: 'Open invoice',
    })),
    ...staleCustomers.slice(0, Math.max(0, 5 - Math.min(overdueSorted.length, 3))).map((customer) => ({
      tone: 'neutral',
      title: `Follow up with ${customer.name}`,
      detail: `${customer.company || customer.email || 'CRM lead'} · ${daysSince(customer.updatedAt || customer.createdAt)} days since update`,
      href: '/pro/?view=customers',
      action: 'Open CRM',
    })),
  ].slice(0, 5);

  const panel = document.createElement('div');
  panel.className = 'dashboard-v2';
  panel.innerHTML = `
    <div class="grid insight-stats">
      <div class="stat insight-stat"><div class="label">Paid this month</div><div class="value compact-value">${esc(moneyByCurrency(paidThisMonth, invoiceTotal))}</div><small>${paidThisMonth.length} paid invoice${paidThisMonth.length === 1 ? '' : 's'}</small></div>
      <div class="stat insight-stat ${overdue.length ? 'attention' : ''}"><div class="label">Overdue</div><div class="value compact-value">${esc(moneyByCurrency(overdue, invoiceTotal))}</div><small>${overdue.length} invoice${overdue.length === 1 ? '' : 's'} need attention</small></div>
      <div class="stat insight-stat"><div class="label">Estimate pipeline</div><div class="value compact-value">${esc(moneyByCurrency(openEstimates, estimateTotal))}</div><small>${openEstimates.length} open estimate${openEstimates.length === 1 ? '' : 's'}</small></div>
      <div class="stat insight-stat"><div class="label">Estimate win rate</div><div class="value">${winRate === null ? '—' : `${winRate}%`}</div><small>${decidedEstimates.length ? `${accepted} of ${decidedEstimates.length} accepted` : 'No decided estimates yet'}</small></div>
    </div>
    <section class="card action-center">
      <div class="card-head"><div><h2>Action center</h2><p class="muted action-subtitle">What deserves attention next.</p></div><span class="action-badge">${nextActions.length}</span></div>
      <div class="next-actions">${nextActions.length ? nextActions.map((item) => `<a class="next-action ${item.tone}" href="${item.href}"><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span><b>${esc(item.action)} →</b></a>`).join('') : '<div class="empty compact-empty">Nothing urgent right now.</div>'}</div>
    </section>`;
  baseStats.insertAdjacentElement('afterend', panel);
}

function injectCustomerInsights(data) {
  if (pageTitle?.textContent !== 'Customers' || app.querySelector('.crm-v2')) return;
  const toolbar = app.querySelector('.toolbar');
  const results = app.querySelector('#customerResults');
  if (!toolbar || !results) return;

  const counts = {
    all: data.customers.length,
    lead: data.customers.filter((c) => c.status === 'lead').length,
    active: data.customers.filter((c) => c.status === 'active').length,
    client: data.customers.filter((c) => c.status === 'client').length,
  };
  const stale = data.customers.filter((customer) => customer.status !== 'client' && daysSince(customer.updatedAt || customer.createdAt) >= 14);

  const insight = document.createElement('div');
  insight.className = 'crm-v2';
  insight.innerHTML = `
    <div class="crm-summary">
      <button class="crm-chip active" data-crm-status="">All <b>${counts.all}</b></button>
      <button class="crm-chip" data-crm-status="lead">Leads <b>${counts.lead}</b></button>
      <button class="crm-chip" data-crm-status="active">Active <b>${counts.active}</b></button>
      <button class="crm-chip" data-crm-status="client">Clients <b>${counts.client}</b></button>
      <button class="crm-chip ${stale.length ? 'needs-attention' : ''}" data-stale-only="true">Follow-up <b>${stale.length}</b></button>
      <label class="crm-sort">Sort <select class="select" id="crmSort"><option value="recent">Recently updated</option><option value="name">Name A–Z</option><option value="oldest">Needs follow-up first</option></select></label>
    </div>
    ${stale.length ? `<div class="followup-strip"><strong>${stale.length} contact${stale.length === 1 ? '' : 's'} may need follow-up</strong><span>${stale.slice(0, 3).map((c) => esc(c.name)).join(' · ')}${stale.length > 3 ? ` · +${stale.length - 3} more` : ''}</span></div>` : ''}`;
  toolbar.insertAdjacentElement('afterend', insight);

  const statusSelect = app.querySelector('#customerStatus');
  const searchInput = app.querySelector('#customerSearch');
  const chips = insight.querySelectorAll('[data-crm-status]');
  const staleButton = insight.querySelector('[data-stale-only]');
  const sort = insight.querySelector('#crmSort');
  let staleOnly = false;

  function syncChips() {
    chips.forEach((chip) => chip.classList.toggle('active', !staleOnly && chip.dataset.crmStatus === statusSelect.value));
    staleButton?.classList.toggle('active', staleOnly);
  }

  function sortRows() {
    const tbody = results.querySelector('tbody');
    if (!tbody) return;
    const customerMap = new Map(data.customers.map((customer) => [customer.name.trim().toLowerCase(), customer]));
    const rows = [...tbody.querySelectorAll('tr')];
    rows.sort((a, b) => {
      const nameA = a.querySelector('td strong')?.textContent?.trim() || '';
      const nameB = b.querySelector('td strong')?.textContent?.trim() || '';
      const aData = customerMap.get(nameA.toLowerCase());
      const bData = customerMap.get(nameB.toLowerCase());
      if (sort.value === 'name') return nameA.localeCompare(nameB);
      const aAge = daysSince(aData?.updatedAt || aData?.createdAt);
      const bAge = daysSince(bData?.updatedAt || bData?.createdAt);
      return sort.value === 'oldest' ? bAge - aAge : aAge - bAge;
    });
    rows.forEach((row) => tbody.appendChild(row));
  }

  function applyStaleFilter() {
    const staleNames = new Set(stale.map((customer) => customer.name.trim().toLowerCase()));
    results.querySelectorAll('tbody tr').forEach((row) => {
      const name = row.querySelector('td strong')?.textContent?.trim().toLowerCase() || '';
      row.hidden = staleOnly && !staleNames.has(name);
    });
    sortRows();
  }

  chips.forEach((chip) => chip.addEventListener('click', () => {
    staleOnly = false;
    statusSelect.value = chip.dataset.crmStatus || '';
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    syncChips();
    setTimeout(sortRows, 0);
  }));
  staleButton?.addEventListener('click', () => {
    statusSelect.value = '';
    searchInput.value = '';
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    staleOnly = true;
    syncChips();
    setTimeout(applyStaleFilter, 0);
  });
  statusSelect.addEventListener('change', () => { if (!staleOnly) syncChips(); setTimeout(() => staleOnly ? applyStaleFilter() : sortRows(), 0); });
  searchInput.addEventListener('input', () => { if (staleOnly) setTimeout(applyStaleFilter, 0); else setTimeout(sortRows, 0); });
  sort.addEventListener('change', () => staleOnly ? applyStaleFilter() : sortRows());
  sortRows();
}

async function enhance() {
  if (!app || !pageTitle) return;
  if (!['Dashboard', 'Customers'].includes(pageTitle.textContent)) return;
  try {
    const data = await workspace();
    if (!data) return;
    if (pageTitle.textContent === 'Dashboard') injectDashboard(data);
    if (pageTitle.textContent === 'Customers') injectCustomerInsights(data);
  } catch (error) {
    console.warn('SoloBizKit CRM/dashboard v2 enhancement skipped:', error);
  }
}

const observer = new MutationObserver(() => { window.requestAnimationFrame(enhance); });
observer.observe(app, { childList: true, subtree: true });
observer.observe(pageTitle, { childList: true, subtree: true, characterData: true });
window.addEventListener('focus', () => { cache = null; enhance(); });
window.addEventListener('solobizkit:workspace-updated', () => { cache = null; enhance(); });
enhance();

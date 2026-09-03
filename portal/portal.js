const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const root = document.querySelector('#portal');
const token = new URLSearchParams(location.search).get('token')?.trim() || '';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0));
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';

async function request(method = 'GET', body) {
  const url = `${SUPABASE_URL}/functions/v1/customer-workspace${method === 'GET' ? `?token=${encodeURIComponent(token)}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'content-type': 'application/json' } : { accept: 'application/json' },
    body: method === 'POST' ? JSON.stringify({ token, ...body }) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Customer portal is unavailable.');
  return data;
}

async function load() {
  if (token.length < 20) return error('Invalid customer link', 'Ask the business for a new secure link.');
  try { render(await request()); }
  catch (err) { error('Portal unavailable', err.message || 'This link may have expired.'); }
}

function render(data) {
  const b = data.business || {};
  const c = data.customer || {};
  const invoices = data.invoices || [];
  const estimates = data.estimates || [];
  const openInvoices = invoices.filter((x) => ['sent', 'overdue'].includes(x.status));
  const amountDue = openInvoices.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const currencies = [...new Set(openInvoices.map((x) => x.currency))];
  const dueLabel = currencies.length === 1 ? money(amountDue, currencies[0]) : `${openInvoices.length} open`;
  const logo = b.logo ? `<img class="logo" src="${esc(b.logo)}" alt="">` : '<div class="mark">SB</div>';
  root.innerHTML = `
    <header><div class="brand">${logo}<div><p class="eyebrow">CUSTOMER PORTAL</p><h1>${esc(b.name || 'Business')}</h1></div></div><div class="muted">Secure document history</div></header>
    <div class="content">
      <div class="welcome"><div><p class="eyebrow">WELCOME</p><h2>${esc(c.name || 'Customer')}</h2><p class="muted">Your estimates, invoices and payment status in one place.</p><div class="summary"><span class="chip">${estimates.length} estimates</span><span class="chip">${invoices.length} invoices</span><span class="chip">Amount due: ${esc(dueLabel)}</span></div></div></div>
      <section class="section"><div class="section-head"><div><p class="eyebrow">ESTIMATES</p><h3>Quotes & approvals</h3></div></div>${estimates.length ? `<div class="list">${estimates.map(estimateRow).join('')}</div>` : '<div class="empty">No estimates shared yet.</div>'}</section>
      <section class="section"><div class="section-head"><div><p class="eyebrow">INVOICES</p><h3>Billing & payments</h3></div></div>${invoices.length ? `<div class="list">${invoices.map(invoiceRow).join('')}</div>` : '<div class="empty">No invoices shared yet.</div>'}</section>
      ${b.email || b.phone ? `<div class="contact"><strong>Questions?</strong><br>${b.email ? `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>` : ''}${b.email && b.phone ? ' · ' : ''}${esc(b.phone || '')}</div>` : ''}
    </div>`;
  root.querySelectorAll('[data-estimate-decision]').forEach((button) => button.addEventListener('click', () => decide(button)));
  document.title = `${c.name || 'Customer'} · ${b.name || 'Customer portal'}`;
}

function estimateRow(e) {
  const canRespond = e.status === 'sent';
  return `<article class="row"><div class="main"><span class="label">Estimate</span><strong>${esc(e.number)}</strong></div><div><span class="label">Issued</span><strong>${date(e.issueDate)}</strong></div><div><span class="status ${esc(e.status)}">${esc(e.status)}</span></div><div><span class="label">Total</span><strong>${money(e.total, e.currency)}</strong></div><div class="actions">${canRespond ? `<button class="btn primary" data-estimate-decision="accepted" data-estimate-id="${esc(e.id)}">Accept</button><button class="btn danger" data-estimate-decision="declined" data-estimate-id="${esc(e.id)}">Decline</button>` : ''}</div></article>`;
}

function invoiceRow(i) {
  const pay = i.paymentUrl && i.status !== 'paid' ? `<a class="btn primary" href="${esc(i.paymentUrl)}" rel="noopener">Pay</a>` : '';
  return `<article class="row"><div class="main"><span class="label">${i.documentType === 'credit_note' ? 'Credit note' : 'Invoice'}</span><strong>${esc(i.number)}</strong></div><div><span class="label">Due</span><strong>${date(i.dueDate)}</strong></div><div><span class="status ${esc(i.status)}">${esc(i.status)}</span></div><div><span class="label">Total</span><strong>${money(i.total, i.currency)}</strong></div><div class="actions">${pay}</div></article>`;
}

async function decide(button) {
  const decision = button.dataset.estimateDecision;
  const estimateId = button.dataset.estimateId;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = decision === 'accepted' ? 'Accepting…' : 'Saving…';
  try {
    await request('POST', { estimateId, decision });
    render(await request());
  } catch (err) {
    button.disabled = false;
    button.textContent = label;
    alert(err.message || 'Could not save your response.');
  }
}

function error(title, message) { root.innerHTML = `<div class="error"><h1>${esc(title)}</h1><p class="muted">${esc(message)}</p></div>`; }
load();

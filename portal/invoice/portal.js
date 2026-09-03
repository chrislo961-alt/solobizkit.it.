const SUPABASE_URL = 'https://eaqddwqprhofpizbpziq.supabase.co';
const root = document.querySelector('#portal');

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0));
const fmtDate = (value) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';

async function loadPortal() {
  const token = new URLSearchParams(location.search).get('token')?.trim();
  if (!token || token.length < 20) return renderError('Invalid invoice link', 'Ask the sender for a new secure customer link.');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-portal?token=${encodeURIComponent(token)}`, { headers: { accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'This invoice link is unavailable.');
    renderInvoice(payload.invoice);
  } catch (error) {
    renderError('Invoice unavailable', error.message || 'This secure link may have expired.');
  }
}

function renderInvoice(invoice) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const logo = invoice.companyLogo ? `<img class="logo" src="${esc(invoice.companyLogo)}" alt="">` : '<div class="mark">SB</div>';
  const pay = invoice.paymentUrl && invoice.status !== 'paid' ? `<a class="btn primary" href="${esc(invoice.paymentUrl)}" rel="noopener">Pay invoice</a>` : '';
  const contact = [invoice.companyEmail ? `<a href="mailto:${esc(invoice.companyEmail)}">${esc(invoice.companyEmail)}</a>` : '', invoice.companyPhone ? esc(invoice.companyPhone) : ''].filter(Boolean).join(' · ');
  root.innerHTML = `
    <header>
      <div class="brand">${logo}<div><p class="eyebrow">INVOICE FROM</p><h1>${esc(invoice.companyName || 'Business')}</h1></div></div>
      <div class="meta"><strong>${esc(invoice.number)}</strong><span class="status ${esc(invoice.status)}">${esc(invoice.status)}</span></div>
    </header>
    <div class="content">
      <div class="hero"><div><p class="eyebrow">BILLED TO</p><h2>${esc(invoice.customerName || 'Customer')}</h2><div class="dates"><span>Issued ${fmtDate(invoice.issueDate)}</span><span>Due ${fmtDate(invoice.dueDate)}</span></div></div><div class="amount"><small>Amount due</small><strong>${money(invoice.status === 'paid' ? 0 : invoice.total, invoice.currency)}</strong></div></div>
      <div class="table-wrap"><table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Tax</th><th class="right">Amount</th></tr></thead><tbody>${items.map((item) => `<tr><td>${esc(item.description)}</td><td class="right">${Number(item.quantity || 0)}</td><td class="right">${money(item.unitPrice, invoice.currency)}</td><td class="right">${Number(item.taxRate || 0)}%</td><td class="right">${money(Number(item.quantity || 0) * Number(item.unitPrice || 0), invoice.currency)}</td></tr>`).join('')}</tbody></table></div>
      <div class="totals"><div><span>Subtotal</span><strong>${money(invoice.subtotal, invoice.currency)}</strong></div><div><span>Tax</span><strong>${money(invoice.taxTotal, invoice.currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(invoice.total, invoice.currency)}</strong></div></div>
      ${invoice.notes ? `<div class="notes"><strong>Notes</strong><br>${esc(invoice.notes)}</div>` : ''}
      <div class="actions">${pay}<button class="btn" type="button" onclick="window.print()">Print / save PDF</button></div>
      ${contact ? `<div class="contact"><strong>Questions?</strong><br>${contact}</div>` : ''}
    </div>`;
  document.title = `${invoice.number} · ${invoice.companyName || 'Invoice'}`;
}

function renderError(title, message) {
  root.innerHTML = `<div class="error"><h1>${esc(title)}</h1><p class="muted">${esc(message)}</p></div>`;
}

loadPortal();

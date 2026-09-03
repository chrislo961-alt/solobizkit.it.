import { getCompanySettings, getSession, supabase } from './backend.js';

let session = null;
let settings = null;

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
const money = (value, currency = 'USD') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0); } catch { return `${currency} ${(Number(value) || 0).toFixed(2)}`; } };
const date = (value) => value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`)) : '—';

async function load(type, id) {
  session ||= await getSession();
  if (!session?.user?.id) throw new Error('Sign in to continue.');
  settings ||= await getCompanySettings(session.user.id);
  const isInvoice = type === 'invoice';
  const table = isInvoice ? 'invoices' : 'estimates';
  const itemTable = isInvoice ? 'invoice_items' : 'estimate_items';
  const { data: doc, error } = await supabase.from(table).select(`*, ${itemTable}(*)`).eq('id', id).eq('user_id', session.user.id).single();
  if (error) throw error;
  let customer = null;
  if (doc.customer_id) {
    const result = await supabase.from('customers').select('*').eq('id', doc.customer_id).eq('user_id', session.user.id).maybeSingle();
    if (result.error) throw result.error;
    customer = result.data;
  }
  return { doc, customer, items: [...(doc[itemTable] || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)) };
}

function business() {
  const rows = [settings?.address, [settings?.postalCode, settings?.city].filter(Boolean).join(' '), settings?.country, settings?.companyEmail, settings?.phone].filter(Boolean);
  return `<strong class="business">${esc(settings?.companyName || 'Your business')}</strong>${rows.map((row) => `<div>${esc(row)}</div>`).join('')}${settings?.taxNumber ? `<div>VAT / Tax ID: ${esc(settings.taxNumber)}</div>` : ''}`;
}

function client(customer) {
  if (!customer) return '<span class="muted">No customer selected</span>';
  const title = customer.company || customer.name || 'Customer';
  const rows = [customer.company && customer.name ? customer.name : null, customer.address, [customer.postal_code, customer.city].filter(Boolean).join(' '), customer.country, customer.email, customer.phone].filter(Boolean);
  return `<strong class="client">${esc(title)}</strong>${rows.map((row) => `<div>${esc(row)}</div>`).join('')}`;
}

function payment(doc) {
  const rows = [
    settings?.bankAccount ? ['Bank account', settings.bankAccount] : null,
    settings?.iban ? ['IBAN', settings.iban] : null,
    settings?.bicSwift ? ['SWIFT / BIC', settings.bicSwift] : null,
    settings?.paymentReference ? ['Reference', settings.paymentReference] : null,
    doc.payment_url ? ['Pay online', doc.payment_url] : null,
  ].filter(Boolean);
  if (!rows.length && !settings?.paymentDetails) return '';
  return `<section class="payment"><h3>Payment details</h3>${rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}${settings?.paymentDetails ? `<p>${esc(settings.paymentDetails).replace(/\n/g, '<br>')}</p>` : ''}</section>`;
}

function css() { return `
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#17211b;font-family:Arial,sans-serif;font-size:12px;line-height:1.45}.page{min-height:297mm;padding:17mm 18mm 15mm;position:relative}.bar{position:absolute;left:0;right:0;top:0;height:5px;background:#183c2b}.top{display:grid;grid-template-columns:1fr auto;gap:30px;margin-bottom:30px}.business{display:block;font-size:20px;margin-bottom:7px}.title{text-align:right}.title h1{margin:0;color:#183c2b;font-size:34px}.number{font-weight:800;font-size:14px}.status{display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;background:#eef4f0;font-size:10px;font-weight:800;text-transform:uppercase}.cards{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-bottom:24px}.card{border:1px solid #dde5df;border-radius:12px;padding:15px;min-height:118px}.label{font-size:9px;font-weight:800;letter-spacing:.12em;color:#728078;margin-bottom:8px}.client{display:block;font-size:15px;margin-bottom:5px}.meta{display:flex;justify-content:space-between;gap:20px;padding:4px 0}.meta span,.muted{color:#6c7971}table{width:100%;border-collapse:collapse}th{background:#f2f6f3;color:#617067;font-size:9px;letter-spacing:.09em;text-transform:uppercase;padding:9px 10px;text-align:left}td{padding:11px 10px;border-bottom:1px solid #e5eae6}.num{text-align:right;white-space:nowrap}.summary{display:grid;grid-template-columns:1fr 260px;gap:26px;margin-top:22px}.notes{padding:14px;background:#f6f8f6;border-radius:10px}.totals{border:1px solid #dce4de;border-radius:12px;overflow:hidden}.totals div{display:flex;justify-content:space-between;padding:8px 12px}.totals .grand{background:#183c2b;color:#fff;font-size:15px;font-weight:800;padding:12px}.payment{margin-top:20px;border-top:1px solid #dce4de;padding-top:15px;max-width:480px}.payment h3{margin:0 0 8px}.payment>div{display:grid;grid-template-columns:110px 1fr;gap:15px;padding:3px 0}.payment span{color:#69776f}.footer{margin-top:34px;padding-top:12px;border-top:1px solid #e4e9e5;display:flex;justify-content:space-between;color:#7b8780;font-size:9px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{min-height:auto}}
`; }

function open(type, doc, customer, items) {
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'Invoice' : 'Estimate';
  const number = isInvoice ? doc.invoice_number : doc.estimate_number;
  const endLabel = isInvoice ? 'Due date' : 'Valid until';
  const endDate = isInvoice ? doc.due_date : doc.valid_until;
  const currency = doc.currency || settings?.defaultCurrency || 'USD';
  const popup = window.open('', '_blank', 'width=1000,height=860');
  if (!popup) throw new Error('Allow pop-ups to print documents.');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(number)}</title><style>${css()}</style></head><body><main class="page"><div class="bar"></div><header class="top"><div>${business()}</div><div class="title"><h1>${title}</h1><div class="number">${esc(number)}</div><span class="status">${esc(doc.status || 'draft')}</span></div></header><section class="cards"><div class="card"><div class="label">${isInvoice ? 'BILL TO' : 'PREPARED FOR'}</div>${client(customer)}</div><div class="card"><div class="label">DOCUMENT DETAILS</div><div class="meta"><span>Issued</span><strong>${esc(date(doc.issue_date))}</strong></div><div class="meta"><span>${endLabel}</span><strong>${esc(date(endDate))}</strong></div><div class="meta"><span>Currency</span><strong>${esc(currency)}</strong></div></div></section><table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Tax</th><th class="num">Amount</th></tr></thead><tbody>${items.map((item) => { const qty = Number(item.quantity || 0); const rate = Number(item.unit_price || 0); const discount = Number(item.discount || 0); const amount = qty * rate * (1 - discount / 100); return `<tr><td><strong>${esc(item.description || 'Service')}</strong></td><td class="num">${qty}</td><td class="num">${money(rate, currency)}</td><td class="num">${Number(item.tax_rate || 0)}%</td><td class="num"><strong>${money(amount, currency)}</strong></td></tr>`; }).join('')}</tbody></table><section class="summary"><div>${doc.notes ? `<div class="notes"><strong>Notes</strong><br>${esc(doc.notes).replace(/\n/g, '<br>')}</div>` : ''}${isInvoice ? payment(doc) : ''}</div><div class="totals"><div><span>Subtotal</span><strong>${money(doc.subtotal, currency)}</strong></div>${Math.abs(Number(doc.discount_total || 0)) > 0.004 ? `<div><span>Discount</span><strong>-${money(doc.discount_total, currency)}</strong></div>` : ''}<div><span>Tax / VAT</span><strong>${money(doc.tax_total, currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(doc.total, currency)}</strong></div></div></section><footer class="footer"><span>${esc(settings?.companyName || 'Your business')}</span><strong>Created with SoloBizKit Pro</strong></footer></main><script>window.onload=()=>setTimeout(()=>window.print(),100)<\/script></body></html>`);
  popup.document.close();
}

async function print(type, id) { const { doc, customer, items } = await load(type, id); open(type, doc, customer, items); }

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const invoiceId = button.dataset.printInvoice;
  const estimateId = button.dataset.printEstimate;
  if (!invoiceId && !estimateId) return;
  event.preventDefault(); event.stopImmediatePropagation();
  try { await print(invoiceId ? 'invoice' : 'estimate', invoiceId || estimateId); }
  catch (error) { console.error(error); alert(error?.message || 'Could not print document.'); }
}, true);

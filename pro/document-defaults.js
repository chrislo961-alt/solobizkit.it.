import { getCompanySettings, getSession, onAuthChange, supabase } from './backend.js';

let settings = null;
let session = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}

function money(value, currency = 'USD') {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0); }
  catch { return `${(Number(value) || 0).toFixed(2)} ${currency}`; }
}

function plusDaysISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function normalizedPrefix(value, fallback) {
  const raw = String(value || fallback).trim().replace(/\s+/g, '');
  return raw.endsWith('-') ? raw : `${raw}-`;
}

function applyPrefix(input, prefix) {
  if (!input) return;
  const suffix = String(input.value || '').match(/(\d+)$/)?.[1];
  if (suffix) input.value = `${normalizedPrefix(prefix, 'INV')}${suffix}`;
}

async function refreshSettings() {
  if (!session?.user?.id) return;
  settings = await getCompanySettings(session.user.id);
  window.__solobizkitInvoicePrefix = normalizedPrefix(settings.invoicePrefix, 'INV');
}

function dispatch(input, eventName = 'input') {
  if (!input) return;
  input.dispatchEvent(new Event(eventName, { bubbles: true }));
}

function applyInvoiceDefaults() {
  if (!settings) return;
  const modalTitle = document.querySelector('#modalTitle');
  if (!modalTitle?.textContent?.toLowerCase().startsWith('new invoice')) return;
  const body = document.querySelector('#modalBody');
  if (!body) return;

  const currency = body.querySelector('[name="currency"]');
  const tax = body.querySelector('[name="taxRate"]');
  const due = body.querySelector('[name="dueDate"]');
  const number = body.querySelector('[name="number"]');

  if (currency) { currency.value = settings.defaultCurrency || 'USD'; dispatch(currency, 'change'); }
  if (tax) { tax.value = Number(settings.defaultTax || 0); dispatch(tax); }
  if (due) due.value = plusDaysISO(settings.paymentTermsDays ?? 14);
  applyPrefix(number, settings.invoicePrefix || 'INV');
}

function applyEstimateDefaults() {
  if (!settings) return;
  const modalTitle = document.querySelector('#modalTitle');
  if (!modalTitle?.textContent?.toLowerCase().startsWith('new estimate')) return;
  const body = document.querySelector('#modalBody');
  if (!body) return;

  const currency = body.querySelector('[name="currency"]');
  const tax = body.querySelector('[name="taxRate"]');
  const number = body.querySelector('[name="number"]');

  if (currency) { currency.value = settings.defaultCurrency || 'USD'; dispatch(currency, 'change'); }
  if (tax) { tax.value = Number(settings.defaultTax || 0); dispatch(tax); }
  applyPrefix(number, settings.estimatePrefix || 'EST-');
}

function sellerBlock() {
  if (!settings) return '<strong>SoloBizKit Pro</strong>';
  const address = [settings.address, [settings.postalCode, settings.city].filter(Boolean).join(' '), settings.country].filter(Boolean);
  const contact = [settings.companyEmail, settings.phone].filter(Boolean);
  return `<strong class="seller-name">${esc(settings.companyName || 'Your business')}</strong>${address.length ? `<div>${address.map(esc).join('<br>')}</div>` : ''}${contact.length ? `<div class="muted">${contact.map(esc).join(' · ')}</div>` : ''}${settings.taxNumber ? `<div class="muted">VAT / Tax ID: ${esc(settings.taxNumber)}</div>` : ''}`;
}

function paymentBlock() {
  if (!settings) return '';
  const rows = [];
  if (settings.bankAccount) rows.push(['Bank account', settings.bankAccount]);
  if (settings.iban) rows.push(['IBAN', settings.iban]);
  if (settings.bicSwift) rows.push(['SWIFT / BIC', settings.bicSwift]);
  if (settings.paymentReference) rows.push(['Reference', settings.paymentReference]);
  const details = settings.paymentDetails ? `<p class="payment-note">${esc(settings.paymentDetails).replace(/\n/g, '<br>')}</p>` : '';
  if (!rows.length && !details) return '';
  return `<section class="payment"><h3>Payment details</h3>${rows.map(([label, value]) => `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}${details}</section>`;
}

function documentStyles() {
  return `
    @page{size:A4;margin:18mm}
    *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#111;margin:0;line-height:1.45}.muted{color:#666}
    header{display:flex;justify-content:space-between;gap:40px;margin-bottom:44px}.seller-name{font-size:21px;display:block;margin-bottom:8px}
    .doc-meta{text-align:right}.doc-meta h1{font-size:36px;margin:0 0 8px}.doc-meta p{margin:3px 0}
    .party-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}.party{padding:18px;border:1px solid #ddd;border-radius:10px}.party h3{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666;margin:0 0 10px}
    table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:11px 8px;border-bottom:1px solid #ddd;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666}.right{text-align:right}
    .totals{width:330px;margin:24px 0 0 auto}.totals div{display:flex;justify-content:space-between;padding:7px 0}.totals .grand{font-size:19px;font-weight:bold;border-top:2px solid #111;margin-top:5px;padding-top:10px}
    .payment{margin-top:42px;padding-top:20px;border-top:1px solid #ddd;max-width:520px}.payment h3{margin:0 0 10px}.payment>div{display:flex;gap:24px;padding:3px 0}.payment>div span{width:110px;color:#666}.payment-note{margin:12px 0 0}
    .notes{margin-top:28px;padding:16px;background:#f5f5f5;border-radius:8px}.footer{margin-top:48px;color:#888;font-size:11px}
  `;
}

async function fetchInvoice(id) {
  const { data, error } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).single();
  if (error) throw error;
  let customer = null;
  if (data.customer_id) {
    const result = await supabase.from('customers').select('*').eq('id', data.customer_id).maybeSingle();
    if (result.error) throw result.error;
    customer = result.data;
  }
  return { document: data, customer };
}

async function fetchEstimate(id) {
  const { data, error } = await supabase.from('estimates').select('*, estimate_items(*)').eq('id', id).single();
  if (error) throw error;
  let customer = null;
  if (data.customer_id) {
    const result = await supabase.from('customers').select('*').eq('id', data.customer_id).maybeSingle();
    if (result.error) throw result.error;
    customer = result.data;
  }
  return { document: data, customer };
}

function customerBlock(customer) {
  if (!customer) return 'No customer selected';
  const lines = [customer.name, customer.company, customer.email, customer.phone, customer.address, [customer.postal_code, customer.city].filter(Boolean).join(' ')].filter(Boolean);
  return lines.map(esc).join('<br>');
}

function openPrintWindow(type, document, customer, items) {
  const currency = document.currency || settings?.defaultCurrency || 'USD';
  const subtotal = Number(document.subtotal || 0);
  const tax = Number(document.tax_total || 0);
  const total = Number(document.total || 0);
  const isInvoice = type === 'Invoice';
  const dateLabel = isInvoice ? `Due ${esc(document.due_date || '—')}` : `Valid until ${esc(document.valid_until || '—')}`;
  const number = isInvoice ? document.invoice_number : document.estimate_number;
  const popup = window.open('', '_blank', 'width=960,height=820');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(number)}</title><style>${documentStyles()}</style></head><body>
    <header><div>${sellerBlock()}</div><div class="doc-meta"><h1>${esc(type)}</h1><strong>${esc(number)}</strong><p>Issued ${esc(document.issue_date || '')}</p><p>${dateLabel}</p></div></header>
    <div class="party-grid"><section class="party"><h3>From</h3>${sellerBlock()}</section><section class="party"><h3>${isInvoice ? 'Bill to' : 'Prepared for'}</h3>${customerBlock(customer)}</section></div>
    <table><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${items.sort((a,b)=>(a.position||0)-(b.position||0)).map((item) => `<tr><td>${esc(item.description)}</td><td class="right">${Number(item.quantity)}</td><td class="right">${money(item.unit_price, currency)}</td><td class="right">${money(Number(item.quantity) * Number(item.unit_price), currency)}</td></tr>`).join('')}</tbody></table>
    <div class="totals"><div><span>Subtotal</span><strong>${money(subtotal, currency)}</strong></div><div><span>Tax / VAT</span><strong>${money(tax, currency)}</strong></div><div class="grand"><span>Total</span><strong>${money(total, currency)}</strong></div></div>
    ${document.notes ? `<section class="notes"><strong>Notes</strong><div>${esc(document.notes).replace(/\n/g, '<br>')}</div></section>` : ''}
    ${isInvoice ? paymentBlock() : ''}
    <div class="footer">Created with SoloBizKit Pro</div><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

async function printInvoice(id) {
  const { document, customer } = await fetchInvoice(id);
  openPrintWindow('Invoice', document, customer, document.invoice_items || []);
}

async function printEstimate(id) {
  const { document, customer } = await fetchEstimate(id);
  openPrintWindow('Estimate', document, customer, document.estimate_items || []);
}

function addEstimatePrintButtons(root = document) {
  root.querySelectorAll('.estimate-actions').forEach((actions) => {
    if (actions.querySelector('[data-print-estimate]')) return;
    const edit = actions.querySelector('[data-edit]');
    if (!edit?.dataset.edit) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.printEstimate = edit.dataset.edit;
    button.textContent = 'Print';
    actions.insertBefore(button, actions.firstChild?.nextSibling || null);
  });
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  const isNewInvoice = target.id === 'newInvoiceTop' || target.id === 'newInvoice' || target.hasAttribute('data-invoice-customer');
  const isNewEstimate = target.id === 'newEstimate' || target.id === 'newEstimateInner';
  if (isNewInvoice) setTimeout(applyInvoiceDefaults, 0);
  if (isNewEstimate) setTimeout(applyEstimateDefaults, 0);

  if (target.hasAttribute('data-print-invoice')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try { await printInvoice(target.dataset.printInvoice); }
    catch (error) { console.error(error); alert(error?.message || 'Could not print invoice.'); }
  }

  if (target.hasAttribute('data-print-estimate')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    try { await printEstimate(target.dataset.printEstimate); }
    catch (error) { console.error(error); alert(error?.message || 'Could not print estimate.'); }
  }
}, true);

const observer = new MutationObserver(() => addEstimatePrintButtons());
observer.observe(document.body, { childList: true, subtree: true });
addEstimatePrintButtons();

onAuthChange(async (_event, nextSession) => {
  session = nextSession;
  if (session) {
    try { await refreshSettings(); } catch (error) { console.error('Could not load document defaults', error); }
  } else {
    settings = null;
    window.__solobizkitInvoicePrefix = null;
  }
});

(async () => {
  try {
    session = await getSession();
    if (session) await refreshSettings();
  } catch (error) { console.error('Could not initialize document defaults', error); }
})();

import { getCompanySettings, getSession, onAuthChange } from './backend.js';

let settings = null;
let session = null;

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

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  const isNewInvoice = target.id === 'newInvoiceTop' || target.id === 'newInvoice' || target.hasAttribute('data-invoice-customer');
  const isNewEstimate = target.id === 'newEstimate' || target.id === 'newEstimateInner';
  if (isNewInvoice) setTimeout(applyInvoiceDefaults, 0);
  if (isNewEstimate) setTimeout(applyEstimateDefaults, 0);
}, true);

onAuthChange(async (_event, nextSession) => {
  session = nextSession;
  if (session) {
    try { await refreshSettings(); } catch (error) { console.error('Could not load document defaults', error); }
  } else {
    settings = null;
    window.__solobizkitInvoicePrefix = null;
  }
});
window.addEventListener('solobizkit:workspace-updated', async () => { try { await refreshSettings(); } catch {} });

(async () => {
  try {
    session = await getSession();
    if (session) await refreshSettings();
  } catch (error) { console.error('Could not initialize document defaults', error); }
})();

import { getDataOwnerId, getSession, supabase } from './backend.js';

const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('invoice_id') || params.get('invoiceId') || params.get('invoice') || '';
const state = (params.get('invoice_payment') || params.get('payment') || params.get('checkout') || params.get('status') || '').toLowerCase();
const looksLikePaymentReturn = Boolean(invoiceId && ['success','paid','complete','completed','cancelled','canceled'].includes(state));

function cleanReturnParams() {
  const url = new URL(window.location.href);
  ['invoice_id','invoiceId','invoice','invoice_payment','payment','status'].forEach((key) => url.searchParams.delete(key));
  if (url.searchParams.get('checkout') && ['success','cancelled','canceled'].includes(url.searchParams.get('checkout').toLowerCase())) url.searchParams.delete('checkout');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function notice(message, tone = 'info') {
  let el = document.querySelector('#invoicePaymentReturnNotice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'invoicePaymentReturnNotice';
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;max-width:420px;padding:13px 15px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.14);font:600 13px/1.45 Inter,Arial,sans-serif;background:#fff;border:1px solid #dfe5ec;color:#18202a';
    document.body.appendChild(el);
  }
  if (tone === 'success') el.style.background = '#ecfdf3';
  else if (tone === 'warn') el.style.background = '#fff8e7';
  else el.style.background = '#fff';
  el.textContent = message;
}

async function fetchStatus(ownerId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id,invoice_number,status,paid_date')
    .eq('id', invoiceId)
    .eq('user_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function waitForWebhook(ownerId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const invoice = await fetchStatus(ownerId);
    if (!invoice) throw new Error('Invoice not found.');
    if (String(invoice.status || '').toLowerCase() === 'paid') return invoice;
    if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

(async () => {
  if (!looksLikePaymentReturn) return;

  if (['cancelled','canceled'].includes(state)) {
    notice('Payment was cancelled. The invoice is unchanged.', 'warn');
    cleanReturnParams();
    setTimeout(() => document.querySelector('#invoicePaymentReturnNotice')?.remove(), 4500);
    return;
  }

  try {
    const session = await getSession();
    if (!session?.user?.id) return;
    const ownerId = await getDataOwnerId();
    if (!ownerId) throw new Error('Workspace not found.');

    notice('Payment completed. Syncing invoice status…');
    const paidInvoice = await waitForWebhook(ownerId);

    if (paidInvoice) {
      notice(`Invoice ${paidInvoice.invoice_number || ''} is marked paid.`, 'success');
      cleanReturnParams();
      setTimeout(() => window.location.reload(), 900);
      return;
    }

    notice('Payment completed. Stripe is still syncing the invoice status; refresh shortly.', 'warn');
    cleanReturnParams();
  } catch (error) {
    console.error('Invoice payment return sync failed', error);
    notice('Payment return received, but invoice status could not be refreshed yet.', 'warn');
  }
})();

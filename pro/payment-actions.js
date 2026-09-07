import { getDataOwnerId, getSession, getWorkspaceContext, supabase } from './backend.js';

let session = null;
let workspace = null;
let dataOwner = null;

async function ensureContext() {
  if (!session) session = await getSession();
  if (!session?.user?.id) throw new Error('Sign in first.');
  workspace = await getWorkspaceContext();
  dataOwner = await getDataOwnerId();
  if (!dataOwner) throw new Error('Workspace not found.');
}

async function getInvoice(id) {
  await ensureContext();
  const { data, error } = await supabase.from('invoices').select('id,invoice_number,status,payment_url,total,currency').eq('id', id).eq('user_id', dataOwner).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Invoice not found.');
  return data;
}

export async function ensurePaymentLink(id) {
  await ensureContext();
  if (!workspace?.canWrite) throw new Error('Editor access is required to create payment links.');
  const invoice = await getInvoice(id);
  if (['paid', 'void'].includes(String(invoice.status).toLowerCase())) throw new Error(`Invoice is already ${invoice.status}.`);
  const { data, error } = await supabase.functions.invoke('create-solobizkit-invoice-checkout', { body: { invoiceId: id } });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || 'Could not create payment link.');
  return data.url;
}

async function copyPaymentLink(id, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Creating…';
  try {
    const url = await ensurePaymentLink(id);
    await navigator.clipboard.writeText(url);
    button.textContent = 'Stripe link copied';
    window.sbkToast?.('Optional Stripe payment link copied.', 'success');
    window.sbkTrack?.('pro_invoice_payment_link_copied');
    setTimeout(() => { button.textContent = 'Stripe pay link'; button.disabled = false; }, 1400);
  } catch (error) {
    console.error(error);
    window.sbkToast?.(error?.message || 'Could not create Stripe payment link.', 'error');
    button.textContent = original;
    button.disabled = false;
  }
}

async function injectButtons(root = document) {
  try { await ensureContext(); } catch { return; }
  if (!workspace?.canWrite) return;
  root.querySelectorAll('[data-edit-invoice]').forEach((edit) => {
    const id = edit.dataset.editInvoice;
    const row = edit.closest('tr');
    const cell = edit.parentElement;
    if (!id || !row || !cell || cell.querySelector(`[data-pay-link="${id}"]`)) return;
    const status = row.querySelector('.status')?.textContent?.trim().toLowerCase() || '';
    if (['paid', 'void'].includes(status)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.payLink = id;
    button.textContent = 'Stripe pay link';
    button.title = 'Optional: create a Stripe card-payment link for this invoice';
    cell.appendChild(document.createTextNode(' '));
    cell.appendChild(button);
  });
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-pay-link]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  copyPaymentLink(button.dataset.payLink, button);
}, true);

const observer = new MutationObserver(() => injectButtons());
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('solobizkit:workspace-updated', () => { workspace = null; dataOwner = null; injectButtons(); });
injectButtons();

window.SoloBizKitPayments = { ensurePaymentLink };

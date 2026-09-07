import { getSession, supabase } from './backend.js';

let session = null;

function base64Bytes(content) {
  const binary = atob(String(content || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function ensureSession() {
  session ||= await getSession();
  if (!session?.user?.id) throw new Error('Sign in to continue.');
  return session;
}

async function openPdfFromFunction(kind, id, popup) {
  await ensureSession();
  const request = kind === 'invoice'
    ? supabase.functions.invoke('send-invoice-message', { body: { invoiceId: id, kind: 'invoice', action: 'download', product: 'solobizkit' } })
    : supabase.functions.invoke('send-estimate-email', { body: { estimateId: id, action: 'download', product: 'solobizkit' } });
  const { data, error } = await request;
  if (error) throw error;
  if (!data?.content) throw new Error(data?.error || `${kind === 'invoice' ? 'Invoice' : 'Estimate'} PDF could not be generated.`);
  const blob = new Blob([base64Bytes(data.content)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  popup.location.replace(url);
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function injectEstimatePdfButtons(root = document) {
  if (!location.pathname.startsWith('/pro/estimates')) return;
  root.querySelectorAll('.estimate-actions[data-estimate-id]').forEach((host) => {
    const id = host.dataset.estimateId;
    if (!id || host.querySelector(`[data-print-estimate="${CSS.escape(id)}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.printEstimate = id;
    button.textContent = 'PDF';
    button.title = 'Open the exact PDF used when this estimate is emailed';
    host.prepend(button, document.createTextNode(' '));
  });
}

function labelInvoiceButtons(root = document) {
  root.querySelectorAll('[data-print-invoice]').forEach((button) => {
    button.textContent = 'PDF';
    button.title = 'Open the exact PDF used when this invoice is emailed';
  });
}

async function openCanonical(kind, id) {
  const popup = window.open('', '_blank', 'width=1000,height=860');
  if (!popup) throw new Error(`Allow pop-ups to open ${kind} PDFs.`);
  popup.document.write(`<!doctype html><title>Preparing ${kind} PDF…</title><body style="font:14px Arial,sans-serif;padding:32px">Preparing the exact ${kind} PDF…</body>`);
  popup.document.close();
  try { await openPdfFromFunction(kind, id, popup); }
  catch (error) { popup.close(); throw error; }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const invoiceId = button.dataset.printInvoice;
  const estimateId = button.dataset.printEstimate;
  if (!invoiceId && !estimateId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try { await openCanonical(invoiceId ? 'invoice' : 'estimate', invoiceId || estimateId); }
  catch (error) { console.error(error); alert(error?.message || 'Could not open document.'); }
}, true);

let scheduled = false;
function enhance() {
  labelInvoiceButtons();
  injectEstimatePdfButtons();
}
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; enhance(); });
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('solobizkit:workspace-updated', () => { session = null; enhance(); });
enhance();

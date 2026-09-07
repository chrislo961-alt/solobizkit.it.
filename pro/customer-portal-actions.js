import { getWorkspaceContext, supabase } from './backend.js';

let workspace = null;
async function canWrite() {
  workspace = workspace || await getWorkspaceContext();
  return Boolean(workspace?.canWrite);
}

const observer = new MutationObserver(() => enhanceInvoiceActions());
observer.observe(document.body, { childList: true, subtree: true });
enhanceInvoiceActions();

async function enhanceInvoiceActions() {
  if (!(await canWrite().catch(() => false))) return;
  document.querySelectorAll('[data-edit-invoice]').forEach((editButton) => {
    const invoiceId = editButton.dataset.editInvoice;
    if (!invoiceId || editButton.parentElement?.querySelector(`[data-portal-invoice="${invoiceId}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.portalInvoice = invoiceId;
    button.textContent = 'Customer link';
    button.addEventListener('click', () => copyPortalLink(button, invoiceId));
    editButton.parentElement?.append(' ', button);
  });
}

async function copyPortalLink(button, invoiceId) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Creating…';
  try {
    if (!(await canWrite())) throw new Error('Editor access is required to create customer links.');
    const { data, error } = await supabase.functions.invoke('create-customer-portal-link', { body: { invoiceId } });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error || 'Could not create customer link.');
    await navigator.clipboard.writeText(data.url);
    button.textContent = 'Copied ✓';
    window.setTimeout(() => { button.textContent = original; button.disabled = false; }, 1800);
  } catch (error) {
    console.error(error);
    button.textContent = 'Try again';
    button.disabled = false;
    window.alert(error?.message || 'Could not create the customer link.');
  }
}

window.addEventListener('solobizkit:workspace-updated', () => { workspace = null; enhanceInvoiceActions(); });

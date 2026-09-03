import { supabase } from './backend.js';

const observer = new MutationObserver(() => enhanceCustomerActions());
observer.observe(document.body, { childList: true, subtree: true });
enhanceCustomerActions();

function enhanceCustomerActions() {
  document.querySelectorAll('[data-edit-customer]').forEach((editButton) => {
    const customerId = editButton.dataset.editCustomer;
    const cell = editButton.parentElement;
    if (!customerId || !cell || cell.querySelector(`[data-workspace-customer="${customerId}"]`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.workspaceCustomer = customerId;
    button.textContent = 'Portal link';
    button.addEventListener('click', () => copyCustomerPortal(button, customerId));
    cell.append(' ', button);
  });
}

async function copyCustomerPortal(button, customerId) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Creating…';
  try {
    const { data, error } = await supabase.functions.invoke('create-customer-workspace-link', {
      body: { customerId },
    });
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error || 'Could not create customer portal link.');

    await navigator.clipboard.writeText(data.url);
    button.textContent = 'Copied ✓';
    window.setTimeout(() => {
      button.textContent = original;
      button.disabled = false;
    }, 1800);
  } catch (error) {
    console.error(error);
    button.textContent = 'Try again';
    button.disabled = false;
    window.alert(error?.message || 'Could not create the customer portal link.');
  }
}

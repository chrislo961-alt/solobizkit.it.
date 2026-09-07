const params = new URLSearchParams(window.location.search);
const requestedInvoice = params.get('invoice');
const requestedCustomer = params.get('customer');
const explicitView = params.get('view');
const validViews = new Set(['dashboard', 'customers', 'invoices']);
const requestedView = requestedInvoice
  ? 'invoices'
  : validViews.has(explicitView)
    ? explicitView
    : requestedCustomer
      ? 'customers'
      : explicitView;
const wantsNew = params.get('new') === '1';
const wantsEdit = params.get('edit') === '1';
let appliedView = false;
let appliedCustomer = false;
let appliedInvoice = false;
let appliedNewInvoice = false;

const style = document.createElement('style');
style.textContent = '.sbk-deeplink-target{outline:2px solid rgba(36,87,245,.45);outline-offset:-2px;background:#f7faff!important;transition:outline .2s ease,background .2s ease}';
document.head.appendChild(style);

function markTarget(row) {
  if (!row) return;
  document.querySelectorAll('.sbk-deeplink-target').forEach((node) => node.classList.remove('sbk-deeplink-target'));
  row.classList.add('sbk-deeplink-target');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(() => row.classList.remove('sbk-deeplink-target'), 5000);
}

function syncView() {
  if (appliedView || !validViews.has(requestedView)) return;
  const button = document.querySelector(`.nav-item[data-view="${requestedView}"]`);
  if (!button || button.disabled) return;
  button.click();
  appliedView = true;
}

function syncCustomer() {
  if (appliedCustomer || !requestedCustomer || !appliedView || requestedView !== 'customers') return;
  const panel = document.querySelector('#crmCustomerPanel');
  const row = document.querySelector(`#customerResults tr[data-customer-id="${CSS.escape(requestedCustomer)}"]`)
    || document.querySelector(`[data-customer-actions][data-customer-id="${CSS.escape(requestedCustomer)}"]`)?.closest('tr');
  if (!panel || !row) return;
  row.click();
  markTarget(row);
  appliedCustomer = true;
}

function syncInvoice() {
  if (appliedInvoice || !requestedInvoice || !appliedView || requestedView !== 'invoices') return;
  const edit = document.querySelector(`[data-edit-invoice="${CSS.escape(requestedInvoice)}"]`);
  const pdf = document.querySelector(`[data-print-invoice="${CSS.escape(requestedInvoice)}"]`);
  const row = (edit || pdf)?.closest('tr');
  if (!row) return;
  if (wantsEdit && edit && !edit.disabled) edit.click();
  else markTarget(row);
  appliedInvoice = true;
}

function syncNewInvoice() {
  if (appliedNewInvoice || !wantsNew || requestedView !== 'invoices' || !appliedView) return;
  const button = document.querySelector('#newInvoice');
  if (!button || button.hidden || button.disabled) return;
  button.click();
  const select = document.querySelector('#modal[open] [name="customerId"]');
  if (requestedCustomer && select?.querySelector(`option[value="${CSS.escape(requestedCustomer)}"]`)) {
    select.value = requestedCustomer;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  appliedNewInvoice = true;
}

function sync() {
  syncView();
  syncNewInvoice();
  syncCustomer();
  syncInvoice();
}

new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled', 'hidden', 'open', 'data-customer-id', 'data-customer-actions'],
});
sync();

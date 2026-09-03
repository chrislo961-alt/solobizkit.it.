const params = new URLSearchParams(window.location.search);
const requestedInvoice = params.get('invoice');
const requestedView = requestedInvoice ? 'invoices' : params.get('view');
const validViews = new Set(['dashboard', 'customers', 'invoices']);
let appliedView = false;
let appliedInvoice = false;

function syncView() {
  if (appliedView || !validViews.has(requestedView)) return;
  const button = document.querySelector(`.nav-item[data-view="${requestedView}"]`);
  if (!button || button.disabled) return;
  button.click();
  appliedView = true;
}

function syncInvoice() {
  if (appliedInvoice || !requestedInvoice || !appliedView) return;
  const button = document.querySelector(`[data-edit-invoice="${CSS.escape(requestedInvoice)}"]`);
  if (!button) return;
  button.click();
  appliedInvoice = true;
}

function sync() {
  syncView();
  syncInvoice();
}

new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
sync();

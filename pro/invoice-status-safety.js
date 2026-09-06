(function(){
  'use strict';

  function normalize(value='') {
    return String(value).trim().toLowerCase();
  }

  function enforce(root=document) {
    root.querySelectorAll('tr').forEach((row) => {
      const status = normalize(row.querySelector('.status')?.textContent || '');
      const paid = row.querySelector('[data-paid-invoice]');
      if (!paid) return;

      if (!['sent','overdue'].includes(status)) {
        paid.remove();
        return;
      }

      paid.textContent = 'Mark paid';
      paid.title = 'Mark this issued invoice as paid manually';
    });
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-paid-invoice]');
    if (!button) return;
    const row = button.closest('tr');
    const status = normalize(row?.querySelector('.status')?.textContent || '');
    if (!['sent','overdue'].includes(status)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.sbkToast?.('Only sent or overdue invoices can be marked paid.', 'error');
    }
  }, true);

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enforce();
    });
  });

  observer.observe(document.body, { childList:true, subtree:true });
  enforce();
})();

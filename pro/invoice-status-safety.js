(function(){
  'use strict';

  const TERMINAL = new Set(['paid','void']);

  function normalize(value='') {
    return String(value).trim().toLowerCase();
  }

  function rowStatus(row) {
    return normalize(row?.querySelector('.status')?.textContent || '');
  }

  function enforce(root=document) {
    root.querySelectorAll('tr').forEach((row) => {
      const status = rowStatus(row);
      const paid = row.querySelector('[data-paid-invoice]');
      const edit = row.querySelector('[data-edit-invoice]');

      if (paid) {
        if (!['sent','overdue'].includes(status)) paid.remove();
        else {
          paid.textContent = 'Mark paid';
          paid.title = 'Mark this issued invoice as paid manually';
        }
      }

      if (edit && TERMINAL.has(status)) {
        edit.disabled = true;
        edit.setAttribute('aria-disabled','true');
        edit.textContent = 'Locked';
        edit.title = status === 'paid'
          ? 'Paid invoices are locked to preserve the paid record.'
          : 'Void invoices are locked to preserve the audit trail.';
        row.setAttribute('data-terminal-invoice', status);
      }
    });
  }

  document.addEventListener('click', (event) => {
    const paid = event.target.closest('[data-paid-invoice]');
    if (paid) {
      const status = rowStatus(paid.closest('tr'));
      if (!['sent','overdue'].includes(status)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.sbkToast?.('Only sent or overdue invoices can be marked paid.', 'error');
      }
      return;
    }

    const edit = event.target.closest('[data-edit-invoice]');
    if (!edit) return;
    const status = rowStatus(edit.closest('tr'));
    if (!TERMINAL.has(status)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.sbkToast?.(
      status === 'paid'
        ? 'Paid invoices are locked and cannot be edited.'
        : 'Void invoices are locked and cannot be edited.',
      'info'
    );
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

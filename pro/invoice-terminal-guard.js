(function(){
  'use strict';

  const TERMINAL = new Set(['paid','void']);

  function rowStatus(row){
    return String(row?.querySelector('.status')?.textContent || '').trim().toLowerCase();
  }

  function protectRows(root=document){
    root.querySelectorAll('[data-edit-invoice]').forEach((button)=>{
      const row = button.closest('tr');
      const status = rowStatus(row);
      if (!TERMINAL.has(status)) return;
      button.disabled = true;
      button.setAttribute('aria-disabled','true');
      button.title = status === 'paid'
        ? 'Paid invoices are locked to preserve the paid record.'
        : 'Void invoices are locked to preserve the audit trail.';
      button.textContent = 'Locked';
      row?.setAttribute('data-terminal-invoice', status);
    });

    root.querySelectorAll('[data-paid-invoice]').forEach((button)=>{
      const row = button.closest('tr');
      if (TERMINAL.has(rowStatus(row))) button.remove();
    });
  }

  document.addEventListener('click',(event)=>{
    const edit = event.target.closest?.('[data-edit-invoice]');
    if (!edit) return;
    const status = rowStatus(edit.closest('tr'));
    if (!TERMINAL.has(status)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message = status === 'paid'
      ? 'Paid invoices are locked and cannot be edited.'
      : 'Void invoices are locked and cannot be edited.';
    window.sbkToast?.(message,'info');
  },true);

  const observer = new MutationObserver(()=>protectRows());
  observer.observe(document.body,{childList:true,subtree:true});
  protectRows();
})();

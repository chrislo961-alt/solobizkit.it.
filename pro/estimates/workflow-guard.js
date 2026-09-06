(function(){
  'use strict';

  function normalizeStatus(row){
    return row?.querySelector('.estimate-status')?.textContent?.trim().toLowerCase() || '';
  }

  function apply(root=document){
    root.querySelectorAll('[data-convert]').forEach((button)=>{
      const row=button.closest('tr');
      const status=normalizeStatus(row);
      if(status==='accepted'){
        button.disabled=false;
        button.title='Convert this accepted estimate to an invoice';
        button.removeAttribute('aria-disabled');
      }else{
        button.disabled=true;
        button.setAttribute('aria-disabled','true');
        button.title=status==='declined'
          ? 'Declined estimates cannot be converted to invoices'
          : 'The customer must accept this estimate before it can be converted to an invoice';
      }
    });

    root.querySelectorAll('[data-edit]').forEach((button)=>{
      const row=button.closest('tr');
      const status=normalizeStatus(row);
      if(['accepted','converted'].includes(status)){
        button.disabled=true;
        button.title=status==='accepted'
          ? 'Accepted estimates are locked to preserve the customer-approved version'
          : 'Converted estimates are locked';
      }
    });
  }

  document.addEventListener('click',(event)=>{
    const button=event.target.closest('[data-convert]');
    if(!button) return;
    const status=normalizeStatus(button.closest('tr'));
    if(status==='accepted') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const message=status==='declined'
      ? 'This estimate was declined and cannot be converted.'
      : 'The customer must accept this estimate before you convert it to an invoice.';
    window.sbkToast?.(message,'error');
  },true);

  const observer=new MutationObserver(()=>apply());
  observer.observe(document.body,{childList:true,subtree:true});
  apply();
})();

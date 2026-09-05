(function(){
  'use strict';
  const invoicePaths=['/invoice-generator/','/no/fakturagenerator/','/sv/fakturagenerator/','/de/rechnungsgenerator/','/es/generador-facturas/','/fr/generateur-factures/'];
  if(!invoicePaths.includes(location.pathname))return;

  const lang=(()=>{
    const m=location.pathname.match(/^\/(no|sv|de|es|fr)\//);if(m)return m[1];
    try{const v=localStorage.getItem('sbk_language');return ['no','sv','de','es','fr'].includes(v)?v:'en'}catch(_){return'en'}
  })();
  const copy={
    en:{section:'Payment details',account:'Bank account',kid:'Payment reference / KID',iban:'IBAN (optional)',bic:'BIC / SWIFT (optional)',accountPh:'Account number',kidPh:'Reference or KID',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Payment details'},
    no:{section:'Betalingsinformasjon',account:'Kontonummer',kid:'KID / betalingsreferanse',iban:'IBAN (valgfritt)',bic:'BIC / SWIFT (valgfritt)',accountPh:'Kontonummer',kidPh:'KID eller betalingsreferanse',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Betalingsinformasjon'},
    sv:{section:'Betalningsuppgifter',account:'Kontonummer',kid:'Betalningsreferens / KID',iban:'IBAN (valfritt)',bic:'BIC / SWIFT (valfritt)',accountPh:'Kontonummer',kidPh:'Referens eller KID',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Betalningsuppgifter'},
    de:{section:'Zahlungsdaten',account:'Bankkonto',kid:'Zahlungsreferenz / KID',iban:'IBAN (optional)',bic:'BIC / SWIFT (optional)',accountPh:'Kontonummer',kidPh:'Referenz oder KID',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Zahlungsdaten'},
    es:{section:'Datos de pago',account:'Cuenta bancaria',kid:'Referencia de pago / KID',iban:'IBAN (opcional)',bic:'BIC / SWIFT (opcional)',accountPh:'Número de cuenta',kidPh:'Referencia o KID',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Datos de pago'},
    fr:{section:'Coordonnées de paiement',account:'Compte bancaire',kid:'Référence de paiement / KID',iban:'IBAN (facultatif)',bic:'BIC / SWIFT (facultatif)',accountPh:'Numéro de compte',kidPh:'Référence ou KID',ibanPh:'IBAN',bicPh:'BIC / SWIFT',preview:'Coordonnées de paiement'}
  }[lang]||null;
  if(!copy)return;

  const KEY='sbk_invoice_payment_v1';
  const $=id=>document.getElementById(id);
  let saveTimer;
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(_){return{}}}
  function save(){
    const data={account:$('payAccount')?.value||'',kid:$('payKid')?.value||'',iban:$('payIban')?.value||'',bic:$('payBic')?.value||''};
    try{localStorage.setItem(KEY,JSON.stringify(data))}catch(_){ }
  }
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,180)}
  function createField(id,label,placeholder){return `<div class="field"><label for="${id}">${label}</label><input id="${id}" autocomplete="off" placeholder="${placeholder}"></div>`}
  function ensureEditor(){
    if($('payAccount'))return;
    const sections=[...document.querySelectorAll('.editor .section')];
    const totals=sections.find(s=>s.querySelector('#tax,#discount,#notes'));
    if(!totals)return;
    const section=document.createElement('div');
    section.className='section';
    section.id='paymentDetailsSection';
    section.innerHTML=`<h2>${copy.section}</h2><div class="row">${createField('payAccount',copy.account,copy.accountPh)}${createField('payKid',copy.kid,copy.kidPh)}</div><div class="row">${createField('payIban',copy.iban,copy.ibanPh)}${createField('payBic',copy.bic,copy.bicPh)}</div>`;
    totals.parentNode.insertBefore(section,totals);
    const data=load();
    $('payAccount').value=data.account||'';$('payKid').value=data.kid||'';$('payIban').value=data.iban||'';$('payBic').value=data.bic||'';
    section.querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>{renderPreview();scheduleSave()}));
  }
  function ensurePreview(){
    if($('pPayment'))return;
    const notes=document.querySelector('.invoice .notes');
    if(!notes)return;
    const block=document.createElement('div');
    block.className='notes';
    block.id='pPayment';
    block.hidden=true;
    block.innerHTML=`<strong>${copy.preview}</strong><div class="muted" id="pPaymentText"></div>`;
    notes.parentNode.insertBefore(block,notes);
  }
  function renderPreview(){
    ensurePreview();
    const block=$('pPayment'),text=$('pPaymentText');if(!block||!text)return;
    const rows=[];
    const account=$('payAccount')?.value.trim();const kid=$('payKid')?.value.trim();const iban=$('payIban')?.value.trim();const bic=$('payBic')?.value.trim();
    if(account)rows.push(`${copy.account}: ${account}`);
    if(kid)rows.push(`${copy.kid}: ${kid}`);
    if(iban)rows.push(`IBAN: ${iban}`);
    if(bic)rows.push(`BIC / SWIFT: ${bic}`);
    text.textContent=rows.join('\n');
    block.hidden=!rows.length;
  }
  function boot(){ensureEditor();ensurePreview();renderPreview()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
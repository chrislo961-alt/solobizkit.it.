(() => {
  if (location.pathname !== '/invoice-generator/') return;

  const KEY = 'solobizkit:free-invoice-options-v2';
  const labels = {
    en: { invoice:'INVOICE', billTo:'Bill to', details:'Invoice details', issued:'Issued', due:'Due', terms:'Terms', description:'Description', qty:'Qty', rate:'Rate', amount:'Amount', subtotal:'Subtotal', discount:'Discount', tax:'Tax', total:'Total due', notes:'Notes', payment:'Payment details' },
    no: { invoice:'FAKTURA', billTo:'Faktureres til', details:'Fakturadetaljer', issued:'Fakturadato', due:'Forfallsdato', terms:'Betalingsvilkår', description:'Beskrivelse', qty:'Antall', rate:'Pris', amount:'Beløp', subtotal:'Delsum', discount:'Rabatt', tax:'MVA', total:'Totalt å betale', notes:'Merknader', payment:'Betalingsinformasjon' },
    sv: { invoice:'FAKTURA', billTo:'Faktureras till', details:'Fakturadetaljer', issued:'Fakturadatum', due:'Förfallodatum', terms:'Betalningsvillkor', description:'Beskrivning', qty:'Antal', rate:'Pris', amount:'Belopp', subtotal:'Delsumma', discount:'Rabatt', tax:'Moms', total:'Att betala', notes:'Anteckningar', payment:'Betalningsuppgifter' },
    da: { invoice:'FAKTURA', billTo:'Faktureres til', details:'Fakturadetaljer', issued:'Fakturadato', due:'Forfaldsdato', terms:'Betalingsbetingelser', description:'Beskrivelse', qty:'Antal', rate:'Pris', amount:'Beløb', subtotal:'Subtotal', discount:'Rabat', tax:'Moms', total:'Til betaling', notes:'Noter', payment:'Betalingsoplysninger' },
    de: { invoice:'RECHNUNG', billTo:'Rechnung an', details:'Rechnungsdetails', issued:'Rechnungsdatum', due:'Fällig am', terms:'Zahlungsziel', description:'Beschreibung', qty:'Menge', rate:'Preis', amount:'Betrag', subtotal:'Zwischensumme', discount:'Rabatt', tax:'MwSt.', total:'Gesamtbetrag', notes:'Notizen', payment:'Zahlungsdaten' }
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }
  function save(next) { localStorage.setItem(KEY, JSON.stringify(next)); }
  const state = { language:'en', bankAccount:'', iban:'', bic:'', reference:'', paymentDetails:'', ...load() };

  function field(label, id, value='', placeholder='') {
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${String(value).replace(/"/g,'&quot;')}" placeholder="${placeholder}"></div>`;
  }

  function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el && el.textContent !== text) el.textContent = text;
  }

  function applyLanguage() {
    const t = labels[state.language] || labels.en;
    setText('.inv-title h2', t.invoice);
    const heads = document.querySelectorAll('.bill-grid > div > strong');
    if (heads[0] && heads[0].textContent !== t.billTo) heads[0].textContent = t.billTo;
    if (heads[1] && heads[1].textContent !== t.details) heads[1].textContent = t.details;
    const th = document.querySelectorAll('.inv-items th');
    [t.description,t.qty,t.rate,t.amount].forEach((value,i)=>{ if(th[i] && th[i].textContent !== value) th[i].textContent=value; });
    const totals = document.querySelectorAll('.totals .total-line span');
    [t.subtotal,t.discount,t.tax,t.total].forEach((value,i)=>{ if(totals[i] && totals[i].textContent !== value) totals[i].textContent=value; });
    const notesStrong = document.querySelector('.invoice .notes strong');
    if (notesStrong && notesStrong.textContent !== t.notes) notesStrong.textContent = t.notes;

    const dates = document.querySelector('#pDates');
    if (dates) {
      const date = document.querySelector('#date')?.value || '';
      const due = document.querySelector('#due')?.value || '';
      const terms = document.querySelector('#terms')?.value || '';
      const next = `${t.issued}: ${date || '—'}\n${t.due}: ${due || '—'}\n${t.terms}: ${terms}`;
      if (dates.textContent !== next) dates.textContent = next;
    }
  }

  function renderPayment() {
    const t = labels[state.language] || labels.en;
    const block = document.querySelector('#pPaymentV2');
    if (!block) return;
    const lines = [state.bankAccount && `Bank: ${state.bankAccount}`, state.iban && `IBAN: ${state.iban}`, state.bic && `SWIFT / BIC: ${state.bic}`, state.reference && `Reference: ${state.reference}`, state.paymentDetails].filter(Boolean);
    block.hidden = !lines.length;
    const html = lines.length ? `<strong>${t.payment}</strong><div class="muted">${lines.map(v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('<br>')}</div>` : '';
    if (block.innerHTML !== html) block.innerHTML = html;
  }

  function sync() {
    state.language = document.querySelector('#invoiceLanguage')?.value || state.language;
    state.bankAccount = document.querySelector('#bankAccountV2')?.value.trim() || '';
    state.iban = document.querySelector('#ibanV2')?.value.trim() || '';
    state.bic = document.querySelector('#bicV2')?.value.trim() || '';
    state.reference = document.querySelector('#referenceV2')?.value.trim() || '';
    state.paymentDetails = document.querySelector('#paymentNotesV2')?.value.trim() || '';
    save(state);
    applyLanguage();
    renderPayment();
  }

  function install() {
    if (document.querySelector('#invoiceLanguage')) return true;
    const clientSection = [...document.querySelectorAll('.editor .section')].find(s => s.querySelector('#currency'));
    const notesSection = document.querySelector('#notes')?.closest('.section');
    if (!clientSection || !notesSection) return false;

    const currencyRow = document.querySelector('#currency')?.closest('.row');
    if (currencyRow) {
      const lang = document.createElement('div');
      lang.className = 'field';
      lang.innerHTML = `<label for="invoiceLanguage">Document language</label><select id="invoiceLanguage"><option value="en">English</option><option value="no">Norsk</option><option value="sv">Svenska</option><option value="da">Dansk</option><option value="de">Deutsch</option></select>`;
      currencyRow.appendChild(lang);
      currencyRow.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';
      lang.querySelector('select').value = state.language;
    }

    const payment = document.createElement('div');
    payment.className = 'section';
    payment.id = 'paymentDetailsV2';
    payment.innerHTML = `<h2>Payment details</h2><div class="row">${field('Bank account','bankAccountV2',state.bankAccount,'Account / clearing details')}${field('IBAN','ibanV2',state.iban,'IBAN')}</div><div class="row">${field('SWIFT / BIC','bicV2',state.bic,'BIC / SWIFT')}${field('Payment reference','referenceV2',state.reference,'Reference / KID')}</div><div class="field"><label for="paymentNotesV2">Payment instructions</label><textarea id="paymentNotesV2" rows="2" placeholder="Additional payment instructions">${state.paymentDetails || ''}</textarea></div>`;
    notesSection.parentNode.insertBefore(payment, notesSection);

    const previewNotes = document.querySelector('.invoice .notes');
    if (previewNotes) {
      const block = document.createElement('div');
      block.className = 'notes';
      block.id = 'pPaymentV2';
      block.hidden = true;
      previewNotes.parentNode.insertBefore(block, previewNotes);
    }

    document.querySelectorAll('#invoiceLanguage,#bankAccountV2,#ibanV2,#bicV2,#referenceV2,#paymentNotesV2').forEach(el => {
      el.addEventListener('input', sync);
      el.addEventListener('change', sync);
    });
    sync();
    return true;
  }

  function boot() {
    if (install()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (install() || tries >= 20) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
import { getCompanySettings, getSession, supabase } from './backend.js';

const languages = [
  ['en','English'],['no','Norsk'],['sv','Svenska'],['da','Dansk'],['de','Deutsch']
];
let settings = null;
let session = null;
let installing = false;

function esc(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

async function ensureContext() {
  session ||= await getSession();
  if (session?.user?.id && !settings) settings = await getCompanySettings(session.user.id);
}

function paymentSummary() {
  if (!settings) return '';
  const rows = [
    settings.bankAccount && `Bank: ${settings.bankAccount}`,
    settings.iban && `IBAN: ${settings.iban}`,
    settings.bicSwift && `SWIFT / BIC: ${settings.bicSwift}`,
    settings.paymentReference && `Reference: ${settings.paymentReference}`,
    settings.paymentDetails
  ].filter(Boolean);
  return rows.length
    ? `<div class="document-payment-summary"><div><strong>Payment details</strong><span>${rows.map(esc).join(' · ')}</span></div><a class="mini-btn" href="/pro/settings/">Edit in Settings</a></div>`
    : `<div class="document-payment-summary empty"><div><strong>Payment details</strong><span>No bank or payment instructions added yet.</span></div><a class="mini-btn" href="/pro/settings/">Add in Settings</a></div>`;
}

async function readLanguage(kind, number) {
  if (!session?.user?.id || !number) return 'en';
  const table = kind === 'estimate' ? 'estimates' : 'invoices';
  const numberColumn = kind === 'estimate' ? 'estimate_number' : 'invoice_number';
  const { data } = await supabase.from(table).select('language').eq('user_id', session.user.id).eq(numberColumn, number).maybeSingle();
  return data?.language || 'en';
}

async function install() {
  if (installing) return;
  const modal = document.querySelector('#modal');
  const body = document.querySelector('#modalBody');
  const title = document.querySelector('#modalTitle');
  if (!modal?.open || !body || !title || body.querySelector('[name="documentLanguage"]')) return;
  const isEstimate = location.pathname.includes('/pro/estimates/');
  const isDocument = isEstimate ? /estimate/i.test(title.textContent || '') : /invoice/i.test(title.textContent || '');
  if (!isDocument || !body.querySelector('[name="currency"]')) return;
  installing = true;
  try {
    await ensureContext();
    const number = body.querySelector('[name="number"]')?.value || '';
    const currentLanguage = await readLanguage(isEstimate ? 'estimate' : 'invoice', number);
    const currencyField = body.querySelector('[name="currency"]')?.closest('.field');
    if (currencyField) {
      const field = document.createElement('div');
      field.className = 'field';
      field.innerHTML = `<label>Document language</label><select class="select" name="documentLanguage">${languages.map(([code,label])=>`<option value="${code}" ${code===currentLanguage?'selected':''}>${label}</option>`).join('')}</select>`;
      currencyField.insertAdjacentElement('afterend', field);
    }
    if (!isEstimate) {
      const fullFields = body.querySelectorAll('.field.full');
      const target = fullFields[fullFields.length - 1];
      if (target) target.insertAdjacentHTML('afterend', `<div class="field full">${paymentSummary()}</div>`);
    }
  } catch (error) {
    console.warn('Document options unavailable', error);
  } finally { installing = false; }
}

async function persistLanguage() {
  const modal = document.querySelector('#modal');
  const body = document.querySelector('#modalBody');
  if (!modal?.open || !body) return;
  const select = body.querySelector('[name="documentLanguage"]');
  const number = body.querySelector('[name="number"]')?.value?.trim();
  if (!select || !number) return;
  await ensureContext();
  if (!session?.user?.id) return;
  const isEstimate = location.pathname.includes('/pro/estimates/');
  const table = isEstimate ? 'estimates' : 'invoices';
  const numberColumn = isEstimate ? 'estimate_number' : 'invoice_number';
  const language = select.value || 'en';
  setTimeout(async () => {
    try {
      await supabase.from(table).update({ language }).eq('user_id', session.user.id).eq(numberColumn, number);
    } catch (error) { console.warn('Could not save document language', error); }
  }, 700);
}

document.querySelector('#modalForm')?.addEventListener('submit', persistLanguage, true);
const observer = new MutationObserver(() => { clearTimeout(observer._t); observer._t=setTimeout(install,40); });
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
install();

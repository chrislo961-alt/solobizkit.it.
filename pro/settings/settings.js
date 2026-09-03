import { getCompanySettings, getSession, onAuthChange, saveCompanySettings, signOut } from '../backend.js';

const app = document.querySelector('#app');
const shell = document.querySelector('#shell');
const authActions = document.querySelector('#authActions');
let session = null;
let settings = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}
function hasProAccess(subscription) {
  return ['active', 'trialing'].includes(String(subscription?.status || '').toLowerCase()) && String(subscription?.plan || '').toLowerCase() === 'pro';
}
function normalizeReminderDays(value) {
  return [...new Set(String(value || '').split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 0 && item <= 365))].sort((a, b) => a - b);
}

async function readSubscription(userId) {
  const { supabase } = await import('../backend.js');
  const { data, error } = await supabase.from('subscriptions').select('status,plan').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function renderSignedOut() {
  shell.classList.add('signed-out');
  authActions.innerHTML = '';
  app.innerHTML = `<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Sign in to edit business settings.</h2><p class="muted auth-copy">Open the Pro workspace to sign in, then return here.</p><a class="btn primary" href="/pro/">Go to Pro workspace</a></section></div>`;
}

function renderLocked() {
  shell.classList.remove('signed-out');
  app.innerHTML = `<div class="auth-stage"><section class="auth-card pro-lock"><div class="lock-icon">🔒</div><h2>Business settings are a Pro feature.</h2><p class="muted">Upgrade from the Pro workspace to unlock CRM, estimates, invoices and company settings.</p><a class="btn primary" href="/pro/">Open Pro</a></section></div>`;
}

function renderAuthActions() {
  authActions.innerHTML = `<span class="account-chip"><strong>${esc(session?.user?.email || 'Account')}</strong><small>PRO</small></span><button class="mini-btn" id="signOutBtn">Sign out</button>`;
  document.querySelector('#signOutBtn').onclick = () => signOut();
}

function previewMarkup(data) {
  const location = [data.address, [data.postalCode, data.city].filter(Boolean).join(' '), data.country].filter(Boolean);
  const payment = [data.bankAccount && `Bank: ${data.bankAccount}`, data.iban && `IBAN: ${data.iban}`, data.bicSwift && `SWIFT/BIC: ${data.bicSwift}`, data.paymentReference && `Reference: ${data.paymentReference}`].filter(Boolean);
  return `<div class="preview"><span class="preview-badge">INVOICE / ESTIMATE DEFAULTS</span><div class="preview-block"><strong>${esc(data.companyName || 'Your business')}</strong><div class="preview-lines">${data.companyEmail ? `<span>${esc(data.companyEmail)}</span>` : ''}${data.phone ? `<span>${esc(data.phone)}</span>` : ''}${location.map((line) => `<span>${esc(line)}</span>`).join('')}${data.taxNumber ? `<span>Tax / VAT: ${esc(data.taxNumber)}</span>` : ''}</div></div><div class="preview-block"><strong>Document defaults</strong><div class="preview-lines"><span>${esc(data.defaultCurrency)} · ${Number(data.defaultTax || 0)}% VAT</span><span>Invoice prefix: ${esc(data.invoicePrefix)}</span><span>Estimate prefix: ${esc(data.estimatePrefix)}</span><span>Payment terms: ${Number(data.paymentTermsDays ?? 14)} days</span><span>Reminders: ${data.reminderScheduleDays?.length ? data.reminderScheduleDays.join(', ') + ' days after due date' : 'Off'}</span></div></div><div class="preview-block"><strong>Payment details</strong><div class="preview-lines">${payment.length ? payment.map((line) => `<span>${esc(line)}</span>`).join('') : '<span>No payment details added yet.</span>'}${data.paymentDetails ? `<span>${esc(data.paymentDetails)}</span>` : ''}</div></div></div>`;
}

function formDataToSettings(form) {
  const data = new FormData(form);
  return {
    companyName: String(data.get('companyName') || '').trim(),
    companyEmail: String(data.get('companyEmail') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    address: String(data.get('address') || '').trim(),
    city: String(data.get('city') || '').trim(),
    postalCode: String(data.get('postalCode') || '').trim(),
    country: String(data.get('country') || '').trim(),
    taxNumber: String(data.get('taxNumber') || '').trim(),
    defaultCurrency: String(data.get('defaultCurrency') || 'USD'),
    defaultTax: Math.max(0, Math.min(100, Number(data.get('defaultTax') || 0))),
    invoicePrefix: String(data.get('invoicePrefix') || 'INV').trim() || 'INV',
    estimatePrefix: String(data.get('estimatePrefix') || 'EST-').trim() || 'EST-',
    paymentTermsDays: Math.max(0, Math.min(365, Number(data.get('paymentTermsDays') ?? 14))),
    reminderScheduleDays: normalizeReminderDays(data.get('reminderScheduleDays')),
    bankAccount: String(data.get('bankAccount') || '').trim(),
    iban: String(data.get('iban') || '').trim(),
    bicSwift: String(data.get('bicSwift') || '').trim(),
    paymentReference: String(data.get('paymentReference') || '').trim(),
    paymentDetails: String(data.get('paymentDetails') || '').trim(),
  };
}

function renderSettings() {
  shell.classList.remove('signed-out');
  renderAuthActions();
  const s = settings;
  app.innerHTML = `<div class="settings-grid"><section class="settings-card"><h2>Company profile</h2><p class="muted">These details are stored securely on your account and used as your business defaults.</p><form id="settingsForm" class="settings-form"><div class="settings-section"><div class="field"><label>Business name</label><input class="input" name="companyName" value="${esc(s.companyName)}" placeholder="Acme Studio AB"></div><div class="field"><label>Business email</label><input class="input" type="email" name="companyEmail" value="${esc(s.companyEmail)}" placeholder="hello@company.com"></div><div class="field"><label>Phone</label><input class="input" name="phone" value="${esc(s.phone)}"></div><div class="field"><label>Tax / VAT number</label><input class="input" name="taxNumber" value="${esc(s.taxNumber)}"></div><div class="field full"><label>Address</label><input class="input" name="address" value="${esc(s.address)}"></div><div class="field"><label>Postal code</label><input class="input" name="postalCode" value="${esc(s.postalCode)}"></div><div class="field"><label>City</label><input class="input" name="city" value="${esc(s.city)}"></div><div class="field full"><label>Country</label><input class="input" name="country" value="${esc(s.country)}"></div></div><div class="settings-section"><div class="field"><label>Default currency</label><select class="select" name="defaultCurrency">${['USD','EUR','GBP','NOK','SEK','DKK'].map((currency) => `<option ${currency === s.defaultCurrency ? 'selected' : ''}>${currency}</option>`).join('')}</select></div><div class="field"><label>Default VAT %</label><input class="input" type="number" min="0" max="100" step="0.01" name="defaultTax" value="${Number(s.defaultTax || 0)}"></div><div class="field"><label>Invoice prefix</label><input class="input" name="invoicePrefix" value="${esc(s.invoicePrefix)}"></div><div class="field"><label>Estimate prefix</label><input class="input" name="estimatePrefix" value="${esc(s.estimatePrefix)}"></div><div class="field"><label>Payment terms (days)</label><input class="input" type="number" min="0" max="365" name="paymentTermsDays" value="${Number(s.paymentTermsDays ?? 14)}"></div><div class="field"><label>Automatic reminders</label><input class="input" name="reminderScheduleDays" value="${esc((s.reminderScheduleDays || [0,7,14]).join(', '))}" placeholder="0, 7, 14"><small class="muted">Days after due date. Leave blank to disable.</small></div></div><div class="settings-section"><div class="field"><label>Bank account</label><input class="input" name="bankAccount" value="${esc(s.bankAccount)}"></div><div class="field"><label>IBAN</label><input class="input" name="iban" value="${esc(s.iban)}"></div><div class="field"><label>SWIFT / BIC</label><input class="input" name="bicSwift" value="${esc(s.bicSwift)}"></div><div class="field"><label>Payment reference</label><input class="input" name="paymentReference" value="${esc(s.paymentReference)}"></div><div class="field full"><label>Payment notes</label><textarea class="textarea" name="paymentDetails" placeholder="Payment instructions shown on documents">${esc(s.paymentDetails)}</textarea></div></div><div class="save-row"><span class="save-state" id="saveState"></span><button class="btn primary" type="submit">Save settings</button></div></form></section><aside class="settings-card"><h2>Document preview</h2><p class="muted">A quick preview of the business information your Pro documents can use.</p><div id="preview">${previewMarkup(s)}</div></aside></div>`;

  const form = app.querySelector('#settingsForm');
  const preview = app.querySelector('#preview');
  const saveState = app.querySelector('#saveState');
  form.addEventListener('input', () => { preview.innerHTML = previewMarkup(formDataToSettings(form)); saveState.textContent = 'Unsaved changes'; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const next = formDataToSettings(form);
    saveState.textContent = 'Saving…';
    try {
      await saveCompanySettings(session.user.id, next);
      settings = next;
      saveState.textContent = 'Saved';
      preview.innerHTML = previewMarkup(settings);
    } catch (error) {
      console.error(error);
      saveState.textContent = error?.message || 'Could not save';
    }
  });
}

async function hydrate() {
  if (!session?.user?.id) return renderSignedOut();
  app.innerHTML = '<div class="auth-stage"><div class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Loading business settings…</h2></div></div>';
  const subscription = await readSubscription(session.user.id);
  if (!hasProAccess(subscription)) return renderLocked();
  settings = await getCompanySettings(session.user.id);
  renderSettings();
}

onAuthChange(async (_event, nextSession) => {
  session = nextSession;
  if (session) await hydrate(); else renderSignedOut();
});

(async () => {
  try {
    session = await getSession();
    if (session) await hydrate(); else renderSignedOut();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="auth-stage"><section class="auth-card"><h2>Could not load settings</h2><p class="muted">${esc(error?.message || 'Please try again.')}</p></section></div>`;
  }
})();
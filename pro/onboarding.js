import { supabase } from './backend.js';

const DISMISS_KEY = 'solobizkit:onboarding:dismissed';
const COMPLETE_KEY = 'solobizkit:onboarding:complete-seen';
let lastSignature = '';
let currentUserId = null;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

async function getState(userId) {
  const [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from('company_settings').select('invoice_onboarding_completed,business_name,company_name,default_currency,bank_account,iban,payment_details').eq('user_id', userId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('crm_archived', false),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid'),
  ]);
  for (const result of [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes]) if (result.error) throw result.error;
  const settings = settingsRes.data || {};
  return {
    setupDone: Boolean(settings.invoice_onboarding_completed) && Boolean(settings.business_name || settings.company_name),
    customerDone: Number(customersRes.count || 0) > 0,
    estimateDone: Number(estimatesRes.count || 0) > 0,
    invoiceDone: Number(invoicesRes.count || 0) > 0,
    paymentDone: Number(paymentsRes.count || 0) > 0,
    hasPaymentDetails: Boolean(settings.bank_account || settings.iban || settings.payment_details),
    currency: settings.default_currency || 'USD',
  };
}

function removeCard() {
  document.querySelector('#proOnboarding')?.remove();
  lastSignature = '';
}

function actionMarkup(step, isNext) {
  if (step.done) return '<span class="onboarding-complete">Done</span>';
  const cls = isNext ? 'btn primary onboarding-cta' : 'mini-btn';
  if (step.href) return `<a class="${cls}" href="${step.href}">${esc(step.cta)}</a>`;
  return `<button class="${cls}" type="button" data-onboarding-action="${step.action}">${esc(step.cta)}</button>`;
}

function render(state) {
  const app = document.querySelector('#app');
  if (!app || !document.querySelector('.app-shell') || !currentUserId) return;
  const params = new URLSearchParams(location.search);
  const isDashboard = (params.get('view') || 'dashboard') === 'dashboard';
  if (!isDashboard || document.querySelector('.paywall-card') || document.querySelector('.auth-stage')) return removeCard();

  const steps = [
    { done: state.setupDone, title: 'Set up your business', text: 'Add company details, default currency, VAT and payment information.', href: '/pro/settings/', cta: 'Open settings' },
    { done: state.customerDone, title: 'Add your first customer', text: 'Create the customer record that estimates and invoices will use.', action: 'customer', cta: 'Add customer' },
    { done: state.estimateDone, title: 'Create your first estimate', text: 'Quote the work, send it and let the customer accept online.', href: '/pro/estimates/?new=1', cta: 'Create estimate' },
    { done: state.invoiceDone, title: 'Send your first invoice', text: 'Create the invoice, add payment details and send it to the customer.', action: 'invoice', cta: 'Create invoice' },
  ];

  const complete = steps.filter((step) => step.done).length;
  const allDone = complete === steps.length;
  const next = steps.findIndex((step) => !step.done);
  const signature = JSON.stringify({ complete, next, paid: state.paymentDone, details: state.hasPaymentDetails, uid: currentUserId });
  if (signature === lastSignature && document.querySelector('#proOnboarding')) return;
  lastSignature = signature;
  removeCard();

  if (allDone) {
    const seenKey = `${COMPLETE_KEY}:${currentUserId}`;
    if (localStorage.getItem(seenKey)) return;
    const section = document.createElement('section');
    section.id = 'proOnboarding';
    section.className = 'onboarding-card onboarding-v2 onboarding-finished';
    section.innerHTML = `
      <div class="onboarding-finish-icon">✓</div>
      <div class="onboarding-finish-copy">
        <p class="eyebrow">READY TO WORK</p>
        <h2>Your SoloBizKit workspace is set up.</h2>
        <p>You have completed the core workflow: business setup, customer, estimate and invoice. From here, the dashboard becomes your daily starting point.</p>
        <div class="onboarding-finish-actions">
          <button class="btn primary" type="button" data-onboarding-action="customer">Add another customer</button>
          <a class="btn secondary" href="/pro/estimates/?new=1">Create another estimate</a>
          <button class="mini-btn" id="finishOnboarding" type="button">Got it</button>
        </div>
      </div>`;
    app.prepend(section);
    section.querySelector('#finishOnboarding').onclick = () => { localStorage.setItem(seenKey, '1'); removeCard(); };
    bindActions(section);
    return;
  }

  if (localStorage.getItem(DISMISS_KEY) === currentUserId) return removeCard();
  const nextStep = steps[next];
  const progress = Math.round((complete / steps.length) * 100);

  const section = document.createElement('section');
  section.id = 'proOnboarding';
  section.className = 'onboarding-card onboarding-v2';
  section.innerHTML = `
    <div class="onboarding-head onboarding-v2-head">
      <div>
        <p class="eyebrow">QUICK START</p>
        <h2>Get from new account to first invoice in four steps.</h2>
        <p class="muted">SoloBizKit is built around one simple workflow. Complete it once and you will know where everything lives.</p>
      </div>
      <button class="mini-btn onboarding-hide" id="dismissOnboarding" type="button">Hide guide</button>
    </div>
    <div class="onboarding-status-row">
      <div><strong>${complete} of 4 complete</strong><span>${progress}% ready</span></div>
      <div class="onboarding-progress"><span style="width:${progress}%"></span></div>
    </div>
    <div class="onboarding-next-card">
      <div class="onboarding-next-number">${next + 1}</div>
      <div class="onboarding-next-copy">
        <span class="onboarding-next-label">NEXT STEP</span>
        <strong>${esc(nextStep.title)}</strong>
        <p>${esc(nextStep.text)}</p>
      </div>
      ${actionMarkup(nextStep, true)}
    </div>
    <div class="onboarding-steps onboarding-v2-steps">
      ${steps.map((step, index) => `
        <article class="onboarding-step ${step.done ? 'done' : index === next ? 'next' : ''}">
          <div class="onboarding-check">${step.done ? '✓' : index + 1}</div>
          <div class="onboarding-copy"><strong>${esc(step.title)}</strong><span>${esc(step.text)}</span></div>
          ${index === next ? '<span class="onboarding-now">Now</span>' : step.done ? '<span class="onboarding-complete">Done</span>' : '<span class="onboarding-later">Later</span>'}
        </article>`).join('')}
    </div>
    <div class="onboarding-footer-note">
      <div><strong>Document defaults</strong><span>${esc(state.currency)} default currency${state.hasPaymentDetails ? ' · payment details added' : ' · add payment details in Settings'}</span></div>
      <a href="/pro/settings/">Review settings →</a>
    </div>`;
  app.prepend(section);

  section.querySelector('#dismissOnboarding').onclick = () => {
    localStorage.setItem(DISMISS_KEY, currentUserId);
    removeCard();
  };
  bindActions(section);
}

function bindActions(section) {
  section.querySelectorAll('[data-onboarding-action]').forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.onboardingAction;
      if (action === 'customer') document.querySelector('#newCustomerTop')?.click();
      if (action === 'invoice') document.querySelector('#newInvoiceTop')?.click();
    };
  });
}

async function refresh() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUserId = session?.user?.id || null;
  if (!currentUserId) return removeCard();
  try { render(await getState(currentUserId)); }
  catch (error) { console.warn('Onboarding state unavailable', error); }
}

const observer = new MutationObserver(() => {
  clearTimeout(observer.timer);
  observer.timer = setTimeout(refresh, 100);
});
observer.observe(document.body, { childList: true, subtree: true });
supabase.auth.onAuthStateChange(() => refresh());
window.addEventListener('focus', refresh);
refresh();

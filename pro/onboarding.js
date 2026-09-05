import { supabase } from './backend.js';

const DISMISS_KEY = 'solobizkit:onboarding:dismissed';
const COMPLETE_KEY = 'solobizkit:onboarding:complete-seen';
const IMPRESSION_KEY = 'solobizkit:onboarding:impression';
let lastSignature = '';
let currentUserId = null;
let refreshQueued = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

function track(event, params = {}) {
  try { window.sbkTrack?.(event, params); } catch (_) {}
}

async function getState(userId) {
  const [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from('company_settings').select('invoice_onboarding_completed,business_name,company_name,default_currency,bank_account,iban,bic_swift,payment_reference,payment_details').eq('user_id', userId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('crm_archived', false),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'paid'),
  ]);
  for (const result of [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes]) if (result.error) throw result.error;
  const settings = settingsRes.data || {};
  const hasCompany = Boolean(settings.business_name || settings.company_name);
  const hasPaymentDetails = Boolean(settings.bank_account || settings.iban || settings.payment_details || settings.payment_reference);
  return {
    setupDone: Boolean(settings.invoice_onboarding_completed) && hasCompany,
    hasCompany,
    paymentDetailsDone: hasPaymentDetails,
    customerDone: Number(customersRes.count || 0) > 0,
    estimateDone: Number(estimatesRes.count || 0) > 0,
    invoiceDone: Number(invoicesRes.count || 0) > 0,
    paymentDone: Number(paymentsRes.count || 0) > 0,
    hasPaymentDetails,
    currency: settings.default_currency || 'USD',
  };
}

function removeCard() {
  document.querySelector('#proOnboarding')?.remove();
}

function actionMarkup(step, isNext) {
  if (step.done) return '<span class="onboarding-complete">Done</span>';
  const cls = isNext ? 'btn primary onboarding-cta' : 'mini-btn';
  if (step.href) return `<a class="${cls}" href="${step.href}" data-onboarding-step="${step.key}">${esc(step.cta)}</a>`;
  return `<button class="${cls}" type="button" data-onboarding-action="${step.action}" data-onboarding-step="${step.key}">${esc(step.cta)}</button>`;
}

function render(state) {
  const app = document.querySelector('#app');
  if (!app || !document.querySelector('.app-shell') || !currentUserId) return;
  const params = new URLSearchParams(location.search);
  const isDashboard = (params.get('view') || 'dashboard') === 'dashboard';
  if (!isDashboard || document.querySelector('.paywall-card') || document.querySelector('.auth-stage')) return removeCard();

  const steps = [
    { key: 'business', done: state.setupDone, title: 'Set up your business', text: 'Add your company name, address, VAT/tax details, currency and document defaults.', href: '/pro/settings/#business', cta: 'Set up business' },
    { key: 'payments', done: state.paymentDetailsDone, title: 'Add how customers should pay', text: 'Add bank account, KID/reference or IBAN. Stripe payment links stay optional.', href: '/pro/settings/#payments', cta: 'Add payment details' },
    { key: 'customer', done: state.customerDone, title: 'Add your first customer', text: 'Create one customer record so quotes and invoices are ready to send.', action: 'customer', cta: 'Add customer' },
    { key: 'invoice', done: state.invoiceDone, title: 'Create your first invoice', text: 'Build a professional invoice, preview it and send or save the PDF.', action: 'invoice', cta: 'Create invoice' },
  ];

  const complete = steps.filter((step) => step.done).length;
  const allDone = complete === steps.length;
  const next = steps.findIndex((step) => !step.done);
  const signature = JSON.stringify({ complete, next, paid: state.paymentDone, details: state.hasPaymentDetails, uid: currentUserId });
  if (signature === lastSignature && document.querySelector('#proOnboarding')) return;
  lastSignature = signature;
  removeCard();

  const impressionKey = `${IMPRESSION_KEY}:${currentUserId}`;
  if (!localStorage.getItem(impressionKey)) {
    localStorage.setItem(impressionKey, '1');
    track('pro_onboarding_viewed', { completed_steps: complete });
  }

  if (allDone) {
    const seenKey = `${COMPLETE_KEY}:${currentUserId}`;
    if (localStorage.getItem(seenKey)) return;
    const section = document.createElement('section');
    section.id = 'proOnboarding';
    section.className = 'onboarding-card onboarding-v2 onboarding-finished';
    section.innerHTML = `
      <div class="onboarding-finish-icon">✓</div>
      <div class="onboarding-finish-copy">
        <p class="eyebrow">WORKSPACE READY</p>
        <h2>Your SoloBizKit workspace is ready for real work.</h2>
        <p>Business details, payment information, your first customer and your first invoice are in place. From here, the dashboard becomes your daily starting point.</p>
        <div class="onboarding-finish-actions">
          <button class="btn primary" type="button" data-onboarding-action="customer">Add another customer</button>
          <a class="btn secondary" href="/pro/estimates/?new=1">Create an estimate</a>
          <button class="mini-btn" id="finishOnboarding" type="button">Done</button>
        </div>
      </div>`;
    app.prepend(section);
    section.querySelector('#finishOnboarding').onclick = () => {
      localStorage.setItem(seenKey, '1');
      track('pro_onboarding_completed');
      removeCard();
    };
    bindActions(section);
    return;
  }

  if (localStorage.getItem(DISMISS_KEY) === currentUserId) return removeCard();
  const nextStep = steps[next];
  const progress = Math.round((complete / steps.length) * 100);
  const brandNew = complete === 0;

  const section = document.createElement('section');
  section.id = 'proOnboarding';
  section.className = `onboarding-card onboarding-v2${brandNew ? ' onboarding-first-run' : ''}`;
  section.innerHTML = `
    <div class="onboarding-head onboarding-v2-head">
      <div>
        <p class="eyebrow">${brandNew ? 'WELCOME TO SOLOBIZKIT PRO' : 'QUICK START'}</p>
        <h2>${brandNew ? 'Get your workspace ready in about five minutes.' : 'Finish setting up your workspace.'}</h2>
        <p class="muted">${brandNew ? 'Do these four things once. After that, creating customers and invoices becomes the normal day-to-day workflow.' : 'You are already on your way. Complete the remaining steps so your documents and payment details are ready for customers.'}</p>
      </div>
      <button class="mini-btn onboarding-hide" id="dismissOnboarding" type="button">${brandNew ? 'Set up later' : 'Hide guide'}</button>
    </div>
    <div class="onboarding-value-row">
      <span>⏱ About 5 minutes</span><span>🔒 Saved to your account</span><span>✓ Change anything later</span>
    </div>
    <div class="onboarding-status-row">
      <div><strong>${complete} of 4 complete</strong><span>${progress}% ready</span></div>
      <div class="onboarding-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>
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
          ${index === next ? '<span class="onboarding-now">Do this now</span>' : step.done ? '<span class="onboarding-complete">Done</span>' : '<span class="onboarding-later">Later</span>'}
        </article>`).join('')}
    </div>
    <div class="onboarding-footer-note">
      <div><strong>Document defaults</strong><span>${esc(state.currency)} default currency${state.hasPaymentDetails ? ' · payment details added' : ' · payment details still missing'}</span></div>
      <div class="onboarding-footer-actions"><a href="/pro/estimates/?new=1">Prefer a quote first? Create estimate →</a><a href="/pro/settings/">Review settings →</a></div>
    </div>`;
  app.prepend(section);

  section.querySelector('#dismissOnboarding').onclick = () => {
    localStorage.setItem(DISMISS_KEY, currentUserId);
    track('pro_onboarding_dismissed', { completed_steps: complete });
    removeCard();
  };
  bindActions(section);
}

function bindActions(section) {
  section.querySelectorAll('[data-onboarding-step]').forEach((el) => {
    el.addEventListener('click', () => track('pro_onboarding_step_clicked', { step: el.dataset.onboardingStep || 'unknown' }));
  });
  section.querySelectorAll('[data-onboarding-action]').forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.onboardingAction;
      if (action === 'customer') document.querySelector('#newCustomerTop')?.click();
      if (action === 'invoice') document.querySelector('#newInvoiceTop')?.click();
    };
  });
}

async function refresh() {
  refreshQueued = false;
  const { data: { session } } = await supabase.auth.getSession();
  currentUserId = session?.user?.id || null;
  if (!currentUserId) return removeCard();
  try { render(await getState(currentUserId)); }
  catch (error) { console.warn('Onboarding state unavailable', error); }
}

function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(refresh, 140);
}

const observer = new MutationObserver(scheduleRefresh);
observer.observe(document.body, { childList: true, subtree: true });
supabase.auth.onAuthStateChange(() => scheduleRefresh());
window.addEventListener('focus', scheduleRefresh);
window.addEventListener('solobizkit:workspace-updated', scheduleRefresh);
refresh();

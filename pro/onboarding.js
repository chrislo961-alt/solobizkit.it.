import { supabase } from './backend.js';

const DISMISS_KEY = 'solobizkit:onboarding:dismissed';
let lastSignature = '';
let currentUserId = null;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
}

async function getState(userId) {
  const [settingsRes, customersRes, estimatesRes, invoicesRes] = await Promise.all([
    supabase.from('company_settings').select('invoice_onboarding_completed,business_name,company_name').eq('user_id', userId).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('crm_archived', false),
    supabase.from('estimates').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  for (const result of [settingsRes, customersRes, estimatesRes, invoicesRes]) if (result.error) throw result.error;
  const setupDone = Boolean(settingsRes.data?.invoice_onboarding_completed) && Boolean(settingsRes.data?.business_name || settingsRes.data?.company_name);
  const customerDone = Number(customersRes.count || 0) > 0;
  const documentDone = Number(estimatesRes.count || 0) > 0 || Number(invoicesRes.count || 0) > 0;
  return { setupDone, customerDone, documentDone };
}

function render(state) {
  const app = document.querySelector('#app');
  if (!app || !document.querySelector('.app-shell') || !currentUserId) return;
  const params = new URLSearchParams(location.search);
  const isDashboard = (params.get('view') || 'dashboard') === 'dashboard';
  if (!isDashboard || document.querySelector('.paywall-card') || document.querySelector('.auth-stage')) return removeCard();
  if (state.setupDone && state.customerDone && state.documentDone) {
    localStorage.removeItem(DISMISS_KEY);
    return removeCard();
  }
  if (localStorage.getItem(DISMISS_KEY) === currentUserId) return removeCard();

  const steps = [
    { done: state.setupDone, title: 'Set up your business', text: 'Add business details, tax defaults and payment terms.', href: '/pro/settings/', cta: 'Business settings' },
    { done: state.customerDone, title: 'Add your first customer', text: 'Create a customer so invoices and estimates have a recipient.', action: 'customer', cta: 'Add customer' },
    { done: state.documentDone, title: 'Create your first document', text: 'Start with an estimate or send an invoice directly.', action: 'invoice', cta: 'Create invoice' },
  ];
  const complete = steps.filter((step) => step.done).length;
  const next = steps.findIndex((step) => !step.done);
  const signature = JSON.stringify({ complete, next, uid: currentUserId });
  if (signature === lastSignature && document.querySelector('#proOnboarding')) return;
  lastSignature = signature;
  removeCard();

  const section = document.createElement('section');
  section.id = 'proOnboarding';
  section.className = 'onboarding-card';
  section.innerHTML = `
    <div class="onboarding-head">
      <div><p class="eyebrow">GET STARTED</p><h2>Set up SoloBizKit in a few minutes</h2><p class="muted">${complete} of 3 complete. You can skip this and keep working normally.</p></div>
      <button class="mini-btn" id="dismissOnboarding" type="button">Hide</button>
    </div>
    <div class="onboarding-progress"><span style="width:${Math.round((complete / 3) * 100)}%"></span></div>
    <div class="onboarding-steps">
      ${steps.map((step, index) => `
        <article class="onboarding-step ${step.done ? 'done' : index === next ? 'next' : ''}">
          <div class="onboarding-check">${step.done ? '✓' : index + 1}</div>
          <div class="onboarding-copy"><strong>${esc(step.title)}</strong><span>${esc(step.text)}</span></div>
          ${step.done ? '<span class="onboarding-complete">Done</span>' : step.href ? `<a class="mini-btn" href="${step.href}">${esc(step.cta)}</a>` : `<button class="mini-btn" type="button" data-onboarding-action="${step.action}">${esc(step.cta)}</button>`}
        </article>`).join('')}
    </div>`;
  app.prepend(section);

  section.querySelector('#dismissOnboarding').onclick = () => {
    localStorage.setItem(DISMISS_KEY, currentUserId);
    removeCard();
  };
  section.querySelectorAll('[data-onboarding-action]').forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.onboardingAction;
      if (action === 'customer') {
        document.querySelector('#newCustomerTop')?.click();
      } else if (action === 'invoice') {
        document.querySelector('#newInvoiceTop')?.click();
      }
    };
  });
}

function removeCard() {
  document.querySelector('#proOnboarding')?.remove();
  lastSignature = '';
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
  observer.timer = setTimeout(refresh, 80);
});
observer.observe(document.body, { childList: true, subtree: true });
supabase.auth.onAuthStateChange(() => refresh());
window.addEventListener('focus', refresh);
refresh();

import { getSession, supabase } from './backend.js';

const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
const formatDate = (value) => {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)); }
  catch { return String(value); }
};
const daysLeft = (value) => {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
};

let subscription = null;

async function loadSubscription() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  const { data, error } = await supabase.from('subscriptions')
    .select('plan,status,current_period_end,cancel_at_period_end,trial_started_at,trial_end_at')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  subscription = data;
  return data;
}

function decoratePaywall() {
  const card = document.querySelector('.paywall-card');
  if (!card || card.dataset.trialAware === 'true') return;
  card.dataset.trialAware = 'true';
  const lead = card.querySelector('.paywall-lead');
  if (lead) lead.textContent = 'Customers, CRM follow-up, estimates, invoices and recurring billing in one focused Pro workspace. Eligible new accounts get 14 days to try everything before the first charge.';
  card.querySelectorAll('[data-checkout]').forEach((button) => {
    const strong = button.querySelector('strong');
    const span = button.querySelector('span');
    if (strong) strong.textContent = button.dataset.checkout === 'annual' ? 'Start 14-day trial · annual' : 'Start 14-day trial · monthly';
    if (span) span.textContent = button.dataset.checkout === 'annual' ? 'Best value after trial' : 'Cancel during trial';
  });
  const foot = card.querySelector('.paywall-foot');
  if (foot) foot.textContent = 'Secure checkout by Stripe. A payment method is collected for the subscription, but eligible new accounts are not charged until the 14-day trial ends.';
  const notice = card.querySelector('.paywall-notice.success');
  if (notice) notice.textContent = 'Checkout completed. Your Pro trial or subscription is activating now. Refresh below if access has not appeared yet.';
}

function renderTrialBanner() {
  if (!subscription || String(subscription.status).toLowerCase() !== 'trialing') return;
  if (document.querySelector('[data-trial-banner]')) return;
  const content = document.querySelector('#app.content');
  if (!content) return;
  const remaining = daysLeft(subscription.trial_end_at);
  const banner = document.createElement('section');
  banner.className = 'trial-banner';
  banner.dataset.trialBanner = 'true';
  banner.innerHTML = `<div><p class="eyebrow">PRO TRIAL</p><strong>Your full SoloBizKit Pro trial is active.</strong><span>${remaining === null ? 'Trial active' : `${remaining} day${remaining === 1 ? '' : 's'} left`} · ends ${esc(formatDate(subscription.trial_end_at))}</span></div><a class="mini-btn" href="/pro/settings/#billing">Billing</a>`;
  content.prepend(banner);
}

function decorateAccountChip() {
  if (!subscription) return;
  const small = document.querySelector('.account-chip small');
  if (!small) return;
  small.textContent = String(subscription.status).toLowerCase() === 'trialing' ? 'PRO TRIAL' : (String(subscription.plan).toLowerCase() === 'pro' ? 'PRO' : 'ACCOUNT');
}

function apply() {
  decoratePaywall();
  decorateAccountChip();
  renderTrialBanner();
}

const style = document.createElement('style');
style.textContent = '.trial-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px;padding:15px 17px;border:1px solid #b7dfc4;border-radius:14px;background:#f1fbf4}.trial-banner strong{display:block;font-size:14px}.trial-banner span{display:block;margin-top:3px;color:var(--muted);font-size:12px}.trial-banner .eyebrow{margin-bottom:4px}@media(max-width:600px){.trial-banner{align-items:flex-start;flex-direction:column}}';
document.head.appendChild(style);

new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
loadSubscription().then(apply).catch((error) => console.error('Trial UI failed', error));

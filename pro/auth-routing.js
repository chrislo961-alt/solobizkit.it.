import { supabase } from './backend.js';

const BIZKIT_ORIGIN = 'https://solobizkit.it.com';
const BIZKIT_PRO_URL = `${BIZKIT_ORIGIN}/pro/`;
const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
const originalReset = supabase.auth.resetPasswordForEmail.bind(supabase.auth);

function safeReturnTarget(raw) {
  if (!raw) return '';
  try {
    const url = new URL(String(raw), window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/pro/')) return '';
    const params = new URLSearchParams(url.search);
    for (const key of ['code','token_hash','type','recovery','checkout','error','error_code','error_description','returnTo']) params.delete(key);
    const search = params.toString();
    return `${url.pathname}${search ? `?${search}` : ''}${url.hash || ''}`;
  } catch {
    return '';
  }
}

function currentReturnTarget() {
  const explicit = new URLSearchParams(window.location.search).get('returnTo');
  const candidate = explicit || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const safe = safeReturnTarget(candidate);
  return safe && safe !== '/pro/' ? safe : '';
}

function signupRedirectUrl() {
  const url = new URL(BIZKIT_PRO_URL);
  const target = currentReturnTarget();
  if (target) url.searchParams.set('returnTo', target);
  return url.toString();
}

async function continueToRequestedPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('recovery') === '1') return;
  const target = safeReturnTarget(params.get('returnTo'));
  if (!target || target === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
  if (data?.session?.user?.id) window.location.replace(target);
}

supabase.auth.signUp = ((credentials) => {
  const options = credentials?.options || {};
  return originalSignUp({
    ...credentials,
    options: {
      ...options,
      emailRedirectTo: signupRedirectUrl(),
      data: {
        ...(options.data || {}),
        source_app: 'solobizkit',
      },
    },
  });
});

supabase.auth.resetPasswordForEmail = ((email, options = {}) => {
  return originalReset(email, {
    ...options,
    redirectTo: `${BIZKIT_PRO_URL}?recovery=1`,
  });
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user?.id) setTimeout(() => continueToRequestedPage(), 0);
});
setTimeout(() => continueToRequestedPage(), 0);

window.sbkAuthRouting = {
  app: 'solobizkit',
  redirect: BIZKIT_PRO_URL,
  signupRedirect: signupRedirectUrl(),
};

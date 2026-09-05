import { supabase } from './backend.js';

const app = document.querySelector('#app');
const LOADING_TEXT = 'Loading your workspace';
const STALL_MS = 8000;

// Supabase currently documents a deadlock risk when async Supabase calls are
// awaited directly inside onAuthStateChange callbacks. Defer every consumer
// callback so the auth callback itself returns immediately.
if (!supabase.auth.__sbkDeferredAuthCallbacks) {
  const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);
  supabase.auth.onAuthStateChange = (callback) => originalOnAuthStateChange((event, session) => {
    setTimeout(() => {
      Promise.resolve(callback(event, session)).catch((error) => {
        console.error('[SoloBizKit Pro auth callback]', error);
      });
    }, 0);
  });
  Object.defineProperty(supabase.auth, '__sbkDeferredAuthCallbacks', { value: true });
}

let stallTimer = null;
let loadingStartedAt = 0;

function isWorkspaceLoading() {
  return Boolean(app && (app.textContent || '').includes(LOADING_TEXT));
}

function clearStallTimer() {
  if (stallTimer) clearTimeout(stallTimer);
  stallTimer = null;
  loadingStartedAt = 0;
}

function renderRecovery() {
  if (!app || !isWorkspaceLoading()) return;
  app.innerHTML = `
    <div class="auth-stage">
      <section class="auth-card" style="max-width:460px">
        <p class="eyebrow">SOLOBIZKIT PRO</p>
        <h2>We couldn’t finish loading your workspace.</h2>
        <p class="muted auth-copy">Your account data is still protected. This is usually a temporary session or network problem.</p>
        <div style="display:grid;gap:10px;margin-top:18px">
          <button class="btn primary" id="sbkRetryWorkspace" type="button">Try again</button>
          <button class="btn secondary" id="sbkSignOutRecovery" type="button">Sign out</button>
        </div>
        <p class="auth-message" id="sbkRecoveryMessage" style="margin-top:12px"></p>
      </section>
    </div>`;

  const retry = document.querySelector('#sbkRetryWorkspace');
  const signout = document.querySelector('#sbkSignOutRecovery');
  const message = document.querySelector('#sbkRecoveryMessage');

  retry?.addEventListener('click', async () => {
    retry.disabled = true;
    if (message) message.textContent = 'Refreshing your secure session…';
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('[SoloBizKit Pro retry]', error);
      if (message) message.textContent = 'Session refresh failed. Please sign in again.';
      retry.disabled = false;
    }
  });

  signout?.addEventListener('click', async () => {
    signout.disabled = true;
    if (message) message.textContent = 'Signing out…';
    try { await supabase.auth.signOut(); } catch (error) { console.error('[SoloBizKit Pro signout]', error); }
    window.location.replace('/pro/');
  });
}

function watchLoadingState() {
  if (!app) return;
  if (!isWorkspaceLoading()) {
    clearStallTimer();
    app.removeAttribute('aria-busy');
    return;
  }

  app.setAttribute('aria-busy', 'true');
  if (stallTimer) return;
  loadingStartedAt = Date.now();
  stallTimer = setTimeout(() => {
    stallTimer = null;
    if (isWorkspaceLoading() && Date.now() - loadingStartedAt >= STALL_MS - 100) renderRecovery();
  }, STALL_MS);
}

if (app) {
  const observer = new MutationObserver(watchLoadingState);
  observer.observe(app, { childList: true, subtree: true, characterData: true });
  watchLoadingState();
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[SoloBizKit Pro unhandled rejection]', event.reason);
  if (isWorkspaceLoading()) renderRecovery();
});

window.sbkProRuntimeGuard = {
  version: 1,
  retryTimeoutMs: STALL_MS,
  deferredAuthCallbacks: true,
};

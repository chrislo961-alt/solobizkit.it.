const CORE_WAIT_MS = 10000;
const LOADING_MARKERS = [
  'loading your workspace',
  'laster arbeidsområdet',
  'laddar arbetsytan',
  'arbeitsbereich wird geladen',
  'cargando tu espacio',
  'chargement de votre espace',
];

function isCoreLoading() {
  const app = document.querySelector('#app');
  if (!app) return false;
  const text = (app.textContent || '').toLowerCase();
  return LOADING_MARKERS.some((marker) => text.includes(marker));
}

function waitForCoreReady(timeoutMs = CORE_WAIT_MS) {
  const app = document.querySelector('#app');
  if (!app || (!isCoreLoading() && app.childElementCount > 0)) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(value);
    };
    const observer = new MutationObserver(() => {
      if (!isCoreLoading() && app.childElementCount > 0) finish(true);
    });
    observer.observe(app, { childList: true, subtree: true, characterData: true });
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

async function safeImport(path) {
  try {
    return await import(path);
  } catch (error) {
    console.warn(`[SoloBizKit Pro] Optional module failed: ${path}`, error);
    return null;
  }
}

// Core order is intentional. Auth routing and the runtime guard must be active
// before anything can subscribe to Supabase auth events.
await import('./auth-routing.js?v=20260905-4');
await import('./runtime-guard.js?v=20260905-4');
await import('./auth-recovery.js?v=20260905-4');
await import('./pro-app.js?v=20260905-4');

const coreReady = await waitForCoreReady();

if (!coreReady) {
  console.error('[SoloBizKit Pro] Core workspace did not settle within startup budget. Optional enhancements were not loaded.');
  window.sbkToast?.('Workspace startup took too long. Use Try again to refresh the secure session.', 'error');
} else if (!document.querySelector('#sbkRetryWorkspace')) {
  // Enhancements are deliberately loaded only after the core app has rendered.
  // This keeps first paint deterministic and prevents a startup storm of
  // duplicate workspace reads and MutationObserver races.
  await Promise.allSettled([
    safeImport('./deep-links.js?v=20260905-4'),
    safeImport('./document-print-v2.js?v=20260905-4'),
    safeImport('./document-defaults.js?v=20260905-4'),
    safeImport('./document-options-v2.js?v=20260905-4'),
    safeImport('./reminder-actions.js?v=20260905-4'),
    safeImport('./payment-actions.js?v=20260905-4'),
    safeImport('./email-actions-v2.js?v=20260905-4'),
  ]);

  await Promise.allSettled([
    safeImport('./customer-history.js?v=20260905-4'),
    safeImport('./customer-portal-actions.js?v=20260905-4'),
    safeImport('./customer-workspace-actions.js?v=20260905-4'),
    safeImport('./catalog/catalog-picker.js?v=20260905-4'),
    safeImport('./document-attachments.js?v=20260905-4'),
    safeImport('./activity-feed.js?v=20260905-4'),
    safeImport('./onboarding.js?v=20260905-4'),
    safeImport('./trial-ui.js?v=20260905-4'),
  ]);

  await Promise.allSettled([
    safeImport('./crm-dashboard-v2.js?v=20260905-4'),
    safeImport('./crm-ux-v3.js?v=20260905-4'),
    safeImport('./lead-followups.js?v=20260905-4'),
    safeImport('./document-ux-v2.js?v=20260905-4'),
    safeImport('./document-editor-v3.js?v=20260905-4'),
    safeImport('./funnel-analytics.js?v=20260905-4'),
  ]);
}

window.sbkProBoot = {
  version: 4,
  coreReady,
  bootedAt: new Date().toISOString(),
};

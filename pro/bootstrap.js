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

const V = '20260905-7';
await import(`./auth-routing.js?v=${V}`);
await import(`./runtime-guard.js?v=${V}`);
await import(`./auth-recovery.js?v=${V}`);
await import(`./pro-app.js?v=${V}`);

const coreReady = await waitForCoreReady();

if (!coreReady) {
  console.error('[SoloBizKit Pro] Core workspace did not settle within startup budget. Optional enhancements were not loaded.');
  window.sbkToast?.('Workspace startup took too long. Use Try again to refresh the secure session.', 'error');
} else if (!document.querySelector('#sbkRetryWorkspace')) {
  await Promise.allSettled([
    safeImport(`./deep-links.js?v=${V}`),
    safeImport(`./document-print-v2.js?v=${V}`),
    safeImport(`./document-defaults.js?v=${V}`),
    safeImport(`./document-options-v2.js?v=${V}`),
    safeImport(`./reminder-actions.js?v=${V}`),
    safeImport(`./payment-actions.js?v=${V}`),
    safeImport(`./email-actions-v2.js?v=${V}`),
  ]);

  await Promise.allSettled([
    safeImport(`./customer-history.js?v=${V}`),
    safeImport(`./customer-portal-actions.js?v=${V}`),
    safeImport(`./customer-workspace-actions.js?v=${V}`),
    safeImport(`./catalog/catalog-picker.js?v=${V}`),
    safeImport(`./document-attachments.js?v=${V}`),
    safeImport(`./activity-feed.js?v=${V}`),
    safeImport(`./onboarding.js?v=${V}`),
    safeImport(`./trial-ui.js?v=${V}`),
  ]);

  await Promise.allSettled([
    safeImport(`./crm-dashboard-v2.js?v=${V}`),
    safeImport(`./crm-ux-v3.js?v=${V}`),
    safeImport(`./lead-followups.js?v=${V}`),
    safeImport(`./document-ux-v2.js?v=${V}`),
    safeImport(`./document-editor-v3.js?v=${V}`),
    safeImport(`./funnel-analytics.js?v=${V}`),
  ]);
}

window.sbkProBoot = {
  version: 7,
  coreReady,
  bootedAt: new Date().toISOString(),
};

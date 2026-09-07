import { supabase } from './backend.js';

const DISMISS_KEY = 'solobizkit:onboarding:dismissed';
const COMPLETE_KEY = 'solobizkit:onboarding:complete-seen';
const IMPRESSION_KEY = 'solobizkit:onboarding:impression';
const EXPANDED_KEY = 'solobizkit:onboarding:expanded';
let lastSignature = '';
let currentUserId = null;
let refreshQueued = false;
let latestState = null;

const COPY = {
  en: {
    quickSetup:'QUICK SETUP', setupTitle:'Set up SoloBizKit', continueTitle:'Finish your setup', next:'Next', complete:'complete', showSteps:'Show all steps', hideSteps:'Hide steps', later:'Set up later', done:'Done',
    businessTitle:'Set up your business', businessText:'Add company, address, VAT/tax, currency and document defaults.', businessCta:'Set up business',
    paymentsTitle:'Add how customers should pay', paymentsText:'Add bank account, KID/reference or IBAN. Stripe links stay optional.', paymentsCta:'Add payment details',
    customerTitle:'Add your first customer', customerText:'Create one customer so quotes and invoices are ready to send.', customerCta:'Add customer',
    invoiceTitle:'Create your first invoice', invoiceText:'Build, preview and send your first professional invoice.', invoiceCta:'Create invoice',
    workspaceReady:'WORKSPACE READY', readyTitle:'Your SoloBizKit workspace is ready.', readyText:'Business details, payment information, a customer and an invoice are in place.', addCustomer:'Add customer', createEstimate:'Create estimate'
  },
  no: {
    quickSetup:'HURTIGOPPSETT', setupTitle:'Sett opp SoloBizKit', continueTitle:'Fullfør oppsettet', next:'Neste', complete:'fullført', showSteps:'Vis alle steg', hideSteps:'Skjul steg', later:'Sett opp senere', done:'Ferdig',
    businessTitle:'Sett opp bedriften', businessText:'Legg inn bedrift, adresse, MVA/skatt, valuta og dokumentstandarder.', businessCta:'Sett opp bedriften',
    paymentsTitle:'Legg til hvordan kunder skal betale', paymentsText:'Legg inn bankkonto, KID/referanse eller IBAN. Stripe-lenker er valgfrie.', paymentsCta:'Legg til betalingsdetaljer',
    customerTitle:'Legg til din første kunde', customerText:'Opprett én kunde slik at tilbud og fakturaer er klare til å sendes.', customerCta:'Legg til kunde',
    invoiceTitle:'Opprett din første faktura', invoiceText:'Lag, forhåndsvis og send din første profesjonelle faktura.', invoiceCta:'Opprett faktura',
    workspaceReady:'ARBEIDSOMRÅDET ER KLART', readyTitle:'SoloBizKit-arbeidsområdet ditt er klart.', readyText:'Bedriftsdetaljer, betaling, en kunde og en faktura er på plass.', addCustomer:'Legg til kunde', createEstimate:'Opprett tilbud'
  },
  sv: {
    quickSetup:'SNABBSTART', setupTitle:'Konfigurera SoloBizKit', continueTitle:'Slutför konfigurationen', next:'Nästa', complete:'klart', showSteps:'Visa alla steg', hideSteps:'Dölj steg', later:'Konfigurera senare', done:'Klar',
    businessTitle:'Konfigurera företaget', businessText:'Lägg till företag, adress, moms/skatt, valuta och dokumentstandarder.', businessCta:'Konfigurera företaget',
    paymentsTitle:'Lägg till hur kunder ska betala', paymentsText:'Lägg till bankkonto, referens eller IBAN. Stripe-länkar är valfria.', paymentsCta:'Lägg till betalningsuppgifter',
    customerTitle:'Lägg till din första kund', customerText:'Skapa en kund så att offerter och fakturor är redo att skickas.', customerCta:'Lägg till kund',
    invoiceTitle:'Skapa din första faktura', invoiceText:'Skapa, förhandsgranska och skicka din första professionella faktura.', invoiceCta:'Skapa faktura',
    workspaceReady:'ARBETS YTAN ÄR KLAR', readyTitle:'Din SoloBizKit-arbetsyta är klar.', readyText:'Företagsuppgifter, betalning, en kund och en faktura är på plats.', addCustomer:'Lägg till kund', createEstimate:'Skapa offert'
  },
  de: {
    quickSetup:'SCHNELLSTART', setupTitle:'SoloBizKit einrichten', continueTitle:'Einrichtung abschließen', next:'Als Nächstes', complete:'abgeschlossen', showSteps:'Alle Schritte anzeigen', hideSteps:'Schritte ausblenden', later:'Später einrichten', done:'Fertig',
    businessTitle:'Unternehmen einrichten', businessText:'Unternehmen, Adresse, USt./Steuer, Währung und Dokumentvorgaben hinzufügen.', businessCta:'Unternehmen einrichten',
    paymentsTitle:'Zahlungsweise für Kunden hinzufügen', paymentsText:'Bankkonto, Referenz oder IBAN hinzufügen. Stripe-Links bleiben optional.', paymentsCta:'Zahlungsdaten hinzufügen',
    customerTitle:'Ersten Kunden hinzufügen', customerText:'Einen Kunden anlegen, damit Angebote und Rechnungen versandbereit sind.', customerCta:'Kunde hinzufügen',
    invoiceTitle:'Erste Rechnung erstellen', invoiceText:'Erste professionelle Rechnung erstellen, prüfen und versenden.', invoiceCta:'Rechnung erstellen',
    workspaceReady:'ARBEITSBEREICH BEREIT', readyTitle:'Dein SoloBizKit-Arbeitsbereich ist bereit.', readyText:'Unternehmensdaten, Zahlung, ein Kunde und eine Rechnung sind eingerichtet.', addCustomer:'Kunde hinzufügen', createEstimate:'Angebot erstellen'
  },
  es: {
    quickSetup:'CONFIGURACIÓN RÁPIDA', setupTitle:'Configura SoloBizKit', continueTitle:'Termina la configuración', next:'Siguiente', complete:'completado', showSteps:'Ver todos los pasos', hideSteps:'Ocultar pasos', later:'Configurar más tarde', done:'Listo',
    businessTitle:'Configura tu negocio', businessText:'Añade empresa, dirección, IVA/impuestos, moneda y valores de documentos.', businessCta:'Configurar negocio',
    paymentsTitle:'Añade cómo deben pagar los clientes', paymentsText:'Añade cuenta bancaria, referencia o IBAN. Los enlaces de Stripe son opcionales.', paymentsCta:'Añadir datos de pago',
    customerTitle:'Añade tu primer cliente', customerText:'Crea un cliente para tener presupuestos y facturas listos para enviar.', customerCta:'Añadir cliente',
    invoiceTitle:'Crea tu primera factura', invoiceText:'Crea, revisa y envía tu primera factura profesional.', invoiceCta:'Crear factura',
    workspaceReady:'ESPACIO LISTO', readyTitle:'Tu espacio de SoloBizKit está listo.', readyText:'Los datos del negocio, el pago, un cliente y una factura ya están configurados.', addCustomer:'Añadir cliente', createEstimate:'Crear presupuesto'
  },
  fr: {
    quickSetup:'CONFIGURATION RAPIDE', setupTitle:'Configurez SoloBizKit', continueTitle:'Terminez la configuration', next:'Suivant', complete:'terminé', showSteps:'Afficher toutes les étapes', hideSteps:'Masquer les étapes', later:'Configurer plus tard', done:'Terminé',
    businessTitle:'Configurez votre entreprise', businessText:'Ajoutez entreprise, adresse, TVA/taxes, devise et réglages des documents.', businessCta:'Configurer l’entreprise',
    paymentsTitle:'Ajoutez le mode de paiement des clients', paymentsText:'Ajoutez compte bancaire, référence ou IBAN. Les liens Stripe restent facultatifs.', paymentsCta:'Ajouter les informations de paiement',
    customerTitle:'Ajoutez votre premier client', customerText:'Créez un client pour préparer devis et factures à l’envoi.', customerCta:'Ajouter un client',
    invoiceTitle:'Créez votre première facture', invoiceText:'Créez, vérifiez et envoyez votre première facture professionnelle.', invoiceCta:'Créer une facture',
    workspaceReady:'ESPACE PRÊT', readyTitle:'Votre espace SoloBizKit est prêt.', readyText:'Les informations de l’entreprise, le paiement, un client et une facture sont configurés.', addCustomer:'Ajouter un client', createEstimate:'Créer un devis'
  }
};

function language() {
  const live = window.sbkI18n?.getLanguage?.();
  if (COPY[live]) return live;
  try { const stored = localStorage.getItem('sbk_language'); if (COPY[stored]) return stored; } catch (_) {}
  return 'en';
}
function tr(key) { return COPY[language()]?.[key] || COPY.en[key] || key; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[char]); }
function track(event, params = {}) { try { window.sbkTrack?.(event, params); } catch (_) {} }

async function getState(userId) {
  const [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase.from('company_settings').select('invoice_onboarding_completed,business_name,company_name,default_currency,bank_account,iban,bic_swift,payment_reference,payment_details').eq('user_id', userId).maybeSingle(),
    supabase.from('customers').select('id', { count:'exact', head:true }).eq('user_id', userId).eq('crm_archived', false),
    supabase.from('estimates').select('id', { count:'exact', head:true }).eq('user_id', userId),
    supabase.from('invoices').select('id', { count:'exact', head:true }).eq('user_id', userId),
    supabase.from('payments').select('id', { count:'exact', head:true }).eq('user_id', userId).eq('status', 'paid'),
  ]);
  for (const result of [settingsRes, customersRes, estimatesRes, invoicesRes, paymentsRes]) if (result.error) throw result.error;
  const settings = settingsRes.data || {};
  const hasCompany = Boolean(settings.business_name || settings.company_name);
  const hasPaymentDetails = Boolean(settings.bank_account || settings.iban || settings.payment_details || settings.payment_reference);
  return {
    setupDone:Boolean(settings.invoice_onboarding_completed) && hasCompany,
    paymentDetailsDone:hasPaymentDetails,
    customerDone:Number(customersRes.count || 0) > 0,
    estimateDone:Number(estimatesRes.count || 0) > 0,
    invoiceDone:Number(invoicesRes.count || 0) > 0,
    paymentDone:Number(paymentsRes.count || 0) > 0,
    hasPaymentDetails,
    currency:settings.default_currency || 'USD',
  };
}

function removeCard() { document.querySelector('#proOnboarding')?.remove(); }
function expandedKey() { return `${EXPANDED_KEY}:${currentUserId || 'guest'}`; }
function isExpanded() { try { return localStorage.getItem(expandedKey()) === '1'; } catch (_) { return false; } }
function setExpanded(value) { try { localStorage.setItem(expandedKey(), value ? '1' : '0'); } catch (_) {} }

function stepsFor(state) {
  return [
    { key:'business', done:state.setupDone, title:tr('businessTitle'), text:tr('businessText'), href:'/pro/settings/#business', cta:tr('businessCta') },
    { key:'payments', done:state.paymentDetailsDone, title:tr('paymentsTitle'), text:tr('paymentsText'), href:'/pro/settings/#payments', cta:tr('paymentsCta') },
    { key:'customer', done:state.customerDone, title:tr('customerTitle'), text:tr('customerText'), action:'customer', cta:tr('customerCta') },
    { key:'invoice', done:state.invoiceDone, title:tr('invoiceTitle'), text:tr('invoiceText'), action:'invoice', cta:tr('invoiceCta') },
  ];
}

function actionMarkup(step, primary = false) {
  if (step.done) return `<span class="onboarding-complete">✓ ${esc(tr('done'))}</span>`;
  const cls = primary ? 'btn primary onboarding-cta' : 'mini-btn';
  if (step.href) return `<a class="${cls}" href="${step.href}" data-onboarding-step="${step.key}">${esc(step.cta)}</a>`;
  return `<button class="${cls}" type="button" data-onboarding-action="${step.action}" data-onboarding-step="${step.key}">${esc(step.cta)}</button>`;
}

function render(state, force = false) {
  latestState = state;
  const app = document.querySelector('#app');
  if (!app || !document.querySelector('.app-shell') || !currentUserId) return;
  const isDashboard = (new URLSearchParams(location.search).get('view') || 'dashboard') === 'dashboard';
  if (!isDashboard || document.querySelector('.paywall-card') || document.querySelector('.auth-stage')) return removeCard();

  const steps = stepsFor(state);
  const complete = steps.filter((step) => step.done).length;
  const allDone = complete === steps.length;
  const next = steps.findIndex((step) => !step.done);
  const signature = JSON.stringify({ complete, next, paid:state.paymentDone, details:state.hasPaymentDetails, uid:currentUserId, lang:language(), expanded:isExpanded() });
  if (!force && signature === lastSignature && document.querySelector('#proOnboarding')) return;
  lastSignature = signature;
  removeCard();

  const impressionKey = `${IMPRESSION_KEY}:${currentUserId}`;
  if (!localStorage.getItem(impressionKey)) {
    localStorage.setItem(impressionKey, '1');
    track('pro_onboarding_viewed', { completed_steps:complete });
  }

  if (allDone) {
    const seenKey = `${COMPLETE_KEY}:${currentUserId}`;
    if (localStorage.getItem(seenKey)) return;
    const section = document.createElement('section');
    section.id = 'proOnboarding';
    section.className = 'onboarding-card onboarding-v2 onboarding-finished';
    section.innerHTML = `<div class="onboarding-finish-icon">✓</div><div class="onboarding-finish-copy"><p class="eyebrow">${esc(tr('workspaceReady'))}</p><h2>${esc(tr('readyTitle'))}</h2><p>${esc(tr('readyText'))}</p></div><div class="onboarding-finish-actions"><button class="mini-btn" type="button" data-onboarding-action="customer">${esc(tr('addCustomer'))}</button><a class="mini-btn" href="/pro/estimates/?new=1">${esc(tr('createEstimate'))}</a><button class="mini-btn" id="finishOnboarding" type="button">${esc(tr('done'))}</button></div>`;
    app.prepend(section);
    section.querySelector('#finishOnboarding').onclick = () => { localStorage.setItem(seenKey, '1'); track('pro_onboarding_completed'); removeCard(); };
    bindActions(section);
    return;
  }

  if (localStorage.getItem(DISMISS_KEY) === currentUserId) return removeCard();
  const nextStep = steps[next];
  const progress = Math.round((complete / steps.length) * 100);
  const expanded = isExpanded();
  const section = document.createElement('section');
  section.id = 'proOnboarding';
  section.className = `onboarding-card onboarding-v2${complete === 0 ? ' onboarding-first-run' : ''}`;
  section.innerHTML = `
    <div class="onboarding-compact-main">
      <div class="onboarding-compact-number">${next + 1}</div>
      <div class="onboarding-compact-copy">
        <div class="onboarding-compact-topline"><p class="eyebrow">${esc(tr('quickSetup'))}</p><span class="onboarding-progress-label">${complete}/4 ${esc(tr('complete'))} · ${progress}%</span></div>
        <h2>${esc(complete === 0 ? tr('setupTitle') : tr('continueTitle'))}</h2>
        <p class="onboarding-next-line"><strong>${esc(tr('next'))}:</strong> ${esc(nextStep.title)} — ${esc(nextStep.text)}</p>
        <div class="onboarding-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div>
      </div>
      <div class="onboarding-compact-actions">
        ${actionMarkup(nextStep, true)}
        <button class="mini-btn" id="toggleOnboardingSteps" type="button" aria-expanded="${expanded}">${esc(expanded ? tr('hideSteps') : tr('showSteps'))}</button>
        <button class="mini-btn onboarding-hide" id="dismissOnboarding" type="button">${esc(tr('later'))}</button>
      </div>
    </div>
    <div class="onboarding-details${expanded ? ' is-open' : ''}" id="onboardingDetails">
      <div class="onboarding-steps onboarding-v2-steps">
        ${steps.map((step, index) => `<article class="onboarding-step ${step.done ? 'done' : index === next ? 'next' : ''}"><div class="onboarding-check">${step.done ? '✓' : index + 1}</div><div class="onboarding-copy"><strong>${esc(step.title)}</strong><span>${esc(step.text)}</span></div><div class="onboarding-step-action">${actionMarkup(step, false)}</div></article>`).join('')}
      </div>
    </div>`;
  app.prepend(section);

  section.querySelector('#toggleOnboardingSteps').onclick = () => { setExpanded(!isExpanded()); render(state, true); };
  section.querySelector('#dismissOnboarding').onclick = () => { localStorage.setItem(DISMISS_KEY, currentUserId); track('pro_onboarding_dismissed', { completed_steps:complete }); removeCard(); };
  bindActions(section);
}

function bindActions(section) {
  section.querySelectorAll('[data-onboarding-step]').forEach((el) => el.addEventListener('click', () => track('pro_onboarding_step_clicked', { step:el.dataset.onboardingStep || 'unknown' })));
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
  const { data:{ session } } = await supabase.auth.getSession();
  currentUserId = session?.user?.id || null;
  if (!currentUserId) return removeCard();
  try { render(await getState(currentUserId)); }
  catch (error) { console.warn('Onboarding state unavailable', error); }
}
function scheduleRefresh() { if (refreshQueued) return; refreshQueued = true; setTimeout(refresh, 140); }

new MutationObserver(scheduleRefresh).observe(document.body, { childList:true, subtree:true });
supabase.auth.onAuthStateChange(() => scheduleRefresh());
window.addEventListener('focus', scheduleRefresh);
window.addEventListener('solobizkit:workspace-updated', scheduleRefresh);
window.addEventListener('sbk:languagechange', () => { lastSignature = ''; if (latestState) render(latestState, true); });
refresh();

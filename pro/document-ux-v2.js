import { getCompanySettings, getSession, loadWorkspace, saveEstimate, saveInvoice } from './backend.js';
import { nextInvoiceNumber, normalizeInvoiceStatus } from './pro-core.js';

const pageType = location.pathname.includes('/pro/estimates/') ? 'estimate' : 'invoice';
let session = null;
let busy = false;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days, base = new Date()) {
  const date = new Date(base);
  date.setDate(date.getDate() + Math.max(0, Number(days || 0)));
  return date.toISOString().slice(0, 10);
}

function normalizedPrefix(value, fallback) {
  const raw = String(value || fallback).trim().replace(/\s+/g, '');
  return raw.endsWith('-') ? raw : `${raw}-`;
}

function nextEstimateNumber(estimates, prefix = 'EST-') {
  const used = estimates.map((estimate) => Number(String(estimate.number || '').match(/(\d+)$/)?.[1] || 0));
  return `${normalizedPrefix(prefix, 'EST-')}${String(Math.max(1000, ...used) + 1).padStart(4, '0')}`;
}

function flash(message, tone = 'success') {
  let node = document.querySelector('#documentUxToast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'documentUxToast';
    node.className = 'doc-ux-toast';
    document.body.appendChild(node);
  }
  node.className = `doc-ux-toast ${tone}`;
  node.textContent = message;
  node.hidden = false;
  clearTimeout(node._hideTimer);
  node._hideTimer = setTimeout(() => { node.hidden = true; }, 2600);
}

async function workspace() {
  session ||= await getSession();
  if (!session?.user?.id) throw new Error('Sign in to continue.');
  return loadWorkspace(session.user.id);
}

async function duplicateInvoice(invoiceId) {
  if (busy) return;
  busy = true;
  try {
    const data = await workspace();
    const source = data.invoices.find((invoice) => invoice.id === invoiceId);
    if (!source) throw new Error('Invoice not found.');
    const settings = await getCompanySettings(session.user.id);
    const issueDate = todayISO();
    const saved = await saveInvoice(session.user.id, {
      customerId: source.customerId,
      number: nextInvoiceNumber(data.invoices),
      issueDate,
      dueDate: plusDaysISO(settings.paymentTermsDays ?? 14),
      status: 'draft',
      currency: source.currency || settings.defaultCurrency || 'USD',
      taxRate: Number(source.taxRate ?? settings.defaultTax ?? 0),
      lines: (source.lines || []).map((line) => ({ ...line })),
      notes: source.notes || '',
      persisted: false,
    });
    flash(`Created ${saved.number} as a new draft.`);
    setTimeout(() => { location.assign(`/pro/?view=invoices&invoice=${encodeURIComponent(saved.id)}`); }, 350);
  } catch (error) {
    console.error(error);
    flash(error?.message || 'Could not duplicate invoice.', 'error');
  } finally {
    busy = false;
  }
}

async function duplicateEstimate(estimateId) {
  if (busy) return;
  busy = true;
  try {
    const data = await workspace();
    const source = data.estimates.find((estimate) => estimate.id === estimateId);
    if (!source) throw new Error('Estimate not found.');
    const settings = await getCompanySettings(session.user.id);
    const saved = await saveEstimate(session.user.id, {
      customerId: source.customerId,
      number: nextEstimateNumber(data.estimates, settings.estimatePrefix),
      issueDate: todayISO(),
      validUntil: plusDaysISO(30),
      status: 'draft',
      currency: source.currency || settings.defaultCurrency || 'USD',
      taxRate: Number(source.taxRate ?? settings.defaultTax ?? 0),
      lines: (source.lines || []).map((line) => ({ ...line })),
      notes: source.notes || '',
      persisted: false,
    });
    flash(`Created ${saved.number} as a new draft.`);
    setTimeout(() => { location.assign('/pro/estimates/'); }, 350);
  } catch (error) {
    console.error(error);
    flash(error?.message || 'Could not duplicate estimate.', 'error');
  } finally {
    busy = false;
  }
}

async function duplicateLatest(type) {
  try {
    const data = await workspace();
    const items = type === 'invoice' ? data.invoices : data.estimates;
    const latest = [...items].sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0];
    if (!latest) {
      flash(`No ${type}s to reuse yet.`, 'error');
      return;
    }
    if (type === 'invoice') await duplicateInvoice(latest.id);
    else await duplicateEstimate(latest.id);
  } catch (error) {
    console.error(error);
    flash(error?.message || 'Could not reuse the latest document.', 'error');
  }
}

function invoiceStatus(invoice) {
  return normalizeInvoiceStatus(invoice);
}

function renderStatusGuide(type, items) {
  const existing = document.querySelector('.doc-ux-status-guide');
  if (existing) existing.remove();
  const toolbar = document.querySelector('.content .card .toolbar');
  if (!toolbar) return;

  const steps = type === 'invoice'
    ? [
        ['draft', 'Draft'],
        ['sent', 'Sent'],
        ['overdue', 'Overdue'],
        ['paid', 'Paid'],
      ]
    : [
        ['draft', 'Draft'],
        ['sent', 'Sent'],
        ['accepted', 'Accepted'],
        ['converted', 'Converted'],
        ['declined', 'Declined'],
      ];
  const count = (key) => items.filter((item) => (type === 'invoice' ? invoiceStatus(item) : item.status) === key).length;
  const guide = document.createElement('div');
  guide.className = 'doc-ux-status-guide';
  guide.innerHTML = `<div class="doc-ux-guide-copy"><strong>${type === 'invoice' ? 'Invoice flow' : 'Estimate flow'}</strong><span>${type === 'invoice' ? 'Draft → Sent → Paid' : 'Draft → Sent → Accepted → Converted'}</span></div><div class="doc-ux-status-chips">${steps.map(([key, label]) => `<button type="button" class="doc-ux-chip ${key}" data-doc-filter="${key}"><span>${esc(label)}</span><b>${count(key)}</b></button>`).join('')}<button type="button" class="doc-ux-chip all" data-doc-filter=""><span>All</span><b>${items.length}</b></button></div>`;
  toolbar.parentElement.insertBefore(guide, toolbar.nextSibling);
}

function addReuseButton(type) {
  const toolbar = document.querySelector('.content .card .toolbar');
  if (!toolbar || toolbar.querySelector('[data-duplicate-latest]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn secondary doc-ux-reuse';
  button.dataset.duplicateLatest = type;
  button.textContent = '↻ New from last';
  const primary = toolbar.querySelector('.btn.primary');
  if (primary) toolbar.insertBefore(button, primary);
  else toolbar.appendChild(button);
}

function addInvoiceDuplicateButtons() {
  document.querySelectorAll('[data-edit-invoice]').forEach((edit) => {
    const cell = edit.parentElement;
    if (!cell || cell.querySelector(`[data-duplicate-invoice="${CSS.escape(edit.dataset.editInvoice)}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.duplicateInvoice = edit.dataset.editInvoice;
    button.textContent = 'Duplicate';
    cell.insertBefore(button, edit.nextSibling);
  });
}

function addEstimateDuplicateButtons() {
  document.querySelectorAll('.estimate-actions [data-edit]').forEach((edit) => {
    const actions = edit.closest('.estimate-actions');
    if (!actions || actions.querySelector(`[data-duplicate-estimate="${CSS.escape(edit.dataset.edit)}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.duplicateEstimate = edit.dataset.edit;
    button.textContent = 'Duplicate';
    actions.insertBefore(button, edit.nextSibling);
  });
}

async function enhance() {
  const toolbar = document.querySelector('.content .card .toolbar');
  if (!toolbar) return;
  const type = location.pathname.includes('/pro/estimates/') ? 'estimate' : 'invoice';
  if (type === 'invoice' && !document.querySelector('#invoiceStatus')) return;
  if (type === 'estimate' && !document.querySelector('#estimateStatus')) return;

  addReuseButton(type);
  if (type === 'invoice') addInvoiceDuplicateButtons();
  else addEstimateDuplicateButtons();

  if (!toolbar.dataset.docUxCountsLoaded) {
    toolbar.dataset.docUxCountsLoaded = '1';
    try {
      const data = await workspace();
      renderStatusGuide(type, type === 'invoice' ? data.invoices : data.estimates);
    } catch (error) {
      console.error('Could not load document UX counts', error);
      delete toolbar.dataset.docUxCountsLoaded;
    }
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.duplicateInvoice) {
    event.preventDefault();
    event.stopImmediatePropagation();
    duplicateInvoice(button.dataset.duplicateInvoice);
    return;
  }
  if (button.dataset.duplicateEstimate) {
    event.preventDefault();
    event.stopImmediatePropagation();
    duplicateEstimate(button.dataset.duplicateEstimate);
    return;
  }
  if (button.dataset.duplicateLatest) {
    event.preventDefault();
    duplicateLatest(button.dataset.duplicateLatest);
    return;
  }
  if (button.hasAttribute('data-doc-filter')) {
    const select = document.querySelector(pageType === 'estimate' ? '#estimateStatus' : '#invoiceStatus');
    if (!select) return;
    select.value = button.dataset.docFilter || '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelectorAll('.doc-ux-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
  }
}, true);

const observer = new MutationObserver(() => {
  clearTimeout(observer._timer);
  observer._timer = setTimeout(enhance, 20);
});
observer.observe(document.body, { childList: true, subtree: true });

enhance();

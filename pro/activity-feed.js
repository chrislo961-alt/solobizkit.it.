import { supabase } from './backend.js';

const app = document.querySelector('#app');
const STORAGE_KEY = 'solobizkit_activity_last_seen';
let loading = false;
let lastSignature = '';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const money = (value, currency = 'USD') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0)); } catch { return `${Number(value || 0).toFixed(2)} ${currency}`; } };

function relativeTime(value) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time));
}

function customerLabel(map, id) {
  return map.get(id) || 'Customer';
}

function buildActivities({ invoices, estimates, recurring, customers }) {
  const names = new Map((customers || []).map((row) => [row.id, row.name || row.company || 'Customer']));
  const items = [];

  for (const row of invoices || []) {
    if (row.status === 'paid') {
      items.push({
        id: `invoice-paid:${row.id}:${row.updated_at || row.paid_date || ''}`,
        type: 'paid',
        title: `Invoice ${row.invoice_number} paid`,
        detail: `${customerLabel(names, row.customer_id)} · ${money(row.total, row.currency)}`,
        at: row.updated_at || (row.paid_date ? `${row.paid_date}T12:00:00Z` : row.created_at),
        href: `/pro/?view=invoices&invoice=${encodeURIComponent(row.id)}`,
      });
    } else if (row.status === 'overdue') {
      items.push({
        id: `invoice-overdue:${row.id}:${row.updated_at || ''}`,
        type: 'overdue',
        title: `Invoice ${row.invoice_number} is overdue`,
        detail: `${customerLabel(names, row.customer_id)} · ${money(row.total, row.currency)}`,
        at: row.updated_at || row.created_at,
        href: `/pro/?view=invoices&invoice=${encodeURIComponent(row.id)}`,
      });
    }
  }

  for (const row of estimates || []) {
    if (!['accepted', 'declined'].includes(row.status) || !row.responded_at) continue;
    items.push({
      id: `estimate-response:${row.id}:${row.responded_at}`,
      type: row.status,
      title: `Estimate ${row.estimate_number} ${row.status}`,
      detail: `${customerLabel(names, row.customer_id)} · ${money(row.total, row.currency)}`,
      at: row.responded_at,
      href: '/pro/estimates/',
    });
  }

  for (const row of recurring || []) {
    if (!row.last_generated_at || !row.last_invoice_id) continue;
    items.push({
      id: `recurring-generated:${row.id}:${row.last_generated_at}`,
      type: 'generated',
      title: `${row.name || 'Recurring invoice'} generated`,
      detail: customerLabel(names, row.customer_id),
      at: row.last_generated_at,
      href: `/pro/?view=invoices&invoice=${encodeURIComponent(row.last_invoice_id)}`,
    });
  }

  return items
    .filter((item) => item.at && Number.isFinite(new Date(item.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 12);
}

async function loadActivity() {
  if (loading || !app.querySelector('.dashboard-grid')) return;
  loading = true;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;
    const [invoiceRes, estimateRes, recurringRes, customerRes] = await Promise.all([
      supabase.from('invoices').select('id,customer_id,invoice_number,status,currency,total,paid_date,created_at,updated_at').eq('user_id', userId).in('status', ['paid', 'overdue']).order('updated_at', { ascending: false }).limit(20),
      supabase.from('estimates').select('id,customer_id,estimate_number,status,currency,total,responded_at').eq('user_id', userId).in('status', ['accepted', 'declined']).not('responded_at', 'is', null).order('responded_at', { ascending: false }).limit(20),
      supabase.from('recurring_invoice_profiles').select('id,customer_id,name,last_generated_at,last_invoice_id').eq('user_id', userId).not('last_generated_at', 'is', null).order('last_generated_at', { ascending: false }).limit(20),
      supabase.from('customers').select('id,name,company').eq('user_id', userId).limit(500),
    ]);
    for (const result of [invoiceRes, estimateRes, recurringRes, customerRes]) if (result.error) throw result.error;
    const items = buildActivities({ invoices: invoiceRes.data, estimates: estimateRes.data, recurring: recurringRes.data, customers: customerRes.data });
    renderActivity(items);
  } catch (error) {
    console.error('Could not load activity feed', error);
  } finally {
    loading = false;
  }
}

function renderActivity(items) {
  const dashboard = app.querySelector('.dashboard-grid');
  if (!dashboard) return;
  const signature = items.map((item) => item.id).join('|');
  if (signature === lastSignature && app.querySelector('#businessActivity')) return;
  lastSignature = signature;
  document.querySelector('#businessActivity')?.remove();

  const lastSeen = Number(localStorage.getItem(STORAGE_KEY) || 0);
  const unread = items.filter((item) => new Date(item.at).getTime() > lastSeen).length;
  const rows = items.length ? items.map((item) => `
    <a class="business-activity-item" href="${esc(item.href)}">
      <span class="activity-icon ${esc(item.type)}" aria-hidden="true"></span>
      <span class="activity-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span>
      <span class="activity-time">${esc(relativeTime(item.at))}</span>
    </a>`).join('') : '<div class="empty">No business activity yet. New payments, estimate responses and automation events will appear here.</div>';

  dashboard.insertAdjacentHTML('afterend', `<section class="card business-activity-card" id="businessActivity"><div class="card-head"><div><h2>Business activity ${unread ? `<span class="activity-count">${unread} new</span>` : ''}</h2><p class="muted activity-subtitle">Payments, customer responses, overdue invoices and automation.</p></div><button class="mini-btn" type="button" id="markActivityRead" ${unread ? '' : 'disabled'}>Mark read</button></div><div class="business-activity-list">${rows}</div></section>`);

  app.querySelector('#markActivityRead')?.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    renderActivity(items);
  });
}

const observer = new MutationObserver(() => {
  if (app.querySelector('.dashboard-grid')) loadActivity();
});
observer.observe(app, { childList: true, subtree: true });
window.addEventListener('focus', loadActivity);
setInterval(() => { if (document.visibilityState === 'visible') loadActivity(); }, 60000);
loadActivity();

import { getCompanySettings, getSession, supabase } from './backend.js';
import { scheduleInvoiceReminders } from './reminder-actions.js';
import { ensurePaymentLink } from './payment-actions.js';

let session = null;
let settings = null;
const esc = (v = '') => String(v).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' })[c]);
const money = (v, c = 'USD') => { try { return new Intl.NumberFormat(undefined, { style:'currency', currency:c }).format(Number(v) || 0); } catch { return `${Number(v || 0).toFixed(2)} ${c}`; } };
const isEmail = (v = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

async function ctx() {
  if (!session) session = await getSession();
  if (!session?.user?.id) throw new Error('Sign in first.');
  if (!settings) settings = await getCompanySettings(session.user.id);
}

async function fetchDoc(table, id) {
  const itemCol = table === 'invoices' ? 'invoice_items(*)' : 'estimate_items(*)';
  const { data, error } = await supabase.from(table).select(`*, ${itemCol}`).eq('id', id).eq('user_id', session.user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Document not found.');
  const customer = data.customer_id
    ? await supabase.from('customers').select('*').eq('id', data.customer_id).eq('user_id', session.user.id).maybeSingle()
    : { data:null, error:null };
  if (customer.error) throw customer.error;
  return { doc:data, customer:customer.data };
}

function ownEmail(to, subject, body) {
  window.location.href = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function dialog(type, number, to, subject, body, { invoice = false, hasExistingPayLink = false } = {}) {
  document.querySelector('#sendDocumentDialog')?.remove();
  const d = document.createElement('dialog');
  d.id = 'sendDocumentDialog';
  d.className = 'modal';
  d.innerHTML = `<div class="modal-card email-send-card">
    <div class="modal-head"><div><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Send ${esc(type)} ${esc(number)}</h2></div><button class="icon-btn" type="button" data-close>×</button></div>
    <div class="email-send-body">
      <label class="field"><span>Recipient</span><input class="input" type="email" id="sendRecipient" value="${esc(to || '')}" autocomplete="email"></label>
      <label class="field"><span>Subject</span><input class="input" id="sendSubject" value="${esc(subject)}"></label>
      <label class="field"><span>Message</span><textarea class="textarea" id="sendBody" rows="7">${esc(body)}</textarea></label>
      ${invoice ? `<div class="payment-choice"><div><strong>How should the customer pay?</strong><span>Bank/KID/IBAN from your invoice is always available. Stripe is optional.</span></div><label class="stripe-choice"><input type="checkbox" id="includeStripeLink" ${hasExistingPayLink ? 'checked' : ''}><span>Add a Stripe “Pay invoice” button</span></label></div>` : ''}
      <div class="send-trust"><span>✓ PDF attached</span><span>✓ Reply-to uses your business email</span>${invoice ? '<span>✓ Stripe only when you choose it</span>' : '<span>✓ Customer response link included</span>'}</div>
      <p class="auth-message" id="sendMessage"></p>
    </div>
    <div class="modal-actions"><button class="btn secondary" type="button" data-own>Use my email</button><button class="btn primary" type="button" data-secure>Send with SoloBizKit + PDF</button></div>
  </div>`;
  document.body.appendChild(d);
  d.querySelector('[data-close]').onclick = () => d.close();
  d.addEventListener('close', () => d.remove(), { once:true });
  d.showModal();
  return d;
}

function invoiceTemplate(doc, customer) {
  const company = settings?.companyName || 'our business';
  const subject = `Invoice ${doc.invoice_number} from ${company}`;
  const body = `Hello ${customer?.name || 'there'},\n\nPlease find invoice ${doc.invoice_number} attached.\n\nTotal: ${money(doc.total, doc.currency)}\nDue: ${doc.due_date || '—'}\n\nPayment instructions are included on the invoice.\n\nIf you have any questions, simply reply to this email.\n\nBest regards,\n${company}`;
  return { subject, body, paymentUrl:doc.payment_url || '' };
}

async function selectedPaymentUrl(d, doc, existingUrl) {
  const wantsStripe = Boolean(d.querySelector('#includeStripeLink')?.checked);
  if (!wantsStripe || ['paid','void'].includes(String(doc.status).toLowerCase())) return '';
  if (existingUrl) return existingUrl;
  const msg = d.querySelector('#sendMessage');
  if (msg) msg.textContent = 'Creating optional Stripe payment link…';
  return ensurePaymentLink(doc.id);
}

async function sendInvoice(id) {
  await ctx();
  const { doc, customer } = await fetchDoc('invoices', id);
  const template = invoiceTemplate(doc, customer);
  const d = dialog('invoice', doc.invoice_number, customer?.email, template.subject, template.body, { invoice:true, hasExistingPayLink:Boolean(template.paymentUrl) });
  const msg = d.querySelector('#sendMessage');

  d.querySelector('[data-own]').onclick = async () => {
    const recipient = d.querySelector('#sendRecipient').value.trim();
    if (recipient && !isEmail(recipient)) { msg.textContent = 'Enter a valid recipient email.'; return; }
    try {
      const paymentUrl = await selectedPaymentUrl(d, doc, template.paymentUrl);
      const base = d.querySelector('#sendBody').value;
      ownEmail(recipient, d.querySelector('#sendSubject').value.trim(), paymentUrl ? `${base}\n\nPay online securely: ${paymentUrl}` : base);
    } catch (error) {
      console.error(error);
      msg.textContent = error?.message || 'Could not create Stripe payment link. You can still send the invoice without Stripe.';
    }
  };

  d.querySelector('[data-secure]').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const recipient = d.querySelector('#sendRecipient').value.trim();
      const subject = d.querySelector('#sendSubject').value.trim();
      if (!isEmail(recipient)) throw new Error('Enter a valid recipient email.');
      if (!subject) throw new Error('Add an email subject.');
      const paymentUrl = await selectedPaymentUrl(d, doc, template.paymentUrl);
      msg.textContent = paymentUrl ? 'Sending invoice with PDF and Stripe link…' : 'Sending invoice with PDF…';
      const customBody = esc(d.querySelector('#sendBody').value).replace(/\n/g, '<br>');
      const payButton = paymentUrl ? `<p style="margin:24px 0"><a href="${esc(paymentUrl)}" style="display:inline-block;background:#2457f5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Pay invoice</a></p>` : '';
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px"><p>${customBody}</p>${payButton}<p style="margin-top:24px;color:#667085;font-size:12px">Payment instructions are also included in the attached invoice PDF.</p></div>`;
      const { data, error } = await supabase.functions.invoke('send-invoice-message', { body:{ invoiceId:id, kind:'invoice', recipient, subject, html, product:'solobizkit' } });
      if (error) throw error;
      if (!data?.sent) throw new Error(data?.error || 'Could not send invoice.');
      const today = new Date().toISOString().slice(0,10);
      const { error:updateError } = await supabase.from('invoices').update({ status:'sent', sent_date:today, updated_at:new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
      if (updateError) throw updateError;
      try { await scheduleInvoiceReminders(id, doc.due_date); } catch (reminderError) { console.warn('Invoice sent, reminder scheduling skipped', reminderError); }
      msg.textContent = `Sent with PDF${paymentUrl ? ' and optional Stripe link' : ''}. Replies go to ${data.replyTo || settings?.companyEmail || 'your business email'}.`;
      window.sbkTrack?.('pro_invoice_sent', { stripe_link:Boolean(paymentUrl) });
      setTimeout(() => { d.close(); location.reload(); }, 900);
    } catch (error) {
      console.error(error);
      msg.textContent = error?.message || 'Could not send invoice.';
      button.disabled = false;
    }
  };
}

async function sendEstimate(id) {
  await ctx();
  const { doc, customer } = await fetchDoc('estimates', id);
  const company = settings?.companyName || 'our business';
  const subject = `Estimate ${doc.estimate_number} from ${company}`;
  const body = `Hello ${customer?.name || 'there'},\n\nPlease find estimate ${doc.estimate_number}.\n\nTotal: ${money(doc.total, doc.currency)}\nValid until: ${doc.valid_until || '—'}\n\nYou can review, accept or decline the estimate online.\n\nBest regards,\n${company}`;
  const d = dialog('estimate', doc.estimate_number, customer?.email, subject, body);
  const msg = d.querySelector('#sendMessage');
  d.querySelector('[data-own]').onclick = () => ownEmail(d.querySelector('#sendRecipient').value.trim(), d.querySelector('#sendSubject').value.trim(), d.querySelector('#sendBody').value);
  d.querySelector('[data-secure]').onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    msg.textContent = 'Sending estimate with PDF and response link…';
    try {
      const recipient = d.querySelector('#sendRecipient').value.trim();
      const customSubject = d.querySelector('#sendSubject').value.trim();
      const customMessage = d.querySelector('#sendBody').value.trim();
      if (!isEmail(recipient)) throw new Error('Enter a valid recipient email.');
      const { data, error } = await supabase.functions.invoke('send-estimate-email', { body:{ estimateId:id, recipient, subject:customSubject, message:customMessage, product:'solobizkit' } });
      if (error) throw error;
      if (!data?.sent) throw new Error(data?.error || 'Could not send estimate.');
      msg.textContent = `Sent. The customer can accept or decline online and reply to ${data.replyTo || settings?.companyEmail || 'your business email'}.`;
      window.sbkTrack?.('pro_estimate_sent');
      setTimeout(() => { d.close(); location.reload(); }, 900);
    } catch (error) {
      console.error(error);
      msg.textContent = error?.message || 'Could not send estimate.';
      button.disabled = false;
    }
  };
}

function inject(root = document) {
  root.querySelectorAll('[data-edit-invoice]').forEach((edit) => {
    const id = edit.dataset.editInvoice;
    const cell = edit.parentElement;
    if (!cell || cell.querySelector(`[data-send-invoice="${id}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mini-btn'; button.dataset.sendInvoice = id; button.textContent = 'Send';
    cell.insertBefore(button, edit.nextSibling);
  });
  root.querySelectorAll('.estimate-actions').forEach((actions) => {
    const id = actions.querySelector('[data-edit]')?.dataset.edit;
    if (!id || actions.querySelector(`[data-send-estimate="${id}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'mini-btn'; button.dataset.sendEstimate = id; button.textContent = 'Send';
    actions.appendChild(button);
  });
}

document.addEventListener('click', (event) => {
  const inv = event.target.closest('[data-send-invoice]');
  if (inv) { event.preventDefault(); event.stopImmediatePropagation(); sendInvoice(inv.dataset.sendInvoice).catch((e) => window.sbkToast?.(e.message, 'error')); return; }
  const est = event.target.closest('[data-send-estimate]');
  if (est) { event.preventDefault(); event.stopImmediatePropagation(); sendEstimate(est.dataset.sendEstimate).catch((e) => window.sbkToast?.(e.message, 'error')); }
}, true);

const style = document.createElement('style');
style.textContent = '.email-send-card{max-width:700px}.email-send-body{display:grid;gap:16px}.email-send-body .field{display:grid;gap:7px}.email-send-body .field span{font-weight:700;font-size:13px}.payment-choice{display:grid;gap:10px;padding:14px;border:1px solid #dbe5f2;border-radius:12px;background:#f8fbff}.payment-choice>div strong,.payment-choice>div span{display:block}.payment-choice>div span{margin-top:4px;color:#60708d;font-size:12px}.stripe-choice{display:flex;gap:9px;align-items:center;font-weight:700;font-size:13px}.send-trust{display:flex;gap:8px;flex-wrap:wrap}.send-trust span{padding:7px 9px;border-radius:999px;background:#f2f6fd;color:#53647f;font-size:11px;font-weight:750}@media(max-width:600px){.modal-actions{display:grid}.modal-actions .btn{width:100%}}';
document.head.appendChild(style);
new MutationObserver(() => inject()).observe(document.body, { childList:true, subtree:true });
inject();
(async () => { try { session = await getSession(); if (session?.user?.id) settings = await getCompanySettings(session.user.id); } catch (error) { console.error(error); } })();

import { getCompanySettings, getSession, supabase } from './backend.js';

let session = null;
let settings = null;

function esc(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' })[char]); }
function stripHtml(value = '') { const div = document.createElement('div'); div.innerHTML = value; return div.textContent || ''; }
function money(value, currency='USD') { try { return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(value)||0); } catch { return `${Number(value||0).toFixed(2)} ${currency}`; } }

async function ensureContext() {
  if (!session) session = await getSession();
  if (session?.user?.id && !settings) settings = await getCompanySettings(session.user.id);
  if (!session?.user?.id) throw new Error('Sign in first.');
}

async function fetchInvoice(id) {
  const { data, error } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('user_id', session.user.id).maybeSingle();
  if (error) throw error; if (!data) throw new Error('Invoice not found.');
  const customer = data.customer_id ? await supabase.from('customers').select('*').eq('id', data.customer_id).eq('user_id', session.user.id).maybeSingle() : { data:null, error:null };
  if (customer.error) throw customer.error;
  return { document:data, customer:customer.data };
}

async function fetchEstimate(id) {
  const { data, error } = await supabase.from('estimates').select('*, estimate_items(*)').eq('id', id).eq('user_id', session.user.id).maybeSingle();
  if (error) throw error; if (!data) throw new Error('Estimate not found.');
  const customer = data.customer_id ? await supabase.from('customers').select('*').eq('id', data.customer_id).eq('user_id', session.user.id).maybeSingle() : { data:null, error:null };
  if (customer.error) throw customer.error;
  return { document:data, customer:customer.data };
}

function invoiceEmail(doc, customer) {
  const company = settings?.companyName || 'our business';
  const subject = `Invoice ${doc.invoice_number} from ${company}`;
  const body = `Hello ${customer?.name || 'there'},\n\nPlease find invoice ${doc.invoice_number} attached.\n\nTotal: ${money(doc.total, doc.currency)}\nDue: ${doc.due_date || '—'}\n\nIf you have any questions, simply reply to this email.\n\nBest regards,\n${company}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px"><h2>Invoice ${esc(doc.invoice_number)}</h2><p>Hello ${esc(customer?.name || 'there')},</p><p>Please find your invoice attached as a PDF.</p><div style="margin:20px 0;padding:16px;border:1px solid #ddd;border-radius:10px"><p style="margin:0"><strong>Total: ${esc(money(doc.total, doc.currency))}</strong></p><p style="margin:6px 0 0">Due: ${esc(doc.due_date || '—')}</p></div><p>If you have any questions, simply reply to this email.</p></div>`;
  return { subject, body, html };
}

function estimateEmail(doc, customer) {
  const company = settings?.companyName || 'our business';
  const subject = `Estimate ${doc.estimate_number} from ${company}`;
  const body = `Hello ${customer?.name || 'there'},\n\nPlease find estimate ${doc.estimate_number}.\n\nTotal: ${money(doc.total, doc.currency)}\nValid until: ${doc.valid_until || '—'}\n\nYou can review, accept or decline the estimate from the secure link in the SoloBizKit email, or reply to me directly.\n\nBest regards,\n${company}`;
  return { subject, body };
}

function openOwnEmail(to, subject, body) {
  const url = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

function makeDialog({ type, number, recipient, subject, body }) {
  document.querySelector('#sendDocumentDialog')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'sendDocumentDialog';
  dialog.className = 'modal';
  dialog.innerHTML = `<div class="modal-card email-send-card"><div class="modal-head"><div><p class="eyebrow">SOLOBIZKIT PRO</p><h2>Send ${esc(type)} ${esc(number)}</h2></div><button class="icon-btn" type="button" data-close>×</button></div><div class="email-send-body"><label class="field"><span>Recipient</span><input class="input" type="email" id="sendRecipient" value="${esc(recipient || '')}" required></label><label class="field"><span>Subject</span><input class="input" id="sendSubject" value="${esc(subject)}"></label><label class="field"><span>Message</span><textarea class="textarea" id="sendBody" rows="7">${esc(body)}</textarea></label><div class="paywall-notice"><strong>Use your own email:</strong> this opens Gmail/Outlook/your default mail app with the message filled in. Save the PDF with Print first, then attach it in your email app.</div><p class="auth-message" id="sendMessage"></p></div><div class="modal-actions email-send-actions"><button class="btn secondary" type="button" data-own-email>Use my email</button><button class="btn primary" type="button" data-send-secure>Send with SoloBizKit + PDF</button></div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove(), { once:true });
  dialog.showModal();
  return dialog;
}

async function sendInvoice(id) {
  await ensureContext();
  const { document:doc, customer } = await fetchInvoice(id);
  const template = invoiceEmail(doc, customer);
  const dialog = makeDialog({ type:'invoice', number:doc.invoice_number, recipient:customer?.email || '', subject:template.subject, body:template.body });
  const message = dialog.querySelector('#sendMessage');
  dialog.querySelector('[data-own-email]').onclick = () => openOwnEmail(dialog.querySelector('#sendRecipient').value.trim(), dialog.querySelector('#sendSubject').value.trim(), dialog.querySelector('#sendBody').value);
  dialog.querySelector('[data-send-secure]').onclick = async (event) => {
    const button = event.currentTarget; button.disabled = true; message.textContent = 'Sending invoice with PDF…';
    try {
      const recipient = dialog.querySelector('#sendRecipient').value.trim();
      const subject = dialog.querySelector('#sendSubject').value.trim();
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:640px"><p>${esc(dialog.querySelector('#sendBody').value).replace(/\n/g,'<br>')}</p></div>`;
      const { data, error } = await supabase.functions.invoke('send-invoice-message', { body:{ invoiceId:id, kind:'invoice', recipient, subject, html } });
      if (error) throw error; if (!data?.sent) throw new Error(data?.error || 'Could not send invoice.');
      const { error:updateError } = await supabase.from('invoices').update({ status:'sent', sent_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
      if (updateError) throw updateError;
      message.textContent = `Sent. Replies go to ${data.replyTo || settings?.companyEmail || 'your business email'}.`;
      setTimeout(() => { dialog.close(); window.location.reload(); }, 900);
    } catch (error) { console.error(error); message.textContent = error?.message || 'Could not send invoice.'; button.disabled = false; }
  };
}

async function sendEstimate(id) {
  await ensureContext();
  const { document:doc, customer } = await fetchEstimate(id);
  const template = estimateEmail(doc, customer);
  const dialog = makeDialog({ type:'estimate', number:doc.estimate_number, recipient:customer?.email || '', subject:template.subject, body:template.body });
  const message = dialog.querySelector('#sendMessage');
  dialog.querySelector('[data-own-email]').onclick = () => openOwnEmail(dialog.querySelector('#sendRecipient').value.trim(), dialog.querySelector('#sendSubject').value.trim(), dialog.querySelector('#sendBody').value);
  dialog.querySelector('[data-send-secure]').onclick = async (event) => {
    const button = event.currentTarget; button.disabled = true; message.textContent = 'Sending estimate with PDF and response link…';
    try {
      const recipient = dialog.querySelector('#sendRecipient').value.trim();
      const { data, error } = await supabase.functions.invoke('send-estimate-email', { body:{ estimateId:id, recipient } });
      if (error) throw error; if (!data?.sent) throw new Error(data?.error || 'Could not send estimate.');
      message.textContent = `Sent. The customer can accept/decline online and reply to ${settings?.companyEmail || 'your business email'}.`;
      setTimeout(() => { dialog.close(); window.location.reload(); }, 900);
    } catch (error) { console.error(error); message.textContent = error?.message || 'Could not send estimate.'; button.disabled = false; }
  };
}

function injectButtons(root=document) {
  root.querySelectorAll('[data-edit-invoice]').forEach((edit) => {
    const id = edit.dataset.editInvoice; const cell = edit.parentElement; if (!cell || cell.querySelector(`[data-send-invoice="${id}"]`)) return;
    const button = document.createElement('button'); button.type='button'; button.className='mini-btn'; button.dataset.sendInvoice=id; button.textContent='Send'; cell.insertBefore(button, edit.nextSibling);
  });
  root.querySelectorAll('.estimate-actions').forEach((actions) => {
    const id = actions.querySelector('[data-edit]')?.dataset.edit; if (!id || actions.querySelector(`[data-send-estimate="${id}"]`)) return;
    const button = document.createElement('button'); button.type='button'; button.className='mini-btn'; button.dataset.sendEstimate=id; button.textContent='Send'; actions.appendChild(button);
  });
}

document.addEventListener('click', (event) => {
  const invoice = event.target.closest('[data-send-invoice]'); if (invoice) { event.preventDefault(); event.stopImmediatePropagation(); sendInvoice(invoice.dataset.sendInvoice).catch((e)=>alert(e.message)); return; }
  const estimate = event.target.closest('[data-send-estimate]'); if (estimate) { event.preventDefault(); event.stopImmediatePropagation(); sendEstimate(estimate.dataset.sendEstimate).catch((e)=>alert(e.message)); }
}, true);

const style = document.createElement('style'); style.textContent = `.email-send-card{max-width:680px}.email-send-body{display:grid;gap:16px}.email-send-body .field{display:grid;gap:7px}.email-send-body .field span{font-weight:700;font-size:13px}.email-send-actions{justify-content:flex-end;gap:10px}`; document.head.appendChild(style);
const observer = new MutationObserver(() => injectButtons()); observer.observe(document.body,{childList:true,subtree:true}); injectButtons();

(async()=>{ try { session=await getSession(); if(session?.user?.id) settings=await getCompanySettings(session.user.id); } catch(error){ console.error('Email actions init failed',error); } })();

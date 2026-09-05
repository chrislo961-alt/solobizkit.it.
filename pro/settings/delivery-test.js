import { getSession, supabase } from '../backend.js';

let injected = false;

async function sendTest(button, message) {
  button.disabled = true;
  message.textContent = 'Sending test email…';
  try {
    const session = await getSession();
    if (!session?.user?.email) throw new Error('Sign in again before testing email delivery.');
    const { data, error } = await supabase.functions.invoke('send-solobizkit-test-email', { body:{} });
    if (error) throw error;
    if (!data?.sent) throw new Error(data?.error || 'Could not send test email.');
    message.innerHTML = `Sent to <strong>${escapeHtml(data.recipient)}</strong>. Check Inbox and Spam/Junk. If it lands in spam, mark it as not spam before sending real customer documents.`;
    button.textContent = 'Send another test';
    window.sbkToast?.('Test email sent. Check Inbox and Spam/Junk.', 'success');
  } catch (error) {
    console.error(error);
    message.textContent = error?.message || 'Could not send test email.';
    window.sbkToast?.(message.textContent, 'error');
  } finally {
    button.disabled = false;
  }
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[char]);
}

function inject() {
  if (injected) return;
  const grid = document.querySelector('#app .settings-grid');
  if (!grid) return;
  injected = true;

  const section = document.createElement('section');
  section.className = 'settings-card';
  section.id = 'email-delivery';
  section.dataset.emailDeliveryTest = 'true';
  section.innerHTML = `
    <div class="split">
      <div>
        <p class="eyebrow">EMAIL DELIVERY</p>
        <h2>Test before you email customers</h2>
      </div>
      <span class="status paid">RESEND</span>
    </div>
    <p class="muted">Send a real delivery test to the email address on your SoloBizKit account. Use this before sending your first invoice or estimate.</p>
    <div class="delivery-checks">
      <span>1. Send the test</span>
      <span>2. Check Inbox</span>
      <span>3. Check Spam / Junk</span>
      <span>4. Reply once to verify Reply-To</span>
    </div>
    <div class="delivery-warning"><strong>Production check:</strong> if mail repeatedly lands in spam, verify SPF, DKIM and DMARC for the sending domain before inviting more customers.</div>
    <div class="save-row">
      <span class="save-state" data-delivery-message>No customer data is included in the test.</span>
      <button class="btn secondary" type="button" data-send-delivery-test>Send test email</button>
    </div>`;

  grid.appendChild(section);
  section.querySelector('[data-send-delivery-test]').onclick = (event) => sendTest(event.currentTarget, section.querySelector('[data-delivery-message]'));
}

const style = document.createElement('style');
style.textContent = `.delivery-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:16px 0}.delivery-checks span{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fafbfc;font-size:12px;font-weight:700}.delivery-warning{padding:12px 14px;border:1px solid #f2d29b;border-radius:10px;background:#fff9ed;color:#6f4b12;font-size:12px;line-height:1.5}@media(max-width:700px){.delivery-checks{grid-template-columns:1fr}}`;
document.head.appendChild(style);

new MutationObserver(inject).observe(document.querySelector('#app'), { childList:true, subtree:true });
inject();

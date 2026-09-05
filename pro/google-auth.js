import { supabase } from './backend.js';

const REDIRECT_URL = 'https://solobizkit.it.com/pro/';
let injecting = false;

function googleIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.93v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.53l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.8.5 3.84 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.94 5.47l3.34 2.6c.8-2.36 3-4.12 5.6-4.12Z"/></svg>';
}

async function startGoogle(button, message) {
  if (button.disabled) return;
  button.disabled = true;
  const original = button.innerHTML;
  button.innerHTML = '<span class="google-auth-spinner" aria-hidden="true"></span><span>Opening Google…</span>';
  if (message) message.textContent = '';

  try {
    sessionStorage.setItem('sbk_oauth_source', 'google');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: false,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Google sign-in is not available yet.');
  } catch (error) {
    console.error('Google sign-in failed', error);
    sessionStorage.removeItem('sbk_oauth_source');
    const raw = error?.message || 'Could not start Google sign-in.';
    const text = /provider.*not.*enabled|unsupported provider/i.test(raw)
      ? 'Google sign-in is not enabled on the authentication server yet.'
      : raw;
    if (message) message.textContent = text;
    else window.sbkToast?.(text, 'error');
    button.disabled = false;
    button.innerHTML = original;
  }
}

function inject() {
  if (injecting) return;
  const form = document.querySelector('#authForm');
  if (!form || form.querySelector('[data-google-auth]')) return;
  injecting = true;

  const message = form.querySelector('#authMessage');
  const firstLabel = form.querySelector('label');
  const block = document.createElement('div');
  block.className = 'google-auth-block';
  block.innerHTML = `
    <button class="google-auth-btn" type="button" data-google-auth>
      <span class="google-auth-icon">${googleIcon()}</span>
      <span>Continue with Google</span>
    </button>
    <div class="google-auth-divider"><span>or continue with email</span></div>`;

  form.insertBefore(block, firstLabel || form.firstChild);
  block.querySelector('[data-google-auth]').onclick = (event) => startGoogle(event.currentTarget, message);
  injecting = false;
}

const style = document.createElement('style');
style.textContent = `
.google-auth-block{display:grid;gap:12px;margin-bottom:2px}.google-auth-btn{appearance:none;width:100%;min-height:48px;border:1px solid #d7dfeb;border-radius:11px;background:#fff;color:#17213a;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:750;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:.15s}.google-auth-btn:hover{background:#f8faff;border-color:#b8c7df}.google-auth-btn:focus-visible{outline:3px solid rgba(36,87,245,.16);outline-offset:2px}.google-auth-btn:disabled{opacity:.65;cursor:progress}.google-auth-icon{width:20px;height:20px;display:inline-flex}.google-auth-icon svg{width:20px;height:20px}.google-auth-divider{display:flex;align-items:center;gap:12px;color:#8994a8;font-size:11px}.google-auth-divider:before,.google-auth-divider:after{content:"";height:1px;background:#e4e9f1;flex:1}.google-auth-divider span{white-space:nowrap}.google-auth-spinner{width:17px;height:17px;border:2px solid #d8e1ef;border-top-color:#2457f5;border-radius:50%;animation:googleSpin .7s linear infinite}@keyframes googleSpin{to{transform:rotate(360deg)}}@media(max-width:600px){.google-auth-btn{min-height:52px;font-size:16px}.google-auth-divider{font-size:10px}}
`;
document.head.appendChild(style);

const observer = new MutationObserver(inject);
observer.observe(document.querySelector('#app') || document.body, { childList:true, subtree:true });
inject();

window.SoloBizKitGoogleAuth = { start: () => supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:REDIRECT_URL } }) };

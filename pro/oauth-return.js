import { supabase } from './backend.js?v=20260906-11';

function cleanUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash && !/access_token=|refresh_token=/i.test(url.hash) ? url.hash : ''}` || '/pro/');
  } catch (_) {}
}

function oauthErrorFromUrl() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams((url.hash || '').replace(/^#/, ''));
  return url.searchParams.get('error_description') || hash.get('error_description') || url.searchParams.get('error') || hash.get('error');
}

async function consumeOAuthReturn() {
  const errorText = oauthErrorFromUrl();
  if (errorText) {
    console.error('[SoloBizKit OAuth]', errorText);
    sessionStorage.setItem('sbk_oauth_error', errorText);
    cleanUrl();
    return { ok:false, error:errorText };
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const hash = new URLSearchParams((url.hash || '').replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data?.session) throw new Error('Google sign-in returned without a session.');
      sessionStorage.setItem('sbk_oauth_completed', '1');
      sessionStorage.removeItem('sbk_oauth_source');
      cleanUrl();
      return { ok:true, session:data.session, mode:'pkce' };
    }

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({ access_token:accessToken, refresh_token:refreshToken });
      if (error) throw error;
      if (!data?.session) throw new Error('Google sign-in returned without a session.');
      sessionStorage.setItem('sbk_oauth_completed', '1');
      sessionStorage.removeItem('sbk_oauth_source');
      cleanUrl();
      return { ok:true, session:data.session, mode:'implicit' };
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data?.session && sessionStorage.getItem('sbk_oauth_source') === 'google') {
      sessionStorage.setItem('sbk_oauth_completed', '1');
      sessionStorage.removeItem('sbk_oauth_source');
      cleanUrl();
      return { ok:true, session:data.session, mode:'auto' };
    }

    return { ok:false, pending:false };
  } catch (error) {
    console.error('[SoloBizKit OAuth return]', error);
    sessionStorage.setItem('sbk_oauth_error', error?.message || 'Google sign-in could not be completed.');
    return { ok:false, error:error?.message || 'Google sign-in could not be completed.' };
  }
}

window.sbkOAuthReturn = await consumeOAuthReturn();

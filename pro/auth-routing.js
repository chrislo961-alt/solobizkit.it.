import { supabase } from './backend.js';

const BIZKIT_PRO_URL = 'https://solobizkit.it.com/pro/';
const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
const originalReset = supabase.auth.resetPasswordForEmail.bind(supabase.auth);

supabase.auth.signUp = ((credentials) => {
  const options = credentials?.options || {};
  return originalSignUp({
    ...credentials,
    options: {
      ...options,
      emailRedirectTo: BIZKIT_PRO_URL,
      data: {
        ...(options.data || {}),
        source_app: 'solobizkit',
      },
    },
  });
});

supabase.auth.resetPasswordForEmail = ((email, options = {}) => {
  return originalReset(email, {
    ...options,
    redirectTo: `${BIZKIT_PRO_URL}?recovery=1`,
  });
});

window.sbkAuthRouting = {
  app: 'solobizkit',
  redirect: BIZKIT_PRO_URL,
};

import { supabase } from './backend.js';

const app = document.querySelector('#app');
const STORAGE_KEY = 'sbk_language';
const supported = ['en', 'no', 'sv', 'de', 'es', 'fr'];

const copy = {
  en: {
    forgot: 'Forgot password?',
    enterEmail: 'Enter your email address first.',
    sending: 'Sending reset link…',
    resetSent: 'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.',
    signupNeutral: 'If this is a new email, check your inbox to confirm it. If you already have an account, sign in or reset your password.',
    recoveryTitle: 'Choose a new password',
    recoveryBody: 'Enter a new password for your SoloBizKit account.',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    savePassword: 'Save new password',
    mismatch: 'The passwords do not match.',
    minLength: 'Use at least 8 characters.',
    saving: 'Saving…',
    saved: 'Password updated. You can now sign in with your new password.',
    back: 'Back to sign in',
  },
  no: {
    forgot: 'Glemt passord?',
    enterEmail: 'Skriv inn e-postadressen først.',
    sending: 'Sender tilbakestillingslenke…',
    resetSent: 'Hvis det finnes en konto med denne e-posten, er en lenke for å tilbakestille passordet sendt. Sjekk innboksen og søppelpost.',
    signupNeutral: 'Hvis dette er en ny e-post, sjekk innboksen for å bekrefte den. Har du allerede en konto, logg inn eller tilbakestill passordet.',
    recoveryTitle: 'Velg et nytt passord',
    recoveryBody: 'Skriv inn et nytt passord for SoloBizKit-kontoen din.',
    newPassword: 'Nytt passord',
    confirmPassword: 'Bekreft passord',
    savePassword: 'Lagre nytt passord',
    mismatch: 'Passordene er ikke like.',
    minLength: 'Bruk minst 8 tegn.',
    saving: 'Lagrer…',
    saved: 'Passordet er oppdatert. Du kan nå logge inn med det nye passordet.',
    back: 'Tilbake til innlogging',
  },
  sv: {
    forgot: 'Glömt lösenord?', enterEmail: 'Ange din e-postadress först.', sending: 'Skickar återställningslänk…',
    resetSent: 'Om det finns ett konto med den här e-postadressen har en återställningslänk skickats. Kontrollera inkorgen och skräpposten.',
    signupNeutral: 'Om detta är en ny e-postadress, kontrollera inkorgen för att bekräfta den. Har du redan ett konto kan du logga in eller återställa lösenordet.',
    recoveryTitle: 'Välj ett nytt lösenord', recoveryBody: 'Ange ett nytt lösenord för ditt SoloBizKit-konto.', newPassword: 'Nytt lösenord', confirmPassword: 'Bekräfta lösenord', savePassword: 'Spara nytt lösenord', mismatch: 'Lösenorden matchar inte.', minLength: 'Använd minst 8 tecken.', saving: 'Sparar…', saved: 'Lösenordet har uppdaterats. Du kan nu logga in med ditt nya lösenord.', back: 'Tillbaka till inloggning',
  },
  de: {
    forgot: 'Passwort vergessen?', enterEmail: 'Gib zuerst deine E-Mail-Adresse ein.', sending: 'Link zum Zurücksetzen wird gesendet…',
    resetSent: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen gesendet. Prüfe Posteingang und Spam.',
    signupNeutral: 'Wenn dies eine neue E-Mail-Adresse ist, bestätige sie über deinen Posteingang. Wenn du bereits ein Konto hast, melde dich an oder setze dein Passwort zurück.',
    recoveryTitle: 'Neues Passwort wählen', recoveryBody: 'Gib ein neues Passwort für dein SoloBizKit-Konto ein.', newPassword: 'Neues Passwort', confirmPassword: 'Passwort bestätigen', savePassword: 'Neues Passwort speichern', mismatch: 'Die Passwörter stimmen nicht überein.', minLength: 'Verwende mindestens 8 Zeichen.', saving: 'Speichern…', saved: 'Passwort aktualisiert. Du kannst dich jetzt mit dem neuen Passwort anmelden.', back: 'Zurück zur Anmeldung',
  },
  es: {
    forgot: '¿Olvidaste la contraseña?', enterEmail: 'Introduce primero tu correo electrónico.', sending: 'Enviando enlace de recuperación…',
    resetSent: 'Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña. Revisa la bandeja de entrada y spam.',
    signupNeutral: 'Si es un correo nuevo, revisa tu bandeja para confirmarlo. Si ya tienes una cuenta, inicia sesión o restablece la contraseña.',
    recoveryTitle: 'Elige una nueva contraseña', recoveryBody: 'Introduce una nueva contraseña para tu cuenta SoloBizKit.', newPassword: 'Nueva contraseña', confirmPassword: 'Confirmar contraseña', savePassword: 'Guardar nueva contraseña', mismatch: 'Las contraseñas no coinciden.', minLength: 'Usa al menos 8 caracteres.', saving: 'Guardando…', saved: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.', back: 'Volver al inicio de sesión',
  },
  fr: {
    forgot: 'Mot de passe oublié ?', enterEmail: 'Saisissez d’abord votre adresse e-mail.', sending: 'Envoi du lien de réinitialisation…',
    resetSent: 'Si un compte existe avec cette adresse, un lien de réinitialisation a été envoyé. Vérifiez votre boîte de réception et les courriers indésirables.',
    signupNeutral: 'S’il s’agit d’une nouvelle adresse, consultez votre boîte de réception pour la confirmer. Si vous avez déjà un compte, connectez-vous ou réinitialisez votre mot de passe.',
    recoveryTitle: 'Choisissez un nouveau mot de passe', recoveryBody: 'Saisissez un nouveau mot de passe pour votre compte SoloBizKit.', newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmer le mot de passe', savePassword: 'Enregistrer le nouveau mot de passe', mismatch: 'Les mots de passe ne correspondent pas.', minLength: 'Utilisez au moins 8 caractères.', saving: 'Enregistrement…', saved: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.', back: 'Retour à la connexion',
  },
};

function language() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return supported.includes(value) ? value : 'en';
  } catch {
    return 'en';
  }
}

function text() { return copy[language()] || copy.en; }

function installForgotPassword() {
  const form = document.querySelector('#authForm');
  if (!form || form.querySelector('#forgotPassword')) return;
  const create = form.querySelector('#createAccount');
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'forgotPassword';
  button.className = 'mini-btn';
  button.style.cssText = 'border:0;background:transparent;box-shadow:none;margin:2px auto 0;padding:6px 8px;text-decoration:underline;text-underline-offset:3px;';
  button.textContent = text().forgot;
  create?.insertAdjacentElement('afterend', button);
  button.addEventListener('click', async () => {
    const email = String(form.elements.email?.value || '').trim();
    const message = form.querySelector('#authMessage');
    if (!email) {
      if (message) message.textContent = text().enterEmail;
      form.elements.email?.focus();
      return;
    }
    button.disabled = true;
    if (message) message.textContent = text().sending;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/pro/?recovery=1` });
      if (error) throw error;
      if (message) message.textContent = text().resetSent;
    } catch (error) {
      console.error(error);
      if (message) message.textContent = text().resetSent;
    } finally {
      button.disabled = false;
    }
  });
}

function correctSignupMessage() {
  const message = document.querySelector('#authMessage');
  if (!message) return;
  const current = (message.textContent || '').trim();
  const legacy = [
    'Check your email to confirm your account, then sign in.',
    'Sjekk e-posten for å bekrefte kontoen, og logg deretter inn.',
    'Kontrollera din e-post för att bekräfta kontot och logga sedan in.',
    'Prüfe deine E-Mail, um dein Konto zu bestätigen, und melde dich danach an.',
    'Revisa tu correo para confirmar tu cuenta y luego inicia sesión.',
    'Consultez votre e-mail pour confirmer votre compte, puis connectez-vous.',
  ];
  if (legacy.includes(current)) message.textContent = text().signupNeutral;
}

function renderRecovery() {
  if (!app) return;
  const t = text();
  document.querySelector('.app-shell')?.classList.add('signed-out');
  const title = document.querySelector('#pageTitle');
  if (title) title.textContent = t.recoveryTitle;
  app.innerHTML = `<div class="auth-stage"><section class="auth-card"><p class="eyebrow">SOLOBIZKIT PRO</p><h2>${t.recoveryTitle}</h2><p class="muted auth-copy">${t.recoveryBody}</p><form id="recoveryForm" class="auth-form"><label>${t.newPassword}<input class="input" name="password" type="password" autocomplete="new-password" minlength="8" required></label><label>${t.confirmPassword}<input class="input" name="confirm" type="password" autocomplete="new-password" minlength="8" required></label><button class="btn primary" type="submit">${t.savePassword}</button><a class="mini-btn" href="/pro/" style="text-align:center">${t.back}</a><p class="auth-message" id="recoveryMessage"></p></form></section></div>`;
  const form = app.querySelector('#recoveryForm');
  const message = app.querySelector('#recoveryMessage');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = String(form.elements.password?.value || '');
    const confirm = String(form.elements.confirm?.value || '');
    if (password.length < 8) { message.textContent = t.minLength; return; }
    if (password !== confirm) { message.textContent = t.mismatch; return; }
    message.textContent = t.saving;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { message.textContent = error.message; return; }
    message.textContent = t.saved;
    setTimeout(async () => {
      await supabase.auth.signOut().catch(() => {});
      window.location.replace('/pro/');
    }, 900);
  });
}

let recoveryMode = new URLSearchParams(location.search).get('recovery') === '1';
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    recoveryMode = true;
    setTimeout(renderRecovery, 0);
  }
});

const observer = new MutationObserver(() => {
  if (recoveryMode) return;
  installForgotPassword();
  correctSignupMessage();
});
observer.observe(document.body, { childList: true, subtree: true });

if (recoveryMode) setTimeout(renderRecovery, 0);
else {
  installForgotPassword();
  correctSignupMessage();
}

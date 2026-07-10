/* stick — sign-in (same mechanism as m2py): email magic-code via the Anvil
   backend at mdataapi.anvil.app, token kept in localStorage. A pasted shared
   access code also works — it is validated server-side by the edge function.
   Alternatively the user can store their own Anthropic API key (BYOK) — it
   unlocks the create panel without sign-in and pays for their own calls.

   Exposes window.StickAuth = { token, user, kind, apiKey, isLoggedIn(),
   hasAccess(), setApiKey(), forgetApiKey(), showKeyEntry(), onChange(fn), logout() }. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const AUTH_BASE = 'https://mdataapi.anvil.app/_/api';
  const LS_T = 'stick.token', LS_U = 'stick.user', LS_K = 'stick.tokenKind';
  const LS_A = 'stick.apiKey';

  const listeners = [];
  const Auth = (window.StickAuth = {
    token: localStorage.getItem(LS_T) || '',
    user: safeParse(localStorage.getItem(LS_U)),
    kind: localStorage.getItem(LS_K) || 'anvil', // 'anvil' | 'shared'
    apiKey: localStorage.getItem(LS_A) || '',
    isLoggedIn() { return !!Auth.token; },
    hasAccess() { return !!Auth.token || !!Auth.apiKey; },
    setApiKey, forgetApiKey,
    showKeyEntry() { showLogin(3); },
    onChange(fn) { listeners.push(fn); },
    logout,
  });

  function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function emit() { updateHeader(); listeners.forEach(fn => { try { fn(); } catch (e) {} }); }

  function persist(token, user, kind) {
    Auth.token = token; Auth.user = user || null; Auth.kind = kind;
    localStorage.setItem(LS_T, token);
    localStorage.setItem(LS_K, kind);
    if (user) localStorage.setItem(LS_U, JSON.stringify(user));
    else localStorage.removeItem(LS_U);
    emit();
  }

  /* remember=true keeps the key across visits (localStorage); false keeps it
     for this page load only — gone on refresh. */
  function setApiKey(key, remember) {
    Auth.apiKey = key;
    if (remember) localStorage.setItem(LS_A, key);
    else localStorage.removeItem(LS_A);
    emit();
  }

  function forgetApiKey() {
    Auth.apiKey = '';
    localStorage.removeItem(LS_A);
    emit();
  }

  function logoutLocal() {
    Auth.token = ''; Auth.user = null;
    localStorage.removeItem(LS_T);
    localStorage.removeItem(LS_U);
    localStorage.removeItem(LS_K);
    emit();
  }

  async function logout() {
    const t = Auth.token;
    logoutLocal();
    if (t && Auth.kind !== 'shared') {
      try {
        await fetch(AUTH_BASE + '/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + t },
        });
      } catch (e) { /* best effort */ }
    }
  }

  async function requestCode(email) {
    const res = await fetch(AUTH_BASE + '/auth/email/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang: 'en' }),
    });
    if (!res.ok) throw new Error((await res.text()) || ('HTTP ' + res.status));
    return res.json();
  }

  /* Verify against Anvil; a long code that Anvil rejects is treated as a
     shared access code (validated by the edge function on first use). */
  async function verifyCode(code) {
    try {
      const res = await fetch(AUTH_BASE + '/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.token) {
          persist(data.token, data.user, 'anvil');
          return true;
        }
      }
    } catch (e) { /* fall through to shared-code path */ }
    if (code.length >= 16) {
      persist(code, { email: 'shared access code' }, 'shared');
      return true;
    }
    throw new Error('Code is invalid or expired.');
  }

  async function refreshMe() {
    if (!Auth.token || Auth.kind === 'shared') return;
    try {
      const res = await fetch(AUTH_BASE + '/auth/me', {
        headers: { 'Authorization': 'Bearer ' + Auth.token },
      });
      if (res.status === 401) { logoutLocal(); return; }
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.user) {
        Auth.user = data.user;
        localStorage.setItem(LS_U, JSON.stringify(data.user));
        emit();
      }
    } catch (e) { /* offline — keep local state */ }
  }

  /* ---------------- header + modal UI ---------------- */
  function updateHeader() {
    const logged = Auth.isLoggedIn();
    const keyed = !logged && !!Auth.apiKey;
    const btn = $('btnLogin'), box = $('userBox');
    if (!btn || !box) return;
    btn.classList.toggle('hidden', logged || keyed);
    box.classList.toggle('hidden', !(logged || keyed));
    if (logged) {
      $('userEmail').textContent = (Auth.user && (Auth.user.email || Auth.user.display_name)) || 'signed in';
      $('btnLogout').textContent = 'Sign out';
    } else if (keyed) {
      $('userEmail').textContent = 'your API key';
      $('btnLogout').textContent = 'Remove key';
    }
  }

  function setStep(n) {
    $('loginStep1').classList.toggle('hidden', n !== 1);
    $('loginStep2').classList.toggle('hidden', n !== 2);
    $('loginStep3').classList.toggle('hidden', n !== 3);
    $('loginErr').textContent = '';
  }
  function showLogin(step) {
    $('loginBackdrop').classList.add('open');
    setStep(step || 1);
    setTimeout(() => {
      const el = step === 2 ? $('loginCode') : step === 3 ? $('loginApiKey') : $('loginEmail');
      if (el) el.focus();
    }, 60);
  }
  function hideLogin() { $('loginBackdrop').classList.remove('open'); }

  async function onSend() {
    const email = ($('loginEmail').value || '').trim();
    if (!email || email.indexOf('@') < 1) { $('loginErr').textContent = 'Enter a valid email address.'; return; }
    $('btnSendCode').disabled = true;
    $('loginErr').textContent = '';
    try {
      await requestCode(email);
      setStep(2);
      $('loginSentNote').textContent = 'Code sent to ' + email + '. Paste the code from the email (the part after ?login= in the link).';
      setTimeout(() => $('loginCode').focus(), 60);
    } catch (e) {
      $('loginErr').textContent = 'Could not send the code: ' + e.message;
    } finally {
      $('btnSendCode').disabled = false;
    }
  }

  async function onVerify() {
    const code = ($('loginCode').value || '').trim();
    if (!code) { $('loginErr').textContent = 'Paste the code first.'; return; }
    $('btnVerify').disabled = true;
    $('loginErr').textContent = '';
    try {
      await verifyCode(code);
      hideLogin();
    } catch (e) {
      $('loginErr').textContent = e.message || 'Code is invalid or expired.';
    } finally {
      $('btnVerify').disabled = false;
    }
  }

  function onSaveKey() {
    const key = ($('loginApiKey').value || '').trim();
    if (!key) { $('loginErr').textContent = 'Paste your API key first.'; return; }
    if (!key.startsWith('sk-ant-')) {
      $('loginErr').textContent = 'That does not look like an Anthropic key — it should start with sk-ant-.';
      return;
    }
    setApiKey(key, $('chkRememberKey').checked);
    $('loginApiKey').value = '';
    hideLogin();
  }

  async function handleLoginParam() {
    const params = new URLSearchParams(location.search);
    const code = params.get('login');
    if (!code) return;
    try { await verifyCode(code); } catch (e) { /* show modal so the user can retry */ showLogin(2); }
    params.delete('login');
    const qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  window.addEventListener('DOMContentLoaded', () => {
    $('btnLogin').addEventListener('click', () => showLogin(1));
    // one button, two meanings: signed in → sign out; key-only → forget the key
    $('btnLogout').addEventListener('click', () => { if (Auth.isLoggedIn()) logout(); else forgetApiKey(); });
    $('btnSendCode').addEventListener('click', onSend);
    $('btnVerify').addEventListener('click', onVerify);
    $('btnSaveKey').addEventListener('click', onSaveKey);
    $('lnkUseKey').addEventListener('click', e => { e.preventDefault(); setStep(3); setTimeout(() => $('loginApiKey').focus(), 60); });
    $('lnkBackFromKey').addEventListener('click', e => { e.preventDefault(); setStep(1); });
    $('loginApiKey').addEventListener('keydown', e => { if (e.key === 'Enter') onSaveKey(); });
    $('lnkHaveCode').addEventListener('click', e => {
      e.preventDefault();
      $('loginSentNote').textContent = 'Paste your code (emailed code or shared access code).';
      setStep(2);
      setTimeout(() => $('loginCode').focus(), 60);
    });
    $('lnkBack').addEventListener('click', e => { e.preventDefault(); setStep(1); });
    $('loginBackdrop').addEventListener('click', e => { if (e.target === $('loginBackdrop')) hideLogin(); });
    $('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') onSend(); });
    $('loginCode').addEventListener('keydown', e => { if (e.key === 'Enter') onVerify(); });

    updateHeader();
    handleLoginParam();
    refreshMe();
  });
})();

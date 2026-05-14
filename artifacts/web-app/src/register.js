import './css/style.css';
import { register, onAuthState } from './js/auth.js';
import { updateUserSettings } from './js/db.js';
import { setLoading } from './js/ui.js';
import { logActivity } from './js/activity.js';
import { FIREBASE_CONFIGURED } from './js/firebase-config.js';

onAuthState(user => { if (user) window.location.href = '/dashboard.html'; });

if (localStorage.getItem('aly-dark') === 'true') {
  document.documentElement.classList.add('dark');
}

if (!FIREBASE_CONFIGURED) {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('hidden');
}

const form = document.getElementById('register-form');
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = document.getElementById('register-btn');
  const errEl = document.getElementById('register-error');
  if (errEl) errEl.classList.add('hidden');

  const businessName = form.business_name.value.trim();
  const email        = form.email.value.trim();
  const password     = form.password.value;
  const confirm      = form.confirm_password.value;

  if (!businessName || !email || !password) {
    if (errEl) { errEl.textContent = 'Please fill in all fields.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (password.length < 6) {
    if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); }
    return;
  }
  if (password !== confirm) {
    if (errEl) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); }
    return;
  }

  setLoading(btn, true);
  try {
    const user = await register(email, password, businessName);
    await updateUserSettings(user.uid, { businessName, email, createdAt: new Date().toISOString() });
    await logActivity(user.uid, 'register', `Welcome to Aly, ${businessName}!`);
    window.location.href = '/dashboard.html';
  } catch (err) {
    const msg = err.code === 'auth/email-already-in-use'
      ? 'An account with this email already exists.'
      : err.message || 'Registration failed. Please try again.';
    if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
  } finally {
    setLoading(btn, false, 'Create Account');
  }
});

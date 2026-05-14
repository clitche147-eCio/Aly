import './css/style.css';
import { login, onAuthState } from './js/auth.js';
import { showToast, setLoading } from './js/ui.js';
import { logActivity } from './js/activity.js';
import { FIREBASE_CONFIGURED } from './js/firebase-config.js';
import { resetPassword } from './js/auth.js';

// Redirect if already logged in
onAuthState(user => { if (user) window.location.href = '/dashboard.html'; });

// Init dark mode from saved pref
if (localStorage.getItem('aly-dark') === 'true') {
  document.documentElement.classList.add('dark');
}

// Show offline banner if Firebase not configured
if (!FIREBASE_CONFIGURED) {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('hidden');
}

// Login form
const form = document.getElementById('login-form');
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  if (errEl) errEl.classList.add('hidden');

  const email    = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    if (errEl) { errEl.textContent = 'Please fill in all fields.'; errEl.classList.remove('hidden'); }
    return;
  }

  setLoading(btn, true);
  try {
    const user = await login(email, password);
    await logActivity(user.uid, 'login', `Logged in as ${email}`);
    window.location.href = '/dashboard.html';
  } catch (err) {
    const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
      ? 'Invalid email or password.'
      : err.message || 'Login failed. Please try again.';
    if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
  } finally {
    setLoading(btn, false, 'Sign In');
  }
});

// Forgot password
document.getElementById('forgot-link')?.addEventListener('click', async e => {
  e.preventDefault();
  const form = document.getElementById('login-form');
  const email = form?.email?.value?.trim();
  if (!email) {
    alert('Please enter your email address first.');
    return;
  }
  try {
    await resetPassword(email);
    showToast('Password reset email sent! Check your inbox.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to send reset email.', 'error');
  }
});

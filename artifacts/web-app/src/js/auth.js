import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, FIREBASE_CONFIGURED } from './firebase-config.js';

// ─── Local-storage offline auth (when Firebase not configured) ───────────────
const LS_USER = 'aly-offline-user';

function lsGetUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)); } catch { return null; }
}
function lsSetUser(u) { localStorage.setItem(LS_USER, JSON.stringify(u)); }
function lsClearUser() { localStorage.removeItem(LS_USER); }

// ─── Public API ───────────────────────────────────────────────────────────────

/** Sign in with email + password */
export async function login(email, password) {
  if (FIREBASE_CONFIGURED) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }
  // Offline: match stored user
  const stored = lsGetUser();
  if (stored && stored.email === email && stored.password === password) {
    return stored;
  }
  throw new Error('Invalid email or password.');
}

/** Create account */
export async function register(email, password, businessName) {
  if (FIREBASE_CONFIGURED) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return { ...cred.user, businessName };
  }
  // Offline: save new user
  const user = { uid: 'local-' + Date.now(), email, password, businessName };
  lsSetUser(user);
  return user;
}

/** Sign out */
export async function logout() {
  if (FIREBASE_CONFIGURED) {
    await signOut(auth);
  } else {
    lsClearUser();
  }
}

/** Send password reset email */
export async function resetPassword(email) {
  if (FIREBASE_CONFIGURED) {
    await sendPasswordResetEmail(auth, email);
    return;
  }
  throw new Error('Password reset requires Firebase. Please configure Firebase first.');
}

/**
 * Listen for auth state changes.
 * Calls callback(user | null) — user has at least { uid, email }.
 */
export function onAuthState(callback) {
  if (FIREBASE_CONFIGURED) {
    onAuthStateChanged(auth, callback);
  } else {
    // Simulate async so callers can rely on it being async
    const user = lsGetUser();
    setTimeout(() => callback(user ? { uid: user.uid, email: user.email } : null), 0);
  }
}

/** Get current user synchronously (may be null before onAuthState fires) */
export function currentUser() {
  if (FIREBASE_CONFIGURED) return auth?.currentUser ?? null;
  const u = lsGetUser();
  return u ? { uid: u.uid, email: u.email } : null;
}

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ============================================================
// SETUP: Replace these values with your Firebase project config
// Steps:
//   1. Go to https://console.firebase.google.com
//   2. Create a project (or open existing one)
//   3. Go to Project Settings → Your Apps → Web App → SDK setup
//   4. Copy the firebaseConfig object values below
//   5. Enable Authentication (Email/Password) in Firebase Console
//   6. Enable Firestore Database in Firebase Console
// ============================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";

let _app = null, _auth = null, _db = null;

if (FIREBASE_CONFIGURED) {
  try {
    _app  = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
    console.log('[Aly] Firebase connected ✅');
  } catch (e) {
    console.error('[Aly] Firebase init failed:', e.message);
  }
} else {
  console.warn('[Aly] Firebase not configured — running in offline mode with localStorage.');
}

export const app  = _app;
export const auth = _auth;
export const db   = _db;

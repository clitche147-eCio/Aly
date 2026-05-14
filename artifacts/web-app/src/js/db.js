import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED } from './firebase-config.js';

// ─── localStorage helpers ─────────────────────────────────────────────────────
function lsKey(uid, col) { return `aly-${col}-${uid}`; }
function lsGet(uid, col) {
  try { return JSON.parse(localStorage.getItem(lsKey(uid, col))) || []; } catch { return []; }
}
function lsSet(uid, col, data) { localStorage.setItem(lsKey(uid, col), JSON.stringify(data)); }
function lsAdd(uid, col, item) {
  const arr = lsGet(uid, col);
  const record = { ...item, id: 'ls-' + Date.now() + '-' + Math.random().toString(36).slice(2) };
  arr.push(record);
  lsSet(uid, col, arr);
  return record;
}
function lsUpdate(uid, col, id, data) {
  const arr = lsGet(uid, col).map(r => r.id === id ? { ...r, ...data } : r);
  lsSet(uid, col, arr);
}
function lsDelete(uid, col, id) {
  lsSet(uid, col, lsGet(uid, col).filter(r => r.id !== id));
}

// ─── User Settings ────────────────────────────────────────────────────────────
const settingsKey = uid => `aly-settings-${uid}`;

export async function getUserSettings(uid) {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? snap.data() : {};
    } catch { return {}; }
  }
  try { return JSON.parse(localStorage.getItem(settingsKey(uid))) || {}; } catch { return {}; }
}

export async function updateUserSettings(uid, data) {
  if (FIREBASE_CONFIGURED && db) {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
    return;
  }
  const current = JSON.parse(localStorage.getItem(settingsKey(uid)) || '{}');
  localStorage.setItem(settingsKey(uid), JSON.stringify({ ...current, ...data }));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(uid) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, 'users', uid, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return lsGet(uid, 'products');
}

export async function addProduct(uid, data) {
  const now = new Date().toISOString();
  const product = { ...data, createdAt: now, updatedAt: now };
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, 'users', uid, 'products'), {
      ...product, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return { id: ref.id, ...product };
  }
  return lsAdd(uid, 'products', product);
}

export async function updateProduct(uid, id, data) {
  const updated = { ...data, updatedAt: new Date().toISOString() };
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, 'users', uid, 'products', id), {
      ...updated, updatedAt: serverTimestamp(),
    });
    return;
  }
  lsUpdate(uid, 'products', id, updated);
}

export async function deleteProduct(uid, id) {
  if (FIREBASE_CONFIGURED && db) {
    await deleteDoc(doc(db, 'users', uid, 'products', id));
    return;
  }
  lsDelete(uid, 'products', id);
}

// ─── Sales ────────────────────────────────────────────────────────────────────
export async function getSales(uid) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, 'users', uid, 'sales'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const sales = lsGet(uid, 'sales');
  return [...sales].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function addSale(uid, data) {
  const sale = { ...data, date: new Date().toISOString() };
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, 'users', uid, 'sales'), {
      ...sale, date: serverTimestamp(),
    });
    return { id: ref.id, ...sale };
  }
  return lsAdd(uid, 'sales', sale);
}

// ─── Activities ───────────────────────────────────────────────────────────────
export async function getActivities(uid) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, 'users', uid, 'activities'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const acts = lsGet(uid, 'activities');
  return [...acts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function addActivity(uid, data) {
  const activity = { ...data, timestamp: new Date().toISOString() };
  if (FIREBASE_CONFIGURED && db) {
    await addDoc(collection(db, 'users', uid, 'activities'), {
      ...activity, timestamp: serverTimestamp(),
    });
    return;
  }
  lsAdd(uid, 'activities', activity);
}

// ─── Real-time listener (Firestore only, falls back to no-op) ─────────────────
export function watchCollection(uid, col, callback) {
  if (!FIREBASE_CONFIGURED || !db) return () => {};
  const q = query(collection(db, 'users', uid, col), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

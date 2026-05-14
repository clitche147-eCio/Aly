import { updateUserSettings } from './db.js';

// ─── Dark Mode ────────────────────────────────────────────────────────────────
export function applyDark(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  const icon = document.getElementById('dark-icon');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  const settingToggle = document.getElementById('dark-mode-setting');
  if (settingToggle) settingToggle.checked = isDark;
}

export function initDarkMode() {
  const saved = localStorage.getItem('aly-dark') === 'true';
  applyDark(saved);
}

export async function toggleDark(uid, settings) {
  const isDark = document.documentElement.classList.contains('dark');
  const next = !isDark;
  applyDark(next);
  localStorage.setItem('aly-dark', String(next));
  if (uid) {
    settings.darkMode = next;
    await updateUserSettings(uid, { darkMode: next });
  }
}

// ─── Section Navigation ───────────────────────────────────────────────────────
const SECTION_TITLES = {
  overview: 'Overview',
  products: 'Products',
  sales: 'Sales',
  activity: 'Activity',
  settings: 'Settings',
};

export function showSection(name) {
  document.querySelectorAll('[data-section]').forEach(el => el.classList.add('hidden'));
  const target = document.querySelector(`[data-section="${name}"]`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = SECTION_TITLES[name] || name;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  if (!sidebar) return;
  const isOpen = !sidebar.classList.contains('-translate-x-full');
  const nextOpen = force !== undefined ? force : !isOpen;
  sidebar.classList.toggle('-translate-x-full', !nextOpen);
  overlay?.classList.toggle('hidden', !nextOpen);
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  info:    'bg-indigo-600 text-white',
  warning: 'bg-amber-500 text-white',
};
const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${TOAST_STYLES[type] || TOAST_STYLES.info}`;
  toast.innerHTML = `<span>${TOAST_ICONS[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
}

// ─── Button loading state ─────────────────────────────────────────────────────
export function setLoading(btn, loading, label = '') {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> Loading…`
    : label || btn.dataset.label || 'Submit';
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

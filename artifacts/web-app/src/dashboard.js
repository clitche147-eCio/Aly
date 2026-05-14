import './css/style.css';
import { onAuthState, logout } from './js/auth.js';
import { getUserSettings, updateUserSettings } from './js/db.js';
import { applyDark, toggleDark, showSection, toggleSidebar, showToast, formatCurrency } from './js/ui.js';
import { loadProducts, renderProducts, initProductHandlers } from './js/products.js';
import { loadSales, renderSales, renderSalesStats, initSalesHandlers } from './js/sales.js';
import { initCharts, updateCharts } from './js/analytics.js';
import { loadActivities, renderActivities, logActivity } from './js/activity.js';
import { FIREBASE_CONFIGURED } from './js/firebase-config.js';

// Global state
window.alyState = { user: null, products: [], sales: [], activities: [], settings: {} };

// ─── Boot sequence ────────────────────────────────────────────────────────────
onAuthState(async (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }
  window.alyState.user = user;

  try {
    // Load settings
    const settings = await getUserSettings(user.uid);
    window.alyState.settings = settings || {};

    // Apply dark mode
    const savedDark = localStorage.getItem('aly-dark') === 'true' || settings?.darkMode;
    applyDark(savedDark);

    // Update sidebar user info
    const businessName = settings?.businessName || user.email?.split('@')[0] || 'My Business';
    setUserDisplay(businessName, user.email);

    // Show Firebase status banner
    if (!FIREBASE_CONFIGURED) {
      document.getElementById('offline-banner')?.classList.remove('hidden');
    }

    // Load all data in parallel
    await Promise.all([
      loadProducts(user.uid),
      loadSales(user.uid),
      loadActivities(user.uid),
    ]);

    // Render everything
    renderProducts();
    renderSales();
    renderSalesStats();
    renderActivities();
    initCharts();
    updateStats();

    // Init all handlers
    initProductHandlers(user.uid);
    initSalesHandlers(user.uid);
    initSettingsHandlers(user.uid);

    // Hide loading overlay
    document.getElementById('loading-overlay')?.classList.add('hidden');
    document.getElementById('app-shell')?.classList.remove('invisible');

  } catch (err) {
    console.error('[Aly] Boot error:', err);
    showToast('Failed to load dashboard. Please refresh.', 'error');
    document.getElementById('loading-overlay')?.classList.add('hidden');
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  const { products, sales } = window.alyState;
  const revenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const expenses = window.alyState.settings.expenses || 0;
  const profit   = revenue - expenses;

  setEl('stat-revenue',  formatCurrency(revenue));
  setEl('stat-products', String(products.length));
  setEl('stat-sales',    String(sales.length));

  const profitEl = document.getElementById('stat-profit');
  if (profitEl) {
    profitEl.textContent  = (profit < 0 ? '-' : '') + formatCurrency(Math.abs(profit));
    profitEl.className    = 'stat-value ' + (profit >= 0 ? 'text-green-600' : 'text-red-500');
  }
  const profitLbl = document.getElementById('profit-label');
  if (profitLbl) profitLbl.textContent = profit >= 0 ? '↑ Net Profit' : '↓ Net Loss';
}
window.updateStats  = updateStats;
window.updateCharts = updateCharts;

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setUserDisplay(name, email) {
  setEl('user-business', name);
  setEl('user-email',    email || '');
  setEl('user-initial',  (name[0] || '?').toUpperCase());
}

// ─── Navigation ───────────────────────────────────────────────────────────────
document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.nav);
    if (window.innerWidth < 1024) toggleSidebar(false);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await logActivity(window.alyState.user?.uid, 'logout', 'Logged out of Aly');
  await logout();
  window.location.href = '/login.html';
});

// ─── Dark mode toggle ─────────────────────────────────────────────────────────
document.getElementById('dark-toggle')?.addEventListener('click', () => {
  toggleDark(window.alyState.user?.uid, window.alyState.settings);
  // Re-render charts with new color scheme after short delay
  setTimeout(updateCharts, 50);
});

// ─── Mobile sidebar ───────────────────────────────────────────────────────────
document.getElementById('menu-toggle')?.addEventListener('click', () => toggleSidebar());
document.getElementById('overlay')?.addEventListener('click', () => toggleSidebar(false));

// ─── Settings section ─────────────────────────────────────────────────────────
function initSettingsHandlers(uid) {
  const nameInput   = document.getElementById('settings-name');
  const saveBtn     = document.getElementById('settings-save');
  const darkSetting = document.getElementById('dark-mode-setting');
  const expenseInput = document.getElementById('settings-expenses');

  if (nameInput) nameInput.value = window.alyState.settings.businessName || '';
  if (expenseInput) expenseInput.value = window.alyState.settings.expenses || '';
  if (darkSetting) {
    darkSetting.checked = document.documentElement.classList.contains('dark');
    darkSetting.addEventListener('change', () => {
      toggleDark(uid, window.alyState.settings);
      setTimeout(updateCharts, 50);
    });
  }

  saveBtn?.addEventListener('click', async () => {
    const name     = nameInput?.value.trim();
    const expenses = parseFloat(expenseInput?.value) || 0;
    if (!name) { showToast('Business name cannot be empty.', 'warning'); return; }

    window.alyState.settings.businessName = name;
    window.alyState.settings.expenses     = expenses;
    await updateUserSettings(uid, { businessName: name, expenses });
    setUserDisplay(name, window.alyState.user?.email);
    updateStats();
    showToast('Settings saved!', 'success');
    await logActivity(uid, 'settings', `Updated business settings`);
  });
}

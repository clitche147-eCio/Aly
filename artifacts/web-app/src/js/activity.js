import { getActivities, addActivity } from './db.js';
import { timeAgo } from './ui.js';

const ICONS = {
  login:           '🔐',
  logout:          '🚪',
  product_added:   '📦',
  product_updated: '✏️',
  product_deleted: '🗑️',
  sale_recorded:   '💰',
  settings:        '⚙️',
  register:        '🎉',
};

export async function loadActivities(uid) {
  const activities = await getActivities(uid);
  window.alyState.activities = activities;
  return activities;
}

export async function logActivity(uid, type, description) {
  if (!uid) return;
  const activity = { type, description };
  await addActivity(uid, activity);
  // Prepend to local state for instant UI update
  window.alyState.activities = [
    { id: 'temp-' + Date.now(), type, description, timestamp: new Date().toISOString() },
    ...(window.alyState.activities || []),
  ].slice(0, 100); // keep last 100
  renderActivities();
}

export function renderActivities() {
  const container = document.getElementById('activity-list');
  if (!container) return;

  const activities = window.alyState.activities || [];

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="text-4xl mb-3">📋</div>
        <p class="text-slate-500 dark:text-slate-400 font-medium">No activity yet</p>
        <p class="text-slate-400 dark:text-slate-500 text-sm mt-1">Actions you take will appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = activities.map(a => `
    <div class="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
        ${ICONS[a.type] || '📌'}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-slate-700 dark:text-slate-300">${escHtml(a.description)}</p>
        <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">${timeAgo(a.timestamp)}</p>
      </div>
    </div>
  `).join('');
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

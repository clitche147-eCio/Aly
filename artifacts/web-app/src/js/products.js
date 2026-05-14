import { getProducts, addProduct, updateProduct, deleteProduct } from './db.js';
import { openModal, closeModal, showToast, formatCurrency, formatDate, setLoading } from './ui.js';
import { logActivity } from './activity.js';

let searchQuery = '';
let sortKey = 'name';
let sortDir = 1;
let editingId = null;

export async function loadProducts(uid) {
  const products = await getProducts(uid);
  window.alyState.products = products;
  return products;
}

export function renderProducts() {
  const container = document.getElementById('products-table-body');
  const emptyState = document.getElementById('products-empty');
  const tableWrap = document.getElementById('products-table-wrap');
  if (!container) return;

  let items = [...(window.alyState.products || [])];

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.size?.toLowerCase().includes(q)
    );
  }

  // Sort
  items.sort((a, b) => {
    let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    if (typeof av === 'number') return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  if (items.length === 0) {
    emptyState?.classList.remove('hidden');
    tableWrap?.classList.add('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');

  container.innerHTML = items.map(p => {
    const lowStock = (p.quantity ?? 0) <= 5;
    return `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      <td class="td font-medium text-slate-900 dark:text-white">${esc(p.name)}</td>
      <td class="td">${formatCurrency(p.price)}</td>
      <td class="td">
        <span class="${lowStock ? 'badge-red' : 'badge-green'}">${p.quantity ?? 0}</span>
      </td>
      <td class="td text-slate-500 dark:text-slate-400">${esc(p.size || '—')}</td>
      <td class="td text-slate-400 dark:text-slate-500 text-xs">${formatDate(p.createdAt)}</td>
      <td class="td">
        <div class="flex items-center gap-2">
          <button onclick="window.editProduct('${p.id}')" class="btn-ghost text-xs px-2 py-1 rounded-md">Edit</button>
          <button onclick="window.confirmDelete('${p.id}','${esc(p.name)}')" class="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

export function initProductHandlers(uid) {
  // Search
  const searchInput = document.getElementById('product-search');
  searchInput?.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderProducts();
  });

  // Sort headers
  document.querySelectorAll('[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) { sortDir *= -1; }
      else { sortKey = key; sortDir = 1; }
      renderProducts();
    });
  });

  // Add product button
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    editingId = null;
    resetProductForm();
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-submit-btn').textContent = 'Add Product';
    openModal('product-modal');
  });

  // Close modal buttons
  document.getElementById('product-modal-close')?.addEventListener('click', () => closeModal('product-modal'));
  document.getElementById('product-modal-cancel')?.addEventListener('click', () => closeModal('product-modal'));

  // Submit form
  const form = document.getElementById('product-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('product-submit-btn');
    const label = btn.textContent;
    setLoading(btn, true);

    const data = {
      name:     form.p_name.value.trim(),
      price:    parseFloat(form.p_price.value) || 0,
      quantity: parseInt(form.p_qty.value) || 0,
      size:     form.p_size.value.trim(),
    };

    try {
      if (editingId) {
        await updateProduct(uid, editingId, data);
        const idx = window.alyState.products.findIndex(p => p.id === editingId);
        if (idx >= 0) window.alyState.products[idx] = { ...window.alyState.products[idx], ...data };
        await logActivity(uid, 'product_updated', `Updated product "${data.name}"`);
        showToast('Product updated!', 'success');
      } else {
        const saved = await addProduct(uid, data);
        window.alyState.products.unshift(saved);
        await logActivity(uid, 'product_added', `Added product "${data.name}"`);
        showToast('Product added!', 'success');
      }
      closeModal('product-modal');
      renderProducts();
      window.updateStats?.();
      window.updateCharts?.();
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setLoading(btn, false, label);
    }
  });

  // Delete modal
  document.getElementById('delete-cancel')?.addEventListener('click', () => closeModal('delete-modal'));
  document.getElementById('delete-confirm')?.addEventListener('click', async () => {
    const id   = window._deleteId;
    const name = window._deleteName;
    if (!id) return;
    try {
      await deleteProduct(uid, id);
      window.alyState.products = window.alyState.products.filter(p => p.id !== id);
      await logActivity(uid, 'product_deleted', `Deleted product "${name}"`);
      showToast('Product deleted', 'info');
      closeModal('delete-modal');
      renderProducts();
      window.updateStats?.();
      window.updateCharts?.();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Global helpers for inline onclick
  window.editProduct = (id) => {
    const p = window.alyState.products.find(p => p.id === id);
    if (!p) return;
    editingId = id;
    const form = document.getElementById('product-form');
    form.p_name.value  = p.name    || '';
    form.p_price.value = p.price   || '';
    form.p_qty.value   = p.quantity ?? '';
    form.p_size.value  = p.size    || '';
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-submit-btn').textContent = 'Save Changes';
    openModal('product-modal');
  };

  window.confirmDelete = (id, name) => {
    window._deleteId   = id;
    window._deleteName = name;
    document.getElementById('delete-product-name').textContent = name;
    openModal('delete-modal');
  };
}

function resetProductForm() {
  const form = document.getElementById('product-form');
  if (form) form.reset();
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

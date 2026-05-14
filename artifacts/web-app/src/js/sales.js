import { getSales, addSale } from './db.js';
import { updateProduct } from './db.js';
import { showToast, formatCurrency, formatDateTime, setLoading, openModal } from './ui.js';
import { logActivity } from './activity.js';

export async function loadSales(uid) {
  const sales = await getSales(uid);
  window.alyState.sales = sales;
  return sales;
}

export function renderSales() {
  const tbody = document.getElementById('sales-table-body');
  const empty = document.getElementById('sales-empty');
  const table = document.getElementById('sales-table-wrap');
  if (!tbody) return;

  const sales = (window.alyState.sales || []).slice(0, 50); // show latest 50

  if (sales.length === 0) {
    empty?.classList.remove('hidden');
    table?.classList.add('hidden');
    return;
  }

  empty?.classList.add('hidden');
  table?.classList.remove('hidden');

  tbody.innerHTML = sales.map(s => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      <td class="td font-medium text-slate-900 dark:text-white">${esc(s.productName)}</td>
      <td class="td">${s.quantity}</td>
      <td class="td">${formatCurrency(s.unitPrice)}</td>
      <td class="td font-semibold text-green-600 dark:text-green-400">${formatCurrency(s.total)}</td>
      <td class="td text-slate-400 dark:text-slate-500 text-xs">${formatDateTime(s.date)}</td>
    </tr>
  `).join('');
}

export function renderSalesStats() {
  const sales = window.alyState.sales || [];
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  function total(from) {
    return sales.filter(s => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return d >= from;
    }).reduce((sum, s) => sum + (s.total || 0), 0);
  }

  const todayEl = document.getElementById('sales-today');
  const weekEl  = document.getElementById('sales-week');
  const monthEl = document.getElementById('sales-month');

  if (todayEl) todayEl.textContent = formatCurrency(total(startOfDay));
  if (weekEl)  weekEl.textContent  = formatCurrency(total(startOfWeek));
  if (monthEl) monthEl.textContent = formatCurrency(total(startOfMonth));
}

export function initSalesHandlers(uid) {
  // Populate product select when section becomes visible
  document.querySelector('[data-nav="sales"]')?.addEventListener('click', populateSaleProductSelect);

  // Form submit
  const form = document.getElementById('sale-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('sale-submit-btn');
    setLoading(btn, true);

    const productId = form.sale_product.value;
    const qty       = parseInt(form.sale_qty.value) || 0;

    if (!productId || qty <= 0) {
      showToast('Please select a product and enter a valid quantity.', 'warning');
      setLoading(btn, false, 'Record Sale');
      return;
    }

    const product = window.alyState.products.find(p => p.id === productId);
    if (!product) {
      showToast('Product not found.', 'error');
      setLoading(btn, false, 'Record Sale');
      return;
    }

    if ((product.quantity ?? 0) < qty) {
      showToast(`Not enough stock! Available: ${product.quantity}`, 'error');
      setLoading(btn, false, 'Record Sale');
      return;
    }

    try {
      const unitPrice = product.price;
      const total = unitPrice * qty;

      // Record sale
      const sale = await addSale(uid, {
        productId,
        productName: product.name,
        quantity: qty,
        unitPrice,
        total,
      });

      window.alyState.sales.unshift(sale);

      // Reduce stock
      const newQty = (product.quantity ?? 0) - qty;
      await updateProduct(uid, productId, { quantity: newQty });
      product.quantity = newQty;

      // Log activity
      await logActivity(uid, 'sale_recorded', `Sold ${qty}× "${product.name}" for ${formatCurrency(total)}`);

      showToast(`Sale recorded! +${formatCurrency(total)}`, 'success');
      form.reset();

      renderSales();
      renderSalesStats();
      window.updateStats?.();
      window.updateCharts?.();

      // Also update products table if visible
      const { renderProducts } = await import('./products.js');
      renderProducts();
    } catch (err) {
      showToast(err.message || 'Failed to record sale', 'error');
    } finally {
      setLoading(btn, false, 'Record Sale');
    }
  });

  // Initial populate
  populateSaleProductSelect();
}

export function populateSaleProductSelect() {
  const select = document.getElementById('sale-product-select');
  if (!select) return;
  const products = window.alyState.products || [];
  if (products.length === 0) {
    select.innerHTML = '<option value="">No products yet — add products first</option>';
    return;
  }
  select.innerHTML = `<option value="">Select a product…</option>` +
    products.map(p => `<option value="${p.id}">${esc(p.name)} (Stock: ${p.quantity ?? 0}) — ${formatCurrency(p.price)}</option>`).join('');
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

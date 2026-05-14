import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

let revenueChart = null;
let topProductsChart = null;
let monthlyChart = null;

function isDark() { return document.documentElement.classList.contains('dark'); }
function gridColor() { return isDark() ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.3)'; }
function labelColor() { return isDark() ? '#94a3b8' : '#64748b'; }

// ─── Revenue trend: last 7 days ───────────────────────────────────────────────
function getRevenueByDay() {
  const sales = window.alyState.sales || [];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date:  new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    });
  }
  return days.map(day => ({
    label: day.label,
    total: sales.filter(s => {
      const sd = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sd >= day.date && sd < new Date(day.date.getTime() + 86400000);
    }).reduce((sum, s) => sum + (s.total || 0), 0),
  }));
}

// ─── Top products by revenue ──────────────────────────────────────────────────
function getTopProducts() {
  const sales = window.alyState.sales || [];
  const map = {};
  sales.forEach(s => {
    const k = s.productName || 'Unknown';
    map[k] = (map[k] || 0) + (s.total || 0);
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

// ─── Monthly overview (current year) ─────────────────────────────────────────
function getMonthlyData() {
  const sales = window.alyState.sales || [];
  const year = new Date().getFullYear();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const totals = new Array(12).fill(0);
  sales.forEach(s => {
    const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
    if (d.getFullYear() === year) totals[d.getMonth()] += s.total || 0;
  });
  return { labels: months, data: totals };
}

// ─── Chart creation ───────────────────────────────────────────────────────────
export function initCharts() {
  const revenueCtx = document.getElementById('revenue-chart')?.getContext('2d');
  const productsCtx = document.getElementById('products-chart')?.getContext('2d');
  const monthlyCtx = document.getElementById('monthly-chart')?.getContext('2d');

  const days = getRevenueByDay();
  const topProds = getTopProducts();
  const monthly = getMonthlyData();

  const PALETTE = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6'];

  if (revenueCtx) {
    revenueChart = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: days.map(d => d.label),
        datasets: [{
          label: 'Revenue',
          data: days.map(d => d.total),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366f1',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: labelColor() } },
          y: { grid: { color: gridColor() }, ticks: { color: labelColor(), callback: v => '$'+v } },
        },
      },
    });
  }

  if (productsCtx) {
    topProductsChart = new Chart(productsCtx, {
      type: 'doughnut',
      data: {
        labels: topProds.length ? topProds.map(([k]) => k) : ['No sales yet'],
        datasets: [{
          data: topProds.length ? topProds.map(([,v]) => v) : [1],
          backgroundColor: topProds.length ? PALETTE : ['#e2e8f0'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: labelColor(), padding: 12, boxWidth: 12 } },
        },
      },
    });
  }

  if (monthlyCtx) {
    monthlyChart = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: monthly.labels,
        datasets: [{
          label: 'Revenue',
          data: monthly.data,
          backgroundColor: monthly.data.map(v => v > 0 ? 'rgba(99,102,241,0.8)' : 'rgba(239,68,68,0.7)'),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: labelColor() } },
          y: { grid: { color: gridColor() }, ticks: { color: labelColor(), callback: v => '$'+v } },
        },
      },
    });
  }

  window.updateCharts = updateCharts;
}

export function updateCharts() {
  const days = getRevenueByDay();
  const topProds = getTopProducts();
  const monthly = getMonthlyData();

  if (revenueChart) {
    revenueChart.data.datasets[0].data = days.map(d => d.total);
    revenueChart.options.scales.x.grid.color = gridColor();
    revenueChart.options.scales.y.grid.color = gridColor();
    revenueChart.update();
  }

  if (topProductsChart) {
    topProductsChart.data.labels = topProds.length ? topProds.map(([k]) => k) : ['No sales yet'];
    topProductsChart.data.datasets[0].data = topProds.length ? topProds.map(([,v]) => v) : [1];
    topProductsChart.data.datasets[0].backgroundColor = topProds.length
      ? ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6']
      : ['#e2e8f0'];
    topProductsChart.update();
  }

  if (monthlyChart) {
    monthlyChart.data.datasets[0].data = monthly.data;
    monthlyChart.data.datasets[0].backgroundColor = monthly.data.map(v => v > 0 ? 'rgba(99,102,241,0.8)' : 'rgba(239,68,68,0.7)');
    monthlyChart.options.scales.y.grid.color = gridColor();
    monthlyChart.update();
  }
}

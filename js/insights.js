/**
 * @fileoverview EcoIQ Insights Dashboard
 * @description Charts and AI analysis from tracker data
 * @module insights
 */

'use strict';

import { db, auth } from './firebase.js';
import { initAuth } from './auth.js';
import { getLevel } from './shared.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/** @type {Array<Object>} */
let history = [];

/** @type {Object} */
let stats = { points: 0, streak: 0, totalActions: 0, totalCO2: 0 };

/** @type {Chart|null} */
let donutChartInstance = null;

/** @type {Chart|null} */
let lineChartInstance  = null;

// Set Chart.js global defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color       = '#e2ffe2';
  Chart.defaults.font.family = 'Plus Jakarta Sans';
}

// ---- INIT ----
loadLocalData();
renderAll();

initAuth(
  async (user) => { await loadFirestoreData(user.uid); renderAll(); },
  () => {}
);

// Auto refresh every 10 seconds
setInterval(() => { loadLocalData(); renderAll(); }, 10000);

// Refresh button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('refreshBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      loadLocalData();
      renderAll();
      showRefreshToast();
    });
  }
});

/**
 * Loads from Firestore
 * @param {string} uid
 */
async function loadFirestoreData(uid) {
  try {
    const snap = await getDoc(doc(db, 'trackers', uid));
    if (snap.exists()) {
      const data = snap.data();
      history = data.history || [];
      stats   = data.stats   || stats;
      localStorage.setItem('ecoiq_tracker', JSON.stringify({ stats, history }));
    }
  } catch (err) {
    console.error('Firestore load error:', err);
  }
}

/** Loads from localStorage */
function loadLocalData() {
  try {
    const saved = localStorage.getItem('ecoiq_tracker');
    if (saved) {
      const data = JSON.parse(saved);
      history = data.history || [];
      stats   = data.stats   || stats;
    }
  } catch (err) {
    console.error('LocalStorage error:', err);
  }
}

/** Renders all components */
function renderAll() {
  renderSummary();
  renderCategoryBars();
  renderWeeklyBars();
  renderDonutChart();
  renderLineChart();
  renderLevelTrack();
  loadAIAnalysis();
}

/** Renders summary cards */
function renderSummary() {
  const totalCO2 = stats.totalCO2 || 0;
  const points   = stats.points   || 0;

  const catTotals = {};
  history.forEach(h => { catTotals[h.cat] = (catTotals[h.cat] || 0) + (h.co2 || 0); });
  const bestCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const el = (id) => document.getElementById(id);
  if (el('totalReduced'))  el('totalReduced').textContent = `${totalCO2.toFixed(1)} kg`;
  if (el('bestCategory'))  el('bestCategory').textContent = bestCat ? bestCat[0] : '—';
  if (el('activeDays'))    el('activeDays').textContent   = getActiveDays();
  if (el('ecoLevel'))      el('ecoLevel').textContent     = getLevel(points).name;
}

/** @returns {number} */
function getActiveDays() {
  return new Set(history.map(h => h.date)).size;
}

/** Renders category bars */
function renderCategoryBars() {
  const container = document.getElementById('categoryBars');
  if (!container) return;

  const cats = {
    transport: { icon: '🚗', label: 'Transport', co2: 0 },
    food:      { icon: '🍽️', label: 'Food',      co2: 0 },
    energy:    { icon: '⚡', label: 'Energy',    co2: 0 },
    shopping:  { icon: '🛍️', label: 'Shopping',  co2: 0 },
    nature:    { icon: '🌿', label: 'Nature',    co2: 0 },
  };

  history.forEach(h => { if (cats[h.cat]) cats[h.cat].co2 += (h.co2 || 0); });
  const maxCO2 = Math.max(...Object.values(cats).map(c => c.co2), 1);

  container.innerHTML = Object.entries(cats).map(([, cat]) => {
    const pct = Math.round((cat.co2 / maxCO2) * 100);
    return `
      <div class="cat-bar-item" role="group" aria-label="${cat.label}: ${cat.co2.toFixed(1)} kg CO₂ saved">
        <div class="cat-bar-label"><span aria-hidden="true">${cat.icon}</span> ${cat.label}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${pct}%"
            role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          </div>
        </div>
        <div class="cat-bar-val">${cat.co2.toFixed(1)} kg</div>
      </div>`;
  }).join('');
}

/** Renders weekly bar chart */
function renderWeeklyBars() {
  const container = document.getElementById('weeklyChart');
  if (!container) return;

  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const week  = [];

  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const pts = history.filter(h => h.date === key).reduce((s, h) => s + (h.points || 0), 0);
    week.push({ day: days[d.getDay()], pts, isToday: i === 0 });
  }

  const maxPts = Math.max(...week.map(w => w.pts), 1);
  container.innerHTML = week.map(w => {
    const h = Math.max((w.pts / maxPts) * 100, 3);
    return `
      <div class="week-bar-wrap" role="group" aria-label="${w.day}: ${w.pts} points">
        <div class="week-pts">${w.pts > 0 ? w.pts : ''}</div>
        <div class="week-bar${w.isToday ? ' today' : ''}" style="height:${h}%"
          role="img" aria-label="${w.day} ${w.pts} points"></div>
        <div class="week-day">${w.day}</div>
      </div>`;
  }).join('');
}

/** Renders donut chart */
function renderDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Set global defaults
  Chart.defaults.color       = '#e2ffe2';
  Chart.defaults.font.family = 'Plus Jakarta Sans';

  const cats = {
    transport: { label: 'Transport 🚗', co2: 0, color: '#3b82f6', border: '#1d4ed8' },
    food:      { label: 'Food 🍽️',      co2: 0, color: '#22c55e', border: '#15803d' },
    energy:    { label: 'Energy ⚡',    co2: 0, color: '#eab308', border: '#a16207' },
    shopping:  { label: 'Shopping 🛍️', co2: 0, color: '#a855f7', border: '#7e22ce' },
    nature:    { label: 'Nature 🌿',   co2: 0, color: '#14b8a6', border: '#0f766e' },
  };

  history.forEach(h => { if (cats[h.cat]) cats[h.cat].co2 += (h.co2 || 0); });

  const entries = Object.values(cats);
  const hasData = entries.some(c => c.co2 > 0);
  const labels  = entries.map(c => c.label);
  const data    = entries.map(c => parseFloat(c.co2.toFixed(2)));
  const colors  = entries.map(c => c.color + 'cc');
  const borders = entries.map(c => c.border);

  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }

  donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data               : hasData ? data : [20,20,20,20,20],
        backgroundColor    : hasData ? colors : Array(5).fill('rgba(255,255,255,0.06)'),
        borderColor        : hasData ? borders : Array(5).fill('rgba(255,255,255,0.1)'),
        borderWidth        : 2,
        hoverBackgroundColor: entries.map(c => c.color),
        hoverBorderWidth   : 3,
        hoverOffset        : 12,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: true,
      cutout             : '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color        : '#e2ffe2',
            font         : { family: 'Plus Jakarta Sans', size: 13, weight: '500' },
            padding      : 20,
            usePointStyle: true,
            pointStyle   : 'circle',
            generateLabels: (chart) => {
              return chart.data.labels.map((label, i) => ({
                text       : hasData
                  ? `${label}  ${chart.data.datasets[0].data[i].toFixed(1)} kg`
                  : label,
                fillStyle  : chart.data.datasets[0].backgroundColor[i],
                strokeStyle: chart.data.datasets[0].borderColor[i],
                color      : '#e2ffe2',
                fontColor  : '#e2ffe2',
                lineWidth  : 1,
                pointStyle : 'circle',
                index      : i,
              }));
            },
          },
        },
        tooltip: {
          enabled        : hasData,
          backgroundColor: 'rgba(10,15,10,0.95)',
          borderColor    : 'rgba(34,197,94,0.4)',
          borderWidth    : 1,
          titleColor     : '#22c55e',
          bodyColor      : '#e2ffe2',
          padding        : 14,
          cornerRadius   : 10,
          callbacks: {
            label     : (ctx) => `  ${ctx.parsed.toFixed(2)} kg CO₂ saved`,
            afterLabel: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return `  ${((ctx.parsed / total) * 100).toFixed(1)}% of total`;
            },
          },
        },
      },
      animation: { animateRotate: true, animateScale: true, duration: 800 },
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        if (!hasData) return;
        const { ctx, chartArea: { width, height, left, top } } = chart;
        const cx    = left + width  / 2;
        const cy    = top  + height / 2;
        const total = history.reduce((s, h) => s + (h.co2 || 0), 0);
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = 'bold 22px Plus Jakarta Sans';
        ctx.fillStyle    = '#22c55e';
        ctx.fillText(`${total.toFixed(1)}`, cx, cy - 12);
        ctx.font         = '12px Plus Jakarta Sans';
        ctx.fillStyle    = '#6b8f6b';
        ctx.fillText('kg CO₂ saved', cx, cy + 12);
        ctx.restore();
      },
    }],
  });
}

/** Renders line chart */
function renderLineChart() {
  const canvas = document.getElementById('lineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const today  = new Date();
  const labels = [];
  const daily  = [];

  for (let i = 13; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const pts = history.filter(h => h.date === key).reduce((s, h) => s + (h.points || 0), 0);
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    daily.push(pts);
  }

  const cumulative = daily.reduce((acc, val, i) => {
    acc.push((acc[i - 1] || 0) + val);
    return acc;
  }, []);

  if (lineChartInstance) { lineChartInstance.destroy(); lineChartInstance = null; }

  lineChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label              : 'Daily Points',
          data               : daily,
          borderColor        : '#22c55e',
          backgroundColor    : (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, 'rgba(34,197,94,0.4)');
            gradient.addColorStop(1, 'rgba(34,197,94,0)');
            return gradient;
          },
          borderWidth        : 2.5,
          pointBackgroundColor: '#22c55e',
          pointBorderColor   : '#0a0f0a',
          pointBorderWidth   : 2,
          pointRadius        : 5,
          pointHoverRadius   : 8,
          tension            : 0.4,
          fill               : true,
          yAxisID            : 'y',
        },
        {
          label              : 'Total Points',
          data               : cumulative,
          borderColor        : '#3b82f6',
          backgroundColor    : 'transparent',
          borderWidth        : 2,
          borderDash         : [6, 4],
          pointBackgroundColor: '#3b82f6',
          pointBorderColor   : '#0a0f0a',
          pointBorderWidth   : 2,
          pointRadius        : 4,
          pointHoverRadius   : 7,
          tension            : 0.4,
          fill               : false,
          yAxisID            : 'y1',
        },
      ],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: true,
      interaction        : { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color        : '#e2ffe2',
            font         : { family: 'Plus Jakarta Sans', size: 13, weight: '500' },
            usePointStyle: true,
            pointStyle   : 'circle',
            padding      : 20,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10,15,10,0.95)',
          borderColor    : 'rgba(34,197,94,0.3)',
          borderWidth    : 1,
          titleColor     : '#22c55e',
          bodyColor      : '#e2ffe2',
          padding        : 14,
          cornerRadius   : 10,
          callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y} pts` },
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b8f6b', font: { size: 11, family: 'Space Mono' }, maxTicksLimit: 7 },
          grid : { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          type    : 'linear',
          position: 'left',
          ticks   : { color: '#22c55e', font: { size: 11, family: 'Space Mono' }, stepSize: 5 },
          grid    : { color: 'rgba(255,255,255,0.06)' },
          title   : { display: true, text: 'Daily Pts', color: '#6b8f6b', font: { size: 11 } },
        },
        y1: {
          type    : 'linear',
          position: 'right',
          ticks   : { color: '#3b82f6', font: { size: 11, family: 'Space Mono' } },
          grid    : { drawOnChartArea: false },
          title   : { display: true, text: 'Total Pts', color: '#6b8f6b', font: { size: 11 } },
        },
      },
      animation: { duration: 800, easing: 'easeInOutQuart' },
    },
  });
}

/** Renders eco level track */
function renderLevelTrack() {
  const points = stats.points || 0;
  const levels = [0, 100, 300, 600, 1000];
  document.querySelectorAll('.level-item').forEach((item, i) => {
    item.classList.remove('unlocked', 'current');
    const required = parseInt(item.dataset.points, 10);
    const next     = levels[i + 1] || Infinity;
    if (points >= next)          item.classList.add('unlocked');
    else if (points >= required) item.classList.add('current');
  });
}

/** Loads AI analysis */
async function loadAIAnalysis() {
  const container = document.getElementById('aiAnalysis');
  if (!container) return;

  container.innerHTML = `
    <div class="analysis-loading">
      <div class="loading-spinner" role="status" aria-label="Loading"></div>
      <p>EcoAI is analyzing your progress...</p>
    </div>`;

  if (history.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:1rem 0">
      Log some actions in the <a href="tracker.html" style="color:var(--green)">Tracker</a> first! 🌱</p>`;
    return;
  }

  const totalCO2 = (stats.totalCO2 || 0).toFixed(1);
  const totalPts = stats.points || 0;
  const catCounts = history.reduce((acc, h) => { acc[h.cat] = (acc[h.cat] || 0) + 1; return acc; }, {});
  const topCats  = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c).join(' and ') || 'general';

  const prompt = `My eco tracking summary:
- CO2 saved: ${totalCO2} kg
- Eco points: ${totalPts}
- Most active: ${topCats}
- Active days: ${getActiveDays()}
- Level: ${getLevel(totalPts).name}
- Actions: ${history.length}

Give 2 short encouraging paragraphs about my progress and 3 specific next steps. Be positive and concise.`;

  try {
    const res = await fetch('/api/chat', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        messages: [
          { role: 'system', content: 'You are EcoAI. Give short motivational eco tracking feedback. Maximum 3 paragraphs.' },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    const data  = await res.json();
    const reply = data.reply;
    if (!reply) throw new Error('Empty response');

    container.innerHTML = `
      <div class="analysis-content" aria-live="polite">
        ${reply
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')
          .replace(/^/, '<p>')
          .replace(/$/, '</p>')}
      </div>`;

  } catch (err) {
    console.error('AI Analysis error:', err.message);
    container.innerHTML = `<p style="color:var(--text-muted)">⚠️ Could not load AI analysis. Make sure <code style="background:rgba(34,197,94,0.15);padding:0.1em 0.4em;border-radius:4px">npm start</code> is running!</p>`;
  }
}

/** Shows refresh toast */
function showRefreshToast() {
  let toast = document.getElementById('refreshToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'refreshToast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = `position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(80px);background:var(--green);color:var(--dark);padding:0.6rem 1.4rem;border-radius:50px;font-weight:600;font-size:0.85rem;z-index:3000;transition:transform 0.3s ease;pointer-events:none;`;
    document.body.appendChild(toast);
  }
  toast.textContent = '✅ Data refreshed!';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(80px)'; }, 2000);
}

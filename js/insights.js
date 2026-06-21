/**
 * @fileoverview EcoIQ Insights Dashboard
 * @description Renders Chart.js visualisations (donut + line), category bars,
 *              weekly activity, eco level track, and AI progress analysis
 *              from tracker data stored in localStorage / Firestore.
 * @module insights
 */

'use strict';

import { db, auth } from './firebase.js';
import { initAuth } from './auth.js';
import { getLevel } from './shared.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** localStorage key shared with the tracker module */
const STORAGE_KEY = 'ecoiq_tracker';

/** Firestore collection for tracker documents */
const FIRESTORE_COLLECTION = 'trackers';

/** Number of days shown in the line chart */
const LINE_CHART_DAYS = 14;

/** Number of days shown in the weekly bar chart */
const WEEKLY_CHART_DAYS = 7;

/** Auto-refresh interval in milliseconds */
const AUTO_REFRESH_MS = 10_000;

/** Toast visible duration in milliseconds */
const TOAST_DURATION_MS = 2000;

/** Chart animation duration in milliseconds */
const CHART_ANIMATION_MS = 800;

/** Minimum bar height percentage so zero-value bars remain visible */
const MIN_BAR_HEIGHT_PCT = 3;

/**
 * Category definitions used by both the donut chart and category bar section.
 * @type {Readonly<Object<string, {label:string, icon:string, color:string, border:string}>>}
 */
const CATEGORIES = Object.freeze({
  transport: { label: 'Transport 🚗', icon: '🚗', color: '#3b82f6', border: '#1d4ed8' },
  food:      { label: 'Food 🍽️',      icon: '🍽️', color: '#22c55e', border: '#15803d' },
  energy:    { label: 'Energy ⚡',    icon: '⚡', color: '#eab308', border: '#a16207' },
  shopping:  { label: 'Shopping 🛍️', icon: '🛍️', color: '#a855f7', border: '#7e22ce' },
  nature:    { label: 'Nature 🌿',    icon: '🌿', color: '#14b8a6', border: '#0f766e' },
});

/** Short day-name labels for the weekly bar chart */
const DAY_LABELS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {Array<Object>} Full action history from tracker */
let history = [];

/** @type {{points:number, streak:number, totalActions:number, totalCO2:number}} */
let stats = { points: 0, streak: 0, totalActions: 0, totalCO2: 0 };

/** @type {import('chart.js').Chart|null} */
let donutChartInstance = null;

/** @type {import('chart.js').Chart|null} */
let lineChartInstance  = null;

// ─── Chart.js global defaults ─────────────────────────────────────────────────

if (typeof Chart !== 'undefined') {
  Chart.defaults.color       = '#e2ffe2';
  Chart.defaults.font.family = 'Plus Jakarta Sans';
}

// ─── Initialisation ───────────────────────────────────────────────────────────

loadLocalData();
renderAll();

initAuth(
  async (user) => { await loadFirestoreData(user.uid); renderAll(); },
  () => {},
);

setInterval(() => { loadLocalData(); renderAll(); }, AUTO_REFRESH_MS);

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('refreshBtn');
  btn?.addEventListener('click', () => {
    loadLocalData();
    renderAll();
    showRefreshToast();
  });
});

// ─── Data loading ─────────────────────────────────────────────────────────────

/**
 * Loads tracker data from Firestore and syncs to localStorage.
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<void>}
 */
async function loadFirestoreData(uid) {
  try {
    const snap = await getDoc(doc(db, FIRESTORE_COLLECTION, uid));
    if (snap.exists()) {
      const data = snap.data();
      history    = data.history || [];
      stats      = data.stats   || stats;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats, history }));
    }
  } catch (err) {
    console.error('[Insights] Firestore load error:', err.message);
  }
}

/** Loads tracker data from localStorage into module state. */
function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    history    = data.history || [];
    stats      = data.stats   || stats;
  } catch (err) {
    console.error('[Insights] LocalStorage error:', err.message);
  }
}

// ─── Master render ────────────────────────────────────────────────────────────

/** Renders all dashboard components. */
function renderAll() {
  renderSummary();
  renderCategoryBars();
  renderWeeklyBars();
  renderDonutChart();
  renderLineChart();
  renderLevelTrack();
  loadAIAnalysis();
}

// ─── Summary cards ────────────────────────────────────────────────────────────

/** Renders the four summary stat cards at the top of the dashboard. */
function renderSummary() {
  const totalCO2 = stats.totalCO2 || 0;
  const points   = stats.points   || 0;

  const catTotals = buildCatTotals();
  const topEntry  = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('totalReduced', `${totalCO2.toFixed(1)} kg`);
  set('bestCategory', topEntry ? topEntry[0] : '—');
  set('activeDays',   String(countActiveDays()));
  set('ecoLevel',     getLevel(points).name);
}

/**
 * Counts the number of unique dates in the full history.
 * @returns {number}
 */
function countActiveDays() {
  return new Set(history.map((h) => h.date)).size;
}

/**
 * Builds a map of category → total CO₂ saved.
 * @returns {Object<string, number>}
 */
function buildCatTotals() {
  return history.reduce((acc, h) => {
    acc[h.cat] = (acc[h.cat] || 0) + (h.co2 || 0);
    return acc;
  }, {});
}

// ─── Category bars ────────────────────────────────────────────────────────────

/** Renders the horizontal CO₂ bars broken down by category. */
function renderCategoryBars() {
  const container = document.getElementById('categoryBars');
  if (!container) return;

  const totals = buildCatTotals();
  const maxCO2 = Math.max(...Object.values(totals), 1);

  container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) => {
    const co2 = totals[key] || 0;
    const pct = Math.round((co2 / maxCO2) * 100);
    return `
      <div class="cat-bar-item" role="group" aria-label="${cat.label}: ${co2.toFixed(1)} kg CO₂ saved">
        <div class="cat-bar-label"><span aria-hidden="true">${cat.icon}</span> ${cat.label.split(' ')[0]}</div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width:${pct}%;background:${cat.color}"
            role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
        <div class="cat-bar-val">${co2.toFixed(1)} kg</div>
      </div>`;
  }).join('');
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────

/** Renders the last 7 days as a simple bar chart using divs. */
function renderWeeklyBars() {
  const container = document.getElementById('weeklyChart');
  if (!container) return;

  const today = new Date();
  const week  = buildWeekData(today);
  const maxPts = Math.max(...week.map((w) => w.pts), 1);

  container.innerHTML = week.map((w) => {
    const heightPct = Math.max((w.pts / maxPts) * 100, MIN_BAR_HEIGHT_PCT);
    return `
      <div class="week-bar-wrap" role="group" aria-label="${w.day}: ${w.pts} points">
        <div class="week-pts">${w.pts > 0 ? w.pts : ''}</div>
        <div class="week-bar${w.isToday ? ' today' : ''}" style="height:${heightPct}%"
          role="img" aria-label="${w.day} — ${w.pts} points"></div>
        <div class="week-day">${w.day}</div>
      </div>`;
  }).join('');
}

/**
 * Builds point totals for each of the last N days.
 * @param {Date} today - Reference date
 * @returns {Array<{day:string, pts:number, isToday:boolean}>}
 */
function buildWeekData(today) {
  return Array.from({ length: WEEKLY_CHART_DAYS }, (_, i) => {
    const offset = WEEKLY_CHART_DAYS - 1 - i;
    const d      = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().split('T')[0];
    const pts = history
      .filter((h) => h.date === key)
      .reduce((sum, h) => sum + (h.points || 0), 0);
    return { day: DAY_LABELS[d.getDay()], pts, isToday: offset === 0 };
  });
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

/** Renders (or re-renders) the CO₂-by-category donut chart. */
function renderDonutChart() {
  const canvas = document.getElementById('donutChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const totals  = buildCatTotals();
  const entries = Object.entries(CATEGORIES);
  const hasData = Object.values(totals).some((v) => v > 0);

  const labels  = entries.map(([, c]) => c.label);
  const data    = entries.map(([k]) => parseFloat((totals[k] || 0).toFixed(2)));
  const colors  = entries.map(([, c]) => `${c.color}cc`);
  const borders = entries.map(([, c]) => c.border);

  if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }

  donutChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data               : hasData ? data : Array(entries.length).fill(20),
        backgroundColor    : hasData ? colors  : Array(entries.length).fill('rgba(255,255,255,0.06)'),
        borderColor        : hasData ? borders : Array(entries.length).fill('rgba(255,255,255,0.1)'),
        borderWidth        : 2,
        hoverBackgroundColor: entries.map(([, c]) => c.color),
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
          labels  : {
            color        : '#e2ffe2',
            font         : { family: 'Plus Jakarta Sans', size: 13, weight: '500' },
            padding      : 20,
            usePointStyle: true,
            pointStyle   : 'circle',
            generateLabels: (chart) => chart.data.labels.map((label, i) => ({
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
            })),
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
      animation: { animateRotate: true, animateScale: true, duration: CHART_ANIMATION_MS },
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
        ctx.font      = '12px Plus Jakarta Sans';
        ctx.fillStyle = '#6b8f6b';
        ctx.fillText('kg CO₂ saved', cx, cy + 12);
        ctx.restore();
      },
    }],
  });
}

// ─── Line chart ───────────────────────────────────────────────────────────────

/** Renders (or re-renders) the daily + cumulative points line chart. */
function renderLineChart() {
  const canvas = document.getElementById('lineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const { labels, daily, cumulative } = buildLineChartData();

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
      animation: { duration: CHART_ANIMATION_MS, easing: 'easeInOutQuart' },
    },
  });
}

/**
 * Builds the label, daily, and cumulative data arrays for the line chart.
 * @returns {{labels:string[], daily:number[], cumulative:number[]}}
 */
function buildLineChartData() {
  const today  = new Date();
  const labels = [];
  const daily  = [];

  for (let i = LINE_CHART_DAYS - 1; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const pts = history
      .filter((h) => h.date === key)
      .reduce((sum, h) => sum + (h.points || 0), 0);
    labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    daily.push(pts);
  }

  const cumulative = daily.reduce((acc, val, i) => {
    acc.push((acc[i - 1] || 0) + val);
    return acc;
  }, []);

  return { labels, daily, cumulative };
}

// ─── Level track ──────────────────────────────────────────────────────────────

/** Updates the eco level progression track to reflect current points. */
function renderLevelTrack() {
  const points        = stats.points || 0;
  const levelThresholds = [0, 100, 300, 600, 1000];

  document.querySelectorAll('.level-item').forEach((item, i) => {
    item.classList.remove('unlocked', 'current');
    const required = parseInt(item.dataset.points, 10);
    const next     = levelThresholds[i + 1] ?? Infinity;

    if (points >= next)          item.classList.add('unlocked');
    else if (points >= required) item.classList.add('current');
  });
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

/** Fetches and renders personalised AI progress analysis. */
async function loadAIAnalysis() {
  const container = document.getElementById('aiAnalysis');
  if (!container) return;

  container.innerHTML = `
    <div class="analysis-loading">
      <div class="loading-spinner" role="status" aria-label="Loading AI analysis"></div>
      <p>EcoAI is analyzing your progress...</p>
    </div>`;

  if (history.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);padding:1rem 0">
      Log some actions in the <a href="tracker.html" style="color:var(--green)">Tracker</a> first! 🌱</p>`;
    return;
  }

  const prompt = buildAnalysisPrompt();

  try {
    const res = await fetch('/api/chat', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        messages: [
          { role: 'system', content: 'You are EcoAI. Give short motivational eco tracking feedback. Maximum 3 paragraphs.' },
          { role: 'user',   content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }

    const { reply } = await res.json();
    if (!reply) throw new Error('Empty response from EcoAI');

    container.innerHTML = `
      <div class="analysis-content" aria-live="polite">
        ${reply
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g,     '<em>$1</em>')
          .replace(/\n\n/g,          '</p><p>')
          .replace(/\n/g,            '<br>')
          .replace(/^/,              '<p>')
          .replace(/$/,              '</p>')}
      </div>`;
  } catch (err) {
    console.error('[Insights] AI Analysis error:', err.message);
    container.innerHTML = `<p style="color:var(--text-muted)">
      ⚠️ Could not load AI analysis. Make sure
      <code style="background:rgba(34,197,94,0.15);padding:0.1em 0.4em;border-radius:4px">npm start</code>
      is running!</p>`;
  }
}

/**
 * Builds the user-facing prompt string for the AI analysis request.
 * @returns {string}
 */
function buildAnalysisPrompt() {
  const totalCO2 = (stats.totalCO2 || 0).toFixed(1);
  const totalPts = stats.points || 0;

  const catCounts = history.reduce((acc, h) => {
    acc[h.cat] = (acc[h.cat] || 0) + 1;
    return acc;
  }, {});

  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat)
    .join(' and ') || 'general';

  return [
    'My eco tracking summary:',
    `- CO₂ saved: ${totalCO2} kg`,
    `- Eco points: ${totalPts}`,
    `- Most active categories: ${topCats}`,
    `- Active days: ${countActiveDays()}`,
    `- Eco level: ${getLevel(totalPts).name}`,
    `- Total actions logged: ${history.length}`,
    '',
    'Give 2 short encouraging paragraphs about my progress and 3 specific next steps.',
    'Be positive and concise.',
  ].join('\n');
}

// ─── Refresh toast ────────────────────────────────────────────────────────────

/** Shows a brief "Data refreshed" toast confirmation. */
function showRefreshToast() {
  let toast = document.getElementById('refreshToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'refreshToast';
    toast.setAttribute('role',      'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = [
      'position:fixed',
      'bottom:2rem',
      'left:50%',
      'transform:translateX(-50%) translateY(80px)',
      'background:var(--green)',
      'color:var(--dark)',
      'padding:0.6rem 1.4rem',
      'border-radius:50px',
      'font-weight:600',
      'font-size:0.85rem',
      'z-index:3000',
      'transition:transform 0.3s ease',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
  }

  toast.textContent         = '✅ Data refreshed!';
  toast.style.transform     = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
  }, TOAST_DURATION_MS);
}
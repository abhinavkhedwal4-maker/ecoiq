/**
 * @fileoverview EcoIQ Action Tracker
 * @description Daily eco-action logging with streak tracking, points
 *              accumulation, CO₂ savings, localStorage persistence and
 *              optional Firebase Firestore sync.
 * @module tracker
 */

'use strict';

import { db, auth } from './firebase.js';
import { initAuth } from './auth.js';
import { getTodayKey } from './shared.js';
import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** localStorage key for persisted tracker data */
const STORAGE_KEY = 'ecoiq_tracker';

/** Maximum number of history entries shown in the recent activity list */
const MAX_HISTORY_DISPLAY = 20;

/** Toast visible duration in milliseconds */
const TOAST_DURATION_MS = 3000;

/** Firestore collection name for tracker documents */
const FIRESTORE_COLLECTION = 'trackers';

/**
 * All available eco actions across five categories.
 * co2 values are in kg CO₂ saved per action instance.
 * @type {ReadonlyArray<{
 *   id: string,
 *   icon: string,
 *   name: string,
 *   cat: string,
 *   points: number,
 *   co2: number
 * }>}
 */
const ECO_ACTIONS = Object.freeze([
  // Transport
  { id: 'walk_instead',     icon: '🚶', name: 'Walked instead of driving',     cat: 'transport', points: 15, co2: 2.1  },
  { id: 'cycle',            icon: '🚲', name: 'Cycled to work/school',          cat: 'transport', points: 20, co2: 2.8  },
  { id: 'public_transport', icon: '🚌', name: 'Used public transport',          cat: 'transport', points: 12, co2: 1.5  },
  { id: 'carpool',          icon: '🚗', name: 'Carpooled with others',           cat: 'transport', points: 10, co2: 1.2  },
  { id: 'no_flight',        icon: '✈️', name: 'Chose train over flight',        cat: 'transport', points: 50, co2: 90.0 },
  { id: 'wfh',              icon: '🏠', name: 'Worked from home',               cat: 'transport', points: 18, co2: 3.2  },
  // Food
  { id: 'veg_meal',         icon: '🥗', name: 'Ate a vegetarian meal',          cat: 'food',      points: 10, co2: 1.5  },
  { id: 'vegan_meal',       icon: '🌱', name: 'Ate a vegan meal',               cat: 'food',      points: 15, co2: 2.0  },
  { id: 'no_food_waste',    icon: '♻️', name: 'Wasted no food today',           cat: 'food',      points: 12, co2: 0.8  },
  { id: 'local_produce',    icon: '🧑‍🌾', name: 'Bought local produce',          cat: 'food',      points: 8,  co2: 0.5  },
  { id: 'composted',        icon: '🌿', name: 'Composted food scraps',          cat: 'food',      points: 10, co2: 0.4  },
  { id: 'tap_water',        icon: '💧', name: 'Drank tap instead of bottled',   cat: 'food',      points: 5,  co2: 0.2  },
  // Energy
  { id: 'lights_off',       icon: '💡', name: 'Turned off unused lights',       cat: 'energy',    points: 5,  co2: 0.3  },
  { id: 'cold_wash',        icon: '🧺', name: 'Used cold water for laundry',    cat: 'energy',    points: 8,  co2: 0.6  },
  { id: 'short_shower',     icon: '🚿', name: 'Took a short shower (<5 min)',   cat: 'energy',    points: 10, co2: 0.5  },
  { id: 'unplugged',        icon: '🔌', name: 'Unplugged devices when idle',    cat: 'energy',    points: 7,  co2: 0.4  },
  { id: 'thermostat',       icon: '🌡️', name: 'Optimized thermostat settings',  cat: 'energy',    points: 12, co2: 1.2  },
  { id: 'solar_used',       icon: '☀️', name: 'Used solar energy today',        cat: 'energy',    points: 20, co2: 2.0  },
  // Shopping
  { id: 'reusable_bag',     icon: '👜', name: 'Used reusable bags',             cat: 'shopping',  points: 5,  co2: 0.1  },
  { id: 'secondhand',       icon: '🔄', name: 'Bought secondhand item',         cat: 'shopping',  points: 20, co2: 3.0  },
  { id: 'repaired',         icon: '🔧', name: 'Repaired instead of replacing',  cat: 'shopping',  points: 25, co2: 4.0  },
  { id: 'no_plastic',       icon: '🚫', name: 'Avoided single-use plastic',     cat: 'shopping',  points: 8,  co2: 0.3  },
  { id: 'bulk_buy',         icon: '📦', name: 'Bought in bulk (less packaging)', cat: 'shopping',  points: 10, co2: 0.5  },
  // Nature
  { id: 'planted_tree',     icon: '🌳', name: 'Planted a tree/plant',           cat: 'nature',    points: 30, co2: 20.0 },
  { id: 'cleaned_area',     icon: '🧹', name: 'Cleaned up local area',          cat: 'nature',    points: 25, co2: 0.0  },
  { id: 'wildlife',         icon: '🦋', name: 'Supported local wildlife',       cat: 'nature',    points: 15, co2: 0.0  },
  { id: 'rainwater',        icon: '🌧️', name: 'Collected rainwater',            cat: 'nature',    points: 12, co2: 0.2  },
]);

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {Set<string>} IDs of actions already logged today */
let loggedToday = new Set();

/** @type {Array<Object>} Full action history (all time) */
let history = [];

/** @type {{points:number, streak:number, lastDate:string, totalActions:number, totalCO2:number}} */
let stats = { points: 0, streak: 0, lastDate: '', totalActions: 0, totalCO2: 0 };

/** @type {string} Currently selected category filter */
let currentCat = 'all';

// ─── Initialisation ──────────────────────────────────────────────────────────

setTodayDateLabel();
loadLocalData();
renderAll();

initAuth(
  async (user) => { await loadFirestoreData(user.uid); renderAll(); },
  () => {},
);

// ─── Data loading ─────────────────────────────────────────────────────────────

/** Renders the human-readable date in the tracker header. */
function setTodayDateLabel() {
  const el = document.getElementById('todayDate');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

/**
 * Loads tracker data from Firestore and refreshes localStorage cache.
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<void>}
 */
async function loadFirestoreData(uid) {
  try {
    const snap = await getDoc(doc(db, FIRESTORE_COLLECTION, uid));
    if (snap.exists()) {
      const data    = snap.data();
      stats         = data.stats   || stats;
      history       = data.history || [];
      loggedToday   = buildLoggedTodaySet(history);
      persistLocally();
    }
  } catch (err) {
    console.error('[Tracker] Firestore load error:', err.message);
  }
}

/** Loads tracker data from localStorage into module state. */
function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data  = JSON.parse(raw);
    stats       = data.stats   || stats;
    history     = data.history || [];
    loggedToday = buildLoggedTodaySet(history);
  } catch (err) {
    console.error('[Tracker] LocalStorage load error:', err.message);
  }
}

/**
 * Builds a Set of action IDs logged on today's date.
 * @param {Array<Object>} historyArr - Full action history
 * @returns {Set<string>}
 */
function buildLoggedTodaySet(historyArr) {
  const todayKey = getTodayKey();
  return new Set(
    historyArr.filter((h) => h.date === todayKey).map((h) => h.id),
  );
}

// ─── Rendering ───────────────────────────────────────────────────────────────

/** Renders all tracker UI components. */
function renderAll() {
  renderActions(currentCat);
  renderHistory();
  updateStats();
}

/**
 * Renders the grid of available eco-action cards.
 * @param {string} cat - Category filter ('all' or a specific category key)
 */
function renderActions(cat) {
  const grid = document.getElementById('actionsGrid');
  if (!grid) return;

  const actions  = cat === 'all' ? ECO_ACTIONS : ECO_ACTIONS.filter((a) => a.cat === cat);
  const fragment = document.createDocumentFragment();

  actions.forEach((action) => {
    fragment.appendChild(createActionCard(action));
  });

  grid.innerHTML = '';
  grid.appendChild(fragment);
}

/**
 * Creates a single action card element.
 * @param {{id:string, icon:string, name:string, cat:string, points:number, co2:number}} action
 * @returns {HTMLDivElement}
 */
function createActionCard(action) {
  const isLogged = loggedToday.has(action.id);
  const card     = document.createElement('div');

  card.className = `action-card${isLogged ? ' logged' : ''}`;
  card.setAttribute('role',       'listitem');
  card.setAttribute('tabindex',   '0');
  card.setAttribute('aria-label', `${action.name} — ${action.points} points${isLogged ? ' — already logged today' : ''}`);

  card.innerHTML = `
    <div class="action-icon" aria-hidden="true">${action.icon}</div>
    <div class="action-info">
      <div class="action-name">${action.name}</div>
      <div class="action-impact">Saves ~${action.co2} kg CO₂</div>
    </div>
    <div class="action-points">+${action.points}pts</div>
    <div class="action-check" aria-hidden="true">✓</div>`;

  if (!isLogged) {
    card.addEventListener('click',   () => logAction(action));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logAction(action); }
    });
  }

  return card;
}

/** Renders the recent activity history list. */
function renderHistory() {
  const list     = document.getElementById('historyList');
  const emptyEl  = document.getElementById('historyEmpty');
  if (!list) return;

  if (history.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const recent   = [...history].reverse().slice(0, MAX_HISTORY_DISPLAY);
  const fragment = document.createDocumentFragment();

  recent.forEach((item) => {
    fragment.appendChild(createHistoryItem(item));
  });

  list.innerHTML = '';
  list.appendChild(fragment);
}

/**
 * Creates a single history list item element.
 * @param {{icon:string, name:string, date:string, time:string, co2:number, points:number}} item
 * @returns {HTMLDivElement}
 */
function createHistoryItem(item) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.setAttribute('role', 'listitem');
  div.innerHTML = `
    <div class="history-icon" aria-hidden="true">${item.icon}</div>
    <div class="history-info">
      <div class="history-name">${item.name}</div>
      <div class="history-time">${item.date} · ${item.time}</div>
    </div>
    <div class="history-co2">-${item.co2}kg CO₂</div>
    <div class="history-pts">+${item.points}pts</div>`;
  return div;
}

/** Pushes current stats values into the DOM. */
function updateStats() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('streakCount',  String(stats.streak      || 0));
  set('totalPoints',  String(stats.points       || 0));
  set('totalActions', String(stats.totalActions || 0));
  set('co2Saved',     `${(stats.totalCO2 || 0).toFixed(1)} kg`);
}

// ─── Action logging ───────────────────────────────────────────────────────────

/**
 * Logs an eco action: updates state, persists data, and refreshes the UI.
 * Idempotent — silently ignores actions already logged today.
 *
 * @param {{id:string, icon:string, name:string, cat:string, points:number, co2:number}} action
 * @returns {Promise<void>}
 */
async function logAction(action) {
  if (loggedToday.has(action.id)) return;

  loggedToday.add(action.id);

  const todayKey = getTodayKey();
  const entry    = {
    id    : action.id,
    icon  : action.icon,
    name  : action.name,
    cat   : action.cat,
    points: action.points,
    co2   : action.co2,
    date  : todayKey,
    time  : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };

  history.push(entry);
  updateStreakAndPoints(action, todayKey);
  renderAll();
  showToast(`✅ +${action.points} pts · ${action.name}`);
  await saveData();
}

/**
 * Updates streak, points, action count and CO₂ totals after logging an action.
 * @param {{points:number, co2:number}} action
 * @param {string} todayKey - Today's date key (YYYY-MM-DD)
 */
function updateStreakAndPoints(action, todayKey) {
  stats.points       = (stats.points       || 0) + action.points;
  stats.totalActions = (stats.totalActions || 0) + 1;
  stats.totalCO2     = (stats.totalCO2     || 0) + action.co2;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (stats.lastDate === yesterdayKey) {
    stats.streak = (stats.streak || 0) + 1;
  } else if (stats.lastDate !== todayKey) {
    stats.streak = 1;
  }

  stats.lastDate = todayKey;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

/** Persists current state to localStorage. */
function persistLocally() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stats, history }));
  } catch (err) {
    console.error('[Tracker] LocalStorage save error:', err.message);
  }
}

/**
 * Saves current state to localStorage and, if authenticated, to Firestore.
 * @returns {Promise<void>}
 */
async function saveData() {
  persistLocally();

  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, user.uid), {
      stats,
      history,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[Tracker] Firestore save error:', err.message);
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────

/**
 * Shows a temporary toast notification at the bottom of the screen.
 * Creates the toast element on first call and reuses it thereafter.
 *
 * @param {string} message - Text to display in the toast
 */
function showToast(message) {
  let toast = document.getElementById('ecoToast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ecoToast';
    toast.className = 'toast';
    toast.setAttribute('role',      'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
}

// ─── Category filter ──────────────────────────────────────────────────────────

document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentCat = btn.dataset.cat;
    renderActions(currentCat);
  });
});
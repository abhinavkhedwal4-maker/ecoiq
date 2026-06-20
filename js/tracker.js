/**
 * @fileoverview EcoIQ Action Tracker
 * @description Daily eco-action logging with Firebase sync
 * @module tracker
 */

'use strict';

import { db, auth } from './firebase.js';
import { initAuth } from './auth.js';
import { getTodayKey } from './shared.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/** @type {Array<Object>} All available eco actions */
const ECO_ACTIONS = [
  { id: 'walk_instead',    icon: '🚶', name: 'Walked instead of driving',    cat: 'transport', points: 15, co2: 2.1  },
  { id: 'cycle',           icon: '🚲', name: 'Cycled to work/school',         cat: 'transport', points: 20, co2: 2.8  },
  { id: 'public_transport',icon: '🚌', name: 'Used public transport',         cat: 'transport', points: 12, co2: 1.5  },
  { id: 'carpool',         icon: '🚗', name: 'Carpooled with others',          cat: 'transport', points: 10, co2: 1.2  },
  { id: 'no_flight',       icon: '✈️', name: 'Chose train over flight',       cat: 'transport', points: 50, co2: 90.0 },
  { id: 'wfh',             icon: '🏠', name: 'Worked from home',              cat: 'transport', points: 18, co2: 3.2  },
  { id: 'veg_meal',        icon: '🥗', name: 'Ate a vegetarian meal',         cat: 'food',      points: 10, co2: 1.5  },
  { id: 'vegan_meal',      icon: '🌱', name: 'Ate a vegan meal',              cat: 'food',      points: 15, co2: 2.0  },
  { id: 'no_food_waste',   icon: '♻️', name: 'Wasted no food today',          cat: 'food',      points: 12, co2: 0.8  },
  { id: 'local_produce',   icon: '🧑‍🌾',name: 'Bought local produce',          cat: 'food',      points: 8,  co2: 0.5  },
  { id: 'composted',       icon: '🌿', name: 'Composted food scraps',         cat: 'food',      points: 10, co2: 0.4  },
  { id: 'tap_water',       icon: '💧', name: 'Drank tap instead of bottled',  cat: 'food',      points: 5,  co2: 0.2  },
  { id: 'lights_off',      icon: '💡', name: 'Turned off unused lights',      cat: 'energy',    points: 5,  co2: 0.3  },
  { id: 'cold_wash',       icon: '🧺', name: 'Used cold water for laundry',   cat: 'energy',    points: 8,  co2: 0.6  },
  { id: 'short_shower',    icon: '🚿', name: 'Took a short shower (<5 min)',  cat: 'energy',    points: 10, co2: 0.5  },
  { id: 'unplugged',       icon: '🔌', name: 'Unplugged devices when idle',   cat: 'energy',    points: 7,  co2: 0.4  },
  { id: 'thermostat',      icon: '🌡️', name: 'Optimized thermostat settings', cat: 'energy',    points: 12, co2: 1.2  },
  { id: 'solar_used',      icon: '☀️', name: 'Used solar energy today',       cat: 'energy',    points: 20, co2: 2.0  },
  { id: 'reusable_bag',    icon: '👜', name: 'Used reusable bags',            cat: 'shopping',  points: 5,  co2: 0.1  },
  { id: 'secondhand',      icon: '🔄', name: 'Bought secondhand item',        cat: 'shopping',  points: 20, co2: 3.0  },
  { id: 'repaired',        icon: '🔧', name: 'Repaired instead of replacing', cat: 'shopping',  points: 25, co2: 4.0  },
  { id: 'no_plastic',      icon: '🚫', name: 'Avoided single-use plastic',    cat: 'shopping',  points: 8,  co2: 0.3  },
  { id: 'bulk_buy',        icon: '📦', name: 'Bought in bulk (less packaging)',cat: 'shopping',  points: 10, co2: 0.5  },
  { id: 'planted_tree',    icon: '🌳', name: 'Planted a tree/plant',          cat: 'nature',    points: 30, co2: 20.0 },
  { id: 'cleaned_area',    icon: '🧹', name: 'Cleaned up local area',         cat: 'nature',    points: 25, co2: 0.0  },
  { id: 'wildlife',        icon: '🦋', name: 'Supported local wildlife',      cat: 'nature',    points: 15, co2: 0.0  },
  { id: 'rainwater',       icon: '🌧️', name: 'Collected rainwater',          cat: 'nature',    points: 12, co2: 0.2  },
];

/** @type {Set<string>} */
let loggedToday = new Set();

/** @type {Array<Object>} */
let history = [];

/** @type {Object} */
let stats = { points: 0, streak: 0, lastDate: '', totalActions: 0, totalCO2: 0 };

let currentCat = 'all';

// ---- INIT ----
document.getElementById('todayDate').textContent =
  new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// Load from localStorage immediately
loadLocalData();
renderAll();

// Then sync Firebase in background
initAuth(
  async (user) => { await loadUserData(user.uid); renderAll(); },
  () => {}
);

/**
 * Loads data from Firestore
 * @param {string} uid
 */
async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'trackers', uid));
    if (snap.exists()) {
      const data   = snap.data();
      stats        = data.stats   || stats;
      history      = data.history || [];
      const todayKey = getTodayKey();
      loggedToday  = new Set(history.filter(h => h.date === todayKey).map(h => h.id));
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
      const data   = JSON.parse(saved);
      stats        = data.stats   || stats;
      history      = data.history || [];
      const todayKey = getTodayKey();
      loggedToday  = new Set(history.filter(h => h.date === todayKey).map(h => h.id));
    }
  } catch (err) {
    console.error('LocalStorage error:', err);
  }
}

function renderAll() {
  renderActions(currentCat);
  renderHistory();
  updateStats();
}

/**
 * Renders action cards
 * @param {string} cat
 */
function renderActions(cat) {
  const grid    = document.getElementById('actionsGrid');
  if (!grid) return;
  const actions = cat === 'all' ? ECO_ACTIONS : ECO_ACTIONS.filter(a => a.cat === cat);
  const fragment = document.createDocumentFragment();

  actions.forEach(action => {
    const isLogged = loggedToday.has(action.id);
    const card     = document.createElement('div');
    card.className = `action-card${isLogged ? ' logged' : ''}`;
    card.setAttribute('role',      'listitem');
    card.setAttribute('tabindex',  '0');
    card.setAttribute('aria-label', `${action.name} - ${action.points} points - ${isLogged ? 'Already logged' : 'Click to log'}`);
    card.innerHTML = `
      <div class="action-icon" aria-hidden="true">${action.icon}</div>
      <div class="action-info">
        <div class="action-name">${action.name}</div>
        <div class="action-impact">Saves ~${action.co2} kg CO₂</div>
      </div>
      <div class="action-points">+${action.points}pts</div>
      <div class="action-check" aria-hidden="true">✓</div>`;

    if (!isLogged) {
      card.addEventListener('click', () => logAction(action));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logAction(action); }
      });
    }
    fragment.appendChild(card);
  });

  grid.innerHTML = '';
  grid.appendChild(fragment);
}

/** Renders history list */
function renderHistory() {
  const list  = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!list) return;

  if (history.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  const recent   = [...history].reverse().slice(0, 20);
  const fragment = document.createDocumentFragment();

  recent.forEach(item => {
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
    fragment.appendChild(div);
  });

  list.innerHTML = '';
  list.appendChild(fragment);
}

/** Updates stat display */
function updateStats() {
  const el = (id) => document.getElementById(id);
  if (el('streakCount'))  el('streakCount').textContent  = stats.streak       || 0;
  if (el('totalPoints'))  el('totalPoints').textContent  = stats.points        || 0;
  if (el('totalActions')) el('totalActions').textContent = stats.totalActions  || 0;
  if (el('co2Saved'))     el('co2Saved').textContent     = `${(stats.totalCO2 || 0).toFixed(1)} kg`;
}

/**
 * Logs an eco action
 * @param {Object} action
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

  stats.points       = (stats.points       || 0) + action.points;
  stats.totalActions = (stats.totalActions || 0) + 1;
  stats.totalCO2     = (stats.totalCO2     || 0) + action.co2;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = yesterday.toISOString().split('T')[0];

  if (stats.lastDate === yKey) {
    stats.streak = (stats.streak || 0) + 1;
  } else if (stats.lastDate !== todayKey) {
    stats.streak = 1;
  }
  stats.lastDate = todayKey;

  updateStats();
  renderActions(currentCat);
  renderHistory();
  showToast(`✅ +${action.points} pts · ${action.name}`);
  await saveData();
}

/** Saves to localStorage and Firestore */
async function saveData() {
  try {
    localStorage.setItem('ecoiq_tracker', JSON.stringify({ stats, history }));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }

  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(doc(db, 'trackers', user.uid), {
        stats, history, updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Firestore save error:', err);
    }
  }
}

/**
 * Shows toast notification
 * @param {string} message
 */
function showToast(message) {
  let toast = document.getElementById('ecoToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ecoToast';
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---- CATEGORY FILTER ----
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentCat = btn.dataset.cat;
    renderActions(currentCat);
  });
});

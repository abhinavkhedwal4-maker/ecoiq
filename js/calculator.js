/**
 * @fileoverview Carbon Calculator UI controller
 * @description Multi-step wizard that collects user answers, calls pure
 *              carbon calculation functions, renders results and a doughnut
 *              chart, fetches AI tips, and optionally syncs to Firestore.
 * @module calculator
 */

'use strict';

import { db, auth } from './firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { calcTransport, calcFood, calcEnergy, calcShopping, getGrade } from './carbon.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Total number of steps in the wizard */
const TOTAL_STEPS = 4;

/** Default electricity bill in ₹/month when field is empty */
const DEFAULT_ELECTRICITY_BILL = 1500;

/** Chart animation duration in milliseconds */
const CHART_ANIMATION_MS = 800;

/** Delay before rendering progress bars after result reveal (ms) */
const BAR_ANIMATION_DELAY_MS = 200;

/** Chart.js colour palette — one per category */
const CHART_COLORS = Object.freeze({
  transport: '#3b82f6',
  food     : '#22c55e',
  energy   : '#eab308',
  shopping : '#a855f7',
});

// ─── State ───────────────────────────────────────────────────────────────────

/**
 * Mutable store for all user answers across the wizard steps.
 * Pill selections update this object directly; numeric inputs are read on step
 * transition and on final calculation.
 * @type {Object}
 */
const answers = {
  carKm           : 0,
  carType         : 'petrol',
  flightsPerYear  : 0,
  publicTransport : 'yes',
  diet            : 'mixed',
  beefFreq        : 'never',
  foodWaste       : 'medium',
  electricityBill : DEFAULT_ELECTRICITY_BILL,
  renewable       : 'no',
  hvac            : 'medium',
  clothes         : 'monthly',
  electronics     : 'yearly',
  repair          : 'sometimes',
};

/** @type {number} Active step index (1–4) */
let currentStep = 1;

/** @type {Chart|null} Chart.js instance — destroyed before re-render */
let resultChartInstance = null;

// ─── Pill selection ──────────────────────────────────────────────────────────

document.querySelectorAll('.pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    const { group, value } = pill.dataset;
    document.querySelectorAll(`[data-group="${group}"]`).forEach((p) => {
      p.classList.remove('active');
      p.setAttribute('aria-checked', 'false');
    });
    pill.classList.add('active');
    pill.setAttribute('aria-checked', 'true');
    answers[group] = value;
  });
});

// ─── Step navigation ─────────────────────────────────────────────────────────

/**
 * Reads numeric inputs for the step being left, then transitions forward.
 * @param {number} nextStep - Target step number (1–4)
 */
window.nextStep = function nextStep(step) {
  syncNumericInputs(currentStep);
  transitionStep(currentStep, step);
  updateProgressBar(step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Transitions backward without syncing inputs (no data loss risk).
 * @param {number} prevStep - Target step number (1–4)
 */
window.prevStep = function prevStep(step) {
  transitionStep(currentStep, step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Reads numeric inputs from a given step into the answers store.
 * @param {number} step - Step whose inputs should be synced
 */
function syncNumericInputs(step) {
  if (step === 1) {
    answers.carKm          = parseFloat(document.getElementById('carKm')?.value)          || 0;
    answers.flightsPerYear = parseFloat(document.getElementById('flightsPerYear')?.value) || 0;
  } else if (step === 3) {
    answers.electricityBill = parseFloat(document.getElementById('electricityBill')?.value) || DEFAULT_ELECTRICITY_BILL;
  }
}

/**
 * Swaps the active CSS class between two step panels.
 * @param {number} from - Outgoing step number
 * @param {number} to   - Incoming step number
 */
function transitionStep(from, to) {
  document.getElementById(`step${from}`)?.classList.remove('active');
  document.getElementById(`step${to}`)?.classList.add('active');

  document.querySelectorAll('.progress-step').forEach((el, i) => {
    const stepNum = i + 1;
    el.classList.toggle('completed', stepNum < to);
    el.classList.toggle('active',    stepNum === to);
  });
}

/**
 * Updates the progress bar fill width.
 * @param {number} step - Current step (1–4)
 */
function updateProgressBar(step) {
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
}

// ─── Calculation & results ───────────────────────────────────────────────────

/**
 * Runs all four carbon calculations, renders the results panel, saves to
 * Firestore (if authenticated), and fetches AI tips.
 * @returns {Promise<void>}
 */
window.calculateFootprint = async function calculateFootprint() {
  syncNumericInputs(4);

  const transport = calcTransport(answers);
  const food      = calcFood(answers);
  const energy    = calcEnergy(answers);
  const shopping  = calcShopping(answers);
  const total     = transport + food + energy + shopping;

  document.getElementById('step4')?.classList.remove('active');
  document.getElementById('calcResult')?.classList.remove('hidden');

  renderGrade(total, getGrade(total));

  setTimeout(() => {
    renderCategoryBar('transport', transport, total);
    renderCategoryBar('food',      food,      total);
    renderCategoryBar('energy',    energy,    total);
    renderCategoryBar('shopping',  shopping,  total);
  }, BAR_ANIMATION_DELAY_MS);

  renderResultChart(transport, food, energy, shopping);
  await saveToFirestore({ transport, food, energy, shopping, total });
  await fetchAITips(total, transport, food, energy, shopping);
};

/**
 * Populates the grade emoji and comparison message in the results panel.
 * @param {number} total                - Total annual CO2e (tonnes)
 * @param {{emoji:string, comparison:string}} grade - Grade object from getGrade()
 */
function renderGrade(total, grade) {
  const emojiEl      = document.getElementById('resultEmoji');
  const totalEl      = document.getElementById('resultTotal');
  const comparisonEl = document.getElementById('resultComparison');

  if (emojiEl)      emojiEl.textContent      = grade.emoji;
  if (totalEl)      totalEl.textContent      = `${total.toFixed(1)} tonnes CO₂/year`;
  if (comparisonEl) comparisonEl.textContent = grade.comparison;
}

/**
 * Animates a single category progress bar and sets its value label.
 * @param {string} category - Category key (transport | food | energy | shopping)
 * @param {number} value    - Category CO2e value in tonnes
 * @param {number} total    - Total CO2e for calculating the percentage
 */
function renderCategoryBar(category, value, total) {
  const pct    = total > 0 ? Math.round((value / total) * 100) : 0;
  const barEl  = document.getElementById(`${category}Bar`);
  const valEl  = document.getElementById(`${category}Val`);

  if (barEl) {
    barEl.style.width = `${pct}%`;
    barEl.setAttribute('aria-valuenow', String(pct));
    barEl.setAttribute('aria-valuemin', '0');
    barEl.setAttribute('aria-valuemax', '100');
    barEl.setAttribute('aria-label', `${category} — ${pct}% of total footprint`);
  }
  if (valEl) valEl.textContent = `${value.toFixed(1)}t`;
}

// ─── Chart ───────────────────────────────────────────────────────────────────

/**
 * Renders (or re-renders) the results doughnut chart.
 * Destroys any previous Chart.js instance to avoid canvas reuse warnings.
 *
 * @param {number} transport - Transport CO2e (tonnes)
 * @param {number} food      - Food CO2e (tonnes)
 * @param {number} energy    - Energy CO2e (tonnes)
 * @param {number} shopping  - Shopping CO2e (tonnes)
 */
function renderResultChart(transport, food, energy, shopping) {
  const canvas = document.getElementById('resultChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (resultChartInstance) {
    resultChartInstance.destroy();
    resultChartInstance = null;
  }

  resultChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels  : ['Transport', 'Food', 'Energy', 'Shopping'],
      datasets: [{
        data           : [transport, food, energy, shopping].map((v) => parseFloat(v.toFixed(2))),
        backgroundColor: Object.values(CHART_COLORS),
        borderColor    : '#0a0f0a',
        borderWidth    : 3,
        hoverOffset    : 8,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: true,
      cutout             : '60%',
      plugins: {
        legend: {
          position: 'right',
          labels  : {
            color        : '#e2ffe2',
            font         : { family: 'Plus Jakarta Sans', size: 12 },
            padding      : 14,
            usePointStyle: true,
            pointStyle   : 'circle',
          },
        },
        tooltip: {
          callbacks      : { label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)} tonnes CO₂` },
          backgroundColor: 'rgba(10,15,10,0.9)',
          borderColor    : 'rgba(34,197,94,0.3)',
          borderWidth    : 1,
          titleColor     : '#22c55e',
          bodyColor      : '#e2ffe2',
          padding        : 12,
        },
      },
      animation: { duration: CHART_ANIMATION_MS, easing: 'easeInOutQuart' },
    },
  });
}

// ─── AI Tips ─────────────────────────────────────────────────────────────────

/**
 * Fetches personalised carbon-reduction tips from the EcoAI backend and
 * renders them in the results panel.
 *
 * @param {number} total     - Total annual CO2e (tonnes)
 * @param {number} transport - Transport component
 * @param {number} food      - Food component
 * @param {number} energy    - Energy component
 * @param {number} shopping  - Shopping component
 * @returns {Promise<void>}
 */
async function fetchAITips(total, transport, food, energy, shopping) {
  const loadingEl = document.getElementById('aiTipsLoading');
  const contentEl = document.getElementById('aiTipsContent');

  const prompt = [
    `My annual carbon footprint is ${total.toFixed(1)} tonnes CO₂.`,
    `Breakdown — Transport: ${transport.toFixed(1)}t, Food: ${food.toFixed(1)}t,`,
    `Energy: ${energy.toFixed(1)}t, Shopping: ${shopping.toFixed(1)}t.`,
    `Diet: ${answers.diet}, Car: ${answers.carType}, Renewable energy: ${answers.renewable}.`,
    '',
    'Give me 5 specific, personalised tips to reduce my carbon footprint.',
    'Focus on my highest categories. Be practical and encouraging.',
    'Format as a numbered list.',
  ].join('\n');

  try {
    const res = await fetch('/api/chat', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        messages: [
          { role: 'system', content: 'You are EcoAI, a sustainability expert. Give practical, personalised tips to reduce carbon footprint.' },
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

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) {
      contentEl.classList.remove('hidden');
      contentEl.innerHTML = reply
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    }
  } catch (err) {
    console.error('[Calculator] AI Tips error:', err.message);
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) {
      contentEl.classList.remove('hidden');
      contentEl.textContent = 'Could not load AI tips. Try asking the chatbot directly!';
    }
  }
}

// ─── Firestore sync ──────────────────────────────────────────────────────────

/**
 * Saves the calculation result to Firestore if the user is signed in.
 * Fails silently — auth is optional for the calculator feature.
 *
 * @param {{transport:number, food:number, energy:number, shopping:number, total:number}} result
 * @returns {Promise<void>}
 */
async function saveToFirestore(result) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(doc(db, 'footprints', user.uid), {
      ...result,
      answers      : { ...answers },
      calculatedAt : serverTimestamp(),
    });
  } catch (err) {
    console.error('[Calculator] Firestore save error:', err.message);
  }
}

// ─── Reset ───────────────────────────────────────────────────────────────────

/**
 * Returns the wizard to step 1 and hides the results panel.
 */
window.resetCalculator = function resetCalculator() {
  document.getElementById('calcResult')?.classList.add('hidden');
  document.getElementById('step1')?.classList.add('active');
  updateProgressBar(1);
  currentStep = 1;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

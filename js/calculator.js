/**
 * @fileoverview Carbon Calculator UI controller
 * @description Multi-step wizard that collects user answers, calls pure
 *              carbon calculation functions, renders results and a doughnut
 *              chart, fetches AI tips, and optionally syncs to Firestore.
 * @module calculator
 * @version 1.1.0
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
 *
 * @typedef {Object} CalculatorAnswers
 * @property {number} carKm - Weekly kilometers driven
 * @property {string} carType - Vehicle type (petrol|diesel|electric|none)
 * @property {number} flightsPerYear - Annual flight count
 * @property {string} publicTransport - Uses public transport (yes|no)
 * @property {string} diet - Diet type (vegan|vegetarian|mixed|meat_heavy)
 * @property {string} beefFreq - Beef consumption frequency
 * @property {string} foodWaste - Food waste level (low|medium|high)
 * @property {number} electricityBill - Monthly electricity bill in ₹
 * @property {string} renewable - Uses renewable energy (yes|no)
 * @property {string} hvac - HVAC usage level (low|medium|high)
 * @property {string} clothes - Clothing purchase frequency
 * @property {string} electronics - Electronics purchase frequency
 * @property {string} repair - Repair vs replace preference
 *
 * @type {CalculatorAnswers}
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
 * Advances to the next step in the calculator wizard.
 * Syncs numeric inputs from the current step before transitioning.
 *
 * @function nextStep
 * @param {number} step - Target step number (1–4)
 * @returns {void}
 *
 * @example
 * nextStep(2); // Move from step 1 to step 2
 */
window.nextStep = function nextStep(step) {
  syncNumericInputs(currentStep);
  transitionStep(currentStep, step);
  updateProgressBar(step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Returns to a previous step in the calculator wizard.
 * Does not sync inputs as user may want to change previous answers.
 *
 * @function prevStep
 * @param {number} step - Target step number (1–4)
 * @returns {void}
 *
 * @example
 * prevStep(1); // Return to step 1 from step 2
 */
window.prevStep = function prevStep(step) {
  transitionStep(currentStep, step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Reads numeric input values from a specific step and updates the answers object.
 * Only syncs inputs for steps that have numeric fields (steps 1 and 3).
 *
 * @function syncNumericInputs
 * @param {number} step - Step number whose inputs should be synced (1-4)
 * @returns {void}
 *
 * @example
 * syncNumericInputs(1); // Syncs carKm and flightsPerYear
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
 * Transitions between wizard steps by toggling CSS classes.
 * Updates progress indicators and manages step visibility.
 *
 * @function transitionStep
 * @param {number} from - Outgoing step number (1-4)
 * @param {number} to - Incoming step number (1-4)
 * @returns {void}
 *
 * @example
 * transitionStep(1, 2); // Hide step 1, show step 2
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
 * Updates the visual progress bar to reflect current wizard position.
 *
 * @function updateProgressBar
 * @param {number} step - Current step number (1-4)
 * @returns {void}
 *
 * @example
 * updateProgressBar(3); // Sets progress bar to 75%
 */
function updateProgressBar(step) {
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${(step / TOTAL_STEPS) * 100}%`;
}

// ─── Calculation & results ───────────────────────────────────────────────────

/**
 * Executes the complete carbon footprint calculation workflow.
 *
 * Performs the following operations:
 * 1. Syncs final numeric inputs
 * 2. Calculates emissions for all four categories
 * 3. Renders results with grade and category breakdown
 * 4. Generates Chart.js visualization
 * 5. Saves results to Firestore (if authenticated)
 * 6. Fetches personalized AI reduction tips
 *
 * @async
 * @function calculateFootprint
 * @returns {Promise<void>}
 *
 * @example
 * await calculateFootprint();
 * // Results displayed, chart rendered, AI tips loaded
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
 * Renders the carbon footprint grade with emoji and comparison text.
 *
 * @function renderGrade
 * @param {number} total - Total annual CO2e emissions in tonnes
 * @param {{emoji: string, comparison: string}} grade - Grade object from getGrade()
 * @returns {void}
 *
 * @example
 * renderGrade(3.5, { emoji: '🌿', comparison: 'Great! Below average.' });
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
 * Renders and animates a single category progress bar with ARIA attributes.
 *
 * @function renderCategoryBar
 * @param {string} category - Category key (transport|food|energy|shopping)
 * @param {number} value - Category CO2e value in tonnes
 * @param {number} total - Total CO2e for percentage calculation
 * @returns {void}
 *
 * @example
 * renderCategoryBar('transport', 2.5, 10.0); // Renders 25% bar
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
 * Creates or updates the results doughnut chart using Chart.js.
 * Properly destroys previous instances to prevent memory leaks.
 *
 * @function renderResultChart
 * @param {number} transport - Transport CO2e in tonnes
 * @param {number} food - Food CO2e in tonnes
 * @param {number} energy - Energy CO2e in tonnes
 * @param {number} shopping - Shopping CO2e in tonnes
 * @returns {void}
 *
 * @example
 * renderResultChart(2.5, 1.8, 1.2, 0.8);
 * // Creates doughnut chart with 4 segments
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
 * Fetches personalized carbon reduction tips from the Groq AI API.
 * Constructs a detailed prompt with user's footprint breakdown and
 * renders the AI response in the results panel.
 *
 * @async
 * @function fetchAITips
 * @param {number} total - Total annual CO2e in tonnes
 * @param {number} transport - Transport emissions in tonnes
 * @param {number} food - Food emissions in tonnes
 * @param {number} energy - Energy emissions in tonnes
 * @param {number} shopping - Shopping emissions in tonnes
 * @returns {Promise<void>}
 *
 * @example
 * await fetchAITips(5.2, 2.1, 1.5, 1.0, 0.6);
 * // Displays 5 personalized reduction tips
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
 * Persists calculation results to Firestore for authenticated users.
 * Enables cross-device sync and historical tracking.
 * Fails gracefully if user is not authenticated.
 *
 * @async
 * @function saveToFirestore
 * @param {{transport: number, food: number, energy: number, shopping: number, total: number}} result - Calculation results
 * @returns {Promise<void>}
 *
 * @example
 * await saveToFirestore({ transport: 2.5, food: 1.8, energy: 1.2, shopping: 0.8, total: 6.3 });
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
 * Resets the calculator to its initial state.
 * Returns to step 1 and hides the results panel.
 *
 * @function resetCalculator
 * @returns {void}
 *
 * @example
 * resetCalculator(); // Start over from step 1
 */
window.resetCalculator = function resetCalculator() {
  document.getElementById('calcResult')?.classList.add('hidden');
  document.getElementById('step1')?.classList.add('active');
  updateProgressBar(1);
  currentStep = 1;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

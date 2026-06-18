// ============================================
//   ECOIQ — Carbon Calculator Logic
// ============================================

import { db, auth } from './firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { calcTransport, calcFood, calcEnergy, calcShopping, getGrade } from './carbon.js';

// State
const answers = {
  carKm: 0, carType: 'petrol', flightsPerYear: 0, publicTransport: 'yes',
  diet: 'mixed', beefFreq: 'never', foodWaste: 'medium',
  electricityBill: 1500, renewable: 'no', hvac: 'medium',
  clothes: 'monthly', electronics: 'yearly', repair: 'sometimes'
};

let currentStep = 1;

// ---- PILL SELECTION ----
document.querySelectorAll('.pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const group = pill.dataset.group;
    document.querySelectorAll(`[data-group="${group}"]`).forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-checked', 'false');
    });
    pill.classList.add('active');
    pill.setAttribute('aria-checked', 'true');
    answers[group] = pill.dataset.value;
  });
});

// ---- NAVIGATION ----
window.nextStep = function(step) {
  if (step === 2) {
    answers.carKm = parseFloat(document.getElementById('carKm').value) || 0;
    answers.flightsPerYear = parseFloat(document.getElementById('flightsPerYear').value) || 0;
  } else if (step === 3) {
    // food answers already tracked via pills
  } else if (step === 4) {
    answers.electricityBill = parseFloat(document.getElementById('electricityBill').value) || 1500;
  }

  document.getElementById(`step${currentStep}`).classList.remove('active');
  document.getElementById(`step${step}`).classList.add('active');

  document.querySelectorAll('.progress-step').forEach((s, i) => {
    if (i + 1 < step) {s.classList.add('completed');}
    if (i + 1 === step) {s.classList.add('active');}
    else {s.classList.remove('active');}
  });

  document.getElementById('progressFill').style.width = `${step * 25}%`;
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.prevStep = function(step) {
  document.getElementById(`step${currentStep}`).classList.remove('active');
  document.getElementById(`step${step}`).classList.add('active');
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ---- CALCULATE ----
window.calculateFootprint = async function() {
  answers.electricityBill = parseFloat(document.getElementById('electricityBill').value) || 1500;

  const transport = calcTransport(answers);
  const food      = calcFood(answers);
  const energy    = calcEnergy(answers);
  const shopping  = calcShopping(answers);
  const total     = transport + food + energy + shopping;

  document.getElementById('step4').classList.remove('active');
  document.getElementById('calcResult').classList.remove('hidden');

  const grade = getGrade(total);
  document.getElementById('resultEmoji').textContent    = grade.emoji;
  document.getElementById('resultTotal').textContent    = `${total.toFixed(1)} tonnes CO₂/year`;
  document.getElementById('resultComparison').textContent = grade.comparison;

  // Animate bars
  setTimeout(() => {
    setBar('transport', transport, total);
    setBar('food',      food,      total);
    setBar('energy',    energy,    total);
    setBar('shopping',  shopping,  total);
  }, 200);

  // Render pie chart
  renderResultChart(transport, food, energy, shopping);

  // Save to Firestore
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'footprints', auth.currentUser.uid), {
        transport, food, energy, shopping, total,
        answers: { ...answers },
        calculatedAt: serverTimestamp()
      });
    } catch (err) { console.error('Save error:', err); }
  }

  // AI Tips
  await getAITips(total, transport, food, energy, shopping);
};

function setBar(category, value, total) {
  const pct = Math.round((value / total) * 100);
  const bar = document.getElementById(`${category}Bar`);
  const val = document.getElementById(`${category}Val`);
  if (bar) {
    bar.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', pct);
    bar.setAttribute('aria-valuemin', 0);
    bar.setAttribute('aria-valuemax', 100);
    bar.setAttribute('aria-label', `${category} ${pct}% of total`);
  }
  if (val) {val.textContent = `${value.toFixed(1)}t`;}
}

// ---- CARBON CALCULATIONS ----

// ---- AI TIPS ----
async function getAITips(total, transport, food, energy, shopping) {
  const loading = document.getElementById('aiTipsLoading');
  const content = document.getElementById('aiTipsContent');

  try {
    const prompt = `My annual carbon footprint is ${total.toFixed(1)} tonnes CO₂.
Breakdown: Transport: ${transport.toFixed(1)}t, Food: ${food.toFixed(1)}t, Energy: ${energy.toFixed(1)}t, Shopping: ${shopping.toFixed(1)}t.
Diet: ${answers.diet}, Car: ${answers.carType}, Renewable energy: ${answers.renewable}.

Give me 5 specific, personalized tips to reduce my carbon footprint. Focus on my highest categories. Be practical and encouraging. Format as a numbered list.`;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are EcoAI, a sustainability expert. Give practical, personalized tips to reduce carbon footprint.' },
          { role: 'user',   content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    const tips = data.reply;

    if (!tips) throw new Error('No tips received');

    if (loading) loading.style.display = 'none';
    if (content) {
      content.classList.remove('hidden');
      content.innerHTML = tips
        .replace(/\*\*(.*?)\*\*/g, '**$1**')
        .replace(/\n/g, '\n');
    }

  } catch (err) {
    console.error('AI Tips error:', err);
    if (loading) loading.style.display = 'none';
    if (content) {
      content.classList.remove('hidden');
      content.textContent = 'Could not load AI tips. Try asking the chatbot directly!';
    }
  }
}

window.resetCalculator = function() {
  document.getElementById('calcResult').classList.add('hidden');
  document.getElementById('step1').classList.add('active');
  currentStep = 1;
  document.getElementById('progressFill').style.width = '25%';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Renders a doughnut chart of footprint breakdown
 * @param {number} transport
 * @param {number} food
 * @param {number} energy
 * @param {number} shopping
 */
function renderResultChart(transport, food, energy, shopping) {
  const canvas = document.getElementById('resultChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy previous
  if (window._resultChart) {
    window._resultChart.destroy();
  }

  window._resultChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Transport', 'Food', 'Energy', 'Shopping'],
      datasets: [{
        data           : [
          parseFloat(transport.toFixed(2)),
          parseFloat(food.toFixed(2)),
          parseFloat(energy.toFixed(2)),
          parseFloat(shopping.toFixed(2)),
        ],
        backgroundColor: ['#3b82f6','#22c55e','#eab308','#a855f7'],
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
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)} tonnes CO₂`,
          },
          backgroundColor: 'rgba(10,15,10,0.9)',
          borderColor    : 'rgba(34,197,94,0.3)',
          borderWidth    : 1,
          titleColor     : '#22c55e',
          bodyColor      : '#e2ffe2',
          padding        : 12,
        },
      },
      animation: { duration: 800, easing: 'easeInOutQuart' },
    },
  });
}

// ---- CHAT TOGGLE ----
window.toggleChat = function() {
  const panel   = document.getElementById('chatPanel');
  const overlay = document.getElementById('chatOverlay');
  const btn     = document.getElementById('chatToggleBtn');
  if (!panel) {return;}
  const isOpen = panel.classList.toggle('open');
  overlay.classList.toggle('active', isOpen);
  if (btn) {btn.setAttribute('aria-expanded', String(isOpen));}
  document.body.style.overflow = isOpen ? 'hidden' : '';
};
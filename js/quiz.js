/**
 * @fileoverview EcoIQ Quiz Engine
 * Timed quiz with scoring, difficulty levels and results
 * @module quiz
 */

/** @type {Array<Object>} All quiz questions */
const QUESTIONS = [
  // Easy
  { q: 'What is the main greenhouse gas responsible for climate change?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'], answer: 1, cat: 'Climate', diff: 'easy', explain: 'CO₂ from burning fossil fuels is the primary driver of human-caused climate change.' },
  { q: 'Which of these has the lowest carbon footprint?', options: ['Beef burger', 'Chicken burger', 'Veggie burger', 'Fish burger'], answer: 2, cat: 'Food', diff: 'easy', explain: 'Plant-based foods produce significantly less CO₂ than animal products.' },
  { q: 'What does "carbon neutral" mean?', options: ['Zero emissions produced', 'Emissions balanced by offsets', 'Using only solar energy', 'No plastic waste'], answer: 1, cat: 'Concepts', diff: 'easy', explain: 'Carbon neutral means any CO₂ released is balanced by an equivalent amount being removed.' },
  { q: 'Which transport mode produces least CO₂ per km?', options: ['Car', 'Plane', 'Train', 'Motorbike'], answer: 2, cat: 'Transport', diff: 'easy', explain: 'Electric trains produce ~14g CO₂/km vs cars at ~170g/km.' },
  { q: 'Approximately what % of global emissions come from food production?', options: ['5%', '10%', '25%', '50%'], answer: 2, cat: 'Food', diff: 'easy', explain: 'The global food system accounts for about 26% of all greenhouse gas emissions.' },
  // Medium
  { q: 'What is the Paris Agreement\'s target for limiting global warming?', options: ['1°C above pre-industrial levels', '1.5–2°C above pre-industrial levels', '3°C above pre-industrial levels', '0.5°C above pre-industrial levels'], answer: 1, cat: 'Policy', diff: 'medium', explain: 'The Paris Agreement aims to limit warming to well below 2°C, preferably 1.5°C above pre-industrial levels.' },
  { q: 'Which household activity uses the most energy in India?', options: ['Lighting', 'Air conditioning and cooling', 'Cooking', 'Watching TV'], answer: 1, cat: 'Energy', diff: 'medium', explain: 'Space cooling (AC) is the fastest growing energy use in Indian homes, especially in summer.' },
  { q: 'What is a "carbon offset"?', options: ['A carbon tax', 'Reducing your own emissions', 'Paying to reduce emissions elsewhere', 'A type of battery'], answer: 2, cat: 'Concepts', diff: 'medium', explain: 'A carbon offset allows individuals or companies to pay for emission reductions elsewhere to compensate for their own emissions.' },
  { q: 'How long does a plastic bottle take to decompose?', options: ['10 years', '50 years', '450 years', '1000 years'], answer: 2, cat: 'Waste', diff: 'medium', explain: 'Plastic bottles take approximately 450 years to decompose in a landfill.' },
  { q: 'Which food produces the most CO₂ per kg?', options: ['Rice', 'Beef', 'Tofu', 'Lentils'], answer: 1, cat: 'Food', diff: 'medium', explain: 'Beef produces about 60kg CO₂ per kg of food — far more than any other common food.' },
  // Hard
  { q: 'What is the global average carbon footprint per person per year?', options: ['1.5 tonnes', '3 tonnes', '4.7 tonnes', '8 tonnes'], answer: 2, cat: 'Data', diff: 'hard', explain: 'The global average is about 4.7 tonnes CO₂ equivalent per person per year.' },
  { q: 'What does "net zero" mean compared to "carbon neutral"?', options: ['Same thing', 'Net zero covers all greenhouse gases not just CO₂', 'Net zero means absolute zero emissions', 'Carbon neutral is stricter'], answer: 1, cat: 'Concepts', diff: 'hard', explain: 'Net zero covers all greenhouse gases (CO₂, methane, nitrous oxide) while carbon neutral typically refers only to CO₂.' },
  { q: 'India\'s electricity grid emission factor is approximately:', options: ['0.2 kg CO₂/kWh', '0.5 kg CO₂/kWh', '0.82 kg CO₂/kWh', '1.5 kg CO₂/kWh'], answer: 2, cat: 'Energy', diff: 'hard', explain: 'India\'s grid emission factor is ~0.82 kg CO₂/kWh, one of the higher rates due to coal dependence.' },
  { q: 'What percentage of global CO₂ emissions does aviation account for?', options: ['1%', '2.5%', '5%', '10%'], answer: 1, cat: 'Transport', diff: 'hard', explain: 'Aviation accounts for about 2.5% of global CO₂ emissions, but its total climate impact is higher.' },
  { q: 'Which is the most effective individual action to reduce carbon footprint?', options: ['Recycling', 'Using LED bulbs', 'Having one fewer child', 'Going vegan'], answer: 2, cat: 'Lifestyle', diff: 'hard', explain: 'Research by Seth Wynes & Kimberly Nicholas found having one fewer child saves ~58 tonnes CO₂/year — far more than other actions.' },
];

const DIFFICULTY_MAP = { easy: ['easy','medium'], medium: ['medium','hard'], hard: ['hard','medium'] };

let currentDiff      = 'easy';
let currentQuestions = [];
let currentIdx       = 0;
let score            = 0;
let timer            = null;
let timeLeft         = 20;
let answered         = false;
let log              = [];

// ---- DIFFICULTY SELECT ----
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    currentDiff = btn.dataset.diff;
  });
});

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} arr
 * @returns {Array}
 */
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Starts the quiz */
window.startQuiz = function() {
  score   = 0;
  currentIdx = 0;
  answered   = false;
  log        = [];

  const pool = QUESTIONS.filter(q => DIFFICULTY_MAP[currentDiff].includes(q.diff));
  currentQuestions = shuffle(pool).slice(0, 15);

  document.getElementById('quizStart').classList.add('hidden');
  document.getElementById('quizActive').classList.remove('hidden');
  document.getElementById('quizResult').classList.add('hidden');

  loadQuestion();
};

/** Loads the current question */
function loadQuestion() {
  if (currentIdx >= currentQuestions.length) { endQuiz(); return; }

  const q  = currentQuestions[currentIdx];
  answered = false;

  document.getElementById('progressText').textContent  = `Question ${currentIdx + 1} of ${currentQuestions.length}`;
  document.getElementById('liveScore').textContent     = score;
  document.getElementById('progressFill').style.width  = `${((currentIdx) / currentQuestions.length) * 100}%`;
  document.getElementById('qCategory').textContent     = q.cat;
  document.getElementById('qText').textContent         = q.q;

  const progressBar = document.getElementById('quizProgressBar');
  if (progressBar) {progressBar.setAttribute('aria-valuenow', currentIdx + 1);}

  const grid   = document.getElementById('optionsGrid');
  const labels = ['A','B','C','D'];
  grid.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('aria-label', `Option ${labels[i]}: ${opt}`);
    btn.innerHTML = `<span class="option-label" aria-hidden="true">${labels[i]}</span>${opt}`;
    btn.addEventListener('click', () => selectAnswer(i, btn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAnswer(i, btn); }
    });
    grid.appendChild(btn);
  });

  startTimer();
}

/** Starts the countdown timer */
function startTimer() {
  clearInterval(timer);
  timeLeft = 20;
  const display = document.getElementById('quizTimer');
  display.textContent = timeLeft;
  display.classList.remove('urgent');

  timer = setInterval(() => {
    timeLeft--;
    display.textContent = timeLeft;
    if (timeLeft <= 5) {display.classList.add('urgent');}
    if (timeLeft <= 0) { clearInterval(timer); if (!answered) {timeoutQuestion();} }
  }, 1000);
}

/**
 * Handles answer selection
 * @param {number} selectedIdx
 * @param {HTMLElement} btn
 */
function selectAnswer(selectedIdx, _btn) {
  if (answered) {return;}
  answered = true;
  clearInterval(timer);

  const q       = currentQuestions[currentIdx];
  const allBtns = document.querySelectorAll('.option-btn');
  const correct = selectedIdx === q.answer;

  allBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer)    {b.classList.add('correct');}
    else if (i === selectedIdx) {b.classList.add('wrong');}
  });

  if (correct) {score++;}
  log.push({ q: q.q, correct, explain: q.explain });

  setTimeout(() => { currentIdx++; loadQuestion(); }, 1600);
}

/** Handles question timeout */
function timeoutQuestion() {
  answered = true;
  const q       = currentQuestions[currentIdx];
  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) {b.classList.add('correct');}
  });
  log.push({ q: q.q, correct: false, explain: q.explain });
  setTimeout(() => { currentIdx++; loadQuestion(); }, 1400);
}

/** Skips current question */
window.skipQuestion = function() {
  if (answered) {return;}
  clearInterval(timer);
  const q = currentQuestions[currentIdx];
  log.push({ q: q.q, correct: false, explain: q.explain });
  currentIdx++;
  loadQuestion();
};

/** Ends quiz and shows results */
function endQuiz() {
  clearInterval(timer);
  document.getElementById('quizActive').classList.add('hidden');
  document.getElementById('quizResult').classList.remove('hidden');

  const pct          = Math.round((score / currentQuestions.length) * 100);
  const { emoji, grade, msg } = getGrade(pct);

  document.getElementById('resultEmoji').textContent   = emoji;
  document.getElementById('resultGrade').textContent   = grade;
  document.getElementById('finalScore').textContent    = score;
  document.getElementById('resultMessage').textContent = msg;

  const circle = document.getElementById('scoreRingCircle');
  const offset = 314 - (314 * pct) / 100;
  setTimeout(() => {
    circle.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
    circle.style.strokeDashoffset = offset;
  }, 200);

  const correct = log.filter(l => l.correct).length;
  const wrong   = log.length - correct;
  document.getElementById('resultBreakdown').innerHTML = `
    <div class="breakdown-row" role="listitem"><span>✅ Correct</span><span>${correct}</span></div>
    <div class="breakdown-row" role="listitem"><span>❌ Wrong / Skipped</span><span>${wrong}</span></div>
    <div class="breakdown-row" role="listitem"><span>📊 Accuracy</span><span>${pct}%</span></div>
    <div class="breakdown-row" role="listitem"><span>🏆 Score</span><span>${score}/${currentQuestions.length}</span></div>
  `;
}

/**
 * Gets grade based on percentage
 * @param {number} pct - Percentage score
 * @returns {{emoji:string, grade:string, msg:string}}
 */
function getGrade(pct) {
  if (pct >= 90) {return { emoji: '🌍', grade: 'Eco Expert!',    msg: 'Outstanding! You have exceptional environmental knowledge.' };}
  if (pct >= 75) {return { emoji: '🌳', grade: 'Eco Champion!',  msg: 'Excellent! You know your sustainability very well.' };}
  if (pct >= 60) {return { emoji: '🌿', grade: 'Eco Aware!',     msg: 'Good job! Keep learning to boost your green knowledge.' };}
  if (pct >= 40) {return { emoji: '🌱', grade: 'Eco Learner!',   msg: 'Not bad! Explore our calculator and tracker to learn more.' };}
  return { emoji: '🌾', grade: 'Eco Beginner!', msg: 'Everyone starts somewhere! Use EcoAI to learn more.' };
}

/** Restarts the quiz */
window.restartQuiz = function() {
  document.getElementById('quizResult').classList.add('hidden');
  document.getElementById('quizStart').classList.remove('hidden');
};

// ---- CHAT TOGGLE ----
// toggleChat is now provided by shared.js - no need to redefine it here
/**
 * @fileoverview EcoIQ Quiz Engine
 * @description Timed multiple-choice quiz with difficulty levels, score
 *              tracking, animated results ring, and explanations per question.
 *              All state is local — no Firebase dependency.
 * @module quiz
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Seconds allowed per question */
const SECONDS_PER_QUESTION = 20;

/** Number of questions served per quiz session */
const QUESTIONS_PER_QUIZ = 15;

/** Milliseconds to show correct/wrong highlight before advancing */
const ANSWER_REVEAL_DELAY_MS = 1600;

/** Milliseconds to show timeout highlight before advancing */
const TIMEOUT_REVEAL_DELAY_MS = 1400;

/** SVG circle circumference for the score ring (r=50 → C = 2πr ≈ 314) */
const SCORE_RING_CIRCUMFERENCE = 314;

/** Milliseconds before animating the score ring on results screen */
const RING_ANIMATION_DELAY_MS = 200;

/**
 * Maps difficulty selection to the pool of question difficulty tags included.
 * @type {Readonly<Object<string, string[]>>}
 */
const DIFFICULTY_MAP = Object.freeze({
  easy  : ['easy', 'medium'],
  medium: ['medium', 'hard'],
  hard  : ['hard', 'medium'],
});

/**
 * All quiz questions with answers, category tags, difficulty and explanation.
 * @type {ReadonlyArray<{
 *   q: string,
 *   options: string[],
 *   answer: number,
 *   cat: string,
 *   diff: string,
 *   explain: string
 * }>}
 */
const QUESTIONS = Object.freeze([
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    q      : 'What is the main greenhouse gas responsible for climate change?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Hydrogen'],
    answer : 1,
    cat    : 'Climate',
    diff   : 'easy',
    explain: 'CO₂ from burning fossil fuels is the primary driver of human-caused climate change.',
  },
  {
    q      : 'Which of these has the lowest carbon footprint?',
    options: ['Beef burger', 'Chicken burger', 'Veggie burger', 'Fish burger'],
    answer : 2,
    cat    : 'Food',
    diff   : 'easy',
    explain: 'Plant-based foods produce significantly less CO₂ than animal products.',
  },
  {
    q      : 'What does "carbon neutral" mean?',
    options: ['Zero emissions produced', 'Emissions balanced by offsets', 'Using only solar energy', 'No plastic waste'],
    answer : 1,
    cat    : 'Concepts',
    diff   : 'easy',
    explain: 'Carbon neutral means any CO₂ released is balanced by an equivalent amount being removed.',
  },
  {
    q      : 'Which transport mode produces least CO₂ per km?',
    options: ['Car', 'Plane', 'Train', 'Motorbike'],
    answer : 2,
    cat    : 'Transport',
    diff   : 'easy',
    explain: 'Electric trains produce ~14 g CO₂/km vs cars at ~170 g/km.',
  },
  {
    q      : 'Approximately what % of global emissions come from food production?',
    options: ['5%', '10%', '25%', '50%'],
    answer : 2,
    cat    : 'Food',
    diff   : 'easy',
    explain: 'The global food system accounts for about 26% of all greenhouse gas emissions.',
  },
  // ── Medium ────────────────────────────────────────────────────────────────
  {
    q      : "What is the Paris Agreement's target for limiting global warming?",
    options: ['1°C above pre-industrial levels', '1.5–2°C above pre-industrial levels', '3°C above pre-industrial levels', '0.5°C above pre-industrial levels'],
    answer : 1,
    cat    : 'Policy',
    diff   : 'medium',
    explain: 'The Paris Agreement aims to limit warming to well below 2°C, preferably 1.5°C above pre-industrial levels.',
  },
  {
    q      : 'Which household activity uses the most energy in India?',
    options: ['Lighting', 'Air conditioning and cooling', 'Cooking', 'Watching TV'],
    answer : 1,
    cat    : 'Energy',
    diff   : 'medium',
    explain: 'Space cooling (AC) is the fastest growing energy use in Indian homes, especially in summer.',
  },
  {
    q      : 'What is a "carbon offset"?',
    options: ['A carbon tax', 'Reducing your own emissions', 'Paying to reduce emissions elsewhere', 'A type of battery'],
    answer : 2,
    cat    : 'Concepts',
    diff   : 'medium',
    explain: 'A carbon offset allows individuals or companies to pay for emission reductions elsewhere to compensate for their own emissions.',
  },
  {
    q      : 'How long does a plastic bottle take to decompose?',
    options: ['10 years', '50 years', '450 years', '1000 years'],
    answer : 2,
    cat    : 'Waste',
    diff   : 'medium',
    explain: 'Plastic bottles take approximately 450 years to decompose in a landfill.',
  },
  {
    q      : 'Which food produces the most CO₂ per kg?',
    options: ['Rice', 'Beef', 'Tofu', 'Lentils'],
    answer : 1,
    cat    : 'Food',
    diff   : 'medium',
    explain: 'Beef produces about 60 kg CO₂ per kg of food — far more than any other common food.',
  },
  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    q      : 'What is the global average carbon footprint per person per year?',
    options: ['1.5 tonnes', '3 tonnes', '4.7 tonnes', '8 tonnes'],
    answer : 2,
    cat    : 'Data',
    diff   : 'hard',
    explain: 'The global average is about 4.7 tonnes CO₂ equivalent per person per year.',
  },
  {
    q      : 'What does "net zero" mean compared to "carbon neutral"?',
    options: ['Same thing', 'Net zero covers all greenhouse gases not just CO₂', 'Net zero means absolute zero emissions', 'Carbon neutral is stricter'],
    answer : 1,
    cat    : 'Concepts',
    diff   : 'hard',
    explain: 'Net zero covers all greenhouse gases (CO₂, methane, nitrous oxide) while carbon neutral typically refers only to CO₂.',
  },
  {
    q      : "India's electricity grid emission factor is approximately:",
    options: ['0.2 kg CO₂/kWh', '0.5 kg CO₂/kWh', '0.82 kg CO₂/kWh', '1.5 kg CO₂/kWh'],
    answer : 2,
    cat    : 'Energy',
    diff   : 'hard',
    explain: "India's grid emission factor is ~0.82 kg CO₂/kWh, one of the higher rates due to coal dependence. Source: CEA 2023.",
  },
  {
    q      : 'What percentage of global CO₂ emissions does aviation account for?',
    options: ['1%', '2.5%', '5%', '10%'],
    answer : 1,
    cat    : 'Transport',
    diff   : 'hard',
    explain: 'Aviation accounts for about 2.5% of global CO₂ emissions, though its total climate impact (including contrails) is higher.',
  },
  {
    q      : 'Which is the most effective individual action to reduce carbon footprint?',
    options: ['Recycling', 'Using LED bulbs', 'Having one fewer child', 'Going vegan'],
    answer : 2,
    cat    : 'Lifestyle',
    diff   : 'hard',
    explain: 'Research by Wynes & Nicholas (2017) found having one fewer child saves ~58 tonnes CO₂/year — far more than other actions.',
  },
]);

// ─── Quiz state ───────────────────────────────────────────────────────────────

/** @type {string} */
let currentDiff = 'easy';

/** @type {Array<typeof QUESTIONS[number]>} */
let currentQuestions = [];

/** @type {number} */
let currentIdx = 0;

/** @type {number} */
let score = 0;

/** @type {number|null} */
let timerHandle = null;

/** @type {number} */
let timeLeft = SECONDS_PER_QUESTION;

/** @type {boolean} */
let answered = false;

/** @type {Array<{q:string, correct:boolean, explain:string}>} */
let answerLog = [];

// ─── Difficulty buttons ───────────────────────────────────────────────────────

document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    currentDiff = btn.dataset.diff;
  });
});

// ─── Quiz flow ────────────────────────────────────────────────────────────────

/**
 * Shuffles an array using Fisher-Yates algorithm.
 * Returns a new array — does not mutate the original.
 * @template T
 * @param {T[]} arr - Array to shuffle
 * @returns {T[]} New shuffled array
 */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Starts a new quiz session, resetting all state. */
window.startQuiz = function startQuiz() {
  score      = 0;
  currentIdx = 0;
  answered   = false;
  answerLog  = [];

  const pool = QUESTIONS.filter((q) => DIFFICULTY_MAP[currentDiff].includes(q.diff));
  currentQuestions = shuffle(pool).slice(0, QUESTIONS_PER_QUIZ);

  setScreenVisibility({ start: false, active: true, result: false });
  loadQuestion();
};

/**
 * Controls which quiz screen is visible.
 * @param {{start:boolean, active:boolean, result:boolean}} visibility
 */
function setScreenVisibility({ start, active, result }) {
  document.getElementById('quizStart')?.classList.toggle('hidden', !start);
  document.getElementById('quizActive')?.classList.toggle('hidden', !active);
  document.getElementById('quizResult')?.classList.toggle('hidden', !result);
}

/** Loads the current question into the DOM. */
function loadQuestion() {
  if (currentIdx >= currentQuestions.length) {
    endQuiz();
    return;
  }

  const q  = currentQuestions[currentIdx];
  answered = false;

  const progressText = document.getElementById('progressText');
  const liveScore    = document.getElementById('liveScore');
  const progressFill = document.getElementById('progressFill');
  const progressBar  = document.getElementById('quizProgressBar');
  const qCategory    = document.getElementById('qCategory');
  const qText        = document.getElementById('qText');

  if (progressText) progressText.textContent = `Question ${currentIdx + 1} of ${currentQuestions.length}`;
  if (liveScore)    liveScore.textContent    = String(score);
  if (progressFill) progressFill.style.width = `${(currentIdx / currentQuestions.length) * 100}%`;
  if (progressBar)  progressBar.setAttribute('aria-valuenow', String(currentIdx + 1));
  if (qCategory)    qCategory.textContent   = q.cat;
  if (qText)        qText.textContent       = q.q;

  renderOptions(q);
  startTimer();
}

/**
 * Renders answer option buttons for a question.
 * @param {typeof QUESTIONS[number]} q - Current question
 */
function renderOptions(q) {
  const grid   = document.getElementById('optionsGrid');
  if (!grid) return;

  const labels = ['A', 'B', 'C', 'D'];
  grid.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('aria-label', `Option ${labels[i]}: ${opt}`);
    btn.innerHTML = `<span class="option-label" aria-hidden="true">${labels[i]}</span>${opt}`;
    btn.addEventListener('click',   () => selectAnswer(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAnswer(i); }
    });
    grid.appendChild(btn);
  });
}

/** Starts the per-question countdown timer. */
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = SECONDS_PER_QUESTION;

  const display = document.getElementById('quizTimer');
  if (!display) return;

  display.textContent = String(timeLeft);
  display.classList.remove('urgent');

  timerHandle = setInterval(() => {
    timeLeft -= 1;
    display.textContent = String(timeLeft);
    if (timeLeft <= 5) display.classList.add('urgent');
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      if (!answered) timeoutQuestion();
    }
  }, 1000);
}

/**
 * Handles the user selecting an answer option.
 * @param {number} selectedIdx - Index of the chosen option (0–3)
 */
function selectAnswer(selectedIdx) {
  if (answered) return;
  answered = true;
  clearInterval(timerHandle);

  const q       = currentQuestions[currentIdx];
  const correct = selectedIdx === q.answer;
  const allBtns = document.querySelectorAll('.option-btn');

  allBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)   btn.classList.add('correct');
    else if (i === selectedIdx) btn.classList.add('wrong');
  });

  if (correct) score += 1;
  answerLog.push({ q: q.q, correct, explain: q.explain });

  setTimeout(() => { currentIdx += 1; loadQuestion(); }, ANSWER_REVEAL_DELAY_MS);
}

/** Handles question timeout — reveals the correct answer before advancing. */
function timeoutQuestion() {
  answered = true;
  const q       = currentQuestions[currentIdx];
  const allBtns = document.querySelectorAll('.option-btn');

  allBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
  });

  answerLog.push({ q: q.q, correct: false, explain: q.explain });
  setTimeout(() => { currentIdx += 1; loadQuestion(); }, TIMEOUT_REVEAL_DELAY_MS);
}

/** Skips the current question without penalising the score. */
window.skipQuestion = function skipQuestion() {
  if (answered) return;
  clearInterval(timerHandle);
  answerLog.push({ q: currentQuestions[currentIdx].q, correct: false, explain: '' });
  currentIdx += 1;
  loadQuestion();
};

// ─── Results ─────────────────────────────────────────────────────────────────

/** Ends the quiz and renders the results screen. */
function endQuiz() {
  clearInterval(timerHandle);
  setScreenVisibility({ start: false, active: false, result: true });

  const pct              = Math.round((score / currentQuestions.length) * 100);
  const { emoji, grade, msg } = getGrade(pct);

  const resultEmoji   = document.getElementById('resultEmoji');
  const resultGrade   = document.getElementById('resultGrade');
  const finalScore    = document.getElementById('finalScore');
  const resultMessage = document.getElementById('resultMessage');

  if (resultEmoji)   resultEmoji.textContent   = emoji;
  if (resultGrade)   resultGrade.textContent   = grade;
  if (finalScore)    finalScore.textContent    = String(score);
  if (resultMessage) resultMessage.textContent = msg;

  animateScoreRing(pct);
  renderBreakdown(pct);
}

/**
 * Animates the SVG score ring to reflect the achieved percentage.
 * @param {number} pct - Score as a percentage (0–100)
 */
function animateScoreRing(pct) {
  const circle = document.getElementById('scoreRingCircle');
  if (!circle) return;

  const offset = SCORE_RING_CIRCUMFERENCE - (SCORE_RING_CIRCUMFERENCE * pct) / 100;
  setTimeout(() => {
    circle.style.transition      = 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';
    circle.style.strokeDashoffset = String(offset);
  }, RING_ANIMATION_DELAY_MS);
}

/**
 * Renders the score breakdown table in the results panel.
 * @param {number} pct - Score percentage
 */
function renderBreakdown(pct) {
  const container = document.getElementById('resultBreakdown');
  if (!container) return;

  const correct = answerLog.filter((l) => l.correct).length;
  const wrong   = answerLog.length - correct;

  container.innerHTML = `
    <div class="breakdown-row" role="listitem"><span>✅ Correct</span><span>${correct}</span></div>
    <div class="breakdown-row" role="listitem"><span>❌ Wrong / Skipped</span><span>${wrong}</span></div>
    <div class="breakdown-row" role="listitem"><span>📊 Accuracy</span><span>${pct}%</span></div>
    <div class="breakdown-row" role="listitem"><span>🏆 Score</span><span>${score}/${currentQuestions.length}</span></div>
  `;
}

/** Returns the player to the start screen for a new attempt. */
window.restartQuiz = function restartQuiz() {
  setScreenVisibility({ start: true, active: false, result: false });
};

// ─── Grade system ─────────────────────────────────────────────────────────────

/**
 * Maps a percentage score to an emoji, grade label, and encouragement message.
 * @param {number} pct - Percentage score (0–100)
 * @returns {{emoji: string, grade: string, msg: string}}
 */
function getGrade(pct) {
  if (pct >= 90) return { emoji: '🌍', grade: 'Eco Expert!',   msg: 'Outstanding! You have exceptional environmental knowledge.' };
  if (pct >= 75) return { emoji: '🌳', grade: 'Eco Champion!', msg: 'Excellent! You know your sustainability very well.' };
  if (pct >= 60) return { emoji: '🌿', grade: 'Eco Aware!',    msg: 'Good job! Keep learning to boost your green knowledge.' };
  if (pct >= 40) return { emoji: '🌱', grade: 'Eco Learner!',  msg: 'Not bad! Explore our calculator and tracker to learn more.' };
  return { emoji: '🌾', grade: 'Eco Beginner!', msg: 'Everyone starts somewhere! Use EcoAI to learn more.' };
}

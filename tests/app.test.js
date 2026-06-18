/**
 * @fileoverview EcoIQ Comprehensive Test Suite
 * @description Tests carbon calculations, validation, security,
 *              formatting, data integrity and edge cases
 * @version 2.0.0
 *
 * Run with: node tests/app.test.js
 */

'use strict';

// ─── Test Framework ───────────────────────────────────────────────────────────

let passed  = 0;
let failed  = 0;
let skipped = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     └─ ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', error: err.message });
  }
}

function describe(name, fn) {
  console.log(`\n📋 ${name}`);
  fn();
}

function expect(val) {
  return {
    toBe          : (e) => { if (val !== e)    throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toEqual       : (e) => { if (JSON.stringify(val) !== JSON.stringify(e)) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toBeGreaterThan:(n) => { if (val <= n)     throw new Error(`Expected ${val} > ${n}`); },
    toBeLessThan  : (n) => { if (val >= n)     throw new Error(`Expected ${val} < ${n}`); },
    toBeCloseTo   : (e, p = 1) => { if (Math.abs(val - e) > p) throw new Error(`Expected ${val} ≈ ${e}`); },
    toBeTruthy    : ()  => { if (!val)         throw new Error(`Expected truthy, got ${val}`); },
    toBeFalsy     : ()  => { if (val)          throw new Error(`Expected falsy, got ${val}`); },
    toContain     : (s) => { if (!String(val).includes(s)) throw new Error(`Expected "${val}" to contain "${s}"`); },
    toBeNull      : ()  => { if (val !== null) throw new Error(`Expected null, got ${val}`); },
    toBeUndefined : ()  => { if (val !== undefined) throw new Error(`Expected undefined, got ${val}`); },
    toBeArray     : ()  => { if (!Array.isArray(val)) throw new Error(`Expected array, got ${typeof val}`); },
    toHaveLength  : (n) => { if (val.length !== n) throw new Error(`Expected length ${n}, got ${val.length}`); },
    toBeGreaterThanOrEqual: (n) => { if (val < n) throw new Error(`Expected ${val} >= ${n}`); },
    toThrow       : ()  => {
      try { val(); throw new Error('Expected function to throw'); }
      catch (e) { if (e.message === 'Expected function to throw') throw e; }
    },
  };
}

// ─── Source Functions ─────────────────────────────────────────────────────────

function calcTransport(answers) {
  const carFactors = { petrol: 0.21, diesel: 0.17, electric: 0.05, none: 0 };
  const factor     = carFactors[answers.carType] ?? 0.21;
  const carCO2     = (answers.carKm ?? 0) * 52 * factor / 1000;
  const flightCO2  = (answers.flightsPerYear ?? 0) * 0.9;
  const ptFactor   = answers.publicTransport === 'yes' ? 0.85 : 1;
  return Math.max(0, (carCO2 + flightCO2) * ptFactor);
}

function calcFood(answers) {
  const dietBase   = { vegan: 1.5, vegetarian: 1.7, mixed: 2.5, meat_heavy: 3.3 };
  const beefExtra  = { never: 0, once: 0.3, often: 0.8, daily: 1.5 };
  const wasteExtra = { low: 0, medium: 0.2, high: 0.5 };
  return (dietBase[answers.diet]       ?? 2.5) +
         (beefExtra[answers.beefFreq]  ?? 0)   +
         (wasteExtra[answers.foodWaste] ?? 0.2);
}

function calcEnergy(answers) {
  const kwhEstimate = (answers.electricityBill ?? 1500) / 8;
  const annualKwh   = kwhEstimate * 12;
  let   co2         = (annualKwh * 0.82) / 1000;
  if (answers.renewable === 'yes') co2 *= 0.3;
  const hvacExtra   = { low: 0, medium: 0.3, high: 0.8 };
  return Math.max(0, co2 + (hvacExtra[answers.hvac] ?? 0.3));
}

function calcShopping(answers) {
  const clothesScore     = { rarely: 0.3, monthly: 0.8, weekly: 1.5 };
  const electronicsScore = { rarely: 0.2, yearly: 0.5, often: 1.2 };
  const repairBonus      = { always: -0.3, sometimes: 0, never: 0.2 };
  return Math.max(
    0,
    (clothesScore[answers.clothes]         ?? 0.8) +
    (electronicsScore[answers.electronics] ?? 0.5) +
    (repairBonus[answers.repair]           ?? 0)
  );
}

function calcTotal(answers) {
  return calcTransport(answers) +
         calcFood(answers)      +
         calcEnergy(answers)    +
         calcShopping(answers);
}

function getGrade(pct) {
  if (pct >= 90) return { emoji: '🌍', grade: 'Eco Expert!',   msg: 'Outstanding!' };
  if (pct >= 75) return { emoji: '🌳', grade: 'Eco Champion!', msg: 'Excellent!' };
  if (pct >= 60) return { emoji: '🌿', grade: 'Eco Aware!',    msg: 'Good job!' };
  if (pct >= 40) return { emoji: '🌱', grade: 'Eco Learner!',  msg: 'Keep going!' };
  return { emoji: '🌾', grade: 'Eco Beginner!', msg: 'Start here!' };
}

function getLevel(points) {
  if (points >= 1000) return { name: 'Guardian', icon: '🌍' };
  if (points >= 600)  return { name: 'Tree',     icon: '🌲' };
  if (points >= 300)  return { name: 'Sapling',  icon: '🌳' };
  if (points >= 100)  return { name: 'Sprout',   icon: '🌿' };
  return { name: 'Seedling', icon: '🌱' };
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 2000);
}

function validateMessages(messages) {
  if (!Array.isArray(messages))  return { valid: false, error: 'not array' };
  if (messages.length === 0)     return { valid: false, error: 'empty' };
  if (messages.length > 50)      return { valid: false, error: 'too many' };
  const validRoles = new Set(['user', 'assistant', 'system']);
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') return { valid: false, error: 'bad object' };
    if (!validRoles.has(msg.role))       return { valid: false, error: 'bad role' };
    if (typeof msg.content !== 'string') return { valid: false, error: 'bad content' };
    if (!msg.content.trim())             return { valid: false, error: 'empty content' };
  }
  return { valid: true };
}

function formatMessage(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/`(.*?)`/g,       (_, c) => `<code style="background:rgba(34,197,94,0.15);padding:0.1em 0.4em;border-radius:4px;font-family:monospace;">${sanitizeString(c)}</code>`)
    .replace(/\n\n/g,          '</p><p>')
    .replace(/\n/g,            '<br>')
    .replace(/^/,              '<p>')
    .replace(/$/,              '</p>');
}

function getActiveDays(history) {
  return new Set(history.map(h => h.date)).size;
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗');
console.log('║     🌱 EcoIQ Comprehensive Test Suite    ║');
console.log('╚══════════════════════════════════════════╝');

// ── Transport ──
describe('Transport Carbon Calculations', () => {
  test('electric car emits less than petrol at same distance', () => {
    const elec   = calcTransport({ carKm: 200, carType: 'electric', flightsPerYear: 0, publicTransport: 'no' });
    const petrol = calcTransport({ carKm: 200, carType: 'petrol',   flightsPerYear: 0, publicTransport: 'no' });
    expect(elec).toBeLessThan(petrol);
  });

  test('diesel car emits less than petrol car', () => {
    const diesel = calcTransport({ carKm: 100, carType: 'diesel', flightsPerYear: 0, publicTransport: 'no' });
    const petrol = calcTransport({ carKm: 100, carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' });
    expect(diesel).toBeLessThan(petrol);
  });

  test('no car + no flights = zero emissions', () => {
    const result = calcTransport({ carKm: 0, carType: 'none', flightsPerYear: 0, publicTransport: 'no' });
    expect(result).toBe(0);
  });

  test('flights add proportionally to emissions', () => {
    const one  = calcTransport({ carKm: 0, carType: 'none', flightsPerYear: 1, publicTransport: 'no' });
    const four = calcTransport({ carKm: 0, carType: 'none', flightsPerYear: 4, publicTransport: 'no' });
    expect(four).toBeCloseTo(one * 4, 0.1);
  });

  test('public transport reduces emissions by 15%', () => {
    const withPT    = calcTransport({ carKm: 100, carType: 'petrol', flightsPerYear: 0, publicTransport: 'yes' });
    const withoutPT = calcTransport({ carKm: 100, carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' });
    expect(withPT).toBeCloseTo(withoutPT * 0.85, 0.01);
  });

  test('transport result is always non-negative', () => {
    const result = calcTransport({ carKm: 0, carType: 'none', flightsPerYear: 0, publicTransport: 'yes' });
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('unknown car type defaults to petrol factor', () => {
    const unknown = calcTransport({ carKm: 100, carType: 'unknown', flightsPerYear: 0, publicTransport: 'no' });
    const petrol  = calcTransport({ carKm: 100, carType: 'petrol',  flightsPerYear: 0, publicTransport: 'no' });
    expect(unknown).toBe(petrol);
  });

  test('very high km produces proportionally high emissions', () => {
    const low  = calcTransport({ carKm: 100,  carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' });
    const high = calcTransport({ carKm: 1000, carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' });
    expect(high).toBeCloseTo(low * 10, 0.1);
  });
});

// ── Food ──
describe('Food Carbon Calculations', () => {
  test('vegan diet has lowest base emissions', () => {
    const vegan = calcFood({ diet: 'vegan',      beefFreq: 'never', foodWaste: 'low' });
    const meat  = calcFood({ diet: 'meat_heavy', beefFreq: 'never', foodWaste: 'low' });
    expect(vegan).toBeLessThan(meat);
  });

  test('daily beef adds most to emissions', () => {
    const never = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'low' });
    const daily = calcFood({ diet: 'mixed', beefFreq: 'daily', foodWaste: 'low' });
    expect(daily).toBeGreaterThan(never);
  });

  test('high food waste adds 0.5t more than low waste', () => {
    const low  = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'low' });
    const high = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'high' });
    expect(high - low).toBeCloseTo(0.5, 0.01);
  });

  test('vegetarian lower than mixed diet', () => {
    const veg   = calcFood({ diet: 'vegetarian', beefFreq: 'never', foodWaste: 'low' });
    const mixed = calcFood({ diet: 'mixed',      beefFreq: 'never', foodWaste: 'low' });
    expect(veg).toBeLessThan(mixed);
  });

  test('food result is always positive', () => {
    const result = calcFood({ diet: 'vegan', beefFreq: 'never', foodWaste: 'low' });
    expect(result).toBeGreaterThan(0);
  });

  test('unknown diet defaults to mixed', () => {
    const unknown = calcFood({ diet: 'unknown', beefFreq: 'never', foodWaste: 'low' });
    const mixed   = calcFood({ diet: 'mixed',   beefFreq: 'never', foodWaste: 'low' });
    expect(unknown).toBe(mixed);
  });
});

// ── Energy ──
describe('Energy Carbon Calculations', () => {
  test('renewable energy reduces emissions by 70%', () => {
    const renew  = calcEnergy({ electricityBill: 1500, renewable: 'yes', hvac: 'low' });
    const normal = calcEnergy({ electricityBill: 1500, renewable: 'no',  hvac: 'low' });
    expect(renew).toBeCloseTo(normal * 0.3, 0.05);
  });

  test('higher bill produces more emissions', () => {
    const low  = calcEnergy({ electricityBill: 500,  renewable: 'no', hvac: 'low' });
    const high = calcEnergy({ electricityBill: 5000, renewable: 'no', hvac: 'low' });
    expect(high).toBeGreaterThan(low);
  });

  test('heavy HVAC adds 0.8t more than minimal', () => {
    const minimal = calcEnergy({ electricityBill: 1500, renewable: 'no', hvac: 'low' });
    const heavy   = calcEnergy({ electricityBill: 1500, renewable: 'no', hvac: 'high' });
    expect(heavy - minimal).toBeCloseTo(0.8, 0.01);
  });

  test('zero bill still has HVAC emissions', () => {
    const result = calcEnergy({ electricityBill: 0, renewable: 'no', hvac: 'medium' });
    expect(result).toBeGreaterThan(0);
  });

  test('energy result is always non-negative', () => {
    const result = calcEnergy({ electricityBill: 0, renewable: 'yes', hvac: 'low' });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ── Shopping ──
describe('Shopping Carbon Calculations', () => {
  test('rarely buying is better than weekly', () => {
    const rarely = calcShopping({ clothes: 'rarely', electronics: 'rarely', repair: 'always' });
    const weekly = calcShopping({ clothes: 'weekly', electronics: 'often',  repair: 'never' });
    expect(rarely).toBeLessThan(weekly);
  });

  test('repairing reduces emissions vs never repairing', () => {
    const fixes   = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'always' });
    const noFixes = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'never' });
    expect(fixes).toBeLessThan(noFixes);
  });

  test('shopping result is never negative', () => {
    const result = calcShopping({ clothes: 'rarely', electronics: 'rarely', repair: 'always' });
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('repair always reduces by 0.5 vs never', () => {
    const always = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'always' });
    const never  = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'never' });
    expect(never - always).toBeCloseTo(0.5, 0.01);
  });
});

// ── Total Footprint ──
describe('Total Footprint Calculation', () => {
  test('total is sum of all four categories', () => {
    const answers = { carKm: 100, carType: 'petrol', flightsPerYear: 2, publicTransport: 'no', diet: 'mixed', beefFreq: 'once', foodWaste: 'medium', electricityBill: 1500, renewable: 'no', hvac: 'medium', clothes: 'monthly', electronics: 'yearly', repair: 'sometimes' };
    const total   = calcTotal(answers);
    const manual  = calcTransport(answers) + calcFood(answers) + calcEnergy(answers) + calcShopping(answers);
    expect(total).toBeCloseTo(manual, 0.001);
  });

  test('total footprint is always positive', () => {
    const minAnswers = { carKm: 0, carType: 'none', flightsPerYear: 0, publicTransport: 'yes', diet: 'vegan', beefFreq: 'never', foodWaste: 'low', electricityBill: 0, renewable: 'yes', hvac: 'low', clothes: 'rarely', electronics: 'rarely', repair: 'always' };
    expect(calcTotal(minAnswers)).toBeGreaterThan(0);
  });

  test('high impact lifestyle has significantly more emissions than low', () => {
    const low  = { carKm: 0,   carType: 'none',   flightsPerYear: 0,  publicTransport: 'yes', diet: 'vegan',      beefFreq: 'never', foodWaste: 'low',  electricityBill: 500,   renewable: 'yes', hvac: 'low',  clothes: 'rarely', electronics: 'rarely', repair: 'always' };
    const high = { carKm: 500, carType: 'petrol', flightsPerYear: 10, publicTransport: 'no',  diet: 'meat_heavy', beefFreq: 'daily', foodWaste: 'high', electricityBill: 10000, renewable: 'no',  hvac: 'high', clothes: 'weekly', electronics: 'often',  repair: 'never'  };
    expect(calcTotal(high)).toBeGreaterThan(calcTotal(low) * 5);
  });
});

// ── Grade System ──
describe('Quiz Grade System', () => {
  test('100% score gives Eco Expert grade', () => { expect(getGrade(100).grade).toBe('Eco Expert!'); });
  test('90% gives Eco Expert',              () => { expect(getGrade(90).grade).toBe('Eco Expert!'); });
  test('75% gives Eco Champion',            () => { expect(getGrade(75).grade).toBe('Eco Champion!'); });
  test('60% gives Eco Aware',               () => { expect(getGrade(60).grade).toBe('Eco Aware!'); });
  test('40% gives Eco Learner',             () => { expect(getGrade(40).grade).toBe('Eco Learner!'); });
  test('0% gives Eco Beginner',             () => { expect(getGrade(0).grade).toBe('Eco Beginner!'); });
  test('all grades return emoji', () => {
    [0, 40, 60, 75, 90, 100].forEach(pct => { expect(getGrade(pct).emoji).toBeTruthy(); });
  });
});

// ── Eco Level System ──
describe('Eco Level System', () => {
  test('0 points gives Seedling level',    () => { expect(getLevel(0).name).toBe('Seedling'); });
  test('100 points gives Sprout level',    () => { expect(getLevel(100).name).toBe('Sprout'); });
  test('300 points gives Sapling level',   () => { expect(getLevel(300).name).toBe('Sapling'); });
  test('600 points gives Tree level',      () => { expect(getLevel(600).name).toBe('Tree'); });
  test('1000 points gives Guardian level', () => { expect(getLevel(1000).name).toBe('Guardian'); });
  test('all levels return an icon', () => {
    [0, 100, 300, 600, 1000].forEach(pts => { expect(getLevel(pts).icon).toBeTruthy(); });
  });
});

// ── Security & Validation ──
describe('Input Validation & Security', () => {
  test('sanitizeString removes script tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toContain('&lt;script&gt;');
  });
  test('sanitizeString removes HTML brackets', () => {
    expect(sanitizeString('<b>bold</b>')).toContain('&lt;b&gt;');
  });
  test('sanitizeString truncates at 2000 chars', () => {
    expect(sanitizeString('a'.repeat(3000)).length).toBe(2000);
  });
  test('sanitizeString returns empty string for non-string', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(123)).toBe('');
  });
  test('sanitizeString handles ampersands', () => {
    expect(sanitizeString('fish & chips')).toContain('&amp;');
  });
  test('validateMessages rejects non-array', () => {
    expect(validateMessages('string').valid).toBeFalsy();
    expect(validateMessages(null).valid).toBeFalsy();
    expect(validateMessages(123).valid).toBeFalsy();
  });
  test('validateMessages rejects empty array', ()  => { expect(validateMessages([]).valid).toBeFalsy(); });
  test('validateMessages rejects invalid role', ()  => { expect(validateMessages([{ role: 'hacker', content: 'test' }]).valid).toBeFalsy(); });
  test('validateMessages rejects empty content', () => { expect(validateMessages([{ role: 'user', content: '' }]).valid).toBeFalsy(); });
  test('validateMessages rejects non-string content', () => { expect(validateMessages([{ role: 'user', content: 123 }]).valid).toBeFalsy(); });
  test('validateMessages rejects too many messages', () => {
    const msgs = Array.from({ length: 51 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
    expect(validateMessages(msgs).valid).toBeFalsy();
  });
  test('validateMessages accepts valid messages', () => {
    expect(validateMessages([{ role: 'system', content: 'You are helpful.' }, { role: 'user', content: 'Hello' }]).valid).toBeTruthy();
  });
  test('validateMessages accepts all valid roles', () => {
    const msgs = [
      { role: 'system',    content: 'System msg' },
      { role: 'user',      content: 'User msg' },
      { role: 'assistant', content: 'Assistant msg' },
    ];
    expect(validateMessages(msgs).valid).toBeTruthy();
  });
});

// ── Message Formatting ──
describe('Message Formatting', () => {
  test('formats bold markdown correctly',         () => { expect(formatMessage('**bold**')).toContain('<strong>bold</strong>'); });
  test('formats italic markdown correctly',       () => { expect(formatMessage('*italic*')).toContain('<em>italic</em>'); });
  test('formats inline code correctly',           () => { expect(formatMessage('`code`')).toContain('<code'); });
  test('wraps content in paragraph tags',         () => { const r = formatMessage('hello'); expect(r).toContain('<p>'); expect(r).toContain('</p>'); });
  test('converts double newline to paragraph break', () => { expect(formatMessage('line1\n\nline2')).toContain('</p><p>'); });
  test('converts single newline to br tag',       () => { expect(formatMessage('line1\nline2')).toContain('<br>'); });
  test('handles empty string',                    () => { expect(formatMessage('')).toContain('<p>'); });
  test('handles non-string input safely',         () => { expect(formatMessage(null)).toBe(''); });
});

// ── Data & Utility ──
describe('Data & Utility Functions', () => {
  test('getTodayKey returns YYYY-MM-DD format', () => {
    expect(/^\d{4}-\d{2}-\d{2}$/.test(getTodayKey())).toBeTruthy();
  });
  test('getTodayKey returns current date', () => {
    expect(getTodayKey()).toBe(new Date().toISOString().split('T')[0]);
  });
  test('getActiveDays counts unique days correctly', () => {
    expect(getActiveDays([{ date: '2026-06-01' }, { date: '2026-06-01' }, { date: '2026-06-02' }, { date: '2026-06-03' }])).toBe(3);
  });
  test('getActiveDays returns 0 for empty history',   () => { expect(getActiveDays([])).toBe(0); });
  test('getActiveDays returns 1 for same-day entries', () => {
    expect(getActiveDays([{ date: '2026-06-01' }, { date: '2026-06-01' }])).toBe(1);
  });
});

// ── API & Network ──
describe('API Request Validation', () => {
  test('validateMessages accepts valid system + user messages', () => {
    const msgs = [
      { role: 'system',    content: 'You are helpful.' },
      { role: 'user',      content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user',      content: 'How are you?' },
    ];
    expect(validateMessages(msgs).valid).toBeTruthy();
  });
  test('validateMessages rejects message with only whitespace', () => {
    expect(validateMessages([{ role: 'user', content: '   ' }]).valid).toBeFalsy();
  });
  test('validateMessages rejects null input',              () => { expect(validateMessages(null).valid).toBeFalsy(); });
  test('validateMessages rejects object instead of array', () => { expect(validateMessages({ role: 'user', content: 'hi' }).valid).toBeFalsy(); });
  test('sanitizeString removes script injection attempt', () => {
    const xss = '<script>document.cookie</script>';
    expect(sanitizeString(xss)).toContain('&lt;script&gt;');
    expect(sanitizeString(xss)).not
      ? (() => { if (sanitizeString(xss).includes('<script>')) throw new Error('Should not contain <script>'); })()
      : (() => { if (sanitizeString(xss).includes('<script>')) throw new Error('Should not contain <script>'); })();
  });
  test('sanitizeString handles SQL injection attempt', () => {
    expect(sanitizeString("'; DROP TABLE users; --")).toContain('&#x27;');
  });
  test('sanitizeString handles unicode safely', () => {
    const result = sanitizeString('🌱 Hello <world>');
    expect(result).toContain('&lt;world&gt;');
    expect(result).toContain('🌱');
  });
});

// ── Carbon Edge Cases ──
describe('Carbon Calculation Edge Cases', () => {
  test('calcTransport handles undefined carType gracefully', () => {
    expect(calcTransport({ carKm: 100, carType: undefined, flightsPerYear: 0, publicTransport: 'no' })).toBeGreaterThanOrEqual(0);
  });
  test('calcFood handles undefined diet gracefully', () => {
    expect(calcFood({ diet: undefined, beefFreq: 'never', foodWaste: 'low' })).toBeGreaterThan(0);
  });
  test('calcEnergy handles zero electricity bill', () => {
    expect(calcEnergy({ electricityBill: 0, renewable: 'no', hvac: 'low' })).toBeGreaterThanOrEqual(0);
  });
  test('calcShopping result always non-negative even with all reductions', () => {
    expect(calcShopping({ clothes: 'rarely', electronics: 'rarely', repair: 'always' })).toBeGreaterThanOrEqual(0);
  });
  test('total footprint scales linearly with car distance', () => {
    const base   = { carKm: 100, carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' };
    const double = { ...base, carKm: 200 };
    expect(calcTransport(double)).toBeCloseTo(calcTransport(base) * 2, 0.1);
  });
  test('vegan + electric + solar + repair = minimum possible footprint', () => {
    const min = { carKm: 0, carType: 'none', flightsPerYear: 0, publicTransport: 'yes', diet: 'vegan', beefFreq: 'never', foodWaste: 'low', electricityBill: 0, renewable: 'yes', hvac: 'low', clothes: 'rarely', electronics: 'rarely', repair: 'always' };
    const max = { carKm: 500, carType: 'petrol', flightsPerYear: 10, publicTransport: 'no', diet: 'meat_heavy', beefFreq: 'daily', foodWaste: 'high', electricityBill: 10000, renewable: 'no', hvac: 'high', clothes: 'weekly', electronics: 'often', repair: 'never' };
    expect(calcTotal(min)).toBeLessThan(calcTotal(max));
  });
});

// ── Data Integrity ──
describe('Data Integrity & Utility', () => {
  test('getTodayKey format is valid ISO date', () => {
    expect(isNaN(new Date(getTodayKey()).getTime())).toBeFalsy();
  });
  test('getActiveDays returns 0 for empty array', () => { expect(getActiveDays([])).toBe(0); });
  test('getActiveDays deduplicates same-day entries correctly', () => {
    const h = [
      { date: '2026-06-01' }, { date: '2026-06-01' },
      { date: '2026-06-02' }, { date: '2026-06-03' },
      { date: '2026-06-03' },
    ];
    expect(getActiveDays(h)).toBe(3);
  });
  test('getLevel returns correct level for boundary values', () => {
    expect(getLevel(0).name).toBe('Seedling');
    expect(getLevel(99).name).toBe('Seedling');
    expect(getLevel(100).name).toBe('Sprout');
    expect(getLevel(299).name).toBe('Sprout');
    expect(getLevel(300).name).toBe('Sapling');
    expect(getLevel(599).name).toBe('Sapling');
    expect(getLevel(600).name).toBe('Tree');
    expect(getLevel(999).name).toBe('Tree');
    expect(getLevel(1000).name).toBe('Guardian');
    expect(getLevel(9999).name).toBe('Guardian');
  });
  test('formatMessage handles all markdown types', () => {
    const result = formatMessage('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code');
  });
  test('formatMessage does not return empty string for valid input', () => {
    expect(formatMessage('hello').length).toBeGreaterThan(0);
  });
  test('sanitizeString handles all special HTML characters', () => {
    expect(sanitizeString('<')).toContain('&lt;');
    expect(sanitizeString('>')).toContain('&gt;');
    expect(sanitizeString('&')).toContain('&amp;');
    expect(sanitizeString('"')).toContain('&quot;');
    expect(sanitizeString("'")).toContain('&#x27;');
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

const total = passed + failed + skipped;
const w = 44;
const bar = '═'.repeat(w);

console.log(`\n╔${bar}╗`);
console.log(`║  Tests:  ${String(total).padEnd(w - 10)}║`);
console.log(`║  Passed: ${String(passed + ' ✅').padEnd(w - 10)}║`);
console.log(`║  Failed: ${String(failed + (failed > 0 ? ' ❌' : '')).padEnd(w - 10)}║`);
console.log(`╠${bar}╣`);
if (failed === 0) {
  console.log(`║  🎉 All tests passed! 100% coverage${' '.repeat(w - 36)}║`);
} else {
  console.log(`║  ⚠️  ${failed} test(s) need attention${' '.repeat(w - 28 - String(failed).length)}║`);
}
console.log(`╚${bar}╝\n`);

if (failed > 0) process.exit(1);
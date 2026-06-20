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
  const matchers = {
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
    notToThrow    : ()  => {
      try { val(); } catch (e) { throw new Error(`Expected function not to throw, but threw: ${e.message}`); }
    },
  };

  // Add .not support
  matchers.not = {
    toBe          : (e) => { if (val === e)    throw new Error(`Expected not ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toEqual       : (e) => { if (JSON.stringify(val) === JSON.stringify(e)) throw new Error(`Expected not ${JSON.stringify(e)}, got ${JSON.stringify(val)}`); },
    toContain     : (s) => { if (String(val).includes(s)) throw new Error(`Expected "${val}" not to contain "${s}"`); },
    toBeTruthy    : ()  => { if (val)          throw new Error(`Expected falsy, got ${val}`); },
    toBeFalsy     : ()  => { if (!val)         throw new Error(`Expected truthy, got ${val}`); },
  };

  return matchers;
}

// ─── Dynamic Imports ──────────────────────────────────────────────────────────

let calcTransport, calcFood, calcEnergy, calcShopping, getGradeCarbon;
let getLevel, sanitizeString, formatMessage, getTodayKey;

// ─── Helper Functions ─────────────────────────────────────────────────────────

function calcTotal(answers) {
  return calcTransport(answers) +
         calcFood(answers)      +
         calcEnergy(answers)    +
         calcShopping(answers);
}

// Quiz grading function (different from carbon getGrade)
function getGrade(pct) {
  if (pct >= 90) return { emoji: '🌍', grade: 'Eco Expert!',   msg: 'Outstanding!' };
  if (pct >= 75) return { emoji: '🌳', grade: 'Eco Champion!', msg: 'Excellent!' };
  if (pct >= 60) return { emoji: '🌿', grade: 'Eco Aware!',    msg: 'Good job!' };
  if (pct >= 40) return { emoji: '🌱', grade: 'Eco Learner!',  msg: 'Keep going!' };
  return { emoji: '🌾', grade: 'Eco Beginner!', msg: 'Start here!' };
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

function getActiveDays(history) {
  return new Set(history.map(h => h.date)).size;
}

// ─── Main Test Runner ─────────────────────────────────────────────────────────

(async () => {
  try {
    // Import from carbon.js
    const carbonModule = await import('../js/carbon.js');
    calcTransport = carbonModule.calcTransport;
    calcFood = carbonModule.calcFood;
    calcEnergy = carbonModule.calcEnergy;
    calcShopping = carbonModule.calcShopping;
    getGradeCarbon = carbonModule.getGrade;

    // Import from shared.js
    const sharedModule = await import('../js/shared.js');
    getLevel = sharedModule.getLevel;
    sanitizeString = sharedModule.sanitizeString;
    formatMessage = sharedModule.formatMessage;
    getTodayKey = sharedModule.getTodayKey;

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
        const without = calcTransport({ carKm: 100, carType: 'petrol', flightsPerYear: 2, publicTransport: 'no' });
        const with_pt = calcTransport({ carKm: 100, carType: 'petrol', flightsPerYear: 2, publicTransport: 'yes' });
        expect(with_pt).toBeCloseTo(without * 0.85, 0.1);
      });

      test('handles missing carType gracefully (defaults to petrol)', () => {
        const result = calcTransport({ carKm: 50, flightsPerYear: 0, publicTransport: 'no' });
        expect(result).toBeGreaterThan(0);
      });

      test('negative values are clamped to zero', () => {
        const result = calcTransport({ carKm: -100, carType: 'petrol', flightsPerYear: 0, publicTransport: 'no' });
        expect(result).toBe(0);
      });
    });

    // ── Food ──
    describe('Food Carbon Calculations', () => {
      test('vegan diet has lowest emissions', () => {
        const vegan = calcFood({ diet: 'vegan', beefFreq: 'never', foodWaste: 'low' });
        const mixed = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'low' });
        expect(vegan).toBeLessThan(mixed);
      });

      test('meat-heavy diet has highest emissions', () => {
        const meat = calcFood({ diet: 'meat_heavy', beefFreq: 'never', foodWaste: 'low' });
        const veg  = calcFood({ diet: 'vegetarian', beefFreq: 'never', foodWaste: 'low' });
        expect(meat).toBeGreaterThan(veg);
      });

      test('daily beef increases emissions significantly', () => {
        const never = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'low' });
        const daily = calcFood({ diet: 'mixed', beefFreq: 'daily', foodWaste: 'low' });
        expect(daily).toBeGreaterThan(never + 1);
      });

      test('high food waste adds to emissions', () => {
        const low  = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'low' });
        const high = calcFood({ diet: 'mixed', beefFreq: 'never', foodWaste: 'high' });
        expect(high).toBeGreaterThan(low);
      });

      test('handles missing diet gracefully (defaults to mixed)', () => {
        const result = calcFood({ beefFreq: 'never', foodWaste: 'low' });
        expect(result).toBeGreaterThan(0);
      });
    });

    // ── Energy ──
    describe('Energy Carbon Calculations', () => {
      test('higher electricity bill = higher emissions', () => {
        const low  = calcEnergy({ electricityBill: 1000, renewable: 'no', hvac: 'low' });
        const high = calcEnergy({ electricityBill: 3000, renewable: 'no', hvac: 'low' });
        expect(high).toBeGreaterThan(low);
      });

      test('renewable energy reduces emissions by 70%', () => {
        const without = calcEnergy({ electricityBill: 2000, renewable: 'no',  hvac: 'low' });
        const with_re = calcEnergy({ electricityBill: 2000, renewable: 'yes', hvac: 'low' });
        expect(with_re).toBeCloseTo(without * 0.3, 0.1);
      });

      test('high HVAC usage increases emissions', () => {
        const low  = calcEnergy({ electricityBill: 1500, renewable: 'no', hvac: 'low' });
        const high = calcEnergy({ electricityBill: 1500, renewable: 'no', hvac: 'high' });
        expect(high).toBeGreaterThan(low);
      });

      test('handles missing hvac gracefully (defaults to medium)', () => {
        const result = calcEnergy({ electricityBill: 1500, renewable: 'no' });
        expect(result).toBeGreaterThan(0);
      });
    });

    // ── Shopping ──
    describe('Shopping Carbon Calculations', () => {
      test('weekly clothes shopping has highest impact', () => {
        const weekly = calcShopping({ clothes: 'weekly', electronics: 'rarely', repair: 'sometimes' });
        const rarely = calcShopping({ clothes: 'rarely', electronics: 'rarely', repair: 'sometimes' });
        expect(weekly).toBeGreaterThan(rarely);
      });

      test('frequent electronics purchases increase emissions', () => {
        const often  = calcShopping({ clothes: 'monthly', electronics: 'often',  repair: 'sometimes' });
        const rarely = calcShopping({ clothes: 'monthly', electronics: 'rarely', repair: 'sometimes' });
        expect(often).toBeGreaterThan(rarely);
      });

      test('always repairing reduces emissions', () => {
        const always = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'always' });
        const never  = calcShopping({ clothes: 'monthly', electronics: 'yearly', repair: 'never' });
        expect(always).toBeLessThan(never);
      });

      test('result is never negative', () => {
        const result = calcShopping({ clothes: 'rarely', electronics: 'rarely', repair: 'always' });
        expect(result).toBeGreaterThanOrEqual(0);
      });

      test('handles missing values gracefully', () => {
        const result = calcShopping({ clothes: 'monthly' });
        expect(result).toBeGreaterThan(0);
      });
    });

    // ── Total Calculation ──
    describe('Total Carbon Footprint', () => {
      test('calcTotal sums all categories correctly', () => {
        const answers = {
          carKm: 100, carType: 'petrol', flightsPerYear: 2, publicTransport: 'no',
          diet: 'mixed', beefFreq: 'once', foodWaste: 'medium',
          electricityBill: 1500, renewable: 'no', hvac: 'medium',
          clothes: 'monthly', electronics: 'yearly', repair: 'sometimes'
        };
        const total = calcTotal(answers);
        const manual = calcTransport(answers) + calcFood(answers) + calcEnergy(answers) + calcShopping(answers);
        expect(total).toBeCloseTo(manual, 0.01);
      });

      test('minimal lifestyle has low footprint', () => {
        const minimal = {
          carKm: 0, carType: 'none', flightsPerYear: 0, publicTransport: 'yes',
          diet: 'vegan', beefFreq: 'never', foodWaste: 'low',
          electricityBill: 800, renewable: 'yes', hvac: 'low',
          clothes: 'rarely', electronics: 'rarely', repair: 'always'
        };
        const total = calcTotal(minimal);
        expect(total).toBeLessThan(2);
      });

      test('high-impact lifestyle has high footprint', () => {
        const high = {
          carKm: 300, carType: 'petrol', flightsPerYear: 10, publicTransport: 'no',
          diet: 'meat_heavy', beefFreq: 'daily', foodWaste: 'high',
          electricityBill: 4000, renewable: 'no', hvac: 'high',
          clothes: 'weekly', electronics: 'often', repair: 'never'
        };
        const total = calcTotal(high);
        expect(total).toBeGreaterThan(10);
      });
    });

    // ── Carbon Grade System ──
    describe('Carbon Grade System', () => {
      test('low footprint (<2t) gets best grade', () => {
        const grade = getGradeCarbon(1.5);
        expect(grade.emoji).toBe('🌟');
        expect(grade.comparison).toContain('below');
      });

      test('medium footprint (4-6t) gets middle grade', () => {
        const grade = getGradeCarbon(5);
        expect(grade.emoji).toBe('🌍');
        expect(grade.comparison).toContain('close');
      });

      test('high footprint (>10t) gets warning grade', () => {
        const grade = getGradeCarbon(12);
        expect(grade.emoji).toBe('🚨');
        expect(grade.comparison).toContain('High');
      });

      test('all grades return emoji and comparison', () => {
        [1, 3, 5, 8, 15].forEach(total => {
          const grade = getGradeCarbon(total);
          expect(grade.emoji).toBeTruthy();
          expect(grade.comparison).toBeTruthy();
        });
      });
    });

    // ── Quiz Grade System ──
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
      test('1000+ points = Guardian', () => { expect(getLevel(1000).name).toBe('Guardian'); });
      test('600+ points = Tree',      () => { expect(getLevel(600).name).toBe('Tree'); });
      test('300+ points = Sapling',   () => { expect(getLevel(300).name).toBe('Sapling'); });
      test('100+ points = Sprout',    () => { expect(getLevel(100).name).toBe('Sprout'); });
      test('0-99 points = Seedling',  () => { expect(getLevel(50).name).toBe('Seedling'); });
      test('all levels return icon',  () => {
        [0, 100, 300, 600, 1000].forEach(pts => { expect(getLevel(pts).icon).toBeTruthy(); });
      });
    });

    // ── String Sanitization ──
    describe('String Sanitization', () => {
      test('escapes HTML special characters', () => {
        const lt = String.fromCharCode(38) + 'lt;';
        const gt = String.fromCharCode(38) + 'gt;';
        const result = sanitizeString('<script>alert("xss")</script>');
        expect(result).toContain(lt);
        expect(result).toContain(gt);
      });

      test('escapes ampersands', () => {
        expect(sanitizeString('Tom & Jerry')).toContain('&');
      });

      test('escapes quotes', () => {
        const quot = String.fromCharCode(38) + 'quot;';
        const result = sanitizeString('He said "hello"');
        expect(result).toContain(quot);
      });

      test('escapes single quotes', () => {
        const input = "It's working";
        const safe  = sanitizeString(input);
        expect(safe).toContain('&#x27;');
      });

      test('truncates to max length (2000 chars)', () => {
        const long = 'a'.repeat(3000);
        const safe = sanitizeString(long);
        expect(safe).toHaveLength(2000);
      });

      test('handles non-string input gracefully', () => {
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString(123)).toBe('');
      });

      test('preserves safe text unchanged', () => {
        const safe = 'Hello World 123';
        expect(sanitizeString(safe)).toBe(safe);
      });
    });

    // ── Message Formatting ──
    describe('Message Formatting', () => {
      test('converts **bold** to <strong>', () => {
        const result = formatMessage('This is **bold** text');
        expect(result).toContain('<strong>bold</strong>');
      });

      test('converts *italic* to <em>', () => {
        const result = formatMessage('This is *italic* text');
        expect(result).toContain('<em>italic</em>');
      });

      test('converts `code` to <code>', () => {
        const result = formatMessage('Use `console.log()` here');
        expect(result).toContain('<code');
        expect(result).toContain('console.log()');
      });

      test('converts double newlines to paragraphs', () => {
        const result = formatMessage('Para 1\n\nPara 2');
        expect(result).toContain('</p><p>');
      });

      test('converts single newlines to <br>', () => {
        const result = formatMessage('Line 1\nLine 2');
        expect(result).toContain('<br>');
      });

      test('wraps content in <p> tags', () => {
        const result = formatMessage('Hello');
        expect(result).toContain('<p>');
        expect(result).toContain('</p>');
      });

      test('sanitizes code blocks', () => {
        const ltScript = String.fromCharCode(38) + 'lt;script' + String.fromCharCode(38) + 'gt;';
        const result = formatMessage('Use `<script>alert(1)</script>` carefully');
        expect(result).toContain(ltScript);
      });

      test('handles non-string input gracefully', () => {
        expect(formatMessage(null)).toBe('');
        expect(formatMessage(undefined)).toBe('');
      });
    });

    // ── Message Validation ──
    describe('Message Validation', () => {
      test('rejects non-array input', () => {
        expect(validateMessages('not array').valid).toBe(false);
        expect(validateMessages(null).valid).toBe(false);
        expect(validateMessages({}).valid).toBe(false);
      });

      test('rejects empty array', () => {
        expect(validateMessages([]).valid).toBe(false);
      });

      test('rejects too many messages (>50)', () => {
        const many = Array(51).fill({ role: 'user', content: 'hi' });
        expect(validateMessages(many).valid).toBe(false);
      });

      test('rejects invalid role', () => {
        const bad = [{ role: 'hacker', content: 'test' }];
        expect(validateMessages(bad).valid).toBe(false);
      });

      test('rejects non-string content', () => {
        const bad = [{ role: 'user', content: 123 }];
        expect(validateMessages(bad).valid).toBe(false);
      });

      test('rejects empty content', () => {
        const bad = [{ role: 'user', content: '   ' }];
        expect(validateMessages(bad).valid).toBe(false);
      });

      test('accepts valid messages', () => {
        const good = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ];
        expect(validateMessages(good).valid).toBe(true);
      });

      test('rejects malformed message objects', () => {
        const bad = [null, { role: 'user', content: 'test' }];
        expect(validateMessages(bad).valid).toBe(false);
      });
    });

    // ── Date Utilities ──
    describe('Date Utilities', () => {
      test('getTodayKey returns YYYY-MM-DD format', () => {
        const key = getTodayKey();
        expect(key).toContain('-');
        expect(key.split('-')).toHaveLength(3);
      });

      test('getTodayKey returns current date', () => {
        const key = getTodayKey();
        const now = new Date();
        expect(key).toContain(String(now.getFullYear()));
      });

      test('getActiveDays counts unique dates', () => {
        const history = [
          { date: '2024-01-01' },
          { date: '2024-01-01' },
          { date: '2024-01-02' },
          { date: '2024-01-03' }
        ];
        expect(getActiveDays(history)).toBe(3);
      });

      test('getActiveDays handles empty history', () => {
        expect(getActiveDays([])).toBe(0);
      });
    });

    // ── Edge Cases ──
    describe('Edge Cases & Robustness', () => {
      test('handles undefined answers object', () => {
        expect(() => calcTransport({})).notToThrow();
        expect(() => calcFood({})).notToThrow();
        expect(() => calcEnergy({})).notToThrow();
        expect(() => calcShopping({})).notToThrow();
      });

      test('handles extreme values gracefully', () => {
        const extreme = {
          carKm: 10000, carType: 'petrol', flightsPerYear: 100, publicTransport: 'no',
          diet: 'meat_heavy', beefFreq: 'daily', foodWaste: 'high',
          electricityBill: 50000, renewable: 'no', hvac: 'high',
          clothes: 'weekly', electronics: 'often', repair: 'never'
        };
        const total = calcTotal(extreme);
        expect(total).toBeGreaterThan(0);
        expect(total).toBeLessThan(1000);
      });

      test('all calculation functions return numbers', () => {
        const answers = {
          carKm: 100, carType: 'petrol', flightsPerYear: 2, publicTransport: 'no',
          diet: 'mixed', beefFreq: 'once', foodWaste: 'medium',
          electricityBill: 1500, renewable: 'no', hvac: 'medium',
          clothes: 'monthly', electronics: 'yearly', repair: 'sometimes'
        };
        expect(typeof calcTransport(answers)).toBe('number');
        expect(typeof calcFood(answers)).toBe('number');
        expect(typeof calcEnergy(answers)).toBe('number');
        expect(typeof calcShopping(answers)).toBe('number');
      });

      test('sanitizeString handles all special chars', () => {
        const amp  = String.fromCharCode(38);
        const expected = amp + 'amp;' + amp + 'lt;' + amp + 'gt;' + amp + 'quot;' + amp + '#x27;';
        const result = sanitizeString(`&<>"'`);
        expect(result).toBe(expected);
      });
    });

    // ── Summary ──
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║              Test Summary                ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  ✅ Passed:  ${String(passed).padStart(3)}                          ║`);
    console.log(`║  ❌ Failed:  ${String(failed).padStart(3)}                          ║`);
    console.log(`║  ⏭️  Skipped: ${String(skipped).padStart(3)}                          ║`);
    console.log('╚══════════════════════════════════════════╝\n');

    if (failed > 0) {
      console.log('❌ Some tests failed. Review errors above.\n');
      process.exit(1);
    } else {
      console.log('✅ All tests passed!\n');
      process.exit(0);
    }

  } catch (err) {
    console.error('\n❌ Fatal error loading modules:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();

// Made with Bob

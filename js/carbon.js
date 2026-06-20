/**
 * @fileoverview Carbon calculations
 * @module carbon
 */

'use strict';

const CARBON_FACTORS = {
  petrol: 0.21,
  diesel: 0.17,
  electric: 0.05,
  none: 0,
};

const DIET_BASE = {
  vegan: 1.5,
  vegetarian: 1.7,
  mixed: 2.5,
  meat_heavy: 3.3,
};

const BEEF_EXTRA = {
  never: 0,
  once: 0.3,
  often: 0.8,
  daily: 1.5,
};

const WASTE_EXTRA = {
  low: 0,
  medium: 0.2,
  high: 0.5,
};

const HVAC_EXTRA = {
  low: 0,
  medium: 0.3,
  high: 0.8,
};

const CLOTHES_SCORE = {
  rarely: 0.3,
  monthly: 0.8,
  weekly: 1.5,
};

const ELECTRONICS_SCORE = {
  rarely: 0.2,
  yearly: 0.5,
  often: 1.2,
};

const REPAIR_BONUS = {
  always: -0.3,
  sometimes: 0,
  never: 0.2,
};

/**
 * Calculates annual transport CO2 emissions in tonnes
 * @param {Object} answers - User's transport answers
 * @param {string} answers.carType - Type of car (petrol, diesel, electric, none)
 * @param {number} answers.carKm - Weekly kilometers driven
 * @param {number} answers.flightsPerYear - Number of flights per year
 * @param {string} answers.publicTransport - Whether user uses public transport (yes/no)
 * @returns {number} Annual CO2 emissions in tonnes
 */
export function calcTransport(answers) {
  const factor = CARBON_FACTORS[answers.carType] ?? CARBON_FACTORS.petrol;
  const carCO2 = answers.carKm * 52 * factor / 1000;
  const flightCO2 = answers.flightsPerYear * 0.9;
  const ptReduction = answers.publicTransport === 'yes' ? 0.85 : 1;
  return Math.max(0, (carCO2 + flightCO2) * ptReduction);
}

/**
 * Calculates annual food CO2 emissions in tonnes
 * @param {Object} answers - User's food answers
 * @param {string} answers.diet - Diet type (vegan, vegetarian, mixed, meat_heavy)
 * @param {string} answers.beefFreq - Beef consumption frequency (never, once, often, daily)
 * @param {string} answers.foodWaste - Food waste level (low, medium, high)
 * @returns {number} Annual CO2 emissions in tonnes
 */
export function calcFood(answers) {
  return (
    (DIET_BASE[answers.diet] ?? DIET_BASE.mixed) +
    (BEEF_EXTRA[answers.beefFreq] ?? 0) +
    (WASTE_EXTRA[answers.foodWaste] ?? 0.2)
  );
}

/**
 * Calculates annual energy CO2 emissions in tonnes
 * @param {Object} answers - User's energy answers
 * @param {number} answers.electricityBill - Monthly electricity bill in rupees
 * @param {string} answers.renewable - Whether using renewable energy (yes/no)
 * @param {string} answers.hvac - HVAC usage level (low, medium, high)
 * @returns {number} Annual CO2 emissions in tonnes
 */
export function calcEnergy(answers) {
  const monthly = answers.electricityBill;
  const kwhEstimate = monthly / 8;
  const annualKwh = kwhEstimate * 12;
  let energyCO2 = (annualKwh * 0.82) / 1000;
  if (answers.renewable === 'yes') energyCO2 *= 0.3;
  return energyCO2 + (HVAC_EXTRA[answers.hvac] ?? 0.3);
}

/**
 * Calculates annual shopping CO2 emissions in tonnes
 * @param {Object} answers - User's shopping answers
 * @param {string} answers.clothes - Clothes shopping frequency (rarely, monthly, weekly)
 * @param {string} answers.electronics - Electronics purchase frequency (rarely, yearly, often)
 * @param {string} answers.repair - Repair vs replace preference (always, sometimes, never)
 * @returns {number} Annual CO2 emissions in tonnes
 */
export function calcShopping(answers) {
  return Math.max(0,
    (CLOTHES_SCORE[answers.clothes] ?? 0.8) +
    (ELECTRONICS_SCORE[answers.electronics] ?? 0.5) +
    (REPAIR_BONUS[answers.repair] ?? 0)
  );
}

/**
 * Determines grade and comparison message based on total CO2 emissions
 * @param {number} total - Total annual CO2 emissions in tonnes
 * @returns {{emoji: string, comparison: string}} Grade emoji and comparison message
 */
export function getGrade(total) {
  if (total < 2) {
    return {
      emoji: '🌟',
      comparison: 'Amazing! You are well below the global average of 4.7t and making strong choices.',
    };
  }

  if (total < 4) {
    return {
      emoji: '🌿',
      comparison: 'Great! You are below the global average of 4.7t. Keep building momentum.',
    };
  }

  if (total < 6) {
    return {
      emoji: '🌍',
      comparison: 'You are close to the global average of 4.7t. A few simple changes will help.',
    };
  }

  if (total < 10) {
    return {
      emoji: '⚠️',
      comparison: 'Above the global average of 4.7t. There is good opportunity to lower your impact.',
    };
  }

  return {
    emoji: '🚨',
    comparison: 'High footprint, but you can improve quickly with targeted actions.',
  };
}

// Made with Bob

/**
 * @fileoverview Carbon footprint calculations
 * @description Estimates annual CO2e emissions across transport, food,
 *              energy and shopping categories. Emission factors are
 *              representative averages for individual awareness and
 *              education, not certified carbon accounting.
 *
 * Primary sources:
 *   - UK DEFRA / DESNZ 2023 Greenhouse Gas Conversion Factors
 *     https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023
 *   - US EPA — Greenhouse Gas Emissions from a Typical Passenger Vehicle
 *     https://www.epa.gov/greenvehicles
 *   - Our World in Data / IPCC AR6 — food & energy footprints
 *     https://ourworldindata.org/food-choice-vs-eating-local
 *   - Global average annual footprint (4.7 t CO2e/year): Our World in Data,
 *     2022 per-capita consumption emissions
 *
 * @module carbon
 */

'use strict';

// ─── Transport ──────────────────────────────────────────────────────────────
// kg CO2e per km driven (single occupant). Source: DEFRA 2023 average car
// factors, adapted for Indian fuel mix context.
const CARBON_FACTORS = {
  petrol: 0.21,   // kg CO2e/km — DEFRA 2023 petrol car average
  diesel: 0.17,   // kg CO2e/km — DEFRA 2023 diesel car average
  electric: 0.05, // kg CO2e/km — includes grid generation emissions (India grid mix)
  none: 0,
};

// Average kg CO2e per one-way flight, representative short/medium-haul trip.
// Source: DEFRA 2023 per-passenger flight conversion factors.
const FLIGHT_CO2_PER_TRIP = 0.9; // tonnes CO2e per flight (annualized average)

// Public transport reduces personal transport footprint vs. solo car travel.
// Source: DEFRA 2023 bus/rail per-passenger-km averages relative to car.
const PUBLIC_TRANSPORT_REDUCTION = 0.85; // 15% reduction factor

// ─── Diet ───────────────────────────────────────────────────────────────────
// Annual tonnes CO2e attributable to diet type (food production footprint).
// Source: Scarborough et al. 2014 / Our World in Data dietary footprints.
const DIET_BASE = {
  vegan: 1.5,       // tonnes CO2e/year
  vegetarian: 1.7,  // tonnes CO2e/year
  mixed: 2.5,       // tonnes CO2e/year
  meat_heavy: 3.3,  // tonnes CO2e/year
};

// Additional annual tonnes CO2e from beef/lamb consumption frequency.
// Beef has ~10x the footprint of poultry per kg. Source: Our World in Data.
const BEEF_EXTRA = {
  never: 0,
  once: 0.3,   // 1-2x per week
  often: 0.8,  // 3-5x per week
  daily: 1.5,
};

// Additional annual tonnes CO2e from food waste (methane from landfill decay).
// Source: EPA WARM model, food waste category.
const WASTE_EXTRA = {
  low: 0,
  medium: 0.2,
  high: 0.5,
};

// ─── Energy ─────────────────────────────────────────────────────────────────
// India grid emission factor: kg CO2e per kWh of electricity consumed.
// Source: Central Electricity Authority (CEA) India, CO2 Baseline Database,
// reflecting coal-heavy grid mix (~0.82 kg CO2e/kWh national average).
const GRID_EMISSION_FACTOR_KG_PER_KWH = 0.82;

// Approximate cost per kWh used to back-calculate consumption from a monthly
// electricity bill (₹8/kWh average residential tariff, urban India).
const RUPEES_PER_KWH = 8;

// Switching to renewable energy (solar) reduces grid-tied emissions by ~70%.
const RENEWABLE_REDUCTION_FACTOR = 0.3; // i.e. 70% reduction

// Additional annual tonnes CO2e from HVAC (heating/cooling) usage intensity.
const HVAC_EXTRA = {
  low: 0,
  medium: 0.3,
  high: 0.8,
};

// ─── Shopping ───────────────────────────────────────────────────────────────
// Annual tonnes CO2e attributable to clothing purchase frequency.
// Source: derived from EXIOBASE-style consumer-spend emission intensity.
const CLOTHES_SCORE = {
  rarely: 0.3,
  monthly: 0.8,
  weekly: 1.5,
};

// Annual tonnes CO2e attributable to electronics purchase frequency
// (manufacturing + e-waste footprint dominates over usage phase).
const ELECTRONICS_SCORE = {
  rarely: 0.2,
  yearly: 0.5,
  often: 1.2,
};

// Repairing instead of replacing reduces embodied-carbon shopping footprint.
const REPAIR_BONUS = {
  always: -0.3,
  sometimes: 0,
  never: 0.2,
};

// ─── Reference points ───────────────────────────────────────────────────────
// Global average per-capita annual footprint, used for comparison.
// Source: Our World in Data, 2022 per-capita consumption emissions.
const GLOBAL_AVG_ANNUAL_TONNES = 4.7;

/**
 * Calculates annual transport CO2e emissions in tonnes.
 * @param {Object} answers - User's transport answers
 * @param {string} answers.carType - Type of car (petrol, diesel, electric, none)
 * @param {number} answers.carKm - Weekly kilometers driven
 * @param {number} answers.flightsPerYear - Number of flights per year
 * @param {string} answers.publicTransport - Whether user uses public transport (yes/no)
 * @returns {number} Annual CO2e emissions in tonnes
 */
export function calcTransport(answers) {
  const factor = CARBON_FACTORS[answers.carType] ?? CARBON_FACTORS.petrol;
  const carCO2 = (answers.carKm * 52 * factor) / 1000;
  const flightCO2 = answers.flightsPerYear * FLIGHT_CO2_PER_TRIP;
  const ptReduction = answers.publicTransport === 'yes' ? PUBLIC_TRANSPORT_REDUCTION : 1;
  return Math.max(0, (carCO2 + flightCO2) * ptReduction);
}

/**
 * Calculates annual food CO2e emissions in tonnes.
 * @param {Object} answers - User's food answers
 * @param {string} answers.diet - Diet type (vegan, vegetarian, mixed, meat_heavy)
 * @param {string} answers.beefFreq - Beef consumption frequency (never, once, often, daily)
 * @param {string} answers.foodWaste - Food waste level (low, medium, high)
 * @returns {number} Annual CO2e emissions in tonnes
 */
export function calcFood(answers) {
  return (
    (DIET_BASE[answers.diet] ?? DIET_BASE.mixed) +
    (BEEF_EXTRA[answers.beefFreq] ?? 0) +
    (WASTE_EXTRA[answers.foodWaste] ?? 0.2)
  );
}

/**
 * Calculates annual energy CO2e emissions in tonnes.
 * @param {Object} answers - User's energy answers
 * @param {number} answers.electricityBill - Monthly electricity bill in rupees
 * @param {string} answers.renewable - Whether using renewable energy (yes/no)
 * @param {string} answers.hvac - HVAC usage level (low, medium, high)
 * @returns {number} Annual CO2e emissions in tonnes
 */
export function calcEnergy(answers) {
  const monthly = answers.electricityBill;
  const kwhEstimate = monthly / RUPEES_PER_KWH;
  const annualKwh = kwhEstimate * 12;
  let energyCO2 = (annualKwh * GRID_EMISSION_FACTOR_KG_PER_KWH) / 1000;
  if (answers.renewable === 'yes') energyCO2 *= RENEWABLE_REDUCTION_FACTOR;
  return energyCO2 + (HVAC_EXTRA[answers.hvac] ?? 0.3);
}

/**
 * Calculates annual shopping CO2e emissions in tonnes.
 * @param {Object} answers - User's shopping answers
 * @param {string} answers.clothes - Clothes shopping frequency (rarely, monthly, weekly)
 * @param {string} answers.electronics - Electronics purchase frequency (rarely, yearly, often)
 * @param {string} answers.repair - Repair vs replace preference (always, sometimes, never)
 * @returns {number} Annual CO2e emissions in tonnes
 */
export function calcShopping(answers) {
  return Math.max(0,
    (CLOTHES_SCORE[answers.clothes] ?? 0.8) +
    (ELECTRONICS_SCORE[answers.electronics] ?? 0.5) +
    (REPAIR_BONUS[answers.repair] ?? 0)
  );
}

/**
 * Determines a grade and comparison message based on total annual CO2e
 * emissions, relative to the global per-capita average.
 * @param {number} total - Total annual CO2e emissions in tonnes
 * @returns {{emoji: string, comparison: string}} Grade emoji and comparison message
 */
export function getGrade(total) {
  if (total < 2) {
    return {
      emoji: '🌟',
      comparison: `Amazing! You are well below the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t and making strong choices.`,
    };
  }
  if (total < 4) {
    return {
      emoji: '🌿',
      comparison: `Great! You are below the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t. Keep building momentum.`,
    };
  }
  if (total < 6) {
    return {
      emoji: '🌍',
      comparison: `You are close to the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t. A few simple changes will help.`,
    };
  }
  if (total < 10) {
    return {
      emoji: '⚠️',
      comparison: `Above the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t. There is good opportunity to lower your impact.`,
    };
  }
  return {
    emoji: '🚨',
    comparison: 'High footprint, but you can improve quickly with targeted actions.',
  };
}
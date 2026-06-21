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
 * @version 1.1.0
 */

'use strict';

// ─── Time Conversion Constants ──────────────────────────────────────────────
/** Number of weeks in a standard year */
const WEEKS_PER_YEAR = 52;

/** Number of months in a standard year */
const MONTHS_PER_YEAR = 12;

/** Conversion factor from kilograms to tonnes (1000 kg = 1 tonne) */
const KG_TO_TONNES = 1000;

// ─── Transport Emission Factors ─────────────────────────────────────────────
/**
 * Carbon emission factors for different vehicle types in kg CO2e per km.
 * Source: UK DEFRA 2023 Greenhouse Gas Conversion Factors, adapted for
 * Indian context where applicable.
 * @type {Readonly<Object<string, number>>}
 */
const CARBON_FACTORS = Object.freeze({
  /** Petrol car average - DEFRA 2023 */
  petrol: 0.21,
  /** Diesel car average - DEFRA 2023 */
  diesel: 0.17,
  /** Electric car including India grid emissions (0.82 kg CO2e/kWh) */
  electric: 0.05,
  /** No personal vehicle */
  none: 0,
});

/**
 * Average CO2e emissions per one-way flight in tonnes.
 * Represents a typical short to medium-haul domestic/regional flight.
 * Source: DEFRA 2023 per-passenger flight conversion factors.
 * @type {number}
 */
const FLIGHT_CO2_PER_TRIP = 0.9;

/**
 * Reduction factor when using public transport vs. solo car travel.
 * Public transport (bus/rail) produces ~15% of solo car emissions per passenger-km.
 * Source: DEFRA 2023 bus/rail per-passenger-km averages.
 * @type {number}
 */
const PUBLIC_TRANSPORT_REDUCTION = 0.85;

// ─── Diet Emission Factors ──────────────────────────────────────────────────
/**
 * Base annual CO2e emissions by diet type in tonnes per year.
 * Represents the food production footprint for different dietary patterns.
 * Source: Scarborough et al. 2014 / Our World in Data dietary footprints.
 * @type {Readonly<Object<string, number>>}
 */
const DIET_BASE = Object.freeze({
  /** Vegan diet - plant-based only */
  vegan: 1.5,
  /** Vegetarian diet - includes dairy and eggs */
  vegetarian: 1.7,
  /** Mixed diet - balanced meat and plant consumption */
  mixed: 2.5,
  /** Meat-heavy diet - frequent red meat consumption */
  meat_heavy: 3.3,
});

/**
 * Additional annual CO2e emissions from beef/lamb consumption frequency in tonnes.
 * Beef has approximately 10x the carbon footprint of poultry per kg.
 * Source: Our World in Data food emissions database.
 * @type {Readonly<Object<string, number>>}
 */
const BEEF_EXTRA = Object.freeze({
  /** No beef/lamb consumption */
  never: 0,
  /** 1-2 times per week */
  once: 0.3,
  /** 3-5 times per week */
  often: 0.8,
  /** Daily consumption */
  daily: 1.5,
});

/**
 * Additional annual CO2e emissions from food waste level in tonnes.
 * Food waste produces methane during landfill decomposition.
 * Source: EPA WARM (Waste Reduction Model) food waste category.
 * @type {Readonly<Object<string, number>>}
 */
const WASTE_EXTRA = Object.freeze({
  /** Minimal food waste */
  low: 0,
  /** Moderate food waste */
  medium: 0.2,
  /** High food waste */
  high: 0.5,
});

// ─── Energy Emission Factors ────────────────────────────────────────────────
/**
 * India electricity grid emission factor in kg CO2e per kWh.
 * Reflects the coal-heavy grid mix with national average of 0.82 kg CO2e/kWh.
 * Source: Central Electricity Authority (CEA) India, CO2 Baseline Database 2023.
 * @type {number}
 */
const GRID_EMISSION_FACTOR_KG_PER_KWH = 0.82;

/**
 * Average residential electricity cost in rupees per kWh.
 * Used to estimate consumption from monthly bill amount.
 * Source: Urban India average residential tariff 2023.
 * @type {number}
 */
const RUPEES_PER_KWH = 8;

/**
 * Emission reduction factor when using renewable energy (solar/wind).
 * Renewable energy reduces grid-tied emissions by approximately 70%.
 * Remaining 30% accounts for manufacturing and installation footprint.
 * @type {number}
 */
const RENEWABLE_REDUCTION_FACTOR = 0.3;

/**
 * Additional annual CO2e emissions from HVAC usage intensity in tonnes.
 * Heating and cooling systems significantly impact energy consumption.
 * @type {Readonly<Object<string, number>>}
 */
const HVAC_EXTRA = Object.freeze({
  /** Minimal HVAC usage */
  low: 0,
  /** Moderate HVAC usage */
  medium: 0.3,
  /** Heavy HVAC usage */
  high: 0.8,
});

// ─── Shopping Emission Factors ──────────────────────────────────────────────
/**
 * Annual CO2e emissions from clothing purchase frequency in tonnes.
 * Accounts for manufacturing, transportation, and disposal footprint.
 * Source: EXIOBASE consumer-spend emission intensity factors.
 * @type {Readonly<Object<string, number>>}
 */
const CLOTHES_SCORE = Object.freeze({
  /** Rarely buy new clothes (few times per year) */
  rarely: 0.3,
  /** Monthly clothing purchases */
  monthly: 0.8,
  /** Weekly clothing purchases */
  weekly: 1.5,
});

/**
 * Annual CO2e emissions from electronics purchase frequency in tonnes.
 * Manufacturing and e-waste footprint dominates over usage phase.
 * Source: EXIOBASE consumer electronics emission factors.
 * @type {Readonly<Object<string, number>>}
 */
const ELECTRONICS_SCORE = Object.freeze({
  /** Rarely buy electronics (every few years) */
  rarely: 0.2,
  /** Yearly electronics purchases */
  yearly: 0.5,
  /** Frequent electronics purchases */
  often: 1.2,
});

/**
 * CO2e impact of repair vs. replace behavior in tonnes per year.
 * Repairing items reduces embodied carbon from manufacturing new products.
 * Negative values represent emissions avoided.
 * @type {Readonly<Object<string, number>>}
 */
const REPAIR_BONUS = Object.freeze({
  /** Always repair instead of replace */
  always: -0.3,
  /** Sometimes repair */
  sometimes: 0,
  /** Never repair, always replace */
  never: 0.2,
});

// ─── Reference Thresholds ───────────────────────────────────────────────────
/**
 * Global average per-capita annual carbon footprint in tonnes CO2e.
 * Used as a comparison benchmark for individual footprints.
 * Source: Our World in Data, 2022 per-capita consumption emissions.
 * @type {number}
 */
const GLOBAL_AVG_ANNUAL_TONNES = 4.7;

/**
 * Excellent footprint threshold in tonnes CO2e per year.
 * Below this value indicates strong sustainability practices.
 * @type {number}
 */
const EXCELLENT_THRESHOLD = 2.0;

/**
 * Good footprint threshold in tonnes CO2e per year.
 * Below this value indicates above-average sustainability.
 * @type {number}
 */
const GOOD_THRESHOLD = 4.0;

/**
 * Average footprint threshold in tonnes CO2e per year.
 * Around the global average, room for improvement.
 * @type {number}
 */
const AVERAGE_THRESHOLD = 6.0;

/**
 * High footprint threshold in tonnes CO2e per year.
 * Above this indicates significant opportunity for reduction.
 * @type {number}
 */
const HIGH_THRESHOLD = 10.0;

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
  const carCO2 = (answers.carKm * WEEKS_PER_YEAR * factor) / KG_TO_TONNES;
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
  const annualKwh = kwhEstimate * MONTHS_PER_YEAR;
  let energyCO2 = (annualKwh * GRID_EMISSION_FACTOR_KG_PER_KWH) / KG_TO_TONNES;
  if (answers.renewable === 'yes') energyCO2 *= RENEWABLE_REDUCTION_FACTOR;
  return energyCO2 + (HVAC_EXTRA[answers.hvac] ?? HVAC_EXTRA.medium);
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
  if (total < EXCELLENT_THRESHOLD) {
    return {
      emoji: '🌟',
      comparison: `Amazing! You are well below the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t and making strong choices.`,
    };
  }
  if (total < GOOD_THRESHOLD) {
    return {
      emoji: '🌿',
      comparison: `Great! You are below the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t. Keep building momentum.`,
    };
  }
  if (total < AVERAGE_THRESHOLD) {
    return {
      emoji: '🌍',
      comparison: `You are close to the global average of ${GLOBAL_AVG_ANNUAL_TONNES}t. A few simple changes will help.`,
    };
  }
  if (total < HIGH_THRESHOLD) {
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
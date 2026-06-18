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

export function calcTransport(answers) {
  const factor = CARBON_FACTORS[answers.carType] ?? CARBON_FACTORS.petrol;
  const carCO2 = answers.carKm * 52 * factor / 1000;
  const flightCO2 = answers.flightsPerYear * 0.9;
  const ptReduction = answers.publicTransport === 'yes' ? 0.85 : 1;
  return Math.max(0, (carCO2 + flightCO2) * ptReduction);
}

export function calcFood(answers) {
  return (
    (DIET_BASE[answers.diet] ?? DIET_BASE.mixed) +
    (BEEF_EXTRA[answers.beefFreq] ?? 0) +
    (WASTE_EXTRA[answers.foodWaste] ?? 0.2)
  );
}

export function calcEnergy(answers) {
  const monthly = answers.electricityBill;
  const kwhEstimate = monthly / 8;
  const annualKwh = kwhEstimate * 12;
  let energyCO2 = (annualKwh * 0.82) / 1000;
  if (answers.renewable === 'yes') energyCO2 *= 0.3;
  return energyCO2 + (HVAC_EXTRA[answers.hvac] ?? 0.3);
}

export function calcShopping(answers) {
  return Math.max(0,
    (CLOTHES_SCORE[answers.clothes] ?? 0.8) +
    (ELECTRONICS_SCORE[answers.electronics] ?? 0.5) +
    (REPAIR_BONUS[answers.repair] ?? 0)
  );
}

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

export function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

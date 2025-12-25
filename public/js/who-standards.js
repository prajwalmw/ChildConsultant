/**
 * WHO Child Growth Standards Implementation
 *
 * This module implements the official WHO growth standards using LMS method
 * (Lambda-Mu-Sigma) for accurate percentile calculations.
 *
 * Reference: WHO Child Growth Standards (2006)
 * https://www.who.int/tools/child-growth-standards
 */

// WHO Weight-for-Age LMS data (0-60 months) - Boys
const WHO_WEIGHT_AGE_BOYS = [
  { month: 0, L: 0.3487, M: 3.3464, S: 0.14602 },
  { month: 1, L: 0.2297, M: 4.4709, S: 0.13395 },
  { month: 2, L: 0.1970, M: 5.5675, S: 0.12385 },
  { month: 3, L: 0.1738, M: 6.3762, S: 0.11727 },
  { month: 4, L: 0.1553, M: 7.0023, S: 0.11316 },
  { month: 5, L: 0.1395, M: 7.5105, S: 0.11080 },
  { month: 6, L: 0.1257, M: 7.9340, S: 0.10958 },
  { month: 7, L: 0.1134, M: 8.2970, S: 0.10902 },
  { month: 8, L: 0.1021, M: 8.6151, S: 0.10882 },
  { month: 9, L: 0.0917, M: 8.9014, S: 0.10881 },
  { month: 10, L: 0.0820, M: 9.1649, S: 0.10891 },
  { month: 11, L: 0.0730, M: 9.4122, S: 0.10906 },
  { month: 12, L: 0.0644, M: 9.6479, S: 0.10925 },
  { month: 15, L: 0.0425, M: 10.3009, S: 0.10986 },
  { month: 18, L: 0.0220, M: 10.8632, S: 0.11066 },
  { month: 21, L: 0.0031, M: 11.3499, S: 0.11158 },
  { month: 24, L: -0.0146, M: 11.7796, S: 0.11256 },
  { month: 27, L: -0.0311, M: 12.1679, S: 0.11358 },
  { month: 30, L: -0.0464, M: 12.5244, S: 0.11461 },
  { month: 33, L: -0.0608, M: 12.8561, S: 0.11567 },
  { month: 36, L: -0.0743, M: 13.1681, S: 0.11673 },
  { month: 42, L: -0.0993, M: 13.7434, S: 0.11889 },
  { month: 48, L: -0.1211, M: 14.2793, S: 0.12103 },
  { month: 54, L: -0.1402, M: 14.7836, S: 0.12314 },
  { month: 60, L: -0.1570, M: 15.2632, S: 0.12521 }
];

// WHO Weight-for-Age LMS data (0-60 months) - Girls
const WHO_WEIGHT_AGE_GIRLS = [
  { month: 0, L: 0.3809, M: 3.2322, S: 0.14171 },
  { month: 1, L: 0.1714, M: 4.1873, S: 0.13724 },
  { month: 2, L: 0.0962, M: 5.1282, S: 0.13000 },
  { month: 3, L: 0.0402, M: 5.8458, S: 0.12619 },
  { month: 4, L: -0.0050, M: 6.4237, S: 0.12402 },
  { month: 5, L: -0.0430, M: 6.8985, S: 0.12274 },
  { month: 6, L: -0.0756, M: 7.2970, S: 0.12204 },
  { month: 7, L: -0.1039, M: 7.6422, S: 0.12178 },
  { month: 8, L: -0.1288, M: 7.9487, S: 0.12181 },
  { month: 9, L: -0.1507, M: 8.2254, S: 0.12199 },
  { month: 10, L: -0.1700, M: 8.4800, S: 0.12223 },
  { month: 11, L: -0.1872, M: 8.7192, S: 0.12247 },
  { month: 12, L: -0.2024, M: 8.9481, S: 0.12268 },
  { month: 15, L: -0.2379, M: 9.5900, S: 0.12309 },
  { month: 18, L: -0.2680, M: 10.1452, S: 0.12339 },
  { month: 21, L: -0.2936, M: 10.6331, S: 0.12363 },
  { month: 24, L: -0.3154, M: 11.0686, S: 0.12384 },
  { month: 27, L: -0.3340, M: 11.4631, S: 0.12403 },
  { month: 30, L: -0.3499, M: 11.8251, S: 0.12421 },
  { month: 33, L: -0.3634, M: 12.1615, S: 0.12439 },
  { month: 36, L: -0.3749, M: 12.4775, S: 0.12456 },
  { month: 42, L: -0.3943, M: 13.0719, S: 0.12494 },
  { month: 48, L: -0.4098, M: 13.6357, S: 0.12533 },
  { month: 54, L: -0.4225, M: 14.1746, S: 0.12574 },
  { month: 60, L: -0.4330, M: 14.6936, S: 0.12618 }
];

// WHO Height-for-Age LMS data (0-60 months) - Boys
const WHO_HEIGHT_AGE_BOYS = [
  { month: 0, L: 1, M: 49.8842, S: 0.03795 },
  { month: 1, L: 1, M: 54.7244, S: 0.03557 },
  { month: 2, L: 1, M: 58.4249, S: 0.03424 },
  { month: 3, L: 1, M: 61.4292, S: 0.03328 },
  { month: 4, L: 1, M: 63.8859, S: 0.03257 },
  { month: 5, L: 1, M: 65.9026, S: 0.03204 },
  { month: 6, L: 1, M: 67.6236, S: 0.03165 },
  { month: 7, L: 1, M: 69.1645, S: 0.03139 },
  { month: 8, L: 1, M: 70.5994, S: 0.03124 },
  { month: 9, L: 1, M: 71.9687, S: 0.03117 },
  { month: 10, L: 1, M: 73.2812, S: 0.03118 },
  { month: 11, L: 1, M: 74.5388, S: 0.03125 },
  { month: 12, L: 1, M: 75.7488, S: 0.03137 },
  { month: 15, L: 1, M: 78.7252, S: 0.03181 },
  { month: 18, L: 1, M: 81.3904, S: 0.03236 },
  { month: 21, L: 1, M: 83.7827, S: 0.03297 },
  { month: 24, L: 1, M: 85.9488, S: 0.03360 },
  { month: 27, L: 1, M: 87.9186, S: 0.03424 },
  { month: 30, L: 1, M: 89.7154, S: 0.03487 },
  { month: 33, L: 1, M: 91.3576, S: 0.03549 },
  { month: 36, L: 1, M: 92.8606, S: 0.03609 },
  { month: 42, L: 1, M: 95.6264, S: 0.03722 },
  { month: 48, L: 1, M: 98.1251, S: 0.03827 },
  { month: 54, L: 1, M: 100.3931, S: 0.03925 },
  { month: 60, L: 1, M: 102.4604, S: 0.04018 }
];

// WHO Height-for-Age LMS data (0-60 months) - Girls
const WHO_HEIGHT_AGE_GIRLS = [
  { month: 0, L: 1, M: 49.1477, S: 0.03790 },
  { month: 1, L: 1, M: 53.6872, S: 0.03626 },
  { month: 2, L: 1, M: 57.0673, S: 0.03497 },
  { month: 3, L: 1, M: 59.8029, S: 0.03379 },
  { month: 4, L: 1, M: 62.0899, S: 0.03285 },
  { month: 5, L: 1, M: 64.0301, S: 0.03212 },
  { month: 6, L: 1, M: 65.7311, S: 0.03154 },
  { month: 7, L: 1, M: 67.2873, S: 0.03109 },
  { month: 8, L: 1, M: 68.7498, S: 0.03075 },
  { month: 9, L: 1, M: 70.1435, S: 0.03048 },
  { month: 10, L: 1, M: 71.4818, S: 0.03029 },
  { month: 11, L: 1, M: 72.7714, S: 0.03015 },
  { month: 12, L: 1, M: 74.0151, S: 0.03007 },
  { month: 15, L: 1, M: 76.9768, S: 0.03010 },
  { month: 18, L: 1, M: 79.6178, S: 0.03032 },
  { month: 21, L: 1, M: 81.9843, S: 0.03064 },
  { month: 24, L: 1, M: 84.1176, S: 0.03100 },
  { month: 27, L: 1, M: 86.0477, S: 0.03137 },
  { month: 30, L: 1, M: 87.7990, S: 0.03174 },
  { month: 33, L: 1, M: 89.3917, S: 0.03211 },
  { month: 36, L: 1, M: 90.8431, S: 0.03247 },
  { month: 42, L: 1, M: 93.5252, S: 0.03318 },
  { month: 48, L: 1, M: 95.9568, S: 0.03386 },
  { month: 54, L: 1, M: 98.1679, S: 0.03452 },
  { month: 60, L: 1, M: 100.1863, S: 0.03516 }
];

// WHO Head Circumference-for-Age LMS data (0-60 months) - Boys
const WHO_HC_AGE_BOYS = [
  { month: 0, L: 1, M: 34.4618, S: 0.03686 },
  { month: 1, L: 1, M: 37.2759, S: 0.03254 },
  { month: 2, L: 1, M: 39.1285, S: 0.03031 },
  { month: 3, L: 1, M: 40.5135, S: 0.02881 },
  { month: 4, L: 1, M: 41.6317, S: 0.02772 },
  { month: 5, L: 1, M: 42.5576, S: 0.02688 },
  { month: 6, L: 1, M: 43.3306, S: 0.02622 },
  { month: 7, L: 1, M: 43.9803, S: 0.02570 },
  { month: 8, L: 1, M: 44.5299, S: 0.02529 },
  { month: 9, L: 1, M: 44.9998, S: 0.02497 },
  { month: 10, L: 1, M: 45.4048, S: 0.02472 },
  { month: 11, L: 1, M: 45.7570, S: 0.02453 },
  { month: 12, L: 1, M: 46.0661, S: 0.02438 },
  { month: 15, L: 1, M: 46.7730, S: 0.02418 },
  { month: 18, L: 1, M: 47.3177, S: 0.02409 },
  { month: 21, L: 1, M: 47.7379, S: 0.02406 },
  { month: 24, L: 1, M: 48.0638, S: 0.02407 },
  { month: 27, L: 1, M: 48.3181, S: 0.02409 },
  { month: 30, L: 1, M: 48.5188, S: 0.02413 },
  { month: 33, L: 1, M: 48.6795, S: 0.02418 },
  { month: 36, L: 1, M: 48.8110, S: 0.02423 },
  { month: 42, L: 1, M: 49.0087, S: 0.02435 },
  { month: 48, L: 1, M: 49.1402, S: 0.02448 },
  { month: 54, L: 1, M: 49.2285, S: 0.02461 },
  { month: 60, L: 1, M: 49.2883, S: 0.02474 }
];

// WHO Head Circumference-for-Age LMS data (0-60 months) - Girls
const WHO_HC_AGE_GIRLS = [
  { month: 0, L: 1, M: 33.8787, S: 0.03496 },
  { month: 1, L: 1, M: 36.5463, S: 0.03247 },
  { month: 2, L: 1, M: 38.2521, S: 0.03080 },
  { month: 3, L: 1, M: 39.5328, S: 0.02958 },
  { month: 4, L: 1, M: 40.5817, S: 0.02862 },
  { month: 5, L: 1, M: 41.4594, S: 0.02785 },
  { month: 6, L: 1, M: 42.2010, S: 0.02721 },
  { month: 7, L: 1, M: 42.8299, S: 0.02668 },
  { month: 8, L: 1, M: 43.3674, S: 0.02624 },
  { month: 9, L: 1, M: 43.8297, S: 0.02587 },
  { month: 10, L: 1, M: 44.2302, S: 0.02556 },
  { month: 11, L: 1, M: 44.5800, S: 0.02531 },
  { month: 12, L: 1, M: 44.8882, S: 0.02510 },
  { month: 15, L: 1, M: 45.5760, S: 0.02473 },
  { month: 18, L: 1, M: 46.0995, S: 0.02449 },
  { month: 21, L: 1, M: 46.5032, S: 0.02434 },
  { month: 24, L: 1, M: 46.8174, S: 0.02424 },
  { month: 27, L: 1, M: 47.0660, S: 0.02418 },
  { month: 30, L: 1, M: 47.2670, S: 0.02414 },
  { month: 33, L: 1, M: 47.4329, S: 0.02412 },
  { month: 36, L: 1, M: 47.5728, S: 0.02411 },
  { month: 42, L: 1, M: 47.7798, S: 0.02412 },
  { month: 48, L: 1, M: 47.9302, S: 0.02415 },
  { month: 54, L: 1, M: 48.0407, S: 0.02419 },
  { month: 60, L: 1, M: 48.1231, S: 0.02424 }
];

/**
 * Interpolate LMS values for a given age in months
 */
function interpolateLMS(ageMonths, dataTable) {
  // Handle edge cases
  if (ageMonths <= dataTable[0].month) {
    return dataTable[0];
  }
  if (ageMonths >= dataTable[dataTable.length - 1].month) {
    return dataTable[dataTable.length - 1];
  }

  // Find surrounding data points
  let lower = null;
  let upper = null;

  for (let i = 0; i < dataTable.length - 1; i++) {
    if (ageMonths >= dataTable[i].month && ageMonths <= dataTable[i + 1].month) {
      lower = dataTable[i];
      upper = dataTable[i + 1];
      break;
    }
  }

  if (!lower || !upper) {
    return dataTable[0];
  }

  // Linear interpolation
  const ratio = (ageMonths - lower.month) / (upper.month - lower.month);

  return {
    month: ageMonths,
    L: lower.L + ratio * (upper.L - lower.L),
    M: lower.M + ratio * (upper.M - upper.M),
    S: lower.S + ratio * (upper.S - lower.S)
  };
}

/**
 * Calculate Z-score from measurement using LMS method
 * Z = [(X/M)^L - 1] / (L * S)
 */
function calculateZScore(measurement, L, M, S) {
  if (L === 0) {
    // Special case when L = 0
    return Math.log(measurement / M) / S;
  }

  return (Math.pow(measurement / M, L) - 1) / (L * S);
}

/**
 * Convert Z-score to percentile using normal distribution approximation
 */
function zScoreToPercentile(zScore) {
  // Clamp z-score to reasonable range
  zScore = Math.max(-3.5, Math.min(3.5, zScore));

  // Using approximation for cumulative normal distribution
  const t = 1 / (1 + 0.2316419 * Math.abs(zScore));
  const d = 0.3989423 * Math.exp(-zScore * zScore / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  let percentile;
  if (zScore >= 0) {
    percentile = (1 - probability) * 100;
  } else {
    percentile = probability * 100;
  }

  return Math.max(0.1, Math.min(99.9, percentile));
}

/**
 * Calculate weight-for-age percentile using WHO standards
 */
export function calculateWeightPercentile(ageMonths, weight, gender) {
  if (!weight || weight <= 0 || !ageMonths || ageMonths < 0) {
    return null;
  }

  const dataTable = gender === 'Male' ? WHO_WEIGHT_AGE_BOYS : WHO_WEIGHT_AGE_GIRLS;
  const lms = interpolateLMS(ageMonths, dataTable);
  const zScore = calculateZScore(weight, lms.L, lms.M, lms.S);

  return zScoreToPercentile(zScore);
}

/**
 * Calculate height-for-age percentile using WHO standards
 */
export function calculateHeightPercentile(ageMonths, height, gender) {
  if (!height || height <= 0 || !ageMonths || ageMonths < 0) {
    return null;
  }

  const dataTable = gender === 'Male' ? WHO_HEIGHT_AGE_BOYS : WHO_HEIGHT_AGE_GIRLS;
  const lms = interpolateLMS(ageMonths, dataTable);
  const zScore = calculateZScore(height, lms.L, lms.M, lms.S);

  return zScoreToPercentile(zScore);
}

/**
 * Calculate head circumference-for-age percentile using WHO standards
 */
export function calculateHeadCircumferencePercentile(ageMonths, hc, gender) {
  if (!hc || hc <= 0 || !ageMonths || ageMonths < 0) {
    return null;
  }

  const dataTable = gender === 'Male' ? WHO_HC_AGE_BOYS : WHO_HC_AGE_GIRLS;
  const lms = interpolateLMS(ageMonths, dataTable);
  const zScore = calculateZScore(hc, lms.L, lms.M, lms.S);

  return zScoreToPercentile(zScore);
}

/**
 * Calculate age in months from date of birth
 */
export function calculateAgeInMonths(dateOfBirth, consultationDate = new Date()) {
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  const consDate = consultationDate instanceof Date ? consultationDate : new Date(consultationDate);

  const years = consDate.getFullYear() - dob.getFullYear();
  const months = consDate.getMonth() - dob.getMonth();
  const days = consDate.getDate() - dob.getDate();

  let totalMonths = years * 12 + months;

  // Add fractional month based on days
  if (days < 0) {
    totalMonths -= 1;
  }

  return Math.max(0, totalMonths);
}

/**
 * Get growth assessment based on percentile
 */
export function getGrowthAssessment(percentile) {
  if (percentile === null || percentile === undefined) {
    return 'Unknown';
  }

  if (percentile < 3) {
    return 'Severe underweight/undergrowth';
  } else if (percentile < 15) {
    return 'Below average';
  } else if (percentile <= 85) {
    return 'Normal';
  } else if (percentile <= 97) {
    return 'Above average';
  } else {
    return 'Very high';
  }
}

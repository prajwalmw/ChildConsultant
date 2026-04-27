/**
 * Nutritional overall score (0-100) — mirrors public/doctor/child_dashboard.html calculateNutritionalScores.
 * Age is taken at consultation date when DOB is known.
 */
(function () {
  'use strict';

  function parseFirestoreDate(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  }

  function ageMonthsAtConsult(dobVal, consultDateVal) {
    const dob = parseFirestoreDate(dobVal);
    const ref = parseFirestoreDate(consultDateVal) || new Date();
    if (!dob || isNaN(dob.getTime()) || isNaN(ref.getTime())) return null;
    const years = ref.getFullYear() - dob.getFullYear();
    const months = ref.getMonth() - dob.getMonth();
    const days = ref.getDate() - dob.getDate();
    let totalMonths = years * 12 + months;
    if (days < 0) totalMonths -= 1;
    return Math.max(0, totalMonths);
  }

  window.calculateNutritionalScoresPrescription = function (nutritionalHealth, childProfile, consultationDateRaw) {
    const dobDate = childProfile && parseFirestoreDate(childProfile.dob || childProfile.dateOfBirth);
    const computedAge = dobDate && !isNaN(dobDate.getTime())
      ? ageMonthsAtConsult(childProfile.dob || childProfile.dateOfBirth, consultationDateRaw)
      : null;
    const ageMonths = computedAge != null ? computedAge : 60;
    const ageYears = Math.floor(ageMonths / 12);

    let physicalScore = 0;
    let dietaryPatternsScore = 0;
    let foodGroupsScore = 0;
    let supplementationScore = 0;

    // 1. Physical Indicators Score (0-100) - Clinical observation-based
    let physicalCount = 0;
    if (nutritionalHealth.energyLevel) {
      physicalCount++;
      if (nutritionalHealth.energyLevel === 'high') physicalScore += 100;
      else if (nutritionalHealth.energyLevel === 'normal') physicalScore += 75;
      else physicalScore += 40;
    }
    if (nutritionalHealth.appetite) {
      physicalCount++;
      if (nutritionalHealth.appetite === 'good') physicalScore += 100;
      else if (nutritionalHealth.appetite === 'normal') physicalScore += 75;
      else physicalScore += 40;
    }
    if (nutritionalHealth.skinHealth) {
      physicalCount++;
      if (nutritionalHealth.skinHealth === 'healthy') physicalScore += 100;
      else if (nutritionalHealth.skinHealth === 'normal') physicalScore += 75;
      else physicalScore += 40;
    }
    if (nutritionalHealth.hairQuality) {
      physicalCount++;
      if (nutritionalHealth.hairQuality === 'healthy') physicalScore += 100;
      else if (nutritionalHealth.hairQuality === 'normal') physicalScore += 75;
      else physicalScore += 40;
    }
    if (nutritionalHealth.nailHealth) {
      physicalCount++;
      if (nutritionalHealth.nailHealth === 'healthy') physicalScore += 100;
      else if (nutritionalHealth.nailHealth === 'normal') physicalScore += 75;
      else physicalScore += 40;
    }
    physicalScore = physicalCount > 0 ? Math.round(physicalScore / physicalCount) : 0;

    // 2. Dietary Patterns Score (0-100) - Age-based WHO meal frequency standards
    let dietaryCount = 0;

    // Meal frequency - WHO IYCF Guidelines
    if (nutritionalHealth.mealsPerDay) {
      dietaryCount++;
      let mealScore = 0;

      if (ageMonths >= 6 && ageMonths < 9) {
        // WHO: 2-3 meals per day for 6-8 months
        if (nutritionalHealth.mealsPerDay >= 2 && nutritionalHealth.mealsPerDay <= 3) mealScore = 100;
        else if (nutritionalHealth.mealsPerDay === 4) mealScore = 85;
        else if (nutritionalHealth.mealsPerDay === 1) mealScore = 50;
        else mealScore = 40;
      } else if (ageMonths >= 9 && ageMonths < 24) {
        // WHO: 3-4 meals per day for 9-23 months
        if (nutritionalHealth.mealsPerDay >= 3 && nutritionalHealth.mealsPerDay <= 4) mealScore = 100;
        else if (nutritionalHealth.mealsPerDay === 2 || nutritionalHealth.mealsPerDay === 5) mealScore = 75;
        else mealScore = 50;
      } else {
        // Children 2+ years: 3 meals + 2 snacks = 5 total, standard is 3-5
        if (nutritionalHealth.mealsPerDay >= 3 && nutritionalHealth.mealsPerDay <= 5) mealScore = 100;
        else if (nutritionalHealth.mealsPerDay === 2 || nutritionalHealth.mealsPerDay === 6) mealScore = 70;
        else mealScore = 40;
      }
      dietaryPatternsScore += mealScore;
    }

    // Breakfast regularity - Standard pediatric recommendation
    if (nutritionalHealth.breakfastRegularity) {
      dietaryCount++;
      if (nutritionalHealth.breakfastRegularity === 'daily') dietaryPatternsScore += 100;
      else if (nutritionalHealth.breakfastRegularity === 'sometimes') dietaryPatternsScore += 60;
      else dietaryPatternsScore += 20;
    }

    // Junk food frequency - Standard pediatric guideline
    if (nutritionalHealth.junkFoodFrequency) {
      dietaryCount++;
      if (nutritionalHealth.junkFoodFrequency === '0-1') dietaryPatternsScore += 100;
      else if (nutritionalHealth.junkFoodFrequency === '2-3') dietaryPatternsScore += 75;
      else if (nutritionalHealth.junkFoodFrequency === '4-5') dietaryPatternsScore += 50;
      else dietaryPatternsScore += 25;
    }

    dietaryPatternsScore = dietaryCount > 0 ? Math.round(dietaryPatternsScore / dietaryCount) : 0;

    // 3. Food Groups Balance Score (0-100) - Age-based WHO & USDA Dietary Guidelines
    let foodGroupCount = 0;

    // Fruit servings - Age-appropriate ranges (USDA 2025-2030 Guidelines)
    if (nutritionalHealth.fruitServings !== null && nutritionalHealth.fruitServings !== undefined) {
      foodGroupCount++;
      let fruitScore = 0;

      if (ageYears >= 0 && ageYears <= 1) {
        // Infants 12-23 months: 0.5-1 cup (approximately 1-2 servings)
        if (nutritionalHealth.fruitServings >= 1 && nutritionalHealth.fruitServings <= 2) fruitScore = 100;
        else if (nutritionalHealth.fruitServings >= 0.5 && nutritionalHealth.fruitServings < 1) fruitScore = 80;
        else if (nutritionalHealth.fruitServings > 2 && nutritionalHealth.fruitServings <= 2.5) fruitScore = 85;
        else fruitScore = 40;
      } else if (ageYears >= 2 && ageYears <= 4) {
        // Toddlers 2-4 years: 1-1.5 cups (approximately 2-3 servings)
        if (nutritionalHealth.fruitServings >= 2 && nutritionalHealth.fruitServings <= 3) fruitScore = 100;
        else if (nutritionalHealth.fruitServings >= 1 && nutritionalHealth.fruitServings < 2) fruitScore = 70;
        else if (nutritionalHealth.fruitServings > 3 && nutritionalHealth.fruitServings <= 4) fruitScore = 85;
        else fruitScore = 40;
      } else if (ageYears >= 5 && ageYears <= 8) {
        // Children 5-8 years: 1-1.5 cups (approximately 2-3 servings)
        if (nutritionalHealth.fruitServings >= 2 && nutritionalHealth.fruitServings <= 3) fruitScore = 100;
        else if (nutritionalHealth.fruitServings >= 1 && nutritionalHealth.fruitServings < 2) fruitScore = 70;
        else if (nutritionalHealth.fruitServings > 3 && nutritionalHealth.fruitServings <= 4) fruitScore = 85;
        else fruitScore = 40;
      } else if (ageYears >= 9 && ageYears <= 13) {
        // Pre-teens 9-13 years: 1.5 cups (approximately 3 servings)
        if (nutritionalHealth.fruitServings >= 2.5 && nutritionalHealth.fruitServings <= 3.5) fruitScore = 100;
        else if (nutritionalHealth.fruitServings >= 2 && nutritionalHealth.fruitServings < 2.5) fruitScore = 75;
        else if (nutritionalHealth.fruitServings > 3.5 && nutritionalHealth.fruitServings <= 4.5) fruitScore = 85;
        else fruitScore = 50;
      } else {
        // Adolescents 14+ years: 1.5-2 cups (approximately 3-4 servings)
        if (nutritionalHealth.fruitServings >= 3 && nutritionalHealth.fruitServings <= 4) fruitScore = 100;
        else if (nutritionalHealth.fruitServings >= 2 && nutritionalHealth.fruitServings < 3) fruitScore = 75;
        else if (nutritionalHealth.fruitServings > 4 && nutritionalHealth.fruitServings <= 5) fruitScore = 85;
        else fruitScore = 50;
      }
      foodGroupsScore += fruitScore;
    }

    // Vegetable servings - Age-appropriate ranges (USDA 2025-2030 Guidelines)
    if (nutritionalHealth.vegetableServings !== null && nutritionalHealth.vegetableServings !== undefined) {
      foodGroupCount++;
      let vegScore = 0;

      if (ageYears >= 0 && ageYears <= 1) {
        // Infants 12-23 months: 0.67-1 cup (approximately 1-2 servings)
        if (nutritionalHealth.vegetableServings >= 1 && nutritionalHealth.vegetableServings <= 2) vegScore = 100;
        else if (nutritionalHealth.vegetableServings >= 0.5 && nutritionalHealth.vegetableServings < 1) vegScore = 75;
        else if (nutritionalHealth.vegetableServings > 2 && nutritionalHealth.vegetableServings <= 2.5) vegScore = 85;
        else vegScore = 40;
      } else if (ageYears >= 2 && ageYears <= 4) {
        // Toddlers 2-4 years: 1-2 cups (approximately 2-4 servings)
        if (nutritionalHealth.vegetableServings >= 2 && nutritionalHealth.vegetableServings <= 4) vegScore = 100;
        else if (nutritionalHealth.vegetableServings >= 1 && nutritionalHealth.vegetableServings < 2) vegScore = 70;
        else if (nutritionalHealth.vegetableServings > 4 && nutritionalHealth.vegetableServings <= 5) vegScore = 85;
        else vegScore = 40;
      } else if (ageYears >= 5 && ageYears <= 8) {
        // Children 5-8 years: 1.5-2.5 cups (approximately 3-5 servings)
        if (nutritionalHealth.vegetableServings >= 3 && nutritionalHealth.vegetableServings <= 5) vegScore = 100;
        else if (nutritionalHealth.vegetableServings >= 1.5 && nutritionalHealth.vegetableServings < 3) vegScore = 75;
        else if (nutritionalHealth.vegetableServings > 5 && nutritionalHealth.vegetableServings <= 6) vegScore = 85;
        else vegScore = 50;
      } else if (ageYears >= 9 && ageYears <= 13) {
        // Pre-teens 9-13 years: 2-3 cups for girls, 2.5-3.5 for boys (approximately 4-6 servings)
        if (nutritionalHealth.vegetableServings >= 4 && nutritionalHealth.vegetableServings <= 7) vegScore = 100;
        else if (nutritionalHealth.vegetableServings >= 2 && nutritionalHealth.vegetableServings < 4) vegScore = 75;
        else if (nutritionalHealth.vegetableServings > 7 && nutritionalHealth.vegetableServings <= 8) vegScore = 85;
        else vegScore = 50;
      } else {
        // Adolescents 14+ years: 2.5-3 cups for girls, 3-4 for boys (approximately 5-8 servings)
        if (nutritionalHealth.vegetableServings >= 5 && nutritionalHealth.vegetableServings <= 8) vegScore = 100;
        else if (nutritionalHealth.vegetableServings >= 3 && nutritionalHealth.vegetableServings < 5) vegScore = 75;
        else if (nutritionalHealth.vegetableServings > 8 && nutritionalHealth.vegetableServings <= 10) vegScore = 85;
        else vegScore = 50;
      }
      foodGroupsScore += vegScore;
    }

    // Dairy intake - Age-appropriate ranges (WHO & AAP Guidelines)
    if (nutritionalHealth.dairyIntake !== null && nutritionalHealth.dairyIntake !== undefined) {
      foodGroupCount++;
      let dairyScore = 0;

      if (ageMonths >= 12 && ageMonths < 24) {
        // WHO: 200-500ml for 12-23 months (depending on other animal-source foods)
        // AAP: 470-710ml (16-24 oz)
        if (nutritionalHealth.dairyIntake >= 400 && nutritionalHealth.dairyIntake <= 600) dairyScore = 100;
        else if (nutritionalHealth.dairyIntake >= 300 && nutritionalHealth.dairyIntake < 400) dairyScore = 85;
        else if (nutritionalHealth.dairyIntake >= 200 && nutritionalHealth.dairyIntake < 300) dairyScore = 75;
        else if (nutritionalHealth.dairyIntake > 600 && nutritionalHealth.dairyIntake <= 750) dairyScore = 75;
        else dairyScore = 50;
      } else if (ageYears >= 2 && ageYears <= 5) {
        // AAP: 470-590ml (16-20 oz) for ages 2-5
        if (nutritionalHealth.dairyIntake >= 450 && nutritionalHealth.dairyIntake <= 600) dairyScore = 100;
        else if (nutritionalHealth.dairyIntake >= 350 && nutritionalHealth.dairyIntake < 450) dairyScore = 80;
        else if (nutritionalHealth.dairyIntake > 600 && nutritionalHealth.dairyIntake <= 750) dairyScore = 75;
        else dairyScore = 50;
      } else if (ageYears >= 6 && ageYears <= 8) {
        // Standard pediatric: 2-2.5 cups (approximately 480-600ml)
        if (nutritionalHealth.dairyIntake >= 450 && nutritionalHealth.dairyIntake <= 650) dairyScore = 100;
        else if (nutritionalHealth.dairyIntake >= 350 && nutritionalHealth.dairyIntake < 450) dairyScore = 75;
        else if (nutritionalHealth.dairyIntake > 650 && nutritionalHealth.dairyIntake <= 800) dairyScore = 80;
        else dairyScore = 50;
      } else {
        // Older children/adolescents: 2.5-3 cups (approximately 600-720ml)
        if (nutritionalHealth.dairyIntake >= 550 && nutritionalHealth.dairyIntake <= 750) dairyScore = 100;
        else if (nutritionalHealth.dairyIntake >= 400 && nutritionalHealth.dairyIntake < 550) dairyScore = 75;
        else if (nutritionalHealth.dairyIntake > 750 && nutritionalHealth.dairyIntake <= 900) dairyScore = 80;
        else dairyScore = 50;
      }
      foodGroupsScore += dairyScore;
    }

    foodGroupsScore = foodGroupCount > 0 ? Math.round(foodGroupsScore / foodGroupCount) : 0;

    // 4. Supplementation Score (0-100)
    if (nutritionalHealth.supplements && nutritionalHealth.supplements.length > 0) {
      if (nutritionalHealth.supplements.includes('none')) {
        supplementationScore = 75; // Neutral - assuming balanced diet
      } else {
        supplementationScore = 85; // Good - addressing specific deficiencies
      }
    } else {
      supplementationScore = 75; // Neutral
    }

    // Calculate overall score (weighted average)
    const overall = Math.round(
      (physicalScore * 0.35) +
      (dietaryPatternsScore * 0.30) +
      (foodGroupsScore * 0.30) +
      (supplementationScore * 0.05)
    );

    return {
      physical: physicalScore,
      dietaryPatterns: dietaryPatternsScore,
      foodGroups: foodGroupsScore,
      supplementation: supplementationScore,
      overall: overall,
      ageMonths: ageMonths, // Include for reference
      ageYears: ageYears
    };
  };

  window.getNutritionalScoreCategoryPrescription = function (score) {
    if (score == null || score === '' || Number.isNaN(Number(score))) return '';
    const s = Number(score);
    if (s >= 85) return 'Excellent Nutrition';
    if (s >= 70) return 'Good Nutrition';
    if (s >= 55) return 'Adequate Nutrition';
    if (s >= 40) return 'Needs Improvement';
    return 'Nutritional Concern';
  };
})();

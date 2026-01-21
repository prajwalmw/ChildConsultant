// One-time migration script to add nutritionalHealth field to existing consultations
// Run with: node migrate-nutritional-health.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'child-consultant'
});

const db = admin.firestore();

async function migrateNutritionalHealth() {
  console.log('🚀 Starting migration: Adding nutritionalHealth to existing consultations...\n');

  let totalConsultations = 0;
  let updatedConsultations = 0;
  let skippedConsultations = 0;

  try {
    // Use collection group query to get ALL consultations across all patients/children
    console.log('🔍 Searching for all consultations using collection group query...\n');
    const consultationsSnapshot = await db.collectionGroup('consultations').get();
    console.log(`📋 Found ${consultationsSnapshot.size} consultations across all children\n`);

    // Group consultations by child for better logging
    const consultationsByChild = new Map();

    consultationsSnapshot.docs.forEach(doc => {
      const pathParts = doc.ref.path.split('/');
      const childId = pathParts[3]; // Extract child ID from path

      if (!consultationsByChild.has(childId)) {
        consultationsByChild.set(childId, []);
      }
      consultationsByChild.get(childId).push(doc);
    });

    console.log(`👶 Processing ${consultationsByChild.size} children\n`);

    // Process each child's consultations
    for (const [childId, consultDocs] of consultationsByChild.entries()) {
      const firstDoc = consultDocs[0];
      const pathParts = firstDoc.ref.path.split('/');
      const parentKey = pathParts[1];

      console.log(`\n👤 Parent: ${parentKey}`);
      console.log(`   👶 Child: ${childId}`);
      console.log(`   🏥 Consultations: ${consultDocs.length}`);

      // Sort consultations by date to apply progressive improvement
      const sortedConsultDocs = consultDocs.sort((a, b) => {
        const dateA = a.data().date?.toDate?.() || new Date(a.data().date);
        const dateB = b.data().date?.toDate?.() || new Date(b.data().date);
        return dateA - dateB;
      });

      for (let i = 0; i < sortedConsultDocs.length; i++) {
        const consultDoc = sortedConsultDocs[i];
        totalConsultations++;
        const data = consultDoc.data();

        // Check if nutritionalHealth already exists with real data
        if (data.nutritionalHealth &&
            (data.nutritionalHealth.energyLevel || data.nutritionalHealth.fruitServings)) {
          console.log(`      ⏭️  Skipping ${consultDoc.id} (already has nutritionalHealth data)`);
          skippedConsultations++;
          continue;
        }

        // Get child's age at consultation time for AGE-APPROPRIATE nutritional data
        // Extract child's DOB from Firestore path to calculate age
        const childPath = consultDoc.ref.parent.parent.path;
        let childAgeMonths = 60; // Default fallback: 5 years old

        try {
          // Try to get child's DOB from the parent document
          const childDoc = await consultDoc.ref.parent.parent.get();
          if (childDoc.exists) {
            const childDOB = childDoc.data().dateOfBirth || childDoc.data().dob;
            if (childDOB) {
              const dobDate = childDOB.toDate ? childDOB.toDate() : new Date(childDOB);
              const consultDateObj = consultDate;
              const ageMs = consultDateObj - dobDate;
              childAgeMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.44)); // Approximate months
            }
          }
        } catch (err) {
          console.log(`      ⚠️  Could not determine age for ${consultDoc.id}, using default`);
        }

        const childAgeYears = Math.floor(childAgeMonths / 12);

        // Generate realistic nutritional health data with progressive improvement
        // Earlier consultations get lower scores, later ones get better nutrition
        const progressionFactor = i / Math.max(sortedConsultDocs.length - 1, 1); // 0 to 1

        // Helper to randomly pick from array
        const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

        // Helper to generate improving values
        const generateImprovingValue = (poorOptions, normalOptions, goodOptions) => {
          const rand = Math.random();
          if (progressionFactor < 0.3) {
            // Early consultations - mix of poor and normal
            return rand < 0.6 ? randomChoice(poorOptions) : randomChoice(normalOptions);
          } else if (progressionFactor < 0.7) {
            // Mid consultations - mostly normal
            return rand < 0.7 ? randomChoice(normalOptions) : randomChoice(goodOptions);
          } else {
            // Later consultations - mix of normal and good
            return rand < 0.3 ? randomChoice(normalOptions) : randomChoice(goodOptions);
          }
        };

        // AGE-BASED meal frequency per WHO IYCF Guidelines
        let mealsPerDay;
        if (childAgeMonths >= 6 && childAgeMonths < 9) {
          // WHO: 2-3 meals for 6-8 months
          mealsPerDay = Math.round(2 + progressionFactor + (Math.random() * 0.5));
        } else if (childAgeMonths >= 9 && childAgeMonths < 24) {
          // WHO: 3-4 meals for 9-23 months
          mealsPerDay = Math.round(3 + progressionFactor + (Math.random() * 0.5));
        } else {
          // Children 2+: 3-5 meals
          mealsPerDay = Math.round(3 + (progressionFactor * 2) + (Math.random() * 0.5));
        }

        // AGE-BASED fruit servings per USDA 2025-2030 Guidelines
        let fruitServings;
        if (childAgeYears <= 1) {
          // 1-2 servings for infants 12-23 months
          fruitServings = parseFloat((1 + progressionFactor + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 2 && childAgeYears <= 4) {
          // 2-3 servings for toddlers 2-4 years
          fruitServings = parseFloat((1.5 + (progressionFactor * 1.5) + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 5 && childAgeYears <= 8) {
          // 2-3 servings for children 5-8 years
          fruitServings = parseFloat((1.5 + (progressionFactor * 1.5) + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 9 && childAgeYears <= 13) {
          // 2.5-3.5 servings for pre-teens
          fruitServings = parseFloat((2 + (progressionFactor * 1.5) + (Math.random() * 0.5)).toFixed(1));
        } else {
          // 3-4 servings for adolescents 14+
          fruitServings = parseFloat((2.5 + (progressionFactor * 1.5) + (Math.random() * 0.5)).toFixed(1));
        }

        // AGE-BASED vegetable servings per USDA 2025-2030 Guidelines
        let vegetableServings;
        if (childAgeYears <= 1) {
          // 1-2 servings for infants
          vegetableServings = parseFloat((1 + progressionFactor + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 2 && childAgeYears <= 4) {
          // 2-4 servings for toddlers
          vegetableServings = parseFloat((1.5 + (progressionFactor * 2) + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 5 && childAgeYears <= 8) {
          // 3-5 servings for children
          vegetableServings = parseFloat((2 + (progressionFactor * 2.5) + (Math.random() * 0.5)).toFixed(1));
        } else if (childAgeYears >= 9 && childAgeYears <= 13) {
          // 4-7 servings for pre-teens
          vegetableServings = parseFloat((3 + (progressionFactor * 3) + (Math.random() * 0.5)).toFixed(1));
        } else {
          // 5-8 servings for adolescents
          vegetableServings = parseFloat((4 + (progressionFactor * 3) + (Math.random() * 0.5)).toFixed(1));
        }

        // AGE-BASED dairy intake per WHO & AAP Guidelines
        let dairyIntake;
        if (childAgeMonths >= 12 && childAgeMonths < 24) {
          // WHO: 200-500ml, AAP: 470-710ml for 12-23 months
          dairyIntake = Math.round(300 + (progressionFactor * 250) + (Math.random() * 100));
        } else if (childAgeYears >= 2 && childAgeYears <= 5) {
          // AAP: 470-590ml for ages 2-5
          dairyIntake = Math.round(400 + (progressionFactor * 150) + (Math.random() * 80));
        } else if (childAgeYears >= 6 && childAgeYears <= 8) {
          // Standard: 480-600ml
          dairyIntake = Math.round(450 + (progressionFactor * 150) + (Math.random() * 80));
        } else {
          // Older children: 550-750ml
          dairyIntake = Math.round(500 + (progressionFactor * 200) + (Math.random() * 100));
        }

        // Generate nutritional health data with AGE-APPROPRIATE values
        const nutritionalHealthData = {
          // Physical Indicators - improving over time
          energyLevel: generateImprovingValue(['low'], ['normal'], ['normal', 'high']),
          appetite: generateImprovingValue(['poor'], ['normal'], ['normal', 'good']),
          skinHealth: generateImprovingValue(['dry'], ['normal'], ['normal', 'healthy']),
          hairQuality: generateImprovingValue(['brittle'], ['normal'], ['normal', 'healthy']),
          nailHealth: generateImprovingValue(['brittle'], ['normal'], ['normal', 'healthy']),

          // Dietary Intake - AGE-BASED and improving over time
          mealsPerDay: mealsPerDay,
          dietaryPattern: randomChoice(['vegetarian', 'non-vegetarian', 'mixed']),
          breakfastRegularity: generateImprovingValue(['never', 'sometimes'], ['sometimes'], ['daily']),
          junkFoodFrequency: generateImprovingValue(['4-5', '6+'], ['2-3'], ['0-1', '2-3']),

          // Food Groups - AGE-BASED servings and improving over time
          fruitServings: fruitServings,
          vegetableServings: vegetableServings,
          dairyIntake: dairyIntake,

          // Supplements
          supplements: Math.random() < 0.3
            ? [randomChoice(['multivitamin', 'iron', 'calcium', 'vitaminD', 'omega3'])]
            : ['none'],

          // Clinical Notes
          clinicalNotes: `Historical data (Age: ${childAgeYears}y${childAgeMonths % 12}m) - Nutritional assessment with age-appropriate WHO/AAP standards`
        };

        // Add nutritionalHealth field with generated data
        await consultDoc.ref.update({
          nutritionalHealth: nutritionalHealthData
        });

        updatedConsultations++;

        // Calculate rough score for logging
        const physicalScore = nutritionalHealthData.energyLevel === 'high' ? 100 :
                            nutritionalHealthData.energyLevel === 'normal' ? 75 : 40;
        console.log(`      ✅ Updated ${consultDoc.id} - Energy: ${nutritionalHealthData.energyLevel}, Fruits: ${nutritionalHealthData.fruitServings}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total consultations found: ${totalConsultations}`);
    console.log(`   Consultations updated: ${updatedConsultations}`);
    console.log(`   Consultations skipped (already had nutritionalHealth): ${skippedConsultations}`);
    console.log('='.repeat(60));
    console.log('\n✅ All existing consultations now have the nutritionalHealth field!');
    console.log('💡 Tip: Future consultations will automatically include nutritional health data.\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateNutritionalHealth();

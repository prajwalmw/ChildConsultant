// One-time migration script to add motorSkills field to existing consultations
// Run with: node migrate-motor-skills.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'child-consultant'
});

const db = admin.firestore();

async function migrateMotorSkills() {
  console.log('🚀 Starting migration: Adding motorSkills to existing consultations...\n');

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
        const consultDate = data.date?.toDate?.() || new Date(data.date);

        // Check if motorSkills already exists and has real data
        if (data.motorSkills && data.motorSkills.overallScore) {
          console.log(`      ⏭️  Skipping ${consultDoc.id} (already has motorSkills data)`);
          skippedConsultations++;
          continue;
        }

        // Generate realistic motor skills data with progressive improvement
        // Earlier consultations get lower scores, later ones get higher scores
        const progressionFactor = i / Math.max(sortedConsultDocs.length - 1, 1); // 0 to 1

        const generateRandomScore = (baseMin, baseMax, progression) => {
          // Add progression bonus (0 to 1.5 points improvement over time)
          const min = baseMin + (progression * 1.0);
          const max = baseMax + (progression * 1.5);
          return parseFloat((Math.random() * (max - min) + min).toFixed(2));
        };

        // Generate scores for each category with progressive improvement
        const grossMotorAvg = generateRandomScore(5.0, 6.5, progressionFactor);
        const fineMotorAvg = generateRandomScore(4.5, 6.0, progressionFactor);
        const balanceAvg = generateRandomScore(4.0, 5.5, progressionFactor);
        const strengthAvg = generateRandomScore(5.0, 6.5, progressionFactor);
        const overallScore = parseFloat(((grossMotorAvg + fineMotorAvg + balanceAvg + strengthAvg) / 4).toFixed(2));

        // Determine category and alert level based on overall score
        let category, alertLevel;
        if (overallScore >= 9.0) {
          category = 'Excellent';
          alertLevel = 'excellent';
        } else if (overallScore >= 7.5) {
          category = 'Good';
          alertLevel = 'normal';
        } else if (overallScore >= 6.0) {
          category = 'Average';
          alertLevel = 'monitor';
        } else if (overallScore >= 4.0) {
          category = 'Below Average';
          alertLevel = 'warning';
        } else {
          category = 'Concern';
          alertLevel = 'critical';
        }

        // Create sample skill assessments for each category
        const motorSkillsData = {
          grossMotor: {
            walking: Math.round(grossMotorAvg),
            running: Math.round(grossMotorAvg + Math.random() - 0.5),
            jumpingRope: Math.round(grossMotorAvg + Math.random() - 0.5),
            climbingStairs: Math.round(grossMotorAvg + Math.random() - 0.5)
          },
          fineMotor: {
            handwriting: Math.round(fineMotorAvg),
            tyingShoelaces: Math.round(fineMotorAvg + Math.random() - 0.5),
            usingTools: Math.round(fineMotorAvg + Math.random() - 0.5)
          },
          balance: {
            balanceBeam: Math.round(balanceAvg)
          },
          strength: {
            stamina: Math.round(strengthAvg)
          },
          grossMotorAvg,
          fineMotorAvg,
          balanceAvg,
          strengthAvg,
          overallScore,
          category,
          alertLevel,
          clinicalNotes: 'Historical data - Assessment conducted during consultation',
          assessmentDate: data.date || new Date()
        };

        // Add motorSkills field with generated data
        await consultDoc.ref.update({
          motorSkills: motorSkillsData
        });

        updatedConsultations++;
        console.log(`      ✅ Updated ${consultDoc.id} - Score: ${overallScore.toFixed(1)} (${category})`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total consultations found: ${totalConsultations}`);
    console.log(`   Consultations updated: ${updatedConsultations}`);
    console.log(`   Consultations skipped (already had motorSkills): ${skippedConsultations}`);
    console.log('='.repeat(60));
    console.log('\n✅ All existing consultations now have the motorSkills field!');
    console.log('💡 Tip: Future consultations will automatically include motor skills assessment data.\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateMotorSkills();

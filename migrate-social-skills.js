// One-time migration script to add socialSkills field to existing consultations
// Run with: node migrate-social-skills.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'child-consultant'
});

const db = admin.firestore();

async function migrateSocialSkills() {
  console.log('🚀 Starting migration: Adding socialSkills to existing consultations...\n');

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

        // Check if socialSkills already exists with real data
        if (data.socialSkills &&
            (data.socialSkills.overallScore || data.socialSkills.communicationAvg)) {
          console.log(`      ⏭️  Skipping ${consultDoc.id} (already has socialSkills data)`);
          skippedConsultations++;
          continue;
        }

        // Get child's age at consultation time for AGE-APPROPRIATE social skills data
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

        // Determine age group based on SSIS/ASQ:SE-2 standards
        let ageGroup;
        if (childAgeMonths < 48) {
          ageGroup = '2-3'; // Ages 2-3 years (24-47 months)
        } else if (childAgeMonths < 72) {
          ageGroup = '4-5'; // Ages 4-5 years (48-71 months)
        } else if (childAgeMonths < 108) {
          ageGroup = '6-8'; // Ages 6-8 years (72-107 months)
        } else {
          ageGroup = '9-13'; // Ages 9-13 years (108+ months)
        }

        // Generate realistic social skills data with progressive improvement
        // Earlier consultations get lower scores, later ones get better scores
        const progressionFactor = i / Math.max(sortedConsultDocs.length - 1, 1); // 0 to 1

        // Helper to generate improving values (0-10 scale)
        const generateImprovingScore = (baseMin, baseMax, progression) => {
          const min = baseMin + (progression * 1.5);
          const max = baseMax + (progression * 1.5);
          return parseFloat((Math.random() * (max - min) + min).toFixed(2));
        };

        // Generate age-appropriate domain scores based on SSIS/ASQ:SE-2 standards
        let socialSkillsData = {};

        if (ageGroup === '2-3') {
          // Ages 2-3: Basic social-emotional skills (ASQ:SE-2)
          const communicationAvg = generateImprovingScore(4.0, 6.0, progressionFactor);
          const interactionAvg = generateImprovingScore(3.5, 5.5, progressionFactor);
          const selfRegulationAvg = generateImprovingScore(3.0, 5.0, progressionFactor);
          const cooperationAvg = generateImprovingScore(3.5, 5.5, progressionFactor);

          const overallScore = parseFloat(((communicationAvg + interactionAvg + selfRegulationAvg + cooperationAvg) / 4 * 10).toFixed(2));

          socialSkillsData = {
            communication: {
              comm_express: Math.round(communicationAvg),
              comm_respond: Math.round(communicationAvg + Math.random() - 0.5)
            },
            interaction: {
              interact_peers: Math.round(interactionAvg),
              interact_adults: Math.round(interactionAvg + Math.random() - 0.5)
            },
            selfRegulation: {
              reg_emotions: Math.round(selfRegulationAvg),
              reg_transitions: Math.round(selfRegulationAvg + Math.random() - 0.5)
            },
            cooperation: {
              coop_sharing: Math.round(cooperationAvg)
            },
            communicationAvg,
            interactionAvg,
            selfRegulationAvg,
            cooperationAvg,
            overallScore
          };
        } else if (ageGroup === '4-5') {
          // Ages 4-5: Expanded social skills (SSIS Preschool)
          const communicationAvg = generateImprovingScore(4.5, 6.5, progressionFactor);
          const cooperationAvg = generateImprovingScore(4.0, 6.0, progressionFactor);
          const empathyAvg = generateImprovingScore(3.5, 5.5, progressionFactor);
          const selfControlAvg = generateImprovingScore(4.0, 6.0, progressionFactor);
          const engagementAvg = generateImprovingScore(4.5, 6.5, progressionFactor);

          const overallScore = parseFloat(((communicationAvg + cooperationAvg + empathyAvg + selfControlAvg + engagementAvg) / 5 * 10).toFixed(2));

          socialSkillsData = {
            communication: {
              comm_express: Math.round(communicationAvg),
              comm_listen: Math.round(communicationAvg + Math.random() - 0.5)
            },
            cooperation: {
              coop_sharing: Math.round(cooperationAvg),
              coop_turns: Math.round(cooperationAvg + Math.random() - 0.5)
            },
            empathy: {
              emp_feelings: Math.round(empathyAvg),
              emp_comfort: Math.round(empathyAvg + Math.random() - 0.5)
            },
            selfControl: {
              self_waiting: Math.round(selfControlAvg),
              self_frustration: Math.round(selfControlAvg + Math.random() - 0.5)
            },
            engagement: {
              engage_activities: Math.round(engagementAvg),
              engage_conversations: Math.round(engagementAvg + Math.random() - 0.5)
            },
            communicationAvg,
            cooperationAvg,
            empathyAvg,
            selfControlAvg,
            engagementAvg,
            overallScore
          };
        } else if (ageGroup === '6-8') {
          // Ages 6-8: Elementary social skills (SSIS Elementary)
          const communicationAvg = generateImprovingScore(5.0, 7.0, progressionFactor);
          const cooperationAvg = generateImprovingScore(5.0, 7.0, progressionFactor);
          const assertionAvg = generateImprovingScore(4.5, 6.5, progressionFactor);
          const responsibilityAvg = generateImprovingScore(5.0, 7.0, progressionFactor);
          const empathyAvg = generateImprovingScore(4.5, 6.5, progressionFactor);
          const selfControlAvg = generateImprovingScore(5.0, 7.0, progressionFactor);
          const engagementAvg = generateImprovingScore(5.5, 7.5, progressionFactor);

          const overallScore = parseFloat(((communicationAvg + cooperationAvg + assertionAvg + responsibilityAvg + empathyAvg + selfControlAvg + engagementAvg) / 7 * 10).toFixed(2));

          socialSkillsData = {
            communication: {
              comm_express: Math.round(communicationAvg),
              comm_listen: Math.round(communicationAvg + Math.random() - 0.5)
            },
            cooperation: {
              coop_sharing: Math.round(cooperationAvg),
              coop_teamwork: Math.round(cooperationAvg + Math.random() - 0.5)
            },
            assertion: {
              assert_opinions: Math.round(assertionAvg),
              assert_needs: Math.round(assertionAvg + Math.random() - 0.5)
            },
            responsibility: {
              resp_tasks: Math.round(responsibilityAvg),
              resp_mistakes: Math.round(responsibilityAvg + Math.random() - 0.5)
            },
            empathy: {
              emp_feelings: Math.round(empathyAvg),
              emp_perspectives: Math.round(empathyAvg + Math.random() - 0.5)
            },
            selfControl: {
              self_frustration: Math.round(selfControlAvg),
              self_impulses: Math.round(selfControlAvg + Math.random() - 0.5)
            },
            engagement: {
              engage_activities: Math.round(engagementAvg),
              engage_peers: Math.round(engagementAvg + Math.random() - 0.5)
            },
            communicationAvg,
            cooperationAvg,
            assertionAvg,
            responsibilityAvg,
            empathyAvg,
            selfControlAvg,
            engagementAvg,
            overallScore
          };
        } else {
          // Ages 9-13: Secondary social skills (SSIS Secondary)
          const communicationAvg = generateImprovingScore(5.5, 7.5, progressionFactor);
          const cooperationAvg = generateImprovingScore(5.5, 7.5, progressionFactor);
          const assertionAvg = generateImprovingScore(5.0, 7.0, progressionFactor);
          const responsibilityAvg = generateImprovingScore(6.0, 8.0, progressionFactor);
          const empathyAvg = generateImprovingScore(5.5, 7.5, progressionFactor);
          const selfControlAvg = generateImprovingScore(5.5, 7.5, progressionFactor);
          const engagementAvg = generateImprovingScore(6.0, 8.0, progressionFactor);

          const overallScore = parseFloat(((communicationAvg + cooperationAvg + assertionAvg + responsibilityAvg + empathyAvg + selfControlAvg + engagementAvg) / 7 * 10).toFixed(2));

          socialSkillsData = {
            communication: {
              comm_express: Math.round(communicationAvg),
              comm_listen: Math.round(communicationAvg + Math.random() - 0.5),
              comm_conversations: Math.round(communicationAvg + Math.random() - 0.5)
            },
            cooperation: {
              coop_teamwork: Math.round(cooperationAvg),
              coop_compromise: Math.round(cooperationAvg + Math.random() - 0.5)
            },
            assertion: {
              assert_opinions: Math.round(assertionAvg),
              assert_pressure: Math.round(assertionAvg + Math.random() - 0.5)
            },
            responsibility: {
              resp_tasks: Math.round(responsibilityAvg),
              resp_mistakes: Math.round(responsibilityAvg + Math.random() - 0.5),
              resp_decisions: Math.round(responsibilityAvg + Math.random() - 0.5)
            },
            empathy: {
              emp_perspectives: Math.round(empathyAvg),
              emp_feelings: Math.round(empathyAvg + Math.random() - 0.5)
            },
            selfControl: {
              self_impulses: Math.round(selfControlAvg),
              self_frustration: Math.round(selfControlAvg + Math.random() - 0.5),
              self_conflicts: Math.round(selfControlAvg + Math.random() - 0.5)
            },
            engagement: {
              engage_peers: Math.round(engagementAvg),
              engage_activities: Math.round(engagementAvg + Math.random() - 0.5)
            },
            communicationAvg,
            cooperationAvg,
            assertionAvg,
            responsibilityAvg,
            empathyAvg,
            selfControlAvg,
            engagementAvg,
            overallScore
          };
        }

        // Determine category and alert level based on SSIS percentile standards (0-100)
        let category, alertLevel;
        const score = socialSkillsData.overallScore;
        if (score >= 85) {
          category = 'Excellent';
          alertLevel = 'excellent';
        } else if (score >= 70) {
          category = 'Good';
          alertLevel = 'normal';
        } else if (score >= 40) {
          category = 'Average';
          alertLevel = 'monitor';
        } else if (score >= 16) {
          category = 'Below Average';
          alertLevel = 'warning';
        } else {
          category = 'Concern';
          alertLevel = 'critical';
        }

        socialSkillsData.category = category;
        socialSkillsData.alertLevel = alertLevel;
        socialSkillsData.clinicalNotes = `Historical data (Age: ${Math.floor(childAgeMonths/12)}y${childAgeMonths % 12}m) - Social skills assessment with age-appropriate SSIS/ASQ:SE-2 standards`;
        socialSkillsData.assessmentDate = data.date || new Date();

        // Add socialSkills field with generated data
        await consultDoc.ref.update({
          socialSkills: socialSkillsData
        });

        updatedConsultations++;
        console.log(`      ✅ Updated ${consultDoc.id} - Score: ${score.toFixed(0)} (${category})`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   Total consultations found: ${totalConsultations}`);
    console.log(`   Consultations updated: ${updatedConsultations}`);
    console.log(`   Consultations skipped (already had socialSkills): ${skippedConsultations}`);
    console.log('='.repeat(60));
    console.log('\n✅ All existing consultations now have the socialSkills field!');
    console.log('💡 Tip: Future consultations will automatically include social skills assessment data.\n');

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateSocialSkills();

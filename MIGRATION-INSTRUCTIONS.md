# ChildConsultant Migration Instructions

This guide will help you add health assessment fields to all existing consultations in your Firebase database.

## Available Migrations

1. **Motor Skills Assessment** - Adds comprehensive motor development data
2. **Nutritional Health Assessment** - Adds dietary and nutritional data
3. **Cognitive Development Index (CDI)** - Adds cognitive assessment data (NEW!)

## Prerequisites

You need a Firebase service account key file. Follow these steps to get it:

### Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **child-consultant**
3. Click the gear icon ⚙️ (Settings) → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. A file named something like `child-consultant-xxxxx-firebase-adminsdk-xxxxx.json` will download
7. **Rename it to:** `serviceAccountKey.json`
8. **Move it to:** `/Users/prajwalwaingankar/ChildConsultant/serviceAccountKey.json`

⚠️ **IMPORTANT:** This file contains sensitive credentials. Never commit it to git!

### Step 2: Install Dependencies

Open Terminal and run:

```bash
cd /Users/prajwalwaingankar/ChildConsultant
npm install
```

### Step 3: Run Migrations

Run all migrations in sequence:

```bash
# Run Motor Skills migration
npm run migrate:motor-skills

# Run Nutritional Health migration
npm run migrate:nutritional-health

# Run Cognitive Development migration
npm run migrate:cognitive-development
```

Or run them directly:

```bash
node migrate-motor-skills.js
node migrate-nutritional-health.js
node migrate-cognitive-development.js
```

## What These Migrations Do

### Motor Skills Migration
✅ Adds comprehensive motor development data (gross motor, fine motor, balance, strength)
✅ Generates age-appropriate realistic scores with progressive improvement over time
✅ Follows WHO/CDC/MABC-2 standards

### Nutritional Health Migration
✅ Adds dietary assessment data (energy, appetite, meal patterns, food groups)
✅ Uses age-based WHO/AAP/USDA nutritional guidelines
✅ Includes hydration and supplement data

### Cognitive Development Migration (NEW!)
✅ Adds Cognitive Development Index (CDI) scores across 5 domains:
  - Attention & Focus
  - Memory
  - Problem-Solving
  - Language & Communication
  - Learning Readiness
✅ Uses Bayley-4, WPPSI-IV, WISC-V, DAS-II clinical standards
✅ Scores on 0-130 scale (Mean=100, SD=15)
✅ Generates age-appropriate cognitive data with progressive improvement

## After Migrations

- All historical consultations will have realistic assessment data
- New consultations will capture actual assessment inputs from doctors
- Dashboard charts will display complete historical trends
- All assessments follow clinical standards and age-appropriate expectations

## Safety

- ✅ Non-destructive: Only adds a field, doesn't modify existing data
- ✅ Idempotent: Safe to run multiple times
- ✅ Read-only service account recommended
- ✅ Batch operations for performance

## Cleanup (After All Migrations)

Once all migrations are complete, you can safely delete:
- `migrate-motor-skills.js`
- `migrate-nutritional-health.js`
- `migrate-cognitive-development.js`
- `serviceAccountKey.json` (⚠️ CRITICAL for security - delete this file!)
- This file (`MIGRATION-INSTRUCTIONS.md`)
- `package.json` (if not using other npm scripts)

---

Need help? Check the console output for detailed error messages.

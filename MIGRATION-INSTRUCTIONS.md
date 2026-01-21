# Motor Skills Migration Instructions

This guide will help you add the `motorSkills` field to all existing consultations in your Firebase database.

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

### Step 3: Run Migration

```bash
npm run migrate:motor-skills
```

Or directly:

```bash
node migrate-motor-skills.js
```

## What This Migration Does

✅ Scans all patients → children → consultations in your database
✅ Adds `motorSkills: null` to consultations that don't have it
✅ Skips consultations that already have the field
✅ Shows detailed progress logs
✅ Provides statistics at the end

## After Migration

- Old consultations will have `motorSkills: null` (no assessment done)
- New consultations will have full motor skills assessment data
- The dashboard will properly show motor skills data when available
- The history chart will work correctly for all consultations

## Safety

- ✅ Non-destructive: Only adds a field, doesn't modify existing data
- ✅ Idempotent: Safe to run multiple times
- ✅ Read-only service account recommended
- ✅ Batch operations for performance

## Cleanup (After Migration)

Once migration is complete, you can safely delete:
- `migrate-motor-skills.js`
- `serviceAccountKey.json` (IMPORTANT for security!)
- This file (`MIGRATION-INSTRUCTIONS.md`)
- Keep `package.json` only if you plan to run other scripts

---

Need help? Check the console output for detailed error messages.

#!/usr/bin/env node
/**
 * One-off: write siteConfig/assistant (geminiApiKey, model) via Firestore REST + OAuth.
 * Uses Firebase CLI refresh token (~/.config/firebase/*.json), not service accounts.
 *
 *   GEMINI_API_KEY="..." node scripts/seed-assistant-firestore.mjs
 *
 * Optional: GEMINI_MODEL (default gemini-flash-latest), FIREBASE_CLI_CREDENTIALS (path to json).
 */
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'child-consultant';
const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
const model = (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();

if (!geminiKey) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

function resolveFirebaseCliCredentialsPath() {
  if (process.env.FIREBASE_CLI_CREDENTIALS) return process.env.FIREBASE_CLI_CREDENTIALS;
  const dir = path.join(process.env.HOME || '', '.config/firebase');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('_application_default_credentials.json'));
  if (files.length === 0) return null;
  files.sort();
  return path.join(dir, files[0]);
}

const credPath = resolveFirebaseCliCredentialsPath();
if (!credPath || !fs.existsSync(credPath)) {
  console.error('No Firebase CLI credentials. Run `firebase login` or set FIREBASE_CLI_CREDENTIALS.');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(credPath, 'utf8'));

const params = new URLSearchParams({
  client_id: raw.client_id,
  client_secret: raw.client_secret,
  refresh_token: raw.refresh_token,
  grant_type: 'refresh_token',
});

const tokRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: params,
});
const tokJson = await tokRes.json();
if (!tokRes.ok) {
  console.error('Token refresh failed:', tokJson);
  process.exit(1);
}
const accessToken = tokJson.access_token;

const fieldsBody = {
  fields: {
    geminiApiKey: { stringValue: geminiKey },
    model: { stringValue: model },
  },
};

const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/siteConfig?documentId=assistant`;
let res = await fetch(createUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(fieldsBody),
});

if (res.status === 409) {
  const patchUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/siteConfig/assistant?updateMask.fieldPaths=geminiApiKey&updateMask.fieldPaths=model`;
  res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fieldsBody),
  });
}

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

console.log('OK: siteConfig/assistant saved.');

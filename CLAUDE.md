# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChildConsultant (branded as "Aqiraa") is a pediatric consultation management web application built with Firebase. The system enables doctors to manage patient consultations, track child health records, and share prescriptions with parents via WhatsApp and PDF.

**Live URL:** https://child-consultant.web.app

## Tech Stack

- **Frontend:** HTML, CSS (Bootstrap), vanilla JavaScript
- **Backend:** Firebase (Firestore, Authentication, Storage, Hosting)
- **APIs:** EmailJS (for contact form), WhatsApp integration for prescription sharing
- **Charts:** Chart.js for dashboard analytics

## Firebase Commands

```bash
# Deploy to Firebase Hosting
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# Start local emulator
firebase emulators:start

# View logs
firebase functions:log
```

## Code Architecture

### Authentication & Authorization

The application uses Firebase Authentication with three user roles stored in Firestore:
- **parent**: Default role for new users, can view their children's records
- **doctor**: Can create consultations, register children, view all parent records
- **admin**: Full access including dashboard analytics

Authentication flow:
1. Users sign in via `login.html` using Email/Password or Google OAuth (FirebaseUI)
2. On first login, a user document is created in `users` collection with role `parent`
3. Role-based redirects happen in `index.html` based on `users/{uid}.role` field
4. Protected pages check user role via `auth.onAuthStateChanged()` before rendering

### Firestore Data Structure

```
users/{uid}
  - uid: string
  - email: string
  - displayName: string
  - photoURL: string
  - role: "parent" | "doctor" | "admin"
  - name: string (full name)
  - mobile: string
  - createdAt: timestamp
  - lastLogin: timestamp

patients/{parentKey}/children/{childId}
  - name: string
  - age: number
  - gender: string
  - weight: number
  - dateOfBirth: date
  - registrationDate: timestamp

patients/{parentKey}/children/{childId}/consultations/{consultationId}
  - consultationId: string (format: YYYYMMDD_HHMMSS)
  - consultationDate: timestamp
  - chiefComplaints: string
  - diagnosis: string
  - prescribedMedication: string
  - advice: string
  - nextVisitDate: date
  - doctorId: string
  - previousVisitId: string (links to prior consultation)

inquiries/{inquiryId}
  - name: string
  - email: string
  - mobile: string
  - reason: string
  - timestamp: timestamp
```

**Important:** The `parentKey` format is `{parentNameSlug}_{parentId}` (e.g., `akshyata-tamse_abc123`). This ensures human-readable yet unique parent identifiers in the database.

### Page Structure

#### Public Pages
- `index.html`: Landing page with services overview, contact form, authentication-aware navigation
- `login.html`: Combined sign-in/sign-up page with email/password and Google OAuth
- `blog-default.html`, `blog-single.html`: Blog templates (static content)

#### Parent Portal (`/parent/`)
- `update_profile.html`: User profile management with photo upload, mobile number with OTP verification via EmailJS

#### Doctor Portal (`/doctor/`)
- `doctor_portal.html`: Lists all parent users, entry point for consultations
- `child_selection.html`: Displays children for selected parent, shows consultation history (past/upcoming), allows starting new consultation
- `register_child.html`: Form to register new child under a parent account
- `patient_consultation.html`: Comprehensive consultation form with auto-generated consultation IDs, links to previous visits
- `view_consultations.html`: Full consultation details view with WhatsApp/PDF prescription sharing

#### Admin Dashboard (`/dashboard/`)
- `dashboard.html` + `dashboard.js`: Analytics dashboard showing inquiry submissions with Chart.js visualizations (inquiries by reason, timeline)

### Key Workflows

#### Doctor Consultation Flow
1. Doctor logs in → Redirected to `doctor_portal.html`
2. Selects parent from table → Navigates to `child_selection.html?parentId={uid}`
3. Views existing children and consultation history
4. Clicks "New Consultation" → Goes to `patient_consultation.html?parentId={uid}&patientId={childId}`
5. Fills consultation form → Saves to Firestore under `patients/{parentKey}/children/{childId}/consultations/`
6. Consultation automatically links to previous visit via `previousVisitId`
7. Can share prescription via WhatsApp or view/download as PDF

#### Parent Registration & Profile
1. New user signs up → Auto-assigned `role: parent` in `users` collection
2. Parent can update profile, upload photo (stored in Firebase Storage at `profile_pictures/{uid}/profile.jpg`)
3. Mobile number requires OTP verification via EmailJS before being saved

#### Child Registration
1. Doctor navigates to `register_child.html?parentId={uid}`
2. Enters child details (name, DOB, weight, gender)
3. Child saved to `patients/{parentKey}/children/` subcollection

### Navigation & UI

- All pages use **Animsition.js** for page transitions
- Navigation is dynamically generated based on auth state:
  - Logged out: Shows "Sign In" link
  - Logged in as parent: Shows "Dashboard" link
  - Logged in as doctor: Shows "Doctor Portal" link
  - Logged in as admin: Shows "Dashboard" link
- Profile dropdown menu in header (only visible when logged in) with "Update Profile" and "Logout"

### Firebase Configuration

**Location:** Hardcoded in each HTML file (consider centralizing)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCyLCI_GOl9SWDLo2zhjMthLQFZ5sA3ddM",
  authDomain: "child-consultant.firebaseapp.com",
  projectId: "child-consultant",
  storageBucket: "child-consultant.appspot.com",
  messagingSenderId: "985386588549",
  appId: "1:985386588549:web:311ecd89cc7f6aa141ccec"
};
```

### Security Rules

**Firestore:** Currently set to open access until November 5, 2025 (see `firestore.rules`). **This is a security risk for production.**

**Storage:** Profile pictures at `profile_pictures/{userId}/` are only writable by the authenticated user with matching UID.

## Common Development Tasks

### Testing Role-Based Access
- To test doctor/admin features, manually update `users/{uid}.role` in Firestore Console
- Default new users get `role: parent` automatically

### Adding New Collections
- Follow the hierarchical structure: `patients/{parentKey}/children/{childId}/...`
- Always use the `createParentKey()` function for generating `parentKey` from parent name and ID

### Debugging Authentication Issues
- Check browser console for Firebase auth errors
- Verify `users/{uid}` document exists with correct `role` field
- Ensure `onAuthStateChanged` completes before page rendering

### Working with Timestamps
- Use `firebase.firestore.FieldValue.serverTimestamp()` for consistency
- Dashboard has a helper `parseDate()` function for handling both Firestore timestamps and readable date strings

## Code Patterns

### Fetching User Role
```javascript
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = '../login.html';
    return;
  }

  db.collection('users').doc(user.uid).get()
    .then(doc => {
      const role = doc.data()?.role;
      if (role !== 'doctor' && role !== 'admin') {
        alert('Access Denied');
        window.location.href = '../index.html';
      }
    });
});
```

### Generating Consultation ID
```javascript
const now = new Date();
const consultationId = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
```

### Parent Key Generation
```javascript
function slugifyName(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function createParentKey(parentName, parentId) {
  const nameSlug = slugifyName(parentName || 'unknown-parent');
  return `${nameSlug}_${parentId}`;
}
```

## Known Issues & Technical Debt

1. **Firebase config duplication**: Config is repeated in every HTML file instead of being centralized
2. **Security rules**: Firestore rules are open until expiry date - need proper role-based rules
3. **No package.json**: Project uses CDN links for all dependencies
4. **Mixed Firebase SDK versions**: Some pages use v8, dashboard uses v11 modular SDK
5. **No build process**: Vanilla JS, no bundling or transpilation
6. **Inline scripts**: Most JavaScript is embedded in HTML rather than separate files

## Recent Changes (Git History)

- Linking of each visit to its previous visit via `previousVisitId`
- "Start" button added in upcoming consultations section
- WhatsApp prescription sharing to parent mobile number
- OTP verification email connection for mobile number updates
- Mobile number save functionality in update profile
- PDF and WhatsApp prescription sharing integration

// Script to populate doctors collection in Firestore
// Run this once to migrate hardcoded doctor data to Firestore

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCyLCI_GOl9SWDLo2zhjMthLQFZ5sA3ddM",
  authDomain: "child-consultant.firebaseapp.com",
  projectId: "child-consultant",
  storageBucket: "child-consultant.appspot.com",
  messagingSenderId: "985386588549",
  appId: "1:985386588549:web:311ecd89cc7f6aa141ccec"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Doctor data to populate
const DOCTORS = [
  {
    id: 'dr-pratima-shinde',
    name: 'Dr. Pratima Shinde',
    title: 'Pediatrician',
    experience: '9 Years',
    experienceYears: 9,
    qualification: 'MBBS, DNB Pediatrics',
    rating: 4.9,
    totalRatings: 342,
    sessionPrice: 999,
    status: 'Online',
    image: 'https://xsgames.co/randomusers/assets/avatars/female/74.jpg',
    calendlyUrl: 'https://calendly.com/aqiraa-care/dr-pratima-shinde',
    about: 'Experienced pediatrician with 9 years of expertise in pediatric care, PICU & NICU management. Running independent pediatric clinic since 2018 with over 5000 teleconsultations provided to rural areas. Certified lactation professional specializing in comprehensive child healthcare.',
    expertise: [
      'General Pediatrics',
      'PICU & NICU Care',
      'Newborn & Infant Care',
      'Lactation Counseling',
      'Pediatric Teleconsultation',
      'Child Growth Monitoring'
    ],
    languages: ['English', 'Hindi', 'Marathi'],
    ratingBreakdown: {
      5: 93,
      4: 5,
      3: 1,
      2: 0,
      1: 1
    },
    isTopRated: true,
    displayOrder: 1,
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'dr-ishani-deshmukh',
    name: 'Dr. Ishani Deshmukh',
    title: 'Child Nutritionist',
    experience: '6 Years',
    experienceYears: 6,
    qualification: 'M.Sc Nutrition, RD',
    rating: 4.8,
    totalRatings: 210,
    sessionPrice: 900,
    status: 'Online',
    image: 'https://xsgames.co/randomusers/assets/avatars/female/67.jpg',
    calendlyUrl: 'https://calendly.com/aqiraa-care/dr-ishani-deshmukh',
    about: 'Registered dietitian and child nutritionist specializing in pediatric nutrition, growth monitoring, and customized meal planning for children with specific dietary needs.',
    expertise: [
      'Pediatric Nutrition',
      'Growth & Development',
      'Picky Eaters Solutions',
      'Food Allergies Management',
      'Weight Management'
    ],
    languages: ['English', 'Hindi', 'Telugu'],
    ratingBreakdown: {
      5: 88,
      4: 10,
      3: 1,
      2: 0,
      1: 1
    },
    isTopRated: true,
    displayOrder: 2,
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'dr-tanvi-malhotra',
    name: 'Dr. Tanvi Malhotra',
    title: 'Pediatrician',
    experience: '12 Years',
    experienceYears: 12,
    qualification: 'MBBS, MD Pediatrics',
    rating: 4.9,
    totalRatings: 340,
    sessionPrice: 1000,
    status: 'Online',
    image: 'https://xsgames.co/randomusers/assets/avatars/female/71.jpg',
    calendlyUrl: 'https://calendly.com/aqiraa-care/dr-tanvi-malhotra',
    about: 'Senior pediatrician with 12 years of experience in child healthcare, preventive medicine, vaccination, and management of common childhood illnesses.',
    expertise: [
      'General Pediatrics',
      'Vaccination & Immunization',
      'Newborn Care',
      'Growth Monitoring',
      'Infectious Diseases'
    ],
    languages: ['English', 'Hindi', 'Gujarati'],
    ratingBreakdown: {
      5: 94,
      4: 4,
      3: 1,
      2: 0,
      1: 1
    },
    isTopRated: false,
    displayOrder: 3,
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  },
  {
    id: 'dr-nandini-iyer',
    name: 'Dr. Nandini Iyer',
    title: 'Pediatrician',
    experience: '10 Years',
    experienceYears: 10,
    qualification: 'MBBS, DNB Pediatrics',
    rating: 4.7,
    totalRatings: 265,
    sessionPrice: 950,
    status: 'Online',
    image: 'https://xsgames.co/randomusers/assets/avatars/female/65.jpg',
    calendlyUrl: 'https://calendly.com/aqiraa-care/dr-nandini-iyer',
    about: 'Experienced pediatrician specializing in developmental pediatrics, chronic disease management, and comprehensive child healthcare with a compassionate approach.',
    expertise: [
      'Developmental Pediatrics',
      'Chronic Disease Management',
      'Allergy & Asthma',
      'Well-Child Checkups',
      'Nutrition Counseling'
    ],
    languages: ['English', 'Hindi', 'Punjabi'],
    ratingBreakdown: {
      5: 82,
      4: 14,
      3: 2,
      2: 1,
      1: 1
    },
    isTopRated: false,
    displayOrder: 4,
    active: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }
];

// Function to populate doctors
async function populateDoctors() {
  console.log('Starting to populate doctors collection...');

  try {
    for (const doctor of DOCTORS) {
      await db.collection('doctors').doc(doctor.id).set(doctor);
      console.log(`✓ Added ${doctor.name} (${doctor.id})`);
    }

    console.log('\n✓ Successfully populated all doctors!');
    console.log('You can now delete this file or comment out the population code.');
  } catch (error) {
    console.error('Error populating doctors:', error);
  }
}

// Uncomment the line below to run the population
// populateDoctors();

console.log('Doctor population script loaded.');
console.log('To populate doctors, uncomment the last line and reload the page.');
console.log('IMPORTANT: Run this only once, then comment it out again!');

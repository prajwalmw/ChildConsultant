// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  calculateWeightPercentile,
  calculateHeightPercentile,
  calculateHeadCircumferencePercentile,
  calculateAgeInMonths
} from "../js/who-standards.js";

// Import WHO LMS data tables for reference curves
// We'll need to export these from who-standards.js or redefine them here
// For now, let's redefine the key tables we need

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

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCyLCI_GOl9SWDLo2zhjMthLQFZ5sA3ddM",
  authDomain: "child-consultant.firebaseapp.com",
  projectId: "child-consultant",
  storageBucket: "child-consultant.appspot.com",
  messagingSenderId: "985386588549",
  appId: "1:985386588549:web:311ecd89cc7f6aa141ccec"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Fetch all inquiry data
async function fetchSubmissions() {
  const submissionsCol = collection(db, "inquiries");
  const snapshot = await getDocs(submissionsCol);
  return snapshot.docs.map(doc => doc.data());
}

// Fetch all consultation data for growth tracking
async function fetchAllConsultations() {
  const consultations = [];

  try {
    // Get all patients
    const patientsSnapshot = await getDocs(collection(db, "patients"));

    for (const patientDoc of patientsSnapshot.docs) {
      const parentKey = patientDoc.id;

      // Get all children for this parent
      const childrenSnapshot = await getDocs(collection(db, "patients", parentKey, "children"));

      for (const childDoc of childrenSnapshot.docs) {
        const childData = childDoc.data();
        const childId = childDoc.id;

        // Get all consultations for this child
        const consultationsSnapshot = await getDocs(
          collection(db, "patients", parentKey, "children", childId, "consultations")
        );

        consultationsSnapshot.docs.forEach(consultDoc => {
          const consultData = consultDoc.data();
          consultations.push({
            childId: childId,
            childName: childData.name,
            dateOfBirth: childData.dob || childData.dateOfBirth, // Support both field names
            gender: childData.gender,
            consultationDate: consultData.date,
            weight: consultData.weight,
            height: consultData.height,
            headCircumference: consultData.headCircumference,
            parentKey: parentKey
          });
        });
      }
    }

    return consultations;
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return [];
  }
}

// Helper: safely parse Firestore timestamp or readable string
function parseDate(timestamp) {
  if (!timestamp) return null;

  // Case 1: Firestore Timestamp object
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }

  // Case 2: Readable Firestore export format like "October 8, 2025 at 10:03:48 PM UTC+5:30"
  if (typeof timestamp === "string" && timestamp.includes("at")) {
    const datePart = timestamp.split(" at ")[0];
    const timePart = timestamp.split(" at ")[1]?.split(" ")[0] || "";
    const dateObj = new Date(`${datePart} ${timePart}`);
    if (!isNaN(dateObj)) return dateObj;
  }

  // Case 3: Direct Date string (ISO or browser format)
  const parsed = new Date(timestamp);
  return isNaN(parsed) ? null : parsed;
}

// Chart 1: Reason-wise bar chart
function drawReasonChart(submissions) {
  const reasonCounts = {};
  submissions.forEach(sub => {
    const reason = sub.reason || "Unknown";
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  const ctx = document.getElementById("reasonChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(reasonCounts),
      datasets: [{
        label: "Number of Inquiries by Reason",
        data: Object.values(reasonCounts),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }]
    },
   options: {
  responsive: true,
  interaction: {
    mode: 'index',     // show tooltip for all datasets on same index
    intersect: false   // allow hover even when not exactly on a point
  },
  plugins: {
    tooltip: {
      enabled: true,
      mode: 'nearest',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      titleFont: { weight: 'bold' },
      padding: 10
    },
    legend: {
      labels: { font: { size: 13 } }
    }
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: "Inquiries Count" } },
    x: { title: { display: true, text: "Date" } }
  }
}

  });
}

// Chart 2: Inquiries per day (date-wise)
function drawTimeChart(submissions) {
  const timeCounts = {};

  submissions.forEach(sub => {
    const dateObj = parseDate(sub.timestamp);
    if (dateObj) {
      // Get date in user's local timezone (e.g., India UTC+5:30)
      const localDate = dateObj.toLocaleDateString("en-CA"); 
      // "en-CA" gives YYYY-MM-DD format in local time (e.g., 2025-10-09)
      timeCounts[localDate] = (timeCounts[localDate] || 0) + 1;
    }
  });

  const sortedDates = Object.keys(timeCounts).sort();
  const counts = sortedDates.map(date => timeCounts[date]);

  const ctx = document.getElementById('timeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Inquiries per Day',
        data: counts,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => {
              const date = new Date(items[0].label);
              return date.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric"
              });
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff'
        }
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { beginAtZero: true, title: { display: true, text: 'Inquiries Count' } }
      }
    }
  });
}

// Chart 3: Child Growth Percentile Chart
function drawGrowthPercentileChart(consultations) {
  if (consultations.length === 0) {
    console.warn('No consultation data available for growth chart');
    return;
  }

  // Group consultations by child
  const childrenData = {};

  consultations.forEach(consult => {
    if (!childrenData[consult.childId]) {
      childrenData[consult.childId] = {
        name: consult.childName,
        gender: consult.gender,
        dateOfBirth: consult.dateOfBirth,
        consultations: []
      };
    }
    childrenData[consult.childId].consultations.push(consult);
  });

  // Prepare datasets for the chart
  const datasets = [];
  const colorPalette = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(199, 199, 199, 1)',
    'rgba(83, 102, 255, 1)'
  ];

  let colorIndex = 0;

  Object.keys(childrenData).forEach(childId => {
    const child = childrenData[childId];

    // Sort consultations by date
    child.consultations.sort((a, b) => {
      const dateA = parseDate(a.consultationDate);
      const dateB = parseDate(b.consultationDate);
      return dateA - dateB;
    });

    // Calculate percentiles for each consultation using WHO standards
    const dataPoints = child.consultations.map(consult => {
      // Convert Firestore dates to Date objects
      const dobDate = parseDate(child.dateOfBirth);
      const consultDate = parseDate(consult.consultationDate);

      const ageMonths = calculateAgeInMonths(dobDate, consultDate);
      const weightPercentile = calculateWeightPercentile(ageMonths, consult.weight, child.gender);
      const heightPercentile = calculateHeightPercentile(ageMonths, consult.height, child.gender);
      const hcPercentile = calculateHeadCircumferencePercentile(ageMonths, consult.headCircumference, child.gender);

      return {
        x: ageMonths,
        weightP: weightPercentile,
        heightP: heightPercentile,
        hcP: hcPercentile
      };
    }).filter(dp => dp.x !== null);

    if (dataPoints.length === 0) return;

    const color = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;

    // Create datasets for weight, height, and head circumference percentiles
    if (dataPoints.some(dp => dp.weightP !== null)) {
      datasets.push({
        label: `${child.name} - Weight %ile`,
        data: dataPoints.map(dp => ({ x: dp.x, y: dp.weightP })).filter(d => d.y !== null),
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }

    if (dataPoints.some(dp => dp.heightP !== null)) {
      datasets.push({
        label: `${child.name} - Height %ile`,
        data: dataPoints.map(dp => ({ x: dp.x, y: dp.heightP })).filter(d => d.y !== null),
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderDash: [5, 5],
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }

    if (dataPoints.some(dp => dp.hcP !== null)) {
      datasets.push({
        label: `${child.name} - Head Circumference %ile`,
        data: dataPoints.map(dp => ({ x: dp.x, y: dp.hcP })).filter(d => d.y !== null),
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderDash: [2, 2],
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }
  });

  if (datasets.length === 0) {
    console.warn('No valid growth data to display');
    return;
  }

  const ctx = document.getElementById('growthChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Child Growth Percentiles Over Time',
          font: { size: 16, weight: 'bold' }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => `Age: ${items[0].parsed.x} months`,
            label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}th percentile`
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff'
        },
        legend: {
          display: true,
          position: 'top',
          labels: { font: { size: 11 } }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Age (months)' },
          ticks: { stepSize: 3 }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Percentile' },
          ticks: {
            callback: function(value) {
              return value + 'th';
            }
          }
        }
      }
    }
  });
}

// Generate WHO reference percentile curve data
function generateWHOCurve(dataTable, percentile) {
  const data = [];

  dataTable.forEach(point => {
    const { L, M, S } = point;
    let measurement;

    // Convert percentile to z-score
    // Approximate z-score from percentile
    const zScores = {
      3: -1.88,
      15: -1.04,
      50: 0,
      85: 1.04,
      97: 1.88
    };

    const zScore = zScores[percentile];

    // Calculate measurement from z-score using inverse LMS
    // X = M * (1 + L * S * Z)^(1/L)
    if (L === 0) {
      measurement = M * Math.exp(S * zScore);
    } else {
      measurement = M * Math.pow(1 + L * S * zScore, 1 / L);
    }

    data.push({ x: point.month, y: measurement });
  });

  return data;
}

// Chart 4: Weight-for-Age with Reference Bands
function drawWeightForAgeChart(consultations) {
  if (consultations.length === 0) {
    console.warn('No consultation data available for weight-for-age chart');
    return;
  }

  // Group consultations by child
  const childrenData = {};

  consultations.forEach(consult => {
    if (!childrenData[consult.childId]) {
      childrenData[consult.childId] = {
        name: consult.childName,
        gender: consult.gender,
        dateOfBirth: consult.dateOfBirth,
        consultations: []
      };
    }
    childrenData[consult.childId].consultations.push(consult);
  });

  // Prepare datasets
  const datasets = [];

  // Generate WHO reference curves for both genders (using mixed approach)
  const percentiles = [3, 15, 50, 85, 97];
  const referenceColors = {
    3: 'rgba(255, 99, 132, 0.15)',
    15: 'rgba(255, 159, 64, 0.15)',
    50: 'rgba(75, 192, 192, 0.3)',
    85: 'rgba(54, 162, 235, 0.15)',
    97: 'rgba(153, 102, 255, 0.15)'
  };

  const referenceBorders = {
    3: 'rgba(255, 99, 132, 0.5)',
    15: 'rgba(255, 159, 64, 0.5)',
    50: 'rgba(75, 192, 192, 1)',
    85: 'rgba(54, 162, 235, 0.5)',
    97: 'rgba(153, 102, 255, 0.5)'
  };

  // Add WHO reference curves (using boys data as baseline, can be made gender-specific)
  percentiles.forEach(p => {
    const boyCurve = generateWHOCurve(WHO_WEIGHT_AGE_BOYS, p);
    datasets.push({
      label: `WHO ${p}th percentile (Boys)`,
      data: boyCurve,
      borderColor: referenceBorders[p],
      backgroundColor: referenceColors[p],
      borderWidth: p === 50 ? 2 : 1,
      borderDash: p === 50 ? [] : [5, 5],
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.4
    });
  });

  // Add actual child weight measurements
  const colorPalette = [
    'rgba(255, 0, 0, 1)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 128, 0, 1)',
    'rgba(255, 165, 0, 1)',
    'rgba(128, 0, 128, 1)'
  ];

  let colorIndex = 0;

  Object.keys(childrenData).forEach(childId => {
    const child = childrenData[childId];

    // Sort consultations by date
    child.consultations.sort((a, b) => {
      const dateA = parseDate(a.consultationDate);
      const dateB = parseDate(b.consultationDate);
      return dateA - dateB;
    });

    // Get weight measurements with age
    const weightData = child.consultations.map(consult => {
      const dobDate = parseDate(child.dateOfBirth);
      const consultDate = parseDate(consult.consultationDate);
      const ageMonths = calculateAgeInMonths(dobDate, consultDate);

      return {
        x: ageMonths,
        y: consult.weight
      };
    }).filter(d => d.y && d.y > 0);

    if (weightData.length === 0) return;

    const color = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;

    datasets.push({
      label: `${child.name} (${child.gender})`,
      data: weightData,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 3,
      fill: false,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.3,
      pointStyle: 'circle'
    });
  });

  if (datasets.length === 0) {
    console.warn('No valid weight data to display');
    return;
  }

  const ctx = document.getElementById('weightForAgeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Weight-for-Age Growth Chart (WHO Standards)',
          font: { size: 16, weight: 'bold' }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => `Age: ${items[0].parsed.x.toFixed(1)} months`,
            label: (context) => {
              if (context.dataset.label.includes('WHO')) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kg`;
              }
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kg`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff'
        },
        legend: {
          display: true,
          position: 'top',
          labels: { font: { size: 10 } }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Age (months)' },
          min: 0,
          max: 60,
          ticks: { stepSize: 6 }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Weight (kg)' },
          ticks: {
            callback: function(value) {
              return value + ' kg';
            }
          }
        }
      }
    }
  });
}

// Chart 5: Height-for-Age Chart
function drawHeightForAgeChart(consultations) {
  if (consultations.length === 0) {
    console.warn('No consultation data available for height-for-age chart');
    return;
  }

  // Group consultations by child
  const childrenData = {};

  consultations.forEach(consult => {
    if (!childrenData[consult.childId]) {
      childrenData[consult.childId] = {
        name: consult.childName,
        gender: consult.gender,
        dateOfBirth: consult.dateOfBirth,
        consultations: []
      };
    }
    childrenData[consult.childId].consultations.push(consult);
  });

  // Prepare datasets
  const datasets = [];

  // Generate WHO reference curves
  const percentiles = [3, 15, 50, 85, 97];
  const referenceColors = {
    3: 'rgba(255, 99, 132, 0.5)',
    15: 'rgba(255, 159, 64, 0.5)',
    50: 'rgba(75, 192, 192, 1)',
    85: 'rgba(54, 162, 235, 0.5)',
    97: 'rgba(153, 102, 255, 0.5)'
  };

  // Add WHO reference curves (using boys data as baseline)
  percentiles.forEach(p => {
    const boyCurve = generateWHOCurve(WHO_HEIGHT_AGE_BOYS, p);
    datasets.push({
      label: `WHO ${p}th percentile (Boys)`,
      data: boyCurve,
      borderColor: referenceColors[p],
      backgroundColor: 'transparent',
      borderWidth: p === 50 ? 2 : 1,
      borderDash: p === 50 ? [] : [5, 5],
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.4
    });
  });

  // Add actual child height measurements
  const colorPalette = [
    'rgba(255, 0, 0, 1)',
    'rgba(0, 0, 255, 1)',
    'rgba(0, 128, 0, 1)',
    'rgba(255, 165, 0, 1)',
    'rgba(128, 0, 128, 1)'
  ];

  let colorIndex = 0;

  Object.keys(childrenData).forEach(childId => {
    const child = childrenData[childId];

    // Sort consultations by date
    child.consultations.sort((a, b) => {
      const dateA = parseDate(a.consultationDate);
      const dateB = parseDate(b.consultationDate);
      return dateA - dateB;
    });

    // Get height measurements with age
    const heightData = child.consultations.map(consult => {
      const dobDate = parseDate(child.dateOfBirth);
      const consultDate = parseDate(consult.consultationDate);
      const ageMonths = calculateAgeInMonths(dobDate, consultDate);

      return {
        x: ageMonths,
        y: consult.height
      };
    }).filter(d => d.y && d.y > 0);

    if (heightData.length === 0) return;

    const color = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;

    datasets.push({
      label: `${child.name} (${child.gender})`,
      data: heightData,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 3,
      fill: false,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.3,
      pointStyle: 'circle'
    });
  });

  if (datasets.length === 0) {
    console.warn('No valid height data to display');
    return;
  }

  const ctx = document.getElementById('heightForAgeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Height-for-Age Growth Chart (WHO Standards)',
          font: { size: 16, weight: 'bold' }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (items) => `Age: ${items[0].parsed.x.toFixed(1)} months`,
            label: (context) => {
              if (context.dataset.label.includes('WHO')) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} cm`;
              }
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} cm`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff'
        },
        legend: {
          display: true,
          position: 'top',
          labels: { font: { size: 10 } }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Age (months)' },
          min: 0,
          max: 60,
          ticks: { stepSize: 6 }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Height (cm)' },
          ticks: {
            callback: function(value) {
              return value + ' cm';
            }
          }
        }
      }
    }
  });
}


// Check user authentication and role
async function checkUserAccess() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        reject(new Error('NOT_AUTHENTICATED'));
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          reject(new Error('USER_NOT_FOUND'));
          return;
        }

        const userData = userDoc.data();
        if (userData.role !== 'admin' && userData.role !== 'doctor') {
          reject(new Error('INSUFFICIENT_PERMISSIONS'));
          return;
        }

        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Initialize dashboard
async function initDashboard() {
  try {
    console.log('Initializing dashboard...');

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded!');
      return;
    }

    // Check user authentication and permissions
    try {
      await checkUserAccess();
      console.log('User authenticated with admin role');
    } catch (error) {
      console.error('Access denied:', error.message);

      let errorMessage = '';
      if (error.message === 'NOT_AUTHENTICATED') {
        errorMessage = 'Please <a href="../login.html" style="color: #3498db;">sign in</a> to view the dashboard.';
        setTimeout(() => {
          window.location.href = '../login.html';
        }, 2000);
      } else if (error.message === 'INSUFFICIENT_PERMISSIONS') {
        errorMessage = 'Access Denied: Admin or Doctor privileges required to view this dashboard.';
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 2000);
      } else {
        errorMessage = 'Error verifying permissions. Please try again.';
      }

      document.querySelector('.dashboard-container').innerHTML =
        `<p style="text-align: center; color: #e74c3c; margin-top: 40px;">${errorMessage}</p>`;
      return;
    }

    const submissions = await fetchSubmissions();
    console.log(`Fetched ${submissions.length} submissions`);

    // Fetch consultation data for growth chart
    const consultations = await fetchAllConsultations();
    console.log(`Fetched ${consultations.length} consultations`);

    if (submissions.length === 0 && consultations.length === 0) {
      console.warn('No data found in the database');
      document.querySelector('.dashboard-container').innerHTML +=
        '<p style="text-align: center; color: #7f8c8d; margin-top: 40px;">No data available yet.</p>';
      return;
    }

    if (submissions.length > 0) {
      drawReasonChart(submissions);
      drawTimeChart(submissions);
    }

    if (consultations.length > 0) {
      drawGrowthPercentileChart(consultations);
      drawWeightForAgeChart(consultations);
      drawHeightForAgeChart(consultations);
    } else {
      const growthSection = document.querySelector('#growthChartSection');
      if (growthSection) {
        growthSection.innerHTML += '<p style="text-align: center; color: #7f8c8d; margin-top: 20px;">No consultation data available for growth tracking.</p>';
      }

      const weightSection = document.querySelector('#weightForAgeSection');
      if (weightSection) {
        weightSection.innerHTML += '<p style="text-align: center; color: #7f8c8d; margin-top: 20px;">No consultation data available for weight tracking.</p>';
      }

      const heightSection = document.querySelector('#heightForAgeSection');
      if (heightSection) {
        heightSection.innerHTML += '<p style="text-align: center; color: #7f8c8d; margin-top: 20px;">No consultation data available for height tracking.</p>';
      }
    }

    console.log('Dashboard initialized successfully');
  } catch (error) {
    console.error('Error initializing dashboard:', error);

    let errorMsg = 'Error loading dashboard data.';
    if (error.code === 'permission-denied') {
      errorMsg = 'Permission denied. Only admins and doctors can access this dashboard.';
      setTimeout(() => {
        window.location.href = '../index.html';
      }, 2000);
    }

    document.querySelector('.dashboard-container').innerHTML +=
      `<p style="text-align: center; color: #e74c3c; margin-top: 40px;">${errorMsg}</p>`;
  }
}

window.addEventListener("DOMContentLoaded", initDashboard);

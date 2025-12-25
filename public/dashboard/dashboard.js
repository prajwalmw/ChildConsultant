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
    } else {
      const growthSection = document.querySelector('#growthChartSection');
      if (growthSection) {
        growthSection.innerHTML += '<p style="text-align: center; color: #7f8c8d; margin-top: 20px;">No consultation data available for growth tracking.</p>';
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

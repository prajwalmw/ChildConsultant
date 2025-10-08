// dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

// Fetch all inquiry data
async function fetchSubmissions() {
  const submissionsCol = collection(db, "inquiries"); // your collection name
  const snapshot = await getDocs(submissionsCol);
  return snapshot.docs.map(doc => doc.data());
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
      const day = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
      timeCounts[day] = (timeCounts[day] || 0) + 1;
    }
  });

  const sortedDates = Object.keys(timeCounts).sort();
  const counts = sortedDates.map(date => timeCounts[date]);

  const ctx = document.getElementById("timeChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedDates,
      datasets: [{
        label: "Inquiries per Day",
        data: counts,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
        tension: 0.3
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

// Initialize dashboard
async function initDashboard() {
  const submissions = await fetchSubmissions();
  drawReasonChart(submissions);
  drawTimeChart(submissions);
}

window.addEventListener("DOMContentLoaded", initDashboard);

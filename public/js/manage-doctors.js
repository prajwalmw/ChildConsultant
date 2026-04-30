// Admin Doctor Management System

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCyLCI_GOl9SWDLo2zhjMthLQFZ5sA3ddM",
  authDomain: "child-consultant.firebaseapp.com",
  projectId: "child-consultant",
  storageBucket: "child-consultant.appspot.com",
  messagingSenderId: "985386588549",
  appId: "1:985386588549:web:311ecd89cc7f6aa141ccec"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let allDoctors = [];
let expertiseArray = [];
let languageArray = [];
let editingDoctorId = null;
let allPackages = [];

// Check if user is admin
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert('Please sign in to access the admin panel');
    window.location.href = '../login.html';
    return;
  }

  try {
    await user.getIdToken();

    let userDoc = null;
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        userDoc = await db
          .collection('users')
          .doc(user.uid)
          .get(i === 0 ? undefined : { source: 'server' });
        break;
      } catch (err) {
        lastErr = err;
        await user.getIdToken(true);
        await new Promise(function (resolve) {
          setTimeout(resolve, 300 + i * 250);
        });
      }
    }

    if (!userDoc) {
      throw lastErr || new Error('Could not load user profile');
    }

    const userRole = userDoc.exists ? userDoc.data().role : undefined;

    if (userRole !== 'admin') {
      alert('Access Denied: Admin privileges required');
      window.location.href = '../index.html';
      return;
    }

    loadDoctors();
    loadPackages();
  } catch (error) {
    console.error('Error checking user role:', error);
    var code = error && error.code ? error.code : '';
    alert(
      'Could not verify admin access' +
        (code ? ' (' + code + ')' : '') +
        '. Try signing out and signing in again. If this continues, Firestore rules may need updating.'
    );
    window.location.href = '../index.html';
  }
});

// Load all doctors
async function loadDoctors() {
  try {
    const snapshot = await db.collection('doctors').orderBy('displayOrder', 'asc').get();

    allDoctors = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderDoctorsTable(allDoctors);
    updateStats();
  } catch (error) {
    console.error('Error loading doctors:', error);
    document.getElementById('tableContainer').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error loading doctors</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Render doctors table
function renderDoctorsTable(doctors) {
  const container = document.getElementById('tableContainer');

  if (doctors.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-md"></i>
        <h3>No doctors found</h3>
        <p>Click "Add New Doctor" to get started</p>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Doctor</th>
          <th>Specialization</th>
          <th>Experience</th>
          <th>Price</th>
          <th>Rating</th>
          <th>Verified</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${doctors.map(doctor => `
          <tr>
            <td>
              <div class="doctor-info">
                <img src="${doctor.image}" alt="${doctor.name}" class="doctor-avatar" onerror="this.src='https://via.placeholder.com/50/f41192/ffffff?text=${doctor.name.charAt(0)}'">
                <div class="doctor-details">
                  <h4>${doctor.name}</h4>
                  <p>${doctor.qualification}</p>
                </div>
              </div>
            </td>
            <td>
              ${doctor.title}
              ${doctor.isTopRated ? '<span class="badge badge-top">Top Rated</span>' : ''}
            </td>
            <td>${doctor.experience || doctor.experienceYears + ' Years'}</td>
            <td>
              ${doctor.discountedPrice && doctor.discountedPrice < doctor.sessionPrice 
                ? `<span style="text-decoration: line-through; color: #999; font-size: 12px;">₹${doctor.sessionPrice}</span><br><span style="color: #f41192; font-weight: bold;">₹${doctor.discountedPrice}</span>` 
                : `₹${doctor.sessionPrice}`}
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 5px;">
                <i class="fas fa-star" style="color: #FFD700;"></i>
                ${doctor.rating} (${doctor.totalRatings})
              </div>
            </td>
            <td class="verified-cell">
              <div class="switch-wrap">
                <label class="switch" title="Blue verified badge on homepage & profile">
                  <input type="checkbox" ${doctor.verified !== false ? 'checked' : ''} onchange="setDoctorVerifiedField('${doctor.id}', this.checked)">
                  <span class="slider"></span>
                </label>
                <span class="ig-verified-preview" aria-hidden="true">${typeof verifiedBadgeSVG === 'function' ? verifiedBadgeSVG(20, 'row_' + doctor.id) : ''}</span>
              </div>
            </td>
            <td>
              <span class="badge ${doctor.active ? 'badge-active' : 'badge-inactive'}">
                ${doctor.active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button class="btn-small btn-edit" onclick="editDoctor('${doctor.id}')">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-small btn-delete" onclick="deleteDoctor('${doctor.id}', '${doctor.name}')">
                  <i class="fas fa-trash"></i> Delete
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

// Update statistics
function updateStats() {
  const total = allDoctors.length;
  const active = allDoctors.filter(d => d.active).length;
  const topRated = allDoctors.filter(d => d.isTopRated).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-top').textContent = topRated;
}

async function setDoctorVerifiedField(doctorId, verified) {
  try {
    await db.collection('doctors').doc(doctorId).update({
      verified,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    const d = allDoctors.find((x) => x.id === doctorId);
    if (d) d.verified = verified;
  } catch (error) {
    console.error('Error updating verified:', error);
    alert('Could not update verified badge: ' + error.message);
    loadDoctors();
  }
}

// Search doctors
function searchDoctors() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();

  const filtered = allDoctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm) ||
    doctor.title.toLowerCase().includes(searchTerm) ||
    doctor.qualification.toLowerCase().includes(searchTerm)
  );

  renderDoctorsTable(filtered);
}

// Open add modal
function openAddModal() {
  editingDoctorId = null;
  document.getElementById('modalTitle').textContent = 'Add New Doctor';
  document.getElementById('doctorForm').reset();
  expertiseArray = [];
  languageArray = [];
  document.getElementById('expertiseChips').innerHTML = '';
  document.getElementById('languageChips').innerHTML = '';
  document.getElementById('imagePreview').style.display = 'none';
  const dv = document.getElementById('doctorVerified');
  if (dv) dv.checked = true;
  document.getElementById('doctorModal').classList.add('active');
}

// Close modal
function closeModal() {
  document.getElementById('doctorModal').classList.remove('active');
  editingDoctorId = null;
}

// Edit doctor
async function editDoctor(doctorId) {
  try {
    const doctor = allDoctors.find(d => d.id === doctorId);
    if (!doctor) return;

    editingDoctorId = doctorId;
    document.getElementById('modalTitle').textContent = 'Edit Doctor';

    // Populate form
    document.getElementById('doctorId').value = doctorId;
    document.getElementById('doctorName').value = doctor.name;
    document.getElementById('doctorTitle').value = doctor.title;
    document.getElementById('doctorExperience').value = doctor.experienceYears || parseInt(doctor.experience);
    document.getElementById('doctorQualification').value = doctor.qualification;
    document.getElementById('doctorPrice').value = doctor.sessionPrice;
    if (document.getElementById('doctorDiscountedPrice')) {
      document.getElementById('doctorDiscountedPrice').value = doctor.discountedPrice || doctor.sessionPrice;
    }
    document.getElementById('doctorRating').value = doctor.rating;
    document.getElementById('doctorTotalRatings').value = doctor.totalRatings;
    document.getElementById('doctorDisplayOrder').value = doctor.displayOrder || 999;
    document.getElementById('doctorImageUrl').value = doctor.image;

    // Show existing image preview
    if (doctor.image) {
      document.getElementById('imagePreview').style.display = 'block';
      document.getElementById('previewImg').src = doctor.image;
      document.getElementById('previewStatus').textContent = '✓ Image loaded successfully';
      document.getElementById('previewStatus').style.color = '#4CAF50';
    }

    document.getElementById('doctorCalendly').value = doctor.calendlyUrl;
    document.getElementById('doctorAbout').value = doctor.about;
    document.getElementById('doctorStatus').value = doctor.status;
    document.getElementById('doctorActive').value = doctor.active.toString();
    document.getElementById('doctorTopRated').checked = doctor.isTopRated || false;
    const dv = document.getElementById('doctorVerified');
    if (dv) dv.checked = doctor.verified !== false;

    // Populate expertise
    expertiseArray = doctor.expertise || [];
    renderChips('expertiseChips', expertiseArray);

    // Populate languages
    languageArray = doctor.languages || [];
    renderChips('languageChips', languageArray);

    document.getElementById('doctorModal').classList.add('active');
  } catch (error) {
    console.error('Error editing doctor:', error);
    alert('Error loading doctor data');
  }
}

// Delete doctor
async function deleteDoctor(doctorId, doctorName) {
  if (!confirm(`Are you sure you want to delete ${doctorName}?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    await db.collection('doctors').doc(doctorId).delete();
    alert(`${doctorName} has been deleted successfully`);
    loadDoctors();
  } catch (error) {
    console.error('Error deleting doctor:', error);
    alert('Error deleting doctor: ' + error.message);
  }
}

// Handle expertise input
function handleExpertiseInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = event.target;
    const value = input.value.trim();

    if (value && !expertiseArray.includes(value)) {
      expertiseArray.push(value);
      renderChips('expertiseChips', expertiseArray);
      input.value = '';
    }
  }
}

// Handle language input
function handleLanguageInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = event.target;
    const value = input.value.trim();

    if (value && !languageArray.includes(value)) {
      languageArray.push(value);
      renderChips('languageChips', languageArray);
      input.value = '';
    }
  }
}

// Render chips
function renderChips(containerId, array) {
  const container = document.getElementById(containerId);
  container.innerHTML = array.map((item, index) => `
    <div class="chip">
      ${item}
      <button type="button" onclick="removeChip('${containerId}', ${index})">×</button>
    </div>
  `).join('');
}

// Remove chip
function removeChip(containerId, index) {
  if (containerId === 'expertiseChips') {
    expertiseArray.splice(index, 1);
    renderChips('expertiseChips', expertiseArray);
  } else if (containerId === 'languageChips') {
    languageArray.splice(index, 1);
    renderChips('languageChips', languageArray);
  }
}

// Convert Google Drive URL to direct image URL
function convertGoogleDriveUrl(url) {
  // If already in correct format, return as is
  if (url.includes('drive.google.com/uc?id=') || url.includes('drive.google.com/thumbnail?id=')) {
    return url;
  }

  // Extract file ID from various Google Drive URL formats
  let fileId = null;

  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  const match1 = url.match(/\/file\/d\/([^\/\?]+)/);
  if (match1) {
    fileId = match1[1];
  }

  // Format 2: https://drive.google.com/open?id=FILE_ID
  const match2 = url.match(/[?&]id=([^&]+)/);
  if (match2) {
    fileId = match2[1];
  }

  // If file ID found, convert to direct URL
  // Using thumbnail endpoint which is more reliable for images
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  // Return original URL if not a Google Drive link
  return url;
}

// Handle image URL input and show preview
document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('doctorImageUrl');
  if (imageInput) {
    imageInput.addEventListener('input', function(e) {
      let imageUrl = e.target.value.trim();
      const previewDiv = document.getElementById('imagePreview');
      const previewImg = document.getElementById('previewImg');
      const previewStatus = document.getElementById('previewStatus');

      if (imageUrl) {
        // Automatically convert Google Drive URL
        const convertedUrl = convertGoogleDriveUrl(imageUrl);

        // Update input if URL was converted
        if (convertedUrl !== imageUrl) {
          imageInput.value = convertedUrl;
          imageUrl = convertedUrl;
          previewStatus.textContent = '✓ URL automatically converted to direct link';
          previewStatus.style.color = '#2196F3';
        }

        // Show preview
        previewDiv.style.display = 'block';
        previewImg.src = imageUrl;

        if (previewStatus.textContent !== '✓ URL automatically converted to direct link') {
          previewStatus.textContent = 'Loading preview...';
          previewStatus.style.color = '#666';
        }

        // Handle image load success
        previewImg.onload = function() {
          previewImg.style.border = '2px solid #4CAF50';
          if (previewStatus.textContent !== '✓ URL automatically converted to direct link') {
            previewStatus.textContent = '✓ Image loaded successfully';
            previewStatus.style.color = '#4CAF50';
          }
        };

        // Handle image load error
        previewImg.onerror = function() {
          previewImg.style.border = '2px solid #f44336';
          previewStatus.textContent = '✗ Could not load image. Check the URL or sharing settings.';
          previewStatus.style.color = '#f44336';
        };
      } else {
        previewDiv.style.display = 'none';
      }
    });
  }
});

// Handle form submit
async function handleSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const experienceYears = parseInt(document.getElementById('doctorExperience').value);

    // Generate doctor ID from name
    const doctorName = document.getElementById('doctorName').value.trim();
    const doctorId = editingDoctorId || ('dr-' + doctorName.toLowerCase()
      .replace(/dr\.?\s*/gi, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-'));

    // Get image URL from input
    const imageUrl = document.getElementById('doctorImageUrl').value.trim();
    if (!imageUrl) {
      alert('Please enter the Google Drive image URL');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Doctor';
      return;
    }

    const doctorData = {
      name: doctorName,
      title: document.getElementById('doctorTitle').value.trim(),
      experience: experienceYears + ' Years',
      experienceYears: experienceYears,
      qualification: document.getElementById('doctorQualification').value.trim(),
      sessionPrice: parseInt(document.getElementById('doctorPrice').value),
      discountedPrice: document.getElementById('doctorDiscountedPrice') ? parseInt(document.getElementById('doctorDiscountedPrice').value) : parseInt(document.getElementById('doctorPrice').value),
      rating: parseFloat(document.getElementById('doctorRating').value),
      totalRatings: parseInt(document.getElementById('doctorTotalRatings').value),
      displayOrder: parseInt(document.getElementById('doctorDisplayOrder').value),
      image: imageUrl,
      calendlyUrl: document.getElementById('doctorCalendly').value.trim(),
      about: document.getElementById('doctorAbout').value.trim(),
      status: document.getElementById('doctorStatus').value,
      active: document.getElementById('doctorActive').value === 'true',
      isTopRated: document.getElementById('doctorTopRated').checked,
      verified: document.getElementById('doctorVerified')
        ? document.getElementById('doctorVerified').checked
        : true,
      expertise: expertiseArray,
      languages: languageArray,
      ratingBreakdown: {
        5: Math.floor(document.getElementById('doctorTotalRatings').value * 0.85),
        4: Math.floor(document.getElementById('doctorTotalRatings').value * 0.10),
        3: Math.floor(document.getElementById('doctorTotalRatings').value * 0.03),
        2: Math.floor(document.getElementById('doctorTotalRatings').value * 0.01),
        1: Math.floor(document.getElementById('doctorTotalRatings').value * 0.01)
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingDoctorId) {
      // Update existing doctor
      await db.collection('doctors').doc(editingDoctorId).update(doctorData);
      alert('Doctor updated successfully!');
    } else {
      // Add new doctor
      doctorData.id = doctorId;
      doctorData.createdAt = firebase.firestore.FieldValue.serverTimestamp();

      await db.collection('doctors').doc(doctorId).set(doctorData);
      alert('Doctor added successfully!');
    }

    closeModal();
    loadDoctors();
  } catch (error) {
    console.error('Error saving doctor:', error);
    alert('Error saving doctor: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Doctor';
  }
}

// ==========================================
// PACKAGE MANAGEMENT LOGIC
// ==========================================

// Load all packages
async function loadPackages() {
  try {
    const snapshot = await db.collection('packages').orderBy('displayOrder', 'asc').get();
    allPackages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderPackagesTable(allPackages);
  } catch (error) {
    console.error('Error loading packages:', error);
    document.getElementById('packagesTableContainer').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error loading packages</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function adminPackageDurationLabel(pkg) {
  if (Number.isFinite(Number(pkg.durationAmount)) && Number(pkg.durationAmount) > 0) {
    const n = Number(pkg.durationAmount);
    return pkg.durationDisplayMonths ? `${n} month${n === 1 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'}`;
  }
  if (Number.isFinite(Number(pkg.durationDays)) && Number(pkg.durationDays) > 0) {
    const d = Number(pkg.durationDays);
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (Number.isFinite(Number(pkg.validityMonths)) && Number(pkg.validityMonths) > 0) {
    const m = Number(pkg.validityMonths);
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  return '—';
}

// Render packages table
function renderPackagesTable(packages) {
  const container = document.getElementById('packagesTableContainer');

  if (packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box"></i>
        <h3>No packages found</h3>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table>
      <thead>
        <tr>
          <th>Package Name</th>
          <th>Price</th>
          <th>Sessions / Duration</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${packages.map(pkg => {
          const sess = Math.max(1, parseInt(pkg.sessions, 10) || 1);
          const ops = pkg.originalPricePerSession != null ? Number(pkg.originalPricePerSession) : Math.round(Number(pkg.price) / sess);
          const dps = pkg.discountedPricePerSession != null ? Number(pkg.discountedPricePerSession) : Math.round(Number(pkg.discountedPrice || pkg.price) / sess);
          const rawName = String(pkg.name || '').trim();
          const displayName = pkg.id === 'standard' && (!rawName || rawName.toLowerCase() === 'standard')
            ? 'Pro'
            : (rawName || pkg.id);
          return `
          <tr>
            <td>
              <strong>${displayName}</strong>
              ${pkg.isBestSeller ? '<span class="badge badge-top" style="margin-left: 8px;">Best Seller ⭐</span>' : ''}
            </td>
            <td>
              <span style="text-decoration: line-through; color: #999; font-size: 12px;">₹${pkg.price.toLocaleString('en-IN')}</span><br>
              <span style="color: #f41192; font-weight: bold; font-size: 16px;">₹${(pkg.discountedPrice || pkg.price).toLocaleString('en-IN')}</span>
              <div style="font-size: 11px; color: #888; margin-top: 4px;">₹${ops.toLocaleString('en-IN')} list / ₹${dps.toLocaleString('en-IN')} pay per session</div>
            </td>
            <td>
              <strong>${sess} sessions</strong><br>
              <span style="color: #666; font-size: 13px;">${adminPackageDurationLabel(pkg)}</span>
            </td>
            <td>
              <span class="badge ${pkg.active ? 'badge-active' : 'badge-inactive'}">
                ${pkg.active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <button class="btn-small btn-edit" onclick="editPackage('${pkg.id}')">
                <i class="fas fa-edit"></i> Edit
              </button>
            </td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

// Open edit package modal
function editPackage(packageId) {
  const pkg = allPackages.find(p => p.id === packageId);
  if (!pkg) return;

  document.getElementById('packageId').value = pkg.id;
  let dispName = (pkg.name || '').trim();
  if (pkg.id === 'standard' && (!dispName || dispName.toLowerCase() === 'standard')) {
    dispName = 'Pro';
  }
  document.getElementById('packageName').value = dispName;

  const sessions = Math.max(1, parseInt(pkg.sessions, 10) || 1);
  document.getElementById('packageSessions').value = sessions;

  document.getElementById('packagePrice').value = Number(pkg.price) || 0;
  document.getElementById('packageDiscountedPrice').value = Number(pkg.discountedPrice != null ? pkg.discountedPrice : pkg.price) || 0;

  const origPs = pkg.originalPricePerSession != null && pkg.originalPricePerSession !== ''
    ? Number(pkg.originalPricePerSession)
    : Math.round(Number(pkg.price) / sessions);
  const discPs = pkg.discountedPricePerSession != null && pkg.discountedPricePerSession !== ''
    ? Number(pkg.discountedPricePerSession)
    : Math.round(Number(pkg.discountedPrice || pkg.price) / sessions);
  document.getElementById('packageOriginalPerSession').value = origPs;
  document.getElementById('packageDiscountedPerSession').value = discPs;

  let durAmt;
  let durMo = false;
  if (Number.isFinite(Number(pkg.durationAmount)) && Number(pkg.durationAmount) > 0) {
    durAmt = Number(pkg.durationAmount);
    durMo = pkg.durationDisplayMonths === true;
  } else if (Number.isFinite(Number(pkg.durationDays)) && Number(pkg.durationDays) > 0) {
    durAmt = Number(pkg.durationDays);
    durMo = false;
  } else if (Number.isFinite(Number(pkg.validityMonths)) && Number(pkg.validityMonths) > 0) {
    durAmt = Number(pkg.validityMonths);
    durMo = true;
  } else {
    durAmt = 90;
    durMo = false;
  }
  document.getElementById('packageDurationAmount').value = durAmt;
  document.getElementById('packageDurationMonthsToggle').checked = durMo;

  const featuresInput = document.getElementById('packageFeatures');
  if (featuresInput) {
    const features = Array.isArray(pkg.features) ? pkg.features : [];
    featuresInput.value = features.join('\n');
  }
  document.getElementById('packageActive').value = pkg.active.toString();
  document.getElementById('packageBestSeller').checked = pkg.isBestSeller || false;

  document.getElementById('packageModal').classList.add('active');
}

// Close package modal
function closePackageModal() {
  document.getElementById('packageModal').classList.remove('active');
}

// Handle package form submit
async function handlePackageSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitPackageBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const packageId = document.getElementById('packageId').value;
    const name = document.getElementById('packageName').value.trim();
    const sessions = Math.max(1, parseInt(document.getElementById('packageSessions').value, 10) || 1);
    const price = parseInt(document.getElementById('packagePrice').value, 10);
    const discountedPrice = parseInt(document.getElementById('packageDiscountedPrice').value, 10);
    const origPs = parseInt(document.getElementById('packageOriginalPerSession').value, 10);
    const discPs = parseInt(document.getElementById('packageDiscountedPerSession').value, 10);
    const durationAmount = parseInt(document.getElementById('packageDurationAmount').value, 10);
    const durationDisplayMonths = document.getElementById('packageDurationMonthsToggle').checked;
    const durationDays = durationDisplayMonths ? durationAmount * 30 : durationAmount;

    const rawFeatures = document.getElementById('packageFeatures')?.value || '';
    const features = rawFeatures
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    await db.collection('packages').doc(packageId).update({
      name,
      sessions,
      price,
      discountedPrice,
      originalPricePerSession: origPs,
      discountedPricePerSession: discPs,
      durationAmount,
      durationDisplayMonths,
      durationDays,
      features: features,
      active: document.getElementById('packageActive').value === 'true',
      isBestSeller: document.getElementById('packageBestSeller').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closePackageModal();
    loadPackages(); // Reload table
    
  } catch (error) {
    console.error('Error saving package:', error);
    alert('Error saving package: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Package';
  }
}
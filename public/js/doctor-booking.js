// Doctor Booking System

// Global variable to store doctors data
let DOCTORS = [];
let doctorsFetchStarted = false;
const INR_SIGN = '\u20B9';

function escapeHtmlAttr(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

function isFirebaseReady() {
  if (typeof firebase === 'undefined') return false;
  try {
    if (firebase.apps && firebase.apps.length > 0) return true;
    firebase.app();
    return true;
  } catch (e) {
    return false;
  }
}

/** Prefer live list from async fetch; fall back to module array. */
function getDoctorList() {
  if (typeof window !== 'undefined' && Array.isArray(window.DOCTORS) && window.DOCTORS.length > 0) {
    return window.DOCTORS;
  }
  return DOCTORS;
}

function getDoctorById(doctorId) {
  const key = doctorId == null ? '' : String(doctorId);
  return getDoctorList().find(function (d) {
    return String(d.id) === key;
  });
}

/** Public site: hide only when explicitly inactive (missing `active` still shows — legacy docs). */
function isDoctorActiveForPublic(doc) {
  return doc.active !== false;
}

/** Same-origin fallback if remote/Drive URL fails or field missing (via.placeholder.com is often blocked). */
const DOCTOR_IMG_FALLBACK = 'images/doctors/dr_pediatrician.png';

/**
 * Turn Google Drive links into an embeddable image URL.
 * drive.google.com/uc and drive.usercontent.google.com often send
 * Cross-Origin-Resource-Policy: same-site, so <img> on other sites fails silently
 * and the booking UI falls back to the local placeholder. lh3.googleusercontent.com
 * matches what Drive's thumbnail redirect uses and loads cross-origin.
 */
function extractGoogleDriveFileId(url) {
  if (!url || typeof url !== 'string') return '';
  var trimmed = url.trim();
  var m1 = trimmed.match(/\/file\/d\/([^\/\?]+)/);
  if (m1) return m1[1];
  var m2 = trimmed.match(/[?&]id=([^&]+)/);
  if (m2) return m2[1];
  return '';
}

function convertGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  var trimmed = url.trim();
  if (trimmed.indexOf('lh3.googleusercontent.com') !== -1) {
    return trimmed;
  }
  var fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(fileId) + '=w1200';
  }
  return trimmed;
}

function pickDoctorImageRaw(doctor) {
  if (!doctor || typeof doctor !== 'object') return '';
  var keys = ['image', 'photoUrl', 'photoURL', 'imageUrl', 'photo', 'avatar', 'picture'];
  for (var i = 0; i < keys.length; i++) {
    var v = doctor[keys[i]];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function doctorPortraitSrc(doctor) {
  var raw = pickDoctorImageRaw(doctor);
  if (!raw) return DOCTOR_IMG_FALLBACK;
  return convertGoogleDriveImageUrl(raw);
}

// Fetch doctors from Firestore
async function fetchDoctorsFromFirestore() {
  try {
    const snapshot = await firebase.firestore()
      .collection('doctors')
      .get();

    DOCTORS = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          finalPrice: (data.discountedPrice && data.discountedPrice < data.sessionPrice) ? data.discountedPrice : data.sessionPrice
        };
      })
      .filter(isDoctorActiveForPublic)
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    return DOCTORS;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    DOCTORS = [];
    return [];
  }
}

function renderDoctorCards(doctors) {
  const container = document.getElementById('doctors-container');
  const noResults = document.getElementById('no-results');

  if (!container || !doctors) return;

  container.innerHTML = '';

  if (doctors.length === 0) {
    container.style.display = 'none';
    if (noResults) noResults.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  if (noResults) noResults.style.display = 'none';

  doctors.forEach((doctor, index) => {
    const sessionPrice = Number(doctor.sessionPrice);
    const finalPrice = Number(doctor.finalPrice);
    const listPrice = Number.isFinite(sessionPrice) ? sessionPrice : 0;
    const payPrice = Number.isFinite(finalPrice) ? finalPrice : listPrice;
    const activePrice = payPrice < listPrice ? payPrice : listPrice;
    const hasDiscount = payPrice < listPrice;
    const inr = '\u20B9';
    const specAttr = escapeHtmlAttr(doctor.title);
    const nameAttr = escapeHtmlAttr(doctor.name || '');
    const qualSafe = escapeHtmlAttr(doctor.qualification || '');
    const titleSafe = escapeHtmlAttr(doctor.title || '');
    const nameHtml = escapeHtmlAttr(doctor.name || '');
    const idAttr = escapeHtmlAttr(doctor.id);
    const portraitSrc = escapeHtmlAttr(doctorPortraitSrc(doctor));
    const portraitFallback = escapeHtmlAttr(DOCTOR_IMG_FALLBACK);

    const cardHTML = `
            <div class="pro-doc-card" data-specialization="${specAttr}" data-experience="${parseInt(doctor.experience, 10) || 0}" data-price="${listPrice}" data-rating="${doctor.rating}">

              <div class="pro-doc-top">
                <div class="pro-doc-img-wrapper">
                  <img src="${portraitSrc}" alt="${nameAttr}" class="pro-doc-img" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="100" height="100" onerror="this.onerror=null;this.src='${portraitFallback}'">
                  ${doctor.isTopRated ? '<div class="pro-top-badge"><i class="fa fa-star"></i> Top Rated</div>' : ''}
                </div>

                <div class="pro-doc-info">
                  <div class="pro-doc-name-row">
                    <h3 class="pro-doc-name">${nameHtml}</h3>
                    ${typeof isDoctorVerified === 'function' && isDoctorVerified(doctor)
                      ? `<span class="pro-verified" title="Verified medical expert">${verifiedBadgeSVG(20, doctor.id + '_' + index)}</span>`
                      : ''}
                  </div>
                  <p class="pro-doc-title">${titleSafe}</p>
                  <p class="pro-doc-exp"><i class="fa fa-clock-o"></i> ${doctor.experience} Overall</p>
                </div>
              </div>

              <div class="pro-doc-middle">
                <div class="pro-stat">
                  <i class="fa fa-graduation-cap" style="color: #8B5CF6;"></i>
                  <span>${qualSafe}</span>
                </div>
                <div class="pro-stat">
                  <i class="fa fa-thumbs-up" style="color: #10B981;"></i>
                  <span class="pro-stat-highlight">${doctor.rating} <span style="color: #6B7280; font-weight: 400; margin-left: 4px;">(${doctor.totalRatings} Stories)</span></span>
                </div>
              </div>

              <div class="pro-doc-bottom">
                <div class="pro-price-block">
                  <span class="pro-price-label">Consultation Fee</span>
                  <div class="pro-price-val inr-money">
                    ${inr}${activePrice}
                    ${hasDiscount ? `<span class="pro-price-old">${inr}${listPrice}</span>` : ''}
                  </div>
                </div>
                <div class="pro-actions">
                  <button type="button" class="pro-btn pro-btn-outline" data-doctor-action="profile" data-doctor-id="${idAttr}">Profile</button>
                  <button type="button" class="pro-btn pro-btn-primary" data-doctor-action="book" data-doctor-id="${idAttr}">Book Now</button>
                </div>
              </div>
            </div>
          `;

    container.innerHTML += cardHTML;
  });
}

function filterDoctors() {
  if (!window.DOCTORS || !Array.isArray(window.DOCTORS)) return;

  const filterSpec = document.getElementById('filter-specialization');
  const filterExp = document.getElementById('filter-experience');
  const filterPrice = document.getElementById('filter-price');
  const filterRating = document.getElementById('filter-rating');
  if (!filterSpec || !filterExp || !filterPrice || !filterRating) return;

  const specialization = filterSpec.value;
  const experience = filterExp.value;
  const priceRange = filterPrice.value;
  const rating = filterRating.value;

  let filtered = window.DOCTORS.filter((doctor) => {
    if (specialization) {
      const t = (doctor.title || '').trim().toLowerCase();
      const s = specialization.trim().toLowerCase();
      if (t !== s) return false;
    }

    if (experience) {
      const docExp = parseInt(doctor.experience, 10);
      if (!Number.isFinite(docExp) || docExp < parseInt(experience, 10)) return false;
    }

    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      const sp = Number(doctor.sessionPrice);
      const fp = Number(doctor.finalPrice);
      const listP = Number.isFinite(sp) ? sp : 0;
      const payP = Number.isFinite(fp) ? fp : listP;
      const activePrice = payP < listP ? payP : listP;
      if (activePrice < min || activePrice > max) return false;
    }

    if (rating && doctor.rating < parseFloat(rating)) return false;

    return true;
  });

  renderDoctorCards(filtered);
}

let doctorCardActionsBound = false;
function setupDoctorCardActions() {
  if (doctorCardActionsBound) return;
  const grid = document.getElementById('doctors-container');
  if (!grid) return;
  doctorCardActionsBound = true;
  grid.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-doctor-action]');
    if (!btn || !grid.contains(btn)) return;
    const id = btn.getAttribute('data-doctor-id');
    if (id == null || id === '') return;
    const action = btn.getAttribute('data-doctor-action');
    e.preventDefault();
    if (action === 'profile') {
      showDoctorProfile(id);
    } else if (action === 'book') {
      bookDoctorSession(id);
    }
  });
}

let doctorFiltersBound = false;
function setupDoctorFilters() {
  if (doctorFiltersBound) return;
  doctorFiltersBound = true;
  const filterSpec = document.getElementById('filter-specialization');
  const filterExp = document.getElementById('filter-experience');
  const filterPrice = document.getElementById('filter-price');
  const filterRating = document.getElementById('filter-rating');
  const clearBtn = document.getElementById('clear-filters');

  if (filterSpec) filterSpec.addEventListener('change', filterDoctors);
  if (filterExp) filterExp.addEventListener('change', filterDoctors);
  if (filterPrice) filterPrice.addEventListener('change', filterDoctors);
  if (filterRating) filterRating.addEventListener('change', filterDoctors);

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (filterSpec) filterSpec.value = '';
      if (filterExp) filterExp.value = '';
      if (filterPrice) filterPrice.value = '';
      if (filterRating) filterRating.value = '';
      if (window.DOCTORS && window.DOCTORS.length > 0) {
        renderDoctorCards(window.DOCTORS);
      }
    });
  }
}

// Initialize doctors and render cards
async function initializeDoctors() {
  // Show loading state
  const container = document.getElementById('doctors-container');
  if (container) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #666;"><i class="fa fa-spinner fa-spin" style="font-size: 40px; color: #f41192; margin-bottom: 15px;"></i><p>Loading doctors...</p></div>';
  }

  // Fetch doctors from Firestore
  await fetchDoctorsFromFirestore();

  // Set global DOCTORS variable for filters to work
  window.DOCTORS = DOCTORS;

  // Render the doctor cards (defined in this file — do not rely on inline HTML script)
  if (DOCTORS.length > 0) {
    try {
      renderDoctorCards(DOCTORS);
    } catch (e) {
      console.error('renderDoctorCards failed:', e);
      if (container) {
        container.style.display = 'grid';
        container.innerHTML =
          '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #c00;"><p>Could not display doctors. Please refresh the page.</p><p style="font-size:13px;color:#666;margin-top:8px;">If this persists, open the browser console (F12) and share any red errors with support.</p></div>';
      }
    }
  } else {
    if (container) {
      container.style.display = 'grid';
      container.innerHTML =
        '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #999;"><i class="fa fa-exclamation-circle" style="font-size: 40px; margin-bottom: 15px;"></i><p>No doctors available at the moment. Please check back later.</p></div>';
    }
  }
}

let domReady = false;
let firebaseWaitAttempts = 0;
const FIREBASE_WAIT_MAX = 80;

function bootDoctorListing() {
  domReady = true;
  setupDoctorCardActions();
  setupDoctorFilters();
  tryInitialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDoctorListing);
} else {
  bootDoctorListing();
}

window.addEventListener('load', function () {
  if (doctorsFetchStarted) return;
  firebaseWaitAttempts = 0;
  tryInitialize();
});

function tryInitialize() {
  const container = document.getElementById('doctors-container');
  if (!domReady || !container) return;
  if (!isFirebaseReady()) {
    firebaseWaitAttempts++;
    if (firebaseWaitAttempts < FIREBASE_WAIT_MAX) {
      setTimeout(tryInitialize, 100);
      return;
    }
    if (!doctorsFetchStarted) {
      container.innerHTML =
        '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #c00;"><p style="margin:0 0 8px;">Could not load booking data (Firebase unavailable).</p><p style="margin:0;font-size:14px;color:#666;">Check your connection, disable strict blockers for this site, then refresh.</p></div>';
      container.style.display = 'grid';
    }
    return;
  }
  if (doctorsFetchStarted) return;
  doctorsFetchStarted = true;
  initializeDoctors().catch(function (err) {
    console.error('initializeDoctors failed:', err);
    doctorsFetchStarted = false;
    var c = document.getElementById('doctors-container');
    if (c) {
      c.style.display = 'grid';
      c.innerHTML =
        '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #c00;"><p>Could not load doctors.</p><p style="font-size:13px;color:#666;margin-top:8px;">Check your connection and refresh. If it continues, open the browser console (F12) for details.</p></div>';
    }
  });
}

// Generate star rating HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let starsHTML = '';

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fa fa-star" style="color: #FFD700;"></i>';
  }
  if (hasHalfStar) {
    starsHTML += '<i class="fa fa-star-half-o" style="color: #FFD700;"></i>';
  }
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="fa fa-star-o" style="color: #FFD700;"></i>';
  }

  return starsHTML;
}

// Show doctor profile modal
function showDoctorProfile(doctorId) {
  const doctor = getDoctorById(doctorId);
  if (!doctor) return;

  const portraitSrc = escapeHtmlAttr(doctorPortraitSrc(doctor));
  const portraitFallback = escapeHtmlAttr(DOCTOR_IMG_FALLBACK);
  const modalNameAttr = escapeHtmlAttr(doctor.name || '');

  const modalHTML = `
    <div id="doctorProfileModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
      <div style="background: white; border-radius: 24px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <button onclick="closeDoctorProfile()" style="position: absolute; top: 20px; right: 20px; background: #f41192; color: #ffffff !important; -webkit-text-fill-color: #ffffff; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; z-index: 10; box-shadow: 0 4px 12px rgba(244,17,146,0.3);">×</button>

        <div style="padding: 40px;">
          <div style="display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
            <div style="flex-shrink: 0;">
              <img src="${portraitSrc}" alt="${modalNameAttr}" width="140" height="140" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 4px solid #FDF2F8; padding: 4px; box-shadow: 0 8px 16px rgba(244,17,146,0.08);" onerror="this.onerror=null;this.src='${portraitFallback}'">
              <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 28px; font-weight: 800; color: #1E293B;">${doctor.rating}</div>
                <div>${generateStarRating(doctor.rating)}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">(${doctor.totalRatings} Ratings)</div>
              </div>
            </div>

            <div style="flex: 1; min-width: 300px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                <h2 style="color: #1E293B; font-size: 28px; font-weight: 800; margin: 0; font-family: 'PT Sans', sans-serif; letter-spacing: 0.03em; line-height: 1.2;">${doctor.name}</h2>
                ${typeof isDoctorVerified === 'function' && isDoctorVerified(doctor) && typeof verifiedBadgeSVG === 'function'
                  ? `<span style="display:inline-flex;" title="Verified medical expert">${verifiedBadgeSVG(22, doctor.id + '_modal')}</span>`
                  : ''}
              </div>
              <p style="font-size: 17px; color: #f41192; font-weight: 600; margin-bottom: 16px;">${doctor.title}</p>

              <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
                <div style="color: #4B5563; font-size: 15px;">
                  <i class="fa fa-graduation-cap" style="color: #8B5CF6; width: 20px;"></i>
                  ${doctor.qualification}
                </div>
                <div style="color: #4B5563; font-size: 15px;">
                  <i class="fa fa-clock-o" style="color: #3B82F6; width: 20px;"></i>
                  ${doctor.experience} Overall
                </div>
                <div>
                  <i class="fa fa-circle" style="color: #4CAF50; margin-right: 5px; font-size: 10px;"></i>
                  <strong style="color: #374151;">${doctor.status}</strong>
                </div>
              </div>

              <div style="background: linear-gradient(135deg, #FFF9FB, #F0F9FF); border: 2px solid #FDF2F8; color: #1E293B; padding: 16px 24px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px;">Consultation Fee</div>
                <div class="inr-money" style="font-size: 28px; font-weight: 800; color: #9e0ff1;">
                  ${doctor.finalPrice < doctor.sessionPrice 
                    ? `${INR_SIGN}${doctor.finalPrice} <span style="text-decoration: line-through; font-size: 16px; color: #9CA3AF; margin-left: 6px; font-weight: 500;">${INR_SIGN}${doctor.sessionPrice}</span>` 
                    : `${INR_SIGN}${doctor.sessionPrice}`}
                </div>
              </div>

              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" onclick="bookDoctorSession(${JSON.stringify(doctor.id)})" onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 16px rgba(244,17,146,0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(244,17,146,0.2)'" style="background: linear-gradient(135deg, #f41192, #9e0ff1); color: #ffffff !important; -webkit-text-fill-color: #ffffff; padding: 15px 30px; border-radius: 25px; border: none; font-weight: 700; font-size: 16px; letter-spacing: 0.04em; cursor: pointer; box-shadow: 0 4px 12px rgba(244,17,146,0.2); flex: 1; min-width: 180px; transition: all 0.2s ease; font-family: 'PT Sans', sans-serif;">Book an Appointment</button>
              </div>
            </div>
          </div>

          <hr style="border: none; border-top: 2px dashed #F1F5F9; margin: 30px 0;">

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1E293B; font-size: 22px; font-weight: 700; margin-bottom: 15px; font-family: 'PT Sans', sans-serif; letter-spacing: 0.03em;">About</h3>
            <p style="color: #4B5563; line-height: 1.8; font-size: 15px;">${doctor.about}</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1E293B; font-size: 22px; font-weight: 700; margin-bottom: 15px; font-family: 'PT Sans', sans-serif; letter-spacing: 0.03em;">Area of Expertise</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${doctor.expertise.map(exp => `
                <span style="background: #F0F9FF; color: #0EA5E9; padding: 8px 16px; border-radius: 12px; font-size: 14px; font-weight: 600;">${exp}</span>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1E293B; font-size: 22px; font-weight: 700; margin-bottom: 15px; font-family: 'PT Sans', sans-serif; letter-spacing: 0.03em;">Languages Known</h3>
            <p style="color: #4B5563; font-size: 15px;">${doctor.languages.join(', ')}</p>
          </div>

          <div>
            <h3 style="color: #1E293B; font-size: 22px; font-weight: 700; margin-bottom: 15px; font-family: 'PT Sans', sans-serif; letter-spacing: 0.03em;">Patient Reviews</h3>
            ${Object.entries(doctor.ratingBreakdown).reverse().map(([stars, percentage]) => `
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <span style="width: 30px; font-weight: 600; color: #374151; font-size: 13px;">${stars} <i class="fa fa-star" style="color: #F59E0B; font-size: 12px;"></i></span>
                <div style="flex: 1; height: 8px; background: #F1F5F9; border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; background: linear-gradient(90deg, #34D399, #10B981); width: ${percentage}%; border-radius: 10px;"></div>
                </div>
                <span style="width: 50px; text-align: right; color: #6B7280; font-size: 13px;">${percentage}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  document.body.style.overflow = 'hidden';
}

// Close doctor profile modal
function closeDoctorProfile() {
  const modal = document.getElementById('doctorProfileModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = 'auto';
  }
}

// Book doctor session (opens Calendly popup, then Razorpay)
function bookDoctorSession(doctorId) {
  const doctor = getDoctorById(doctorId);
  if (!doctor) {
    console.warn('bookDoctorSession: doctor not found for id', doctorId);
    return;
  }

  // Store doctor info for payment after Calendly
  sessionStorage.setItem('selectedDoctor', JSON.stringify({
    id: doctor.id,
    name: doctor.name,
    price: doctor.finalPrice
  }));

  // Close the modal
  closeDoctorProfile();

  // Use single Calendly link for all doctors (or doctor's custom link if provided)
  const calendlyUrl = doctor.calendlyUrl || 'https://calendly.com/aqiraa-care/doctor-appointment?month=2026-01';

  console.log('Opening Calendly with URL:', calendlyUrl);

  if (typeof Calendly === 'undefined' || typeof Calendly.initPopupWidget !== 'function') {
    alert('The scheduling calendar is still loading. Please wait a few seconds and tap Book again.');
    return;
  }

  // Get logged-in user details
  const user = firebase.auth().currentUser;
  const prefillData = {};

  if (user) {
    if (user.displayName) {
      prefillData.name = user.displayName;
    }
    if (user.email) {
      prefillData.email = user.email;
    }
  }

  // Open Calendly popup widget with pre-filled user data
  // Note: The title "Doctor Appointment" comes from Calendly event settings and cannot be changed via API
  Calendly.initPopupWidget({
    url: calendlyUrl,
    prefill: prefillData
  });

  // Listen for Calendly events
  window.addEventListener('message', function(e) {
    if (e.data.event && e.data.event === 'calendly.event_scheduled') {
      // User successfully scheduled an appointment
      console.log('Appointment scheduled:', e.data);

      // Store the event details
      sessionStorage.setItem('calendlyEvent', JSON.stringify(e.data.payload));

      // Close Calendly popup
      const calendlyOverlay = document.querySelector('.calendly-popup-close');
      if (calendlyOverlay) calendlyOverlay.click();

      // Auto-trigger Razorpay immediately (no intermediate dialog needed)
      setTimeout(() => {
        proceedToDoctorPayment();
      }, 500);
    }
  });
}

// Show booking instructions (opens in new tab)
function showBookingInstructions(doctor) {
  const existingMsg = document.getElementById('bookingInstructions');
  if (existingMsg) existingMsg.remove();

  const messageHTML = `
    <div id="bookingInstructions" style="position: fixed; bottom: 30px; right: 30px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 99999; max-width: 420px; border-left: 5px solid #f41192;">
      <button onclick="document.getElementById('bookingInstructions').remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
      <h4 style="color: #f41192; margin-bottom: 10px; font-size: 18px;">📅 Booking ${doctor.name}</h4>
      <p style="color: #666; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">
        Select your preferred date and time in the new tab. After scheduling, return here to complete your payment of <strong class="inr-money">${INR_SIGN}${doctor.finalPrice || doctor.price || doctor.sessionPrice}</strong>.
      </p>
      <button onclick="proceedToDoctorPayment()" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: #ffffff !important; -webkit-text-fill-color: #ffffff; padding: 12px 25px; border-radius: 20px; border: none; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(244,17,146,0.3); font-size: 15px;">I've Scheduled - Proceed to Payment</button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', messageHTML);
}

// Show payment instructions after successful Calendly booking
function showPaymentInstructions(doctor, eventDetails) {
  const existingMsg = document.getElementById('paymentInstructions');
  if (existingMsg) existingMsg.remove();

  // Extract appointment details if available
  let appointmentInfo = '';
  console.log('Event details:', eventDetails);

  if (eventDetails) {
    // Try different possible paths for the start time
    const startTimeStr = eventDetails.start_time ||
                        (eventDetails.event && eventDetails.event.start_time) ||
                        (eventDetails.invitee && eventDetails.invitee.start_time);

    if (startTimeStr) {
      const startTime = new Date(startTimeStr);
      appointmentInfo = `
        <div style="background: #f0f9ff; padding: 12px; border-radius: 10px; margin-bottom: 15px; border-left: 3px solid #f41192;">
          <p style="margin: 0; font-size: 13px; color: #555;">
            <strong>✓ Appointment Confirmed</strong><br>
            📅 ${startTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
            ⏰ ${startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      `;
    }
  }

  const messageHTML = `
    <div id="paymentInstructions" style="position: fixed; bottom: 30px; right: 30px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 99999; max-width: 420px; border-left: 5px solid #4CAF50;">
      <button onclick="document.getElementById('paymentInstructions').remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
      <h4 style="color: #4CAF50; margin-bottom: 10px; font-size: 18px;">🎉 Appointment Scheduled!</h4>
      ${appointmentInfo}
      <p style="color: #666; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">
        Complete your booking by paying <strong class="inr-money">${INR_SIGN}${doctor.finalPrice || doctor.price || doctor.sessionPrice}</strong> to confirm your appointment with ${doctor.name}.
      </p>
      <button onclick="proceedToDoctorPayment()" class="inr-money" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: #ffffff !important; -webkit-text-fill-color: #ffffff; padding: 12px 25px; border-radius: 20px; border: none; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(244,17,146,0.3); font-size: 15px;">Complete Payment ${INR_SIGN}${doctor.finalPrice || doctor.price || doctor.sessionPrice}</button>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', messageHTML);
}

// Proceed to doctor payment
function proceedToDoctorPayment() {
  const doctorData = sessionStorage.getItem('selectedDoctor');
  if (!doctorData) {
    alert('Please select a doctor and time slot first.');
    return;
  }

  const doctor = JSON.parse(doctorData);

  // Remove the message
  const message = document.getElementById('calendlyMessage');
  if (message) message.remove();

  // Initiate Razorpay payment
  initiateDoctorPayment(doctor);
}

// Initiate Razorpay payment for doctor session
function initiateDoctorPayment(doctor) {
  if (typeof Razorpay === 'undefined') {
    alert('Payment system is loading. Please try again.');
    return;
  }

  const user = firebase.auth().currentUser;
  const userEmail = user ? user.email : '';
  const userName = user ? user.displayName || '' : '';

  const options = {
    key: 'rzp_live_S6y99PjkyiSG8O',
    amount: doctor.price * 100,
    currency: 'INR',
    name: 'Aqiraa',
    description: `Consultation with ${doctor.name}`,
    image: 'https://child-consultant.web.app/images/logo-razorpay.png',
    prefill: {
      name: userName,
      email: userEmail,
      contact: ''
    },
    notes: {
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      session_type: 'individual_consultation',
      session_price: `${INR_SIGN}${doctor.price}`
    },
    theme: {
      color: '#f41192'
    },
    handler: function(response) {
      handleDoctorPaymentSuccess(response, doctor);
    },
    modal: {
      ondismiss: function() {
        console.log('Payment cancelled');
      }
    }
  };

  const razorpay = new Razorpay(options);
  razorpay.on('payment.failed', function(response) {
    alert('Payment failed: ' + response.error.description);
  });

  razorpay.open();
}

// Handle successful doctor payment
function handleDoctorPaymentSuccess(paymentResponse, doctor) {
  const user = firebase.auth().currentUser;

  const bookingData = {
    type: 'doctor_consultation',
    paymentId: paymentResponse.razorpay_payment_id,
    doctorId: doctor.id,
    doctorName: doctor.name,
    amount: doctor.price,
    status: 'confirmed',
    paymentStatus: 'success',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: user ? user.uid : 'guest',
    userEmail: user ? user.email : '',
    userName: user ? user.displayName || '' : ''
  };

  firebase.firestore().collection('doctor_bookings').add(bookingData)
    .then((docRef) => {
      sessionStorage.removeItem('selectedDoctor');

      // Notify Aqiraa admin via EmailJS
      if (typeof emailjs !== 'undefined') {
        emailjs.send("service_zdtmdad", "template_0ljis7t", {
          name: bookingData.userName || 'User',
          email: bookingData.userEmail || 'N/A',
          phone: 'N/A',
          message: `NEW DOCTOR BOOKING ALERT\n\nDoctor: ${doctor.name}\nAmount: ${INR_SIGN}${doctor.price}\nBooking ID: ${docRef.id}\nPayment ID: ${paymentResponse.razorpay_payment_id}\nUser: ${bookingData.userName || 'N/A'} (${bookingData.userEmail || 'N/A'})\nStatus: Confirmed`
        }).catch(err => console.error('Admin email notification failed:', err));
      }

      alert(`✓ Booking Confirmed!\n\nYou have successfully booked a consultation with ${doctor.name}.\n\nBooking ID: ${docRef.id}\nPayment ID: ${paymentResponse.razorpay_payment_id}\n\nYou will receive a confirmation email shortly.`);
      window.location.href = 'index.html';
    })
    .catch((error) => {
      console.error('Error saving booking:', error);
      alert('Payment successful but there was an error saving your booking. Please contact support with payment ID: ' + paymentResponse.razorpay_payment_id);
    });
}

// Export functions to window
window.showDoctorProfile = showDoctorProfile;
window.closeDoctorProfile = closeDoctorProfile;
window.bookDoctorSession = bookDoctorSession;
window.showBookingInstructions = showBookingInstructions;
window.showPaymentInstructions = showPaymentInstructions;
window.proceedToDoctorPayment = proceedToDoctorPayment;
window.DOCTORS = DOCTORS;
window.generateStarRating = generateStarRating;
window.renderDoctorCards = renderDoctorCards;
window.filterDoctors = filterDoctors;

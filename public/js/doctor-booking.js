// Doctor Booking System

// Global variable to store doctors data
let DOCTORS = [];

// Fetch doctors from Firestore
async function fetchDoctorsFromFirestore() {
  try {
    // Fetch all doctors and filter/sort in memory
    const snapshot = await firebase.firestore()
      .collection('doctors')
      .get();

    // Filter active doctors and sort by displayOrder
    DOCTORS = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(doc => doc.active === true)
      .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999));

    console.log(`Loaded ${DOCTORS.length} doctors from Firestore`);
    return DOCTORS;
  } catch (error) {
    console.error('Error fetching doctors:', error);
    // Return empty array if fetch fails
    return [];
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

  // Render the doctor cards
  if (DOCTORS.length > 0) {
    // Check if renderDoctorCards function exists (defined in HTML)
    if (typeof window.renderDoctorCards === 'function') {
      window.renderDoctorCards(DOCTORS);
    } else {
      console.error('renderDoctorCards function not found');
    }
  } else {
    if (container) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 50px; color: #999;"><i class="fa fa-exclamation-circle" style="font-size: 40px; margin-bottom: 15px;"></i><p>No doctors available at the moment. Please check back later.</p></div>';
    }
  }
}

// Initialize when DOM is ready - wait for both Firebase and DOM
let domReady = false;
let firebaseReady = false;

document.addEventListener('DOMContentLoaded', function() {
  domReady = true;
  tryInitialize();
});

// Also try after a short delay to ensure Firebase is loaded
setTimeout(function() {
  firebaseReady = true;
  tryInitialize();
}, 500);

function tryInitialize() {
  // Check if we're on a page with the doctors container and both DOM and Firebase are ready
  if (domReady && firebaseReady && document.getElementById('doctors-container')) {
    // Only initialize if not already initialized
    if (DOCTORS.length === 0) {
      initializeDoctors();
    }
  }
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
  const doctor = DOCTORS.find(d => d.id === doctorId);
  if (!doctor) return;

  const modalHTML = `
    <div id="doctorProfileModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
      <div style="background: white; border-radius: 20px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <button onclick="closeDoctorProfile()" style="position: absolute; top: 20px; right: 20px; background: #f41192; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 20px; z-index: 10; box-shadow: 0 4px 12px rgba(244,17,146,0.3);">×</button>

        <div style="padding: 40px;">
          <div style="display: flex; gap: 30px; margin-bottom: 30px; flex-wrap: wrap;">
            <div style="flex-shrink: 0;">
              <img src="${doctor.image}" alt="${doctor.name}" style="width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 5px solid #f41192;" onerror="this.src='images/doctors/default_placeholder.jpg'">
              <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 32px; font-weight: 800; color: #f41192;">${doctor.rating}</div>
                <div>${generateStarRating(doctor.rating)}</div>
                <div style="font-size: 14px; color: #666; margin-top: 5px;">(${doctor.totalRatings} Ratings)</div>
              </div>
            </div>

            <div style="flex: 1; min-width: 300px;">
              <h2 style="color: #f41192; font-size: 28px; margin-bottom: 5px;">${doctor.name}</h2>
              <p style="font-size: 18px; color: #666; margin-bottom: 10px;">${doctor.title}</p>

              <div style="display: flex; gap: 20px; margin-bottom: 15px; flex-wrap: wrap;">
                <div>
                  <i class="fa fa-graduation-cap" style="color: #f41192; margin-right: 5px;"></i>
                  <strong>${doctor.qualification}</strong>
                </div>
                <div>
                  <i class="fa fa-clock-o" style="color: #f41192; margin-right: 5px;"></i>
                  <strong>${doctor.experience}</strong>
                </div>
                <div>
                  <i class="fa fa-circle" style="color: #4CAF50; margin-right: 5px; font-size: 10px;"></i>
                  <strong>${doctor.status}</strong>
                </div>
              </div>

              <div style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 15px 25px; border-radius: 15px; display: inline-block; margin-bottom: 15px;">
                <div style="font-size: 14px; opacity: 0.9;">Appointment beginning at</div>
                <div style="font-size: 28px; font-weight: 800;">₹${doctor.sessionPrice}</div>
              </div>

              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="bookDoctorSession('${doctor.id}')" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 15px 35px; border-radius: 25px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 0 4px 12px rgba(244,17,146,0.3); flex: 1; min-width: 180px;">Book an Appointment</button>
              </div>
            </div>
          </div>

          <hr style="border: none; border-top: 2px solid #f0f0f0; margin: 30px 0;">

          <div style="margin-bottom: 30px;">
            <h3 style="color: #f41192; font-size: 22px; margin-bottom: 15px;">About</h3>
            <p style="color: #666; line-height: 1.8; font-size: 15px;">${doctor.about}</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #f41192; font-size: 22px; margin-bottom: 15px;">Area of Expertise</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${doctor.expertise.map(exp => `
                <span style="background: linear-gradient(135deg, #FFF9FB 0%, #F0F9FF 100%); color: #f41192; padding: 8px 16px; border-radius: 20px; font-size: 14px; border: 2px solid #f41192;">${exp}</span>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #f41192; font-size: 22px; margin-bottom: 15px;">Languages Known</h3>
            <p style="color: #666; font-size: 16px;">${doctor.languages.join(', ')}</p>
          </div>

          <div>
            <h3 style="color: #f41192; font-size: 22px; margin-bottom: 15px;">Rating Breakdown</h3>
            ${Object.entries(doctor.ratingBreakdown).reverse().map(([stars, percentage]) => `
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <span style="width: 30px; font-weight: 600;">${stars} <i class="fa fa-star" style="color: #FFD700; font-size: 12px;"></i></span>
                <div style="flex: 1; height: 8px; background: #f0f0f0; border-radius: 10px; overflow: hidden;">
                  <div style="height: 100%; background: linear-gradient(90deg, #f41192, #FF6B9D); width: ${percentage}%; border-radius: 10px;"></div>
                </div>
                <span style="width: 50px; text-align: right; color: #666; font-size: 14px;">${percentage}%</span>
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
  const doctor = DOCTORS.find(d => d.id === doctorId);
  if (!doctor) return;

  // Store doctor info for payment after Calendly
  sessionStorage.setItem('selectedDoctor', JSON.stringify({
    id: doctor.id,
    name: doctor.name,
    price: doctor.sessionPrice
  }));

  // Close the modal
  closeDoctorProfile();

  // Use single Calendly link for all doctors (or doctor's custom link if provided)
  const calendlyUrl = doctor.calendlyUrl || 'https://calendly.com/aqiraa-care/doctor-appointment?month=2026-01';

  console.log('Opening Calendly with URL:', calendlyUrl);

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
        Select your preferred date and time in the new tab. After scheduling, return here to complete your payment of <strong>₹${doctor.sessionPrice}</strong>.
      </p>
      <button onclick="proceedToDoctorPayment()" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 12px 25px; border-radius: 20px; border: none; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(244,17,146,0.3); font-size: 15px;">I've Scheduled - Proceed to Payment</button>
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
        Complete your booking by paying <strong>₹${doctor.sessionPrice}</strong> to confirm your appointment with ${doctor.name}.
      </p>
      <button onclick="proceedToDoctorPayment()" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 12px 25px; border-radius: 20px; border: none; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(244,17,146,0.3); font-size: 15px;">Complete Payment ₹${doctor.sessionPrice}</button>
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
    key: 'rzp_live_S2D7Q4ISUUW7c8',
    amount: doctor.price * 100,
    currency: 'INR',
    name: 'Aqiraa',
    description: `Consultation with ${doctor.name}`,
    image: 'https://child-consultant.web.app/images/logo.png',
    prefill: {
      name: userName,
      email: userEmail,
      contact: ''
    },
    notes: {
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      session_type: 'individual_consultation',
      session_price: `₹${doctor.price}`
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

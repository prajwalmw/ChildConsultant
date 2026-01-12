// Doctor Booking System

// Doctor profiles data
const DOCTORS = [
  {
    id: 'dr-pratima-shinde',
    name: 'Dr. Pratima Shinde',
    title: 'Pediatrician',
    experience: '13 Years',
    qualification: 'MBBS, DNB Pediatrics',
    rating: 4.9,
    totalRatings: 342,
    sessionPrice: 999,
    status: 'Online',
    image: 'https://xsgames.co/randomusers/assets/avatars/female/74.jpg',
    calendlyUrl: 'https://calendly.com/aqiraa-care/dr-pratima-shinde',
    about: 'Experienced pediatrician with 13 years of expertise in pediatric care, PICU & NICU management. Running independent pediatric clinic since 2018 with over 5000 teleconsultations provided to rural areas. Certified lactation professional specializing in comprehensive child healthcare.',
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
    }
  },
  {
    id: 'dr-ishani-deshmukh',
    name: 'Dr. Ishani Deshmukh',
    title: 'Child Nutritionist',
    experience: '6 Years',
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
    }
  },
  {
    id: 'dr-tanvi-malhotra',
    name: 'Dr. Tanvi Malhotra',
    title: 'Pediatrician',
    experience: '12 Years',
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
    }
  },
  {
    id: 'dr-nandini-iyer',
    name: 'Dr. Nandini Iyer',
    title: 'Pediatrician',
    experience: '10 Years',
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
    }
  }
];

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
              <img src="${doctor.image}" alt="${doctor.name}" style="width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 5px solid #f41192;" onerror="this.src='images/default-doctor.png'">
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
                <div style="font-size: 14px; opacity: 0.9;">Session beginning at</div>
                <div style="font-size: 28px; font-weight: 800;">₹${doctor.sessionPrice}</div>
              </div>

              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="bookDoctorSession('${doctor.id}')" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 15px 35px; border-radius: 25px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; box-shadow: 0 4px 12px rgba(244,17,146,0.3); flex: 1; min-width: 180px;">Book a Session</button>
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

// Book doctor session (opens Calendly, then Razorpay)
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

  // Open Calendly in a popup
  window.open(doctor.calendlyUrl, 'calendly', 'width=800,height=600');

  // Show message to user
  showCalendlyMessage(doctor);
}

// Show Calendly booking message
function showCalendlyMessage(doctor) {
  const messageHTML = `
    <div id="calendlyMessage" style="position: fixed; bottom: 30px; right: 30px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); z-index: 9998; max-width: 400px; border-left: 5px solid #f41192;">
      <button onclick="document.getElementById('calendlyMessage').remove()" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
      <h4 style="color: #f41192; margin-bottom: 10px; font-size: 18px;">Booking with ${doctor.name}</h4>
      <p style="color: #666; margin-bottom: 15px; font-size: 14px; line-height: 1.6;">After selecting your preferred date and time in Calendly, you'll be redirected to complete the payment of ₹${doctor.sessionPrice}.</p>
      <button onclick="proceedToDoctorPayment()" style="background: linear-gradient(135deg, #f41192, #FF6B9D); color: white; padding: 12px 25px; border-radius: 20px; border: none; font-weight: 700; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(244,17,146,0.3);">Proceed to Payment</button>
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
window.proceedToDoctorPayment = proceedToDoctorPayment;
window.DOCTORS = DOCTORS;
window.generateStarRating = generateStarRating;

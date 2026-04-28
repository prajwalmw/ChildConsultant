// Razorpay Configuration and Payment Handler

// Razorpay Live API Key (Prajwal Waingankar Account)
const RAZORPAY_KEY_ID = 'rzp_live_S6y99PjkyiSG8O';

// Packages are now fetched dynamically from Firestore.

// Initialize Firebase (if not already initialized)
function initializeFirebaseForPayment() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return false;
  }
  return true;
}

// Handle Razorpay Payment
async function initiateRazorpayPayment(packageType) {
  // Check if Razorpay is loaded
  if (typeof Razorpay === 'undefined') {
    alert('Payment system is loading. Please try again in a moment.');
    return;
  }

  // Check if Firebase is initialized
  if (!initializeFirebaseForPayment()) {
    alert('System initialization error. Please refresh the page.');
    return;
  }

  try {
    const pkgDoc = await firebase.firestore().collection('packages').doc(packageType).get();
    if (!pkgDoc.exists) {
      alert('Invalid package selected');
      return;
    }

    const pkgData = pkgDoc.data();
    const durationDays = Number.isFinite(Number(pkgData.durationDays))
      ? Number(pkgData.durationDays)
      : (Number(pkgData.validityMonths) ? Number(pkgData.validityMonths) * 30 : null);

    const packageDetails = {
      name: pkgData.name + ' Package' + (pkgData.isBestSeller ? ' (Best Seller)' : ''),
      price: pkgData.discountedPrice || pkgData.price,
      originalPrice: pkgData.price,
      sessions: pkgData.sessions,
      duration: (typeof durationDays === 'number' ? `${durationDays} Days` : ''),
      description: `${pkgData.sessions} Sessions • ${typeof durationDays === 'number' ? `${durationDays} Days Duration` : ''} • Customized counselling`
    };

    // Get current user (if logged in)
    const user = firebase.auth().currentUser;
    const userEmail = user ? user.email : '';
    const userName = user ? user.displayName || '' : '';

    // Create detailed description for payment (single line for better visibility)
    const detailedDescription = `${packageDetails.name} - ${packageDetails.sessions} Sessions, ${packageDetails.duration} Duration`;

    // Razorpay options
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: packageDetails.price * 100, // Amount in paise (multiply by 100)
      currency: 'INR',
      name: 'Aqiraa',
      description: detailedDescription,
      image: 'https://child-consultant.web.app/images/logo-razorpay.png',
      prefill: {
        name: userName,
        email: userEmail,
        contact: ''
      },
      notes: {
        package_name: packageDetails.name,
        package_type: packageType,
        total_sessions: packageDetails.sessions,
        duration_period: packageDetails.duration,
        original_price: `₹${packageDetails.originalPrice}`,
        discounted_price: `₹${packageDetails.price}`,
        price_per_session: `₹${Math.round(packageDetails.price / packageDetails.sessions)}`
      },
      theme: {
        color: '#f41192'
      },
      handler: function(response) {
        // Payment successful
        handlePaymentSuccess(response, packageType, packageDetails);
      },
      modal: {
        ondismiss: function() {
          console.log('Payment cancelled by user');
        }
      }
    };

    const razorpayInstance = new Razorpay(options);

    razorpayInstance.on('payment.failed', function(response) {
      handlePaymentFailure(response);
    });

    razorpayInstance.open();
  } catch (error) {
    console.error('Error fetching package details:', error);
    alert('Failed to initialize payment. Please try again.');
  }
}

// Handle successful payment
function handlePaymentSuccess(paymentResponse, packageType, packageDetails) {
  console.log('Payment successful:', paymentResponse);

  // Get current user
  const user = firebase.auth().currentUser;

  // Prepare booking data
  const bookingData = {
    paymentId: paymentResponse.razorpay_payment_id,
    orderId: paymentResponse.razorpay_order_id || '',
    signature: paymentResponse.razorpay_signature || '',
    packageType: packageType,
    packageName: packageDetails.name,
    amount: packageDetails.price,
    sessions: packageDetails.sessions,
    duration: packageDetails.duration,
    status: 'confirmed',
    paymentStatus: 'success',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: user ? user.uid : 'guest',
    userEmail: user ? user.email : '',
    userName: user ? user.displayName || '' : '',
    sessionsRemaining: packageDetails.sessions,
    expiryDate: calculateExpiryDate(packageDetails.duration)
  };

  // Save to Firestore
  firebase.firestore().collection('bookings').add(bookingData)
    .then((docRef) => {
      console.log('Booking saved with ID:', docRef.id);

      // Notify Aqiraa admin via EmailJS
      if (typeof emailjs !== 'undefined') {
        emailjs.send("service_zdtmdad", "template_0ljis7t", {
          name: bookingData.userName || 'User',
          email: bookingData.userEmail || 'N/A',
          phone: 'N/A',
          message: `NEW PACKAGE BOOKING ALERT\n\nPackage: ${packageDetails.name}\nSessions: ${packageDetails.sessions}\nDuration: ${packageDetails.duration}\nAmount: ₹${packageDetails.price}\nBooking ID: ${docRef.id}\nPayment ID: ${paymentResponse.razorpay_payment_id}\nUser: ${bookingData.userName || 'N/A'} (${bookingData.userEmail || 'N/A'})\nStatus: Confirmed`
        }).catch(err => console.error('Admin email notification failed:', err));
      }

      // Show success message
      showPaymentSuccessMessage(packageDetails, paymentResponse.razorpay_payment_id);

      // Redirect to confirmation page after 2 seconds
      setTimeout(() => {
        window.location.href = `booking-confirmation.html?bookingId=${docRef.id}`;
      }, 2000);
    })
    .catch((error) => {
      console.error('Error saving booking:', error);
      alert('Payment successful but there was an error saving your booking. Please contact support with payment ID: ' + paymentResponse.razorpay_payment_id);
    });
}

// Handle payment failure
function handlePaymentFailure(response) {
  console.error('Payment failed:', response);

  const errorCode = response.error.code;
  const errorDescription = response.error.description;
  const errorReason = response.error.reason;

  // Save failed payment attempt to Firestore
  const user = firebase.auth().currentUser;
  firebase.firestore().collection('failed_payments').add({
    errorCode: errorCode,
    errorDescription: errorDescription,
    errorReason: errorReason,
    userId: user ? user.uid : 'guest',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert('Payment failed: ' + errorDescription + '\nPlease try again or contact support.');
}

// Calculate expiry date based on duration string (supports days or legacy months)
function calculateExpiryDate(duration) {
  const raw = String(duration || '').toLowerCase();
  const n = parseInt(raw);
  const expiryDate = new Date();

  if (!Number.isFinite(n) || n <= 0) {
    return expiryDate;
  }

  // Legacy: "6 Months"
  if (raw.includes('month')) {
    expiryDate.setMonth(expiryDate.getMonth() + n);
    return expiryDate;
  }

  // Default: days
  expiryDate.setDate(expiryDate.getDate() + n);
  return expiryDate;
}

// Show success message overlay
function showPaymentSuccessMessage(packageDetails, paymentId) {
  const successHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center;" id="payment-success-overlay">
      <div style="background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 500px; box-shadow: 0 10px 50px rgba(0,0,0,0.3);">
        <div style="font-size: 60px; color: #4CAF50; margin-bottom: 20px;">✓</div>
        <h2 style="color: #f41192; margin-bottom: 15px;">Payment Successful!</h2>
        <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Thank you for purchasing the <strong>${packageDetails.name}</strong></p>
        <p style="color: #999; font-size: 14px; margin-bottom: 20px;">Payment ID: ${paymentId}</p>
        <p style="color: #666; font-size: 14px;">Redirecting to confirmation page...</p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', successHTML);
}

// Export functions for global use
window.initiateRazorpayPayment = initiateRazorpayPayment;

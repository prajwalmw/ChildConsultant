// Razorpay Configuration and Payment Handler

// Razorpay Live API Key (Prajwal Waingankar Account)
const RAZORPAY_KEY_ID = 'rzp_live_S6y99PjkyiSG8O';

// Package details configuration
const PACKAGES = {
  basic: {
    name: 'BASIC Package',
    price: 10,
    originalPrice: 9600,
    sessions: 12,
    validity: '3 Months',
    description: '12 Sessions • 3 Months Validity • Customized counselling'
  },
  standard: {
    name: 'STANDARD Package',
    price: 16320,
    originalPrice: 19200,
    sessions: 24,
    validity: '6 Months',
    description: '24 Sessions • 6 Months Validity • Customized counselling'
  },
  premium: {
    name: 'PREMIUM Package (Best Seller)',
    price: 23616,
    originalPrice: 28800,
    sessions: 36,
    validity: '9 Months',
    description: '36 Sessions • 9 Months Validity • Customized counselling'
  },
  elite: {
    name: 'ELITE Package',
    price: 30336,
    originalPrice: 38400,
    sessions: 48,
    validity: '12 Months',
    description: '48 Sessions • 12 Months Validity • Customized counselling'
  }
};

// Initialize Firebase (if not already initialized)
function initializeFirebaseForPayment() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return false;
  }
  return true;
}

// Handle Razorpay Payment
function initiateRazorpayPayment(packageType) {
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

  const packageDetails = PACKAGES[packageType];
  if (!packageDetails) {
    alert('Invalid package selected');
    return;
  }

  // Get current user (if logged in)
  const user = firebase.auth().currentUser;
  const userEmail = user ? user.email : '';
  const userName = user ? user.displayName || '' : '';

  // Create detailed description for payment (single line for better visibility)
  const detailedDescription = `${packageDetails.name} - ${packageDetails.sessions} Sessions, ${packageDetails.validity} Validity`;

  // Razorpay options
  const options = {
    key: RAZORPAY_KEY_ID,
    amount: packageDetails.price * 100, // Amount in paise (multiply by 100)
    currency: 'INR',
    name: 'Aqiraa',
    description: detailedDescription,
    image: 'https://child-consultant.web.app/images/logo-razorpay.png', // Optimized logo for payment gateways (512x512, 302KB)
    prefill: {
      name: userName,
      email: userEmail,
      contact: ''
    },
    notes: {
      package_name: packageDetails.name,
      package_type: packageType,
      total_sessions: packageDetails.sessions,
      validity_period: packageDetails.validity,
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
    validity: packageDetails.validity,
    status: 'confirmed',
    paymentStatus: 'success',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: user ? user.uid : 'guest',
    userEmail: user ? user.email : '',
    userName: user ? user.displayName || '' : '',
    sessionsRemaining: packageDetails.sessions,
    expiryDate: calculateExpiryDate(packageDetails.validity)
  };

  // Save to Firestore
  firebase.firestore().collection('bookings').add(bookingData)
    .then((docRef) => {
      console.log('Booking saved with ID:', docRef.id);

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

// Calculate expiry date based on validity period
function calculateExpiryDate(validity) {
  const months = parseInt(validity);
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
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

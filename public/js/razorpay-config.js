// Razorpay Configuration and Payment Handler
// Wrapped so the file can be injected twice (recovery) without const redeclaration errors.
(function () {
  'use strict';
  if (window.__aqiraaRzpConfigExecuted) {
    return;
  }
  window.__aqiraaRzpConfigExecuted = true;

// Razorpay Live API Key (Prajwal Waingankar Account)
const RAZORPAY_KEY_ID = 'rzp_live_S6y99PjkyiSG8O';
const INR_SIGN = '\u20B9';

// Packages are now fetched dynamically from Firestore.

/** @returns {{ amount: number, useMonths: boolean }} */
function getPackageDurationParts(pkg) {
  if (!pkg || typeof pkg !== 'object') return { amount: 0, useMonths: false };
  if (Number.isFinite(Number(pkg.durationAmount)) && Number(pkg.durationAmount) > 0) {
    return { amount: Number(pkg.durationAmount), useMonths: pkg.durationDisplayMonths === true };
  }
  if (Number.isFinite(Number(pkg.durationDays)) && Number(pkg.durationDays) > 0) {
    return { amount: Number(pkg.durationDays), useMonths: false };
  }
  if (Number.isFinite(Number(pkg.validityMonths)) && Number(pkg.validityMonths) > 0) {
    return { amount: Number(pkg.validityMonths), useMonths: true };
  }
  return { amount: 0, useMonths: false };
}

function formatPackageDurationLabel(pkg) {
  const { amount, useMonths } = getPackageDurationParts(pkg);
  if (!amount) return '';
  if (useMonths) return `${amount} month${amount === 1 ? '' : 's'}`;
  return `${amount} day${amount === 1 ? '' : 's'}`;
}

function calculateExpiryDateFromPackage(pkg) {
  const { amount, useMonths } = getPackageDurationParts(pkg);
  const expiryDate = new Date();
  if (!Number.isFinite(amount) || amount <= 0) return expiryDate;
  if (useMonths) {
    expiryDate.setMonth(expiryDate.getMonth() + amount);
    return expiryDate;
  }
  expiryDate.setDate(expiryDate.getDate() + amount);
  return expiryDate;
}

// Initialize Firebase (if not already initialized)
function initializeFirebaseForPayment() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    return false;
  }
  return true;
}

function waitForRazorpayReady(timeoutMs) {
  var max = timeoutMs != null ? timeoutMs : 20000;
  var start = Date.now();
  return new Promise(function (resolve) {
    function tick() {
      if (typeof Razorpay !== 'undefined') {
        resolve(true);
        return;
      }
      if (Date.now() - start >= max) {
        resolve(false);
        return;
      }
      setTimeout(tick, 50);
    }
    tick();
  });
}

function escapeHtmlForAttr(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

/** Digits only; keeps last 10 for Indian +91 style input. */
function normalizePhoneDigits(raw) {
  var d = String(raw || '').replace(/\D/g, '');
  if (d.length >= 12 && d.slice(0, 2) === '91') {
    d = d.slice(-10);
  }
  if (d.length > 10 && d.slice(0, 1) === '0') {
    d = d.replace(/^0+/, '');
  }
  return d;
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

/**
 * Collect buyer contact details before Razorpay (same fields as site inquiry flow).
 * Pre-fills from Firebase Auth when the user is signed in.
 */
function showPackageBuyerModal(packageType, packageDetails, onConfirm) {
  var existing = document.getElementById('package-buyer-modal-overlay');
  if (existing) existing.remove();

  var user = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth().currentUser : null;
  var defName = user && user.displayName ? String(user.displayName).trim() : '';
  var defEmail = user && user.email ? String(user.email).trim() : '';

  var pkgTitle = escapeHtmlForAttr(packageDetails.name);
  var priceStr = escapeHtmlForAttr(String(packageDetails.price));

  var html =
    '<div id="package-buyer-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;">' +
    '<div style="background:#fff;border-radius:20px;max-width:440px;width:100%;padding:28px 24px 22px;box-shadow:0 20px 50px rgba(0,0,0,0.25);position:relative;">' +
    '<button type="button" id="package-buyer-modal-close" aria-label="Close" style="position:absolute;top:14px;right:14px;width:36px;height:36px;border:none;border-radius:50%;background:#f1f5f9;color:#64748b;font-size:20px;line-height:1;cursor:pointer;">×</button>' +
    '<h3 style="margin:0 0 6px;font-size:20px;color:#1e293b;font-weight:800;">Your details</h3>' +
    '<p style="margin:0 0 18px;font-size:14px;color:#64748b;line-height:1.5;">We need this to confirm your booking and reach you. You will pay <strong class="inr-money">' +
    INR_SIGN +
    priceStr +
    '</strong> for <strong>' +
    pkgTitle +
    '</strong>.</p>' +
    '<label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Full name *</label>' +
    '<input id="pkg-buyer-name" type="text" autocomplete="name" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px;font-size:15px;" />' +
    '<label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Email *</label>' +
    '<input id="pkg-buyer-email" type="email" autocomplete="email" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px;font-size:15px;" />' +
    '<label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Mobile *</label>' +
    '<input id="pkg-buyer-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="10-digit mobile" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;font-size:15px;" />' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<button type="button" id="pkg-buyer-cancel" style="flex:1;min-width:120px;padding:14px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;color:#475569;font-weight:700;cursor:pointer;font-size:15px;">Cancel</button>' +
    '<button type="button" id="pkg-buyer-continue" style="flex:1;min-width:120px;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#f41192,#9e0ff1);color:#fff !important;-webkit-text-fill-color:#fff;font-weight:700;cursor:pointer;font-size:15px;box-shadow:0 4px 14px rgba(244,17,146,0.35);">Continue to pay</button>' +
    '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
  var nameEl = document.getElementById('pkg-buyer-name');
  var emailEl = document.getElementById('pkg-buyer-email');
  var phoneEl = document.getElementById('pkg-buyer-phone');
  if (nameEl) nameEl.value = defName;
  if (emailEl) emailEl.value = defEmail;

  function closeModal() {
    var el = document.getElementById('package-buyer-modal-overlay');
    if (el) el.remove();
  }

  function submit() {
    var name = nameEl ? nameEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';
    var phoneDigits = normalizePhoneDigits(phoneEl ? phoneEl.value : '');
    if (name.length < 2) {
      alert('Please enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    if (phoneDigits.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    closeModal();
    onConfirm({ name: name, email: email, phone: phoneDigits });
  }

  document.getElementById('pkg-buyer-continue').addEventListener('click', submit);
  document.getElementById('pkg-buyer-cancel').addEventListener('click', closeModal);
  document.getElementById('package-buyer-modal-close').addEventListener('click', closeModal);
}

function openRazorpayForPackage(packageType, packageDetails, buyer) {
  var discPs = Number.isFinite(Number(packageDetails.discPs))
    ? Number(packageDetails.discPs)
    : Math.round(packageDetails.price / Math.max(1, packageDetails.sessions));

  var detailedDescription =
    packageDetails.name + ' - ' + packageDetails.sessions + ' Sessions, ' + (packageDetails.duration || 'Duration n/a');

  var options = {
    key: RAZORPAY_KEY_ID,
    amount: packageDetails.price * 100,
    currency: 'INR',
    name: 'Aqiraa',
    description: detailedDescription,
    image: 'https://child-consultant.web.app/images/logo-razorpay.png',
    prefill: {
      name: buyer.name,
      email: buyer.email,
      contact: buyer.phone
    },
    notes: {
      package_name: packageDetails.name,
      package_type: packageType,
      total_sessions: packageDetails.sessions,
      duration_period: packageDetails.duration,
      original_price: INR_SIGN + packageDetails.originalPrice,
      discounted_price: INR_SIGN + packageDetails.price,
      price_per_session: INR_SIGN + discPs,
      buyer_name: buyer.name,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone
    },
    theme: {
      color: '#f41192'
    },
    handler: function (response) {
      handlePaymentSuccess(response, packageType, packageDetails, buyer);
    },
    modal: {
      ondismiss: function () {
        console.log('Payment cancelled by user');
      }
    }
  };

  var razorpayInstance = new Razorpay(options);
  razorpayInstance.on('payment.failed', function (response) {
    handlePaymentFailure(response);
  });
  razorpayInstance.open();
}

// Handle Razorpay Payment — attached to window immediately so package buttons never see a missing handler.
window.initiateRazorpayPayment = async function initiateRazorpayPayment(packageType) {
  // Check if Firebase is initialized
  if (!initializeFirebaseForPayment()) {
    alert('System initialization error. Please refresh the page.');
    return;
  }

  var ready = await waitForRazorpayReady(20000);
  if (!ready || typeof Razorpay === 'undefined') {
    alert('Payment system is still loading. Please wait a few seconds and tap Book again, or refresh the page.');
    return;
  }

  try {
    const pkgDoc = await firebase.firestore().collection('packages').doc(packageType).get();
    if (!pkgDoc.exists) {
      alert('Invalid package selected');
      return;
    }

    const pkgData = pkgDoc.data();
    const sessions = Math.max(1, parseInt(pkgData.sessions, 10) || 1);
    const durationLabel = formatPackageDurationLabel(pkgData);
    const displayName = (pkgData.name || '').trim() || pkgDoc.id;
    const listPrice = Number(pkgData.price);
    const payPrice = Number(pkgData.discountedPrice != null ? pkgData.discountedPrice : pkgData.price);
    const priceNum = Number.isFinite(payPrice) && payPrice > 0 ? payPrice : (Number.isFinite(listPrice) ? listPrice : 0);
    const discPs = Number.isFinite(Number(pkgData.discountedPricePerSession))
      ? Number(pkgData.discountedPricePerSession)
      : Math.round(priceNum / sessions);

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      alert('This package has no valid price. Please contact support.');
      return;
    }

    const packageDetails = {
      name: displayName + (pkgData.isBestSeller ? ' (Best Seller)' : ''),
      price: priceNum,
      originalPrice: Number.isFinite(listPrice) ? listPrice : priceNum,
      sessions,
      duration: durationLabel,
      description: [sessions ? `${sessions} Sessions` : '', durationLabel, 'Customized counselling'].filter(Boolean).join(' • '),
      expiryDate: calculateExpiryDateFromPackage(pkgData),
      discPs: discPs
    };

    showPackageBuyerModal(packageType, packageDetails, function (buyer) {
      openRazorpayForPackage(packageType, packageDetails, buyer);
    });
  } catch (error) {
    console.error('Error fetching package details:', error);
    alert('Failed to initialize payment. Please try again.');
  }
}

// Handle successful payment
function handlePaymentSuccess(paymentResponse, packageType, packageDetails, buyer) {
  console.log('Payment successful:', paymentResponse);

  // Get current user
  const user = firebase.auth().currentUser;
  const b = buyer && typeof buyer === 'object' ? buyer : {};
  const contactName = (b.name || '').trim() || (user && user.displayName) || '';
  const contactEmail = (b.email || '').trim() || (user && user.email) || '';
  const contactPhone = (b.phone || '').trim() || '';

  // Prepare booking data (contact fields are what the customer entered before checkout)
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
    userEmail: contactEmail,
    userName: contactName,
    userPhone: contactPhone,
    sessionsRemaining: packageDetails.sessions,
    expiryDate: packageDetails.expiryDate
  };

  // Save to Firestore
  firebase.firestore().collection('bookings').add(bookingData)
    .then((docRef) => {
      console.log('Booking saved with ID:', docRef.id);

      if (typeof window.aqiraaFirePurchaseConversion === 'function') {
        window.aqiraaFirePurchaseConversion(packageDetails.price, 'INR', paymentResponse.razorpay_payment_id);
      }

      // Notify Aqiraa admin via EmailJS (same template fields as the contact inquiry form)
      if (typeof emailjs !== 'undefined') {
        var phoneDisplay = contactPhone ? '+91 ' + contactPhone : 'N/A';
        emailjs.send("service_zdtmdad", "template_0ljis7t", {
          name: contactName || 'Package buyer',
          email: contactEmail || 'N/A',
          phone: phoneDisplay,
          message: `NEW PACKAGE BOOKING\n\nPackage: ${packageDetails.name}\nSessions: ${packageDetails.sessions}\nDuration: ${packageDetails.duration}\nAmount: ${INR_SIGN}${packageDetails.price}\nBooking ID: ${docRef.id}\nPayment ID: ${paymentResponse.razorpay_payment_id}\nContact: ${contactName || 'N/A'}\nEmail: ${contactEmail || 'N/A'}\nMobile: ${phoneDisplay}\nFirebase user: ${user ? user.uid : 'guest'}\nStatus: Confirmed`
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

// Export helpers for global use (initiateRazorpayPayment assigned above)
window.waitForRazorpayReady = waitForRazorpayReady;
window.formatPackageDurationLabel = formatPackageDurationLabel;
window.calculateExpiryDateFromPackage = calculateExpiryDateFromPackage;
window.getPackageDurationParts = getPackageDurationParts;

})();

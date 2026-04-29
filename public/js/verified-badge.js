/**
 * Simple verified mark: flat blue circle + white check.
 * Firestore: doctors.verified — false hides; omit/true shows.
 */
(function (global) {
  function isDoctorVerified(doctor) {
    return !!(doctor && doctor.verified !== false);
  }

  /**
   * @param {number} size - pixel width/height
   */
  function verifiedBadgeSVG(size) {
    var s = size || 20;
    return (
      '<svg class="ig-verified-badge" viewBox="0 0 24 24" width="' +
      s +
      '" height="' +
      s +
      '" role="img" aria-label="Verified medical expert">' +
      '<circle cx="12" cy="12" r="10" fill="#0095F6"/>' +
      '<path d="M8.2 12.4l2.2 2.2 5.4-5.4" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  global.isDoctorVerified = isDoctorVerified;
  global.verifiedBadgeSVG = verifiedBadgeSVG;
})(typeof window !== 'undefined' ? window : this);

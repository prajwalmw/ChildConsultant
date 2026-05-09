// JavaScript Document — Animsition page transitions (site-wide)

/** Same document path as index for Firebase Hosting (/ vs /index.html). */
function sameDocPath(a, b) {
  function norm(p) {
    if (!p || p === '/') return '/index.html';
    return p;
  }
  return norm(a) === norm(b);
}

function scrollToIdFromHash(hash) {
  if (!hash || hash === '#') return false;
  var id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;
  if (typeof window.aqiraaScrollToAnchorById === 'function') {
    /* Instant on hash loads — smooth scroll often loses races with layout shifts / animsition */
    return !!window.aqiraaScrollToAnchorById(id, null, { behavior: 'auto' });
  }
  var target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'auto', block: 'start' });
  return true;
}

$(document).ready(function () {
  $('.animsition').animsition({
    // Only real navigations; skip #, javascript:, mailto — avoids broken back/home and in-page anchors
    linkElement:
      'a.animsition-link[href]:not([href^="#"]):not([href^="javascript:"]):not([href^="mailto:"])',
    inClass: 'fade-in',
    outClass: 'fade-out',
    inDuration: 420,
    outDuration: 280,
    loading: false,
    transition: function (url) {
      if (!url || url === '#' || String(url).toLowerCase().indexOf('javascript:') === 0) {
        return;
      }
      var abs;
      try {
        abs = new URL(url, window.location.href);
      } catch (e) {
        window.location.href = url;
        return;
      }
      var cur = new URL(window.location.href);
      if (
        abs.origin === cur.origin &&
        sameDocPath(abs.pathname, cur.pathname) &&
        abs.search === cur.search
      ) {
        if (abs.hash && scrollToIdFromHash(abs.hash)) {
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.location.href = abs.href;
    }
  });

  /* Early hash scroll (DOM ready). window.load may be late on slow networks / heavy images. */
  scrollToHashOnLoad();
  scheduleHomepageHashRetries();
});

// Deep links from ads (e.g. /index.html#doctor-booking): scroll after paint / layout
function scrollToHashOnLoad() {
  if (!window.location.hash || window.location.hash.length < 2) return;
  scrollToIdFromHash(window.location.hash);
}

function scheduleHomepageHashRetries() {
  if (!window.location.hash || window.location.hash.length < 2) return;
  var delays = [60, 180, 450, 900, 1800];
  delays.forEach(function (ms) {
    setTimeout(scrollToHashOnLoad, ms);
  });
}

// Handle Get Started button click — outside animsition; deep-link scroll after layout
$(window).on('load', function () {
  scrollToHashOnLoad();
  setTimeout(scrollToHashOnLoad, 120);

  window.addEventListener('hashchange', scrollToHashOnLoad);

  $('#get-started-btn').on('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (typeof window.aqiraaScrollToAnchorById === 'function') {
      window.aqiraaScrollToAnchorById('packages-section', null);
    }
    return false;
  });

  var btn = document.getElementById('get-started-btn');
  if (btn) {
    btn.addEventListener(
      'click',
      function (e) {
        e.preventDefault();
        if (typeof window.aqiraaScrollToAnchorById === 'function') {
          window.aqiraaScrollToAnchorById('packages-section', null);
        }
      },
      true
    );
  }
});

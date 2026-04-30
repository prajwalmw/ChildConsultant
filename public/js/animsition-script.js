// JavaScript Document — Animsition page transitions (site-wide)

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
        abs.pathname === cur.pathname &&
        abs.search === cur.search
      ) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      window.location.href = abs.href;
    }
  });
});

// Handle Get Started button click - outside animsition
$(window).on('load', function () {
  $('#get-started-btn').on('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var packagesSection = document.getElementById('packages');
    if (packagesSection) {
      packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return false;
  });

  var btn = document.getElementById('get-started-btn');
  if (btn) {
    btn.addEventListener(
      'click',
      function (e) {
        e.preventDefault();
        var packagesSection = document.getElementById('packages');
        if (packagesSection) {
          packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
      true
    );
  }
});

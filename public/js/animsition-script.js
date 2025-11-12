// JavaScript Document

 $(document).ready(function() {
    $('.animsition').animsition({
      linkElement: '.animsition-link'
    });
  });

  // Handle Get Started button click - outside animsition
  $(window).on('load', function() {
    $('#get-started-btn').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('Get Started button clicked!');

      var contactForm = document.getElementById('contact-form');
      if (contactForm) {
        contactForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return false;
    });

    // Also try with direct event listener
    var btn = document.getElementById('get-started-btn');
    if (btn) {
      console.log('Button found:', btn);
      btn.addEventListener('click', function(e) {
        console.log('Native click handler fired');
        e.preventDefault();
        var contactForm = document.getElementById('contact-form');
        if (contactForm) {
          contactForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, true);
    }
  });
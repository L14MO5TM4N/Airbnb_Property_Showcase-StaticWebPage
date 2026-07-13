/* =============================================================
   gallery.js — Photo gallery lightbox + review slideshow logic
   Used on: sodra-rorum/index.html and balinge/index.html

   This file handles three things:
     1. Lightbox — opens when any gallery thumbnail or the hero
        image is clicked; supports prev/next and keyboard nav
     2. Review slideshows — two independent auto-advancing
        slideshows (one for Airbnb reviews, one for Booking.com)
     3. Keyboard accessibility — arrow keys and Escape work
        while the lightbox is open

   Dependencies:
     - gallery.css must be loaded on the same page
     - The HTML structure must match what is described in gallery.css

   This file is shared between both property pages.
   ============================================================= */


/* =============================================================
   SECTION 1 — LIGHTBOX

   The lightbox shows one gallery image at a time, full-screen.

   How it works:
     - On page load, we collect all images inside .photo-grid
       into an array called "galleryImages"
     - When any thumbnail (or the hero image) is clicked,
       we open the lightbox and show that image
     - Prev/next buttons and arrow keys move through the array
     - Clicking the overlay background or pressing Escape closes it
   ============================================================= */

(function () {

  /* --- Find the lightbox elements in the DOM --- */
  var lightbox     = document.querySelector('.lightbox');
  var lightboxImg  = document.querySelector('.lightbox__image');
  var closeBtn     = document.querySelector('.lightbox__close');
  var prevBtn      = document.querySelector('.lightbox__prev');
  var nextBtn      = document.querySelector('.lightbox__next');
  var counter      = document.querySelector('.lightbox__counter');

  /* If there is no lightbox on this page, stop here.
     This prevents errors if the script is accidentally loaded
     on a page that doesn't have the lightbox HTML. */
  if (!lightbox) return;

  /* --- Build the gallery image list ---
     We look for all images inside .photo-grid items.
     Each image's src and alt are stored so we can display them
     in the lightbox without needing to duplicate data. */
  var galleryImages = [];

  document.querySelectorAll('.photo-grid__item img').forEach(function (img) {
    galleryImages.push({
      src: img.src,   /* Full URL to the image */
      alt: img.alt    /* Alt text for screen readers */
    });
  });

  /* The index of the image currently shown in the lightbox */
  var currentIndex = 0;

  /* --- Open the lightbox at a given index ---
     Called when a thumbnail or hero image is clicked */
  function openLightbox(index) {
    currentIndex = index;
    showImage(currentIndex);
    lightbox.classList.add('is-open');

    /* Prevent the page from scrolling while the lightbox is open */
    document.body.style.overflow = 'hidden';

    /* Move keyboard focus to the close button so keyboard users
       can immediately navigate or close */
    closeBtn.focus();
  }

  /* --- Close the lightbox --- */
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';  /* Restore page scrolling */
  }

  /* --- Show the image at a given index ---
     Updates the <img> src and the counter text */
  function showImage(index) {
    /* Clamp index to valid range (0 to length-1) */
    currentIndex = (index + galleryImages.length) % galleryImages.length;

    var entry = galleryImages[currentIndex];

    /* Briefly fade the image out while the new one loads */
    lightboxImg.classList.add('is-loading');

    lightboxImg.src = entry.src;
    lightboxImg.alt = entry.alt;

    /* Fade back in once the image has loaded */
    lightboxImg.onload = function () {
      lightboxImg.classList.remove('is-loading');
    };

    /* Update the counter e.g. "3 / 12" */
    if (counter) {
      counter.textContent = (currentIndex + 1) + ' / ' + galleryImages.length;
    }
  }

  /* --- Wire up thumbnail clicks ---
     Each .photo-grid__item gets a click handler that opens the
     lightbox at the correct index */
  document.querySelectorAll('.photo-grid__item').forEach(function (item, index) {
    item.addEventListener('click', function () {
      openLightbox(index);
    });

    /* Make thumbnails keyboard-accessible — pressing Enter or Space
       on a focused thumbnail opens the lightbox */
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'Open photo ' + (index + 1) + ' in full screen');

    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });
  });

  /* --- Wire up the hero image ---
     The hero image at the top of the property page also opens
     the lightbox at index 0 (the first/featured gallery photo) */
  var heroTrigger = document.querySelector('.hero-image-link');
  if (heroTrigger) {
    heroTrigger.addEventListener('click', function (e) {
      e.preventDefault();   /* Stop the link from navigating */
      openLightbox(0);
    });
  }

  /* --- Navigation buttons --- */
  prevBtn.addEventListener('click', function () {
    showImage(currentIndex - 1);
  });

  nextBtn.addEventListener('click', function () {
    showImage(currentIndex + 1);
  });

  /* --- Close button --- */
  closeBtn.addEventListener('click', closeLightbox);

  /* --- Close when clicking the dark overlay background ---
     Only close if the click target is the lightbox itself,
     not one of the buttons or the image inside it */
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  /* --- Keyboard navigation ---
     Arrow keys navigate while lightbox is open.
     Escape closes it. */
  document.addEventListener('keydown', function (e) {
    /* Only respond to keys while the lightbox is open */
    if (!lightbox.classList.contains('is-open')) return;

    if (e.key === 'ArrowLeft')  showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    if (e.key === 'Escape')     closeLightbox();
  });

})();
/* End of lightbox IIFE — all variables above are private to this block */


/* =============================================================
   SECTION 2 — REVIEW SLIDESHOWS

   Each property page has two review slideshows side by side —
   one for Airbnb reviews, one for Booking.com reviews.

   Both slideshows are initialised by the same function below.
   We look for all elements with [data-review-slideshow] and
   set up an independent timer for each one.

   This means:
     - Adding a third review slideshow to a page requires no JS changes —
       just add the HTML with data-review-slideshow and it works
     - Each slideshow runs at its own pace independently
   ============================================================= */

(function () {

  /* How long each review slide is shown before advancing */
  var REVIEW_INTERVAL = 6000;  /* 6 seconds — reviews need more reading time */

  /* Find all review slideshows on the page */
  var slideshows = document.querySelectorAll('[data-review-slideshow]');

  /* Initialise each one independently */
  slideshows.forEach(function (slideshow) {

    var slides = slideshow.querySelectorAll('.review-slide');
    var dots   = slideshow.querySelectorAll('.review-dot');
    var current = 0;
    var timer;

    /* If this slideshow has fewer than 2 slides, nothing to advance */
    if (slides.length < 2) return;

    function goToSlide(index) {
  var previous = current;
  current = (index + slides.length) % slides.length;

  if (previous === current) return;

  var outgoing = slides[previous];
  var incoming = slides[current];

  outgoing.classList.remove('is-active');
  incoming.classList.add('is-active');

  /* Incoming slide slides in from the right to center */
  incoming.style.transform = 'translateX(0)';
  /* Outgoing slide slides out to the left */
  outgoing.style.transform = 'translateX(-100%)';

  /* Once the outgoing slide has finished sliding off-screen to the left,
     silently snap it back to "waiting on the right" with no animation —
     so it's ready to slide in correctly the next time it's its turn. */
  outgoing.addEventListener('transitionend', function resetPosition() {
    outgoing.style.transition = 'none';
    outgoing.style.transform = 'translateX(100%)';
    void outgoing.offsetWidth; /* forces the browser to apply the change immediately */
    outgoing.style.transition = '';
    outgoing.removeEventListener('transitionend', resetPosition);
  });
}

    function startTimer() {
      timer = setInterval(function () {
        goToSlide(current + 1);
      }, REVIEW_INTERVAL);
    }

    function resetTimer() {
      clearInterval(timer);
      startTimer();
    }

    /* Wire up dot buttons for manual navigation */
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = parseInt(dot.getAttribute('data-index'), 10);
        goToSlide(index);
        resetTimer();
      });
    });

    /* Start the auto-advance timer */
    startTimer();
  });

})();
/* End of review slideshow IIFE */


/* =============================================================
   END OF gallery.js

   Checklist for using this file on a property page:
     [ ] gallery.css is linked in the <head>
     [ ] gallery.js is linked at the bottom of <body>
     [ ] .lightbox HTML is present (see property page template)
     [ ] .photo-grid items are present with images
     [ ] Hero image is wrapped in <a class="hero-image-link">
     [ ] Review slideshows use [data-review-slideshow] attribute
     [ ] Review dots use data-index="0", "1", etc.
   ============================================================= */
/* =============================================================
   gallery.js — Photo gallery lightbox + review slideshow logic
   Used on: index.html (Bälinge) and sodra-rorum/index.html

   This file handles four things:
     1. Lightbox — opens when any gallery thumbnail, the single-image
        hero, or the hero slideshow is clicked; supports prev/next,
        keyboard nav, and touch swipe
     2. Review slideshows — two independent auto-advancing
        slideshows (one for Airbnb reviews, one for Booking.com)
     3. Read More toggle — expands/collapses long intro text
     4. Hero slideshow — auto-advance, dots, touch swipe, and
        clicking through to the matching lightbox photo

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
     - Prev/next buttons, arrow keys, and touch swipe move through
       the array
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

  /* --- Wire up the single-image hero (used on sodra-rorum/index.html) ---
     The hero image at the top of that property page opens the
     lightbox at index 0 (the first/featured gallery photo). Pages
     using the multi-image hero-slideshow instead are handled by
     Section 4 further down, which links back into this section. */
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

  /* --- Touch swipe inside the lightbox (phones/tablets only) ---
     Swipe left advances to the next photo, swipe right goes back.
     Only the horizontal distance matters — a mostly-vertical touch
     (e.g. an accidental scroll attempt) is ignored. */
  var lbTouchStartX = 0;
  var lbTouchStartY = 0;
  var SWIPE_THRESHOLD = 40; /* minimum pixels to count as a deliberate swipe */

  lightbox.addEventListener('touchstart', function (e) {
    lbTouchStartX = e.changedTouches[0].clientX;
    lbTouchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    var deltaX = e.changedTouches[0].clientX - lbTouchStartX;
    var deltaY = e.changedTouches[0].clientY - lbTouchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        showImage(currentIndex + 1); /* swiped left -> next */
      } else {
        showImage(currentIndex - 1); /* swiped right -> previous */
      }
    }
  });

  /* --- Expose to Section 4 (hero slideshow) ---
     Section 4 lives in its own IIFE below and needs to open the
     lightbox at a specific photo, and needs to know which photos
     exist, so we hand out references via window. This is the
     simplest way for two independent, self-contained script blocks
     to talk to each other without merging them into one. */
  window.openGalleryLightbox = openLightbox;
  window.galleryImages       = galleryImages;

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
   SECTION 3 — READ MORE TOGGLE

   Collapses long text blocks and reveals a "Read more" / "Read less"
   button to expand them.

   Structure expected in HTML:
     <div class="read-more" data-read-more>
       <p class="text-lead">...</p>
     </div>
     <button class="read-more__toggle" data-read-more-toggle>Read more</button>
   ============================================================= */

(function () {

  document.querySelectorAll('[data-read-more]').forEach(function (block) {

    var toggle = block.nextElementSibling;
    if (!toggle || !toggle.hasAttribute('data-read-more-toggle')) return;

    /* If the text already fits within the collapsed height, there's
       nothing to expand — hide the button entirely. */
    if (block.scrollHeight <= block.clientHeight + 4) {
      toggle.style.display = 'none';
      return;
    }

    toggle.setAttribute('aria-expanded', 'false');

    toggle.addEventListener('click', function () {
      var expanded = block.classList.toggle('is-expanded');
      toggle.textContent = expanded ? 'Read less' : 'Read more';
      toggle.setAttribute('aria-expanded', expanded);
    });

  });

})();
/* End of read-more IIFE */


/* =============================================================
   SECTION 4 — HERO SLIDESHOW

   Handles the auto-advancing multi-image hero banner used on
   index.html (Bälinge). This logic used to live in an inline
   <script> in index.html — it's been moved here so it can share
   code with the lightbox (Section 1) for the gallery click-through
   and touch swipe below.

   If a page doesn't have a .hero-slideshow (e.g. sodra-rorum/index.html,
   which still uses the single-image .property-hero), this entire
   section quietly does nothing.
   ============================================================= */

(function () {

  var INTERVAL = 5000;  /* 5 seconds between auto-advances */

  var slideshow = document.querySelector('.hero-slideshow');
  var track     = document.querySelector('.hero-slideshow__track');
  var slides    = document.querySelectorAll('.hero-slideshow__slide');
  var dots      = document.querySelectorAll('.hero-slideshow__dot');

  /* Not on this page — stop here */
  if (!slideshow || !slides.length) return;

  var currentIndex = 0;
  var timer;

  /* Show the slide at the given index — slides the whole track so
     that slide lines up in view, and updates the active dot.
     The "is-active" class no longer controls visibility (the CSS
     no longer uses it for that) — it's kept purely as a marker so
     the click-to-gallery handler below can find "whichever slide
     is currently showing" without tracking a separate variable. */
  function goToSlide(index) {
    slides[currentIndex].classList.remove('is-active');
    if (dots.length) dots[currentIndex].classList.remove('is-active');

    currentIndex = (index + slides.length) % slides.length;

    slides[currentIndex].classList.add('is-active');
    if (dots.length) dots[currentIndex].classList.add('is-active');

    track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
  }

  function nextSlide() { goToSlide(currentIndex + 1); }
  function prevSlide() { goToSlide(currentIndex - 1); }

  function startTimer() { timer = setInterval(nextSlide, INTERVAL); }

  /* Used after a manual interaction (dot click or swipe) so the
     new slide gets a full interval before auto-advancing again */
  function resetTimer() {
    clearInterval(timer);
    startTimer();
  }

  /* Wire up each dot button to jump to its slide */
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goToSlide(parseInt(dot.getAttribute('data-index'), 10));
      resetTimer();
    });
  });

  startTimer();

  /* --- Click-through to the gallery ---
     Clicking the track opens the lightbox at whichever photo is
     currently showing, matched by comparing image src against the
     gallery photo array built in Section 1 (shared via window).
     If the currently-shown photo isn't in the gallery for some
     reason, it falls back to opening at the first gallery photo
     rather than doing nothing. */
  var justSwiped = false; /* true briefly after a swipe, so the
                              resulting click doesn't ALSO open the gallery */

  if (track) {
    track.addEventListener('click', function () {
      if (justSwiped) return;
      if (typeof window.openGalleryLightbox !== 'function') return;

      var activeImg = track.querySelector('.hero-slideshow__slide.is-active img');
      if (!activeImg) return;

      var images = window.galleryImages || [];
      var matchIndex = images.findIndex(function (entry) {
        return entry.src === activeImg.src;
      });

      window.openGalleryLightbox(matchIndex !== -1 ? matchIndex : 0);
    });
  }

  /* --- Touch swipe (phones/tablets only) ---
     Swipe left -> next slide, swipe right -> previous slide.
     A mostly-vertical touch (e.g. scrolling the page) is ignored. */
  var touchStartX = 0;
  var touchStartY = 0;
  var SWIPE_THRESHOLD = 40; /* minimum pixels to count as a deliberate swipe */

  if (track) {
    track.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      justSwiped = false;
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
      var deltaX = e.changedTouches[0].clientX - touchStartX;
      var deltaY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        justSwiped = true;
        resetTimer();
        if (deltaX < 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    });
  }

})();
/* End of hero slideshow IIFE */


/* =============================================================
   END OF gallery.js

   Checklist for using this file on a property page:
     [ ] gallery.css is linked in the <head>
     [ ] gallery.js is linked at the bottom of <body>
     [ ] .lightbox HTML is present (see property page template)
     [ ] .photo-grid items are present with images
     [ ] If using the hero-slideshow (not the single-image hero),
         there is no separate inline <script> for it in the page —
         Section 4 above handles it entirely
   ============================================================= */
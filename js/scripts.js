/* =============================================================
   gallery.js — Photo gallery lightbox 
   Used on: index.html (Bälinge) and sodra-rorum/index.html

   This file handles five things:
     1. Lightbox — opens when any gallery thumbnail, the single-image
        hero, or the hero slideshow is clicked; supports prev/next,
        keyboard nav, and touch swipe
     3. Read More toggle — expands/collapses long intro text
     4. Hero slideshow — auto-advance, dots, touch swipe, and
        clicking through to the matching lightbox photo
     5. "Other Locations" nav dropdown                                                                       
     6.Bug report dialog — opens from footer,
       submits via Web3Forms
     7. dynamic FAQ button script
     8. Share button — opens the native share dialog on mobile, copies url
       to clipboard on desktop


   Dependencies:
     - scripts.css must be loaded on the same page
     - The HTML structure must match what is described in scripts.css

   Single source of truth for the lightbox:
     All images that should appear in the lightbox live inside a
     hidden <div class="gallery-full">. The visible photo-grid is
     only for display and click targets.
   ============================================================= */

/* =============================================================
   SECTION 1 — LIGHTBOX

   The lightbox shows one gallery image at a time, full-screen.

   How it works:
     - On page load we collect every <img> inside .gallery-full
       into an array called "galleryImages"
     - When a thumbnail or hero image is clicked we find the
       matching image by src and open the lightbox at that index
     - Prev/next buttons, arrow keys, and touch swipe move through
       the array
     - Clicking the overlay background or pressing Escape closes it
   ============================================================= */

(function () {
  /* --- Find the lightbox elements in the DOM --- */
  var lightbox = document.querySelector(".lightbox");
  var lightboxImg = document.querySelector(".lightbox__image");
  var closeBtn = document.querySelector(".lightbox__close");
  var prevBtn = document.querySelector(".lightbox__prev");
  var nextBtn = document.querySelector(".lightbox__next");
  var counter = document.querySelector(".lightbox__counter");

  /* If there is no lightbox on this page, stop here.
     This prevents errors if the script is accidentally loaded
     on a page that doesn't have the lightbox HTML. */
  if (!lightbox) return;

  /* --- Build the gallery image list ---
     Single source of truth: the hidden .gallery-full container.
     This list controls both the order and the total number of
     images shown in the lightbox. */
  var galleryImages = [];
  var fullGallery = document.querySelector(".gallery-full");

  if (fullGallery) {
    fullGallery.querySelectorAll("img").forEach(function (img) {
      galleryImages.push({
        src: img.src,
        alt: img.alt,
      });
    });
  }

  /* The index of the image currently shown in the lightbox */
  var currentIndex = 0;

  /* --- Open the lightbox at a given index --- */
  function openLightbox(index) {
    currentIndex = index;
    showImage(currentIndex);
    lightbox.classList.add("is-open");

    /* Prevent the page from scrolling while the lightbox is open */
    document.body.style.overflow = "hidden";

    /* Move keyboard focus to the close button so keyboard users
       can immediately navigate or close */
    closeBtn.focus();
  }

  /* --- Close the lightbox --- */
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = ""; /* Restore page scrolling */

    /* Remove the #gallery-N hash now that the lightbox is closed */
    if (window.history && window.history.replaceState) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }
  /* --- Show the image at a given index ---
     Updates the <img> src and the counter text */
  function showImage(index) {
    /* Clamp index to valid range (0 to length-1) */
    currentIndex = (index + galleryImages.length) % galleryImages.length;

    var entry = galleryImages[currentIndex];

    /* Briefly fade the image out while the new one loads */
    lightboxImg.classList.add("is-loading");

    lightboxImg.src = entry.src;
    lightboxImg.alt = entry.alt;

    /* Fade back in once the image has loaded */
    lightboxImg.onload = function () {
      lightboxImg.classList.remove("is-loading");
    };

    /* Update the counter e.g. "3 / 12" */
    if (counter) {
      counter.textContent = currentIndex + 1 + " / " + galleryImages.length;
    }

    /* Reflect the current photo in the URL as #gallery-N.
       Uses replaceState (not pushState) so browsing through photos
       doesn't fill up the back-button history with every click. */
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#gallery-" + (currentIndex + 1));
    }
  }

  /* --- Wire up thumbnail clicks ---
     We match by image src so the visible order of the photo-grid
     does not have to be the same as the lightbox order. */
  document.querySelectorAll(".photo-grid__item").forEach(function (item) {
    item.addEventListener("click", function () {
      var thumbImg = item.querySelector("img");
      if (!thumbImg) return;

      var matchIndex = galleryImages.findIndex(function (entry) {
        return entry.src === thumbImg.src;
      });

      openLightbox(matchIndex !== -1 ? matchIndex : 0);
    });

    /* Make thumbnails keyboard-accessible */
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", "Open photo in full screen");

    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        item.click(); /* reuse the same logic */
      }
    });
  });

  /* --- Navigation buttons --- */
  prevBtn.addEventListener("click", function () {
    showImage(currentIndex - 1);
  });

  nextBtn.addEventListener("click", function () {
    showImage(currentIndex + 1);
  });

  /* --- Close button --- */
  closeBtn.addEventListener("click", closeLightbox);

  /* --- Close when clicking the dark overlay background --- */
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  /* --- Keyboard navigation --- */
  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;

    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "Escape") closeLightbox();
  });

  /* --- Touch swipe inside the lightbox --- */
  var lbTouchStartX = 0;
  var lbTouchStartY = 0;
  var SWIPE_THRESHOLD = 40;

  lightbox.addEventListener(
    "touchstart",
    function (e) {
      lbTouchStartX = e.changedTouches[0].clientX;
      lbTouchStartY = e.changedTouches[0].clientY;
    },
    { passive: true },
  );

  lightbox.addEventListener("touchend", function (e) {
    var deltaX = e.changedTouches[0].clientX - lbTouchStartX;
    var deltaY = e.changedTouches[0].clientY - lbTouchStartY;

    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > SWIPE_THRESHOLD
    ) {
      if (deltaX < 0) {
        showImage(currentIndex + 1); /* swiped left → next */
      } else {
        showImage(currentIndex - 1); /* swiped right → previous */
      }
    }
  });

  /* --- Expose to Section 4 (hero slideshow) --- */
  window.openGalleryLightbox = openLightbox;
  window.galleryImages = galleryImages;

  /* --- Deep-link: open the lightbox on page load if the URL already
     has a #gallery or #gallery-N hash, e.g. someone following a
     shared link straight to yoursite.com/balinge/#gallery-4 */
  var hashMatch = window.location.hash.match(/^#gallery-(\d+)$/);
  if (hashMatch) {
    openLightbox(parseInt(hashMatch[1], 10) - 1);
  } else if (window.location.hash === "#gallery") {
    openLightbox(0);
  }
})();
/* End of lightbox IIFE */



/* =============================================================
   SECTION 3 — READ MORE TOGGLE
   ============================================================= */

(function () {
  document.querySelectorAll("[data-read-more]").forEach(function (block) {
    var toggle = block.nextElementSibling;
    if (!toggle || !toggle.hasAttribute("data-read-more-toggle")) return;

    if (block.scrollHeight <= block.clientHeight + 4) {
      toggle.style.display = "none";
      return;
    }

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", function () {
      var expanded = block.classList.toggle("is-expanded");
      toggle.textContent = expanded ? "Read less" : "Read more";
      toggle.setAttribute("aria-expanded", expanded);

      if (expanded) {
        block.style.maxHeight = block.scrollHeight + "px";
      } else {
        block.style.maxHeight = ""; // back to the CSS collapsed value (*em)
      }
    });
  });
})();
/* End of read-more IIFE */

/* =============================================================
   SECTION 4 — HERO SLIDESHOW

   Handles the auto-advancing multi-image hero banner used on
   both property pages (index.html and sodra-rorum/index.html).
   ============================================================= */

(function () {
  var INTERVAL = 5000; /* 5 seconds */

  var slideshow = document.querySelector(".hero-slideshow");
  var track = document.querySelector(".hero-slideshow__track");
  var slides = document.querySelectorAll(".hero-slideshow__slide");
  var dots = document.querySelectorAll(".hero-slideshow__dot");

  if (!slideshow || !slides.length) return;

  var currentIndex = 0;
  var timer;

  function goToSlide(index) {
    slides[currentIndex].classList.remove("is-active");
    if (dots.length) dots[currentIndex].classList.remove("is-active");

    currentIndex = (index + slides.length) % slides.length;

    slides[currentIndex].classList.add("is-active");
    if (dots.length) dots[currentIndex].classList.add("is-active");

    track.style.transform = "translateX(-" + currentIndex * 100 + "%)";
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }
  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function startTimer() {
    timer = setInterval(nextSlide, INTERVAL);
  }

  function resetTimer() {
    clearInterval(timer);
    startTimer();
  }

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      goToSlide(parseInt(dot.getAttribute("data-index"), 10));
      resetTimer();
    });
  });

  startTimer();

  /* --- Click-through to the gallery ---
     Match the currently visible hero image by src against the
     full gallery list built in Section 1. */
  var justSwiped = false;

  if (track) {
    track.addEventListener("click", function () {
      if (justSwiped) return;
      if (typeof window.openGalleryLightbox !== "function") return;

      var activeImg = track.querySelector(
        ".hero-slideshow__slide.is-active img",
      );
      if (!activeImg) return;

      var images = window.galleryImages || [];
      var matchIndex = images.findIndex(function (entry) {
        return entry.src === activeImg.src;
      });

      window.openGalleryLightbox(matchIndex !== -1 ? matchIndex : 0);
    });
  }
  /* --- "View all photos" hint ---
     Always opens the lightbox at the first image (index 0). */
  var viewAllHint = document.querySelector(".hero-slideshow__hint");
  if (viewAllHint) {
    viewAllHint.style.pointerEvents = "auto"; // make it clickable
    viewAllHint.style.cursor = "pointer";

    viewAllHint.addEventListener("click", function (e) {
      e.stopPropagation(); // stop the track click from also firing
      if (typeof window.openGalleryLightbox === "function") {
        window.openGalleryLightbox(0);
      }
    });
  }

  /* --- Touch swipe --- */
  var touchStartX = 0;
  var touchStartY = 0;
  var SWIPE_THRESHOLD = 40;

  if (track) {
    track.addEventListener(
      "touchstart",
      function (e) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
        justSwiped = false;
      },
      { passive: true },
    );

    track.addEventListener("touchend", function (e) {
      var deltaX = e.changedTouches[0].clientX - touchStartX;
      var deltaY = e.changedTouches[0].clientY - touchStartY;

      if (
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > SWIPE_THRESHOLD
      ) {
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
   SECTION 5 — "OTHER LOCATIONS" NAV DROPDOWN
   ============================================================= */

(function () {
  var dropdown = document.querySelector("[data-nav-dropdown]");
  if (!dropdown) return;

  var toggle = dropdown.querySelector("[data-nav-dropdown-toggle]");
  var menu = dropdown.querySelector("[data-nav-dropdown-menu]");
  if (!toggle || !menu) return;

  function openMenu() {
    dropdown.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    dropdown.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();

    if (dropdown.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  document.addEventListener("click", function () {
    closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });
})();
/* End of nav dropdown IIFE */

/* =============================================================
   SECTION 6 — BUG REPORT DIALOG
   Opens from footer "Report a bug", closes on backdrop / Cancel /
   Escape, fills page_url, submits via Web3Forms (fetch).
   ============================================================= */
(function () {
  var dialog = document.querySelector("[data-bug-dialog]");
  if (!dialog) return;

  var form = dialog.querySelector(".bug-dialog__form");
  var pageField = document.getElementById("bug-page-url");
  var openers = document.querySelectorAll("[data-open-bug-report]");
  var closers = dialog.querySelectorAll("[data-bug-close]");

  function openDialog(e) {
    if (e) e.preventDefault();
    if (pageField) pageField.value = window.location.href;
    dialog.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeDialog() {
    dialog.hidden = true;
    document.body.style.overflow = "";
  }

  openers.forEach(function (el) {
    el.addEventListener("click", openDialog);
  });

  closers.forEach(function (el) {
    el.addEventListener("click", closeDialog);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !dialog.hidden) closeDialog();
  });

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : "";

    if (pageField) pageField.value = window.location.href;

    var formData = new FormData(form);

    if (submitBtn) {
      submitBtn.textContent = "Sending...";
      submitBtn.disabled = true;
    }

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          alert("Thank you — your report was sent.");
          form.reset();
          closeDialog();
        } else {
          alert("Error: " + (result.data.message || "Could not send."));
        }
      })
      .catch(function () {
        alert("Something went wrong. Please try again.");
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
  });
})();

/* =============================================================
   SECTION 7 — FAQ deep-link (open category + scroll)

   Used when someone arrives at the FAQ page with a hash, e.g.
     faq/#faq-balinge
     faq/#faq-sodra-rorum

   Those links come from the FAQ buttons under the intro on each
   property page. This script:
     1. Finds the matching <details class="faq-category">
     2. Opens it
     3. Smooth-scrolls it into view

   Safe on every page: if there is no hash, or no matching
   category, it exits immediately.
   ============================================================= */
(function () {
  var hash = window.location.hash; // e.g. "#faq-balinge"
  if (!hash) return;

  var target = document.querySelector(hash);
  if (!target || !target.matches("details.faq-category")) return;

  target.open = true;

  window.setTimeout(function () {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
})();

/* =============================================================
   SECTION 8 — Share button
   Opens the native share dialog on mobile, copies the URL to
   clipboard on desktop. Used on both property pages.
   ============================================================= */

document.querySelectorAll("[data-share-button]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "Check out this cottage in Skåne!",
      url: window.location.href,
    };

    // Native share sheet (best on mobile, also works on many desktops)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled the share sheet — do nothing
      }
      return;
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    } catch (err) {
      alert("Could not share or copy the link");
    }
  });
});

/* =============================================================
   END OF gallery.js

   Checklist for using this file on a property page:
     [ ] scripts.css is linked in the <head>
     [ ] gallery.js is linked at the bottom of <body>
     [ ] .lightbox HTML is present
     [ ] A hidden <div class="gallery-full"> contains ALL images
         that should appear in the lightbox (in the desired order)
     [ ] .photo-grid contains the visible thumbnails (any subset,
         any order)
     [ ] If using the hero-slideshow, Section 4 handles it
   ============================================================= */

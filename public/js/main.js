// ===== Jewels by Iram - Main JavaScript =====

// Get CSRF token from meta tag
function getCsrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

// Navbar scroll effect & back-to-top visibility
window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // Back to top button
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }
});

// Mobile nav toggle & enhanced features
document.addEventListener('DOMContentLoaded', function() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });

    // Mobile dropdown toggle
    const dropdowns = navLinks.querySelectorAll('.dropdown');
    dropdowns.forEach(function(dropdown) {
      dropdown.querySelector('a').addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          dropdown.classList.toggle('open');
        }
      });
    });

    // Close nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Hero slider
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    var currentSlide = 0;
    setInterval(function() {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }, 5000);
  }

  // Reveal on scroll (IntersectionObserver)
  var revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach(function(el) {
      observer.observe(el);
    });
  } else {
    // Fallback: reveal all immediately
    revealElements.forEach(function(el) {
      el.classList.add('revealed');
    });
  }

  // Back to top button click
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});

// Add to cart function
function addToCart(productId, quantity) {
  quantity = quantity || 1;
  fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
    body: JSON.stringify({ productId: productId, quantity: parseInt(quantity) })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    if (data.success) {
      updateCartBadge(data.cartCount);
      showToast('Added to your bag!');
    } else {
      showToast(data.error || 'Failed to add to cart');
    }
  })
  .catch(function() {
    showToast('Something went wrong. Please try again.');
  });
}

// Update cart badge
function updateCartBadge(count) {
  var badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Toast notification
function showToast(message) {
  var toast = document.getElementById('toast');
  var toastMsg = document.getElementById('toastMessage');
  if (toast && toastMsg) {
    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

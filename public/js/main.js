// ===== Jewels by Iram - Main JavaScript =====

// Get CSRF token from meta tag
function getCsrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

// Navbar scroll effect
window.addEventListener('scroll', function() {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// Mobile nav toggle
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

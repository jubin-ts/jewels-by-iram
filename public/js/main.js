'use strict';

document.addEventListener('DOMContentLoaded', function () {

  // ── Utility: CSRF Token ──────────────────────────────────────
  function getCsrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
    var input = document.querySelector('input[name="_csrf"]');
    return input ? input.value : '';
  }

  // ── Utility: Debounce ────────────────────────────────────────
  function debounce(fn, delay) {
    var timer;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  // ── Utility: Format currency (INR) ──────────────────────────
  function formatPrice(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  // ── Utility: AJAX helper ────────────────────────────────────
  function ajaxPost(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': getCsrfToken()
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error || 'Request failed');
        });
      }
      return res.json();
    });
  }

  // ============================================================
  //  1. MOBILE MENU TOGGLE
  // ============================================================
  (function initMobileMenu() {
    var toggle = document.querySelector('.hamburger');
    var mobileNav = document.querySelector('.mobile-nav');
    var overlay = document.querySelector('.overlay');

    if (!toggle) return;

    toggle.addEventListener('click', function () {
      toggle.classList.toggle('active');
      if (mobileNav) mobileNav.classList.toggle('active');
      if (overlay) overlay.classList.toggle('active');
    });

    // Also support .mobile-menu-toggle alias
    var altToggle = document.querySelector('.mobile-menu-toggle');
    if (altToggle && altToggle !== toggle) {
      altToggle.addEventListener('click', function () {
        var navLinks = document.querySelector('.nav-links');
        if (navLinks) navLinks.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', function () {
        if (toggle) toggle.classList.remove('active');
        if (mobileNav) mobileNav.classList.remove('active');
        overlay.classList.remove('active');
      });
    }

    // Close on link click
    if (mobileNav) {
      mobileNav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          toggle.classList.remove('active');
          mobileNav.classList.remove('active');
          if (overlay) overlay.classList.remove('active');
        });
      });
    }
  })();

  // ============================================================
  //  2. SEARCH WITH LIVE RESULTS
  // ============================================================
  (function initSearch() {
    var searchInput = document.querySelector('.search-input');
    var dropdown = document.querySelector('.search-results-dropdown');

    if (!searchInput || !dropdown) return;

    var handleSearch = debounce(function () {
      var query = searchInput.value.trim();
      if (query.length < 2) {
        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
        return;
      }

      fetch('/api/search?q=' + encodeURIComponent(query))
        .then(function (res) { return res.json(); })
        .then(function (products) {
          if (!products.length) {
            dropdown.innerHTML = '<div class="search-no-results">No products found</div>';
            dropdown.classList.add('active');
            return;
          }

          var html = products.map(function (p) {
            var imgSrc = p.image || '/images/placeholder.jpg';
            return '<a href="/shop/' + encodeURIComponent(p.slug) + '" class="search-result-item">' +
              '<div class="search-result-image"><img src="' + imgSrc + '" alt="' + p.name.replace(/"/g, '&quot;') + '"></div>' +
              '<div class="search-result-info">' +
                '<div class="search-result-name">' + p.name.replace(/</g, '&lt;') + '</div>' +
                '<div class="search-result-price">' + formatPrice(p.price) + '</div>' +
              '</div>' +
            '</a>';
          }).join('');

          html += '<a href="/shop?search=' + encodeURIComponent(query) + '" class="search-view-all">View all results →</a>';
          dropdown.innerHTML = html;
          dropdown.classList.add('active');
        })
        .catch(function () {
          dropdown.classList.remove('active');
        });
    }, 300);

    searchInput.addEventListener('input', handleSearch);

    // Close dropdown on click outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-bar') && !e.target.closest('.search-results-dropdown')) {
        dropdown.classList.remove('active');
      }
    });
  })();

  // ============================================================
  //  3. ADD TO CART (AJAX)
  // ============================================================
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.add-to-cart-form');
    if (!form) return;

    e.preventDefault();

    var productId = form.querySelector('[name="product_id"]');
    var quantity = form.querySelector('[name="quantity"]');
    var csrf = form.querySelector('[name="_csrf"]');

    var body = {
      product_id: productId ? productId.value : '',
      quantity: quantity ? parseInt(quantity.value, 10) || 1 : 1,
      _csrf: csrf ? csrf.value : getCsrfToken()
    };

    fetch('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': body._csrf
      },
      body: JSON.stringify(body)
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        // Update cart count badges
        document.querySelectorAll('.cart-badge, .cart-count').forEach(function (el) {
          el.textContent = data.cartCount;
          if (data.cartCount > 0) el.style.display = '';
        });
        showToast('Added to cart!', 'success');
      } else {
        showToast(data.error || 'Could not add to cart', 'error');
      }
    })
    .catch(function () {
      showToast('Something went wrong. Please try again.', 'error');
    });
  });

  // ============================================================
  //  4. CART QUANTITY UPDATE
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.quantity-btn');
    if (!btn) return;

    var row = btn.closest('.cart-item, tr, [data-item-id]');
    if (!row) return;

    var input = row.querySelector('.quantity-input, input[name="quantity"]');
    if (!input) return;

    var itemId = row.dataset.itemId || (row.querySelector('[name="item_id"]') || {}).value;
    if (!itemId) return;

    var currentQty = parseInt(input.value, 10) || 1;
    var isPlus = btn.classList.contains('quantity-plus') || btn.dataset.action === 'plus' || btn.textContent.trim() === '+';
    var newQty = isPlus ? currentQty + 1 : currentQty - 1;

    if (newQty < 0) newQty = 0;
    input.value = newQty;

    ajaxPost('/cart/update', { item_id: itemId, quantity: newQty, _csrf: getCsrfToken() })
      .then(function () {
        if (newQty === 0) {
          // Remove the row
          var rowEl = row.closest('tr') || row;
          rowEl.remove();
          showToast('Item removed from cart', 'success');
        }
        recalcCartTotal();
      })
      .catch(function () {
        input.value = currentQty; // revert
        showToast('Could not update quantity', 'error');
      });
  });

  function recalcCartTotal() {
    var total = 0;
    document.querySelectorAll('.cart-item, .cart-table tbody tr').forEach(function (row) {
      var priceEl = row.querySelector('.cart-item-price, [data-price]');
      var qtyEl = row.querySelector('.quantity-input, input[name="quantity"]');
      var lineTotalEl = row.querySelector('.cart-item-total, .line-total');
      if (!priceEl || !qtyEl) return;

      var price = parseFloat(priceEl.dataset.price || priceEl.textContent.replace(/[^0-9.]/g, ''));
      var qty = parseInt(qtyEl.value, 10) || 0;
      var lineTotal = price * qty;
      total += lineTotal;

      if (lineTotalEl) lineTotalEl.textContent = formatPrice(lineTotal);
    });

    var cartTotalEl = document.querySelector('.cart-total-amount, .cart-total');
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
  }

  // ============================================================
  //  5. REMOVE FROM CART
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.remove-item-btn');
    if (!btn) return;

    e.preventDefault();

    var row = btn.closest('.cart-item, tr, [data-item-id]');
    var itemId = btn.dataset.itemId || (row && row.dataset.itemId) || '';
    if (!itemId) return;

    ajaxPost('/cart/remove', { item_id: itemId, _csrf: getCsrfToken() })
      .then(function () {
        var rowEl = row ? (row.closest('tr') || row) : null;
        if (rowEl) rowEl.remove();
        recalcCartTotal();
        showToast('Item removed from cart', 'success');

        // Check if cart is now empty
        var remaining = document.querySelectorAll('.cart-item, .cart-table tbody tr');
        if (remaining.length === 0) {
          var cartContainer = document.querySelector('.cart-table, .cart-items');
          if (cartContainer) {
            cartContainer.innerHTML = '<div class="cart-empty"><p>Your cart is empty</p><a href="/shop" class="btn btn-primary">Continue Shopping</a></div>';
          }
        }
      })
      .catch(function () {
        showToast('Could not remove item', 'error');
      });
  });

  // ============================================================
  //  6. WISHLIST TOGGLE
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.wishlist-btn, .product-wishlist-btn');
    if (!btn) return;

    e.preventDefault();

    var productId = btn.dataset.productId || '';
    if (!productId) return;

    var isActive = btn.classList.contains('active');
    var url = isActive ? '/wishlist/remove' : '/wishlist/add';

    ajaxPost(url, { product_id: productId, _csrf: getCsrfToken() })
      .then(function () {
        btn.classList.toggle('active');
        var icon = btn.querySelector('svg, i');
        if (icon) {
          if (btn.classList.contains('active')) {
            icon.setAttribute('fill', 'currentColor');
          } else {
            icon.setAttribute('fill', 'none');
          }
        }
        showToast(
          btn.classList.contains('active') ? 'Added to wishlist!' : 'Removed from wishlist',
          'success'
        );
      })
      .catch(function (err) {
        showToast(err.message || 'Please login to use wishlist', 'error');
      });
  });

  // ============================================================
  //  7. PRODUCT IMAGE GALLERY
  // ============================================================
  (function initGallery() {
    var mainImage = document.querySelector('.product-gallery-main img');
    var thumbs = document.querySelector('.product-gallery-thumbs');

    if (!mainImage || !thumbs) return;

    thumbs.addEventListener('click', function (e) {
      var thumb = e.target.closest('img');
      if (!thumb) return;

      mainImage.src = thumb.src.replace('-thumb', '').replace('-small', '');
      if (thumb.dataset.full) mainImage.src = thumb.dataset.full;

      thumbs.querySelectorAll('img').forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
    });
  })();

  // ============================================================
  //  8. PRODUCT TABS
  // ============================================================
  (function initTabs() {
    var tabNav = document.querySelector('.product-tabs-nav');
    if (!tabNav) return;

    tabNav.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      var targetId = btn.dataset.tab;

      // Deactivate all tabs and panels
      tabNav.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.product-tab-content').forEach(function (panel) { panel.classList.remove('active'); });

      // Activate clicked tab and its panel
      btn.classList.add('active');
      var panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  })();

  // ============================================================
  //  9. TOAST NOTIFICATIONS
  // ============================================================
  function showToast(message, type) {
    type = type || 'success';

    var container = document.querySelector('.flash-messages');
    if (!container) {
      container = document.createElement('div');
      container.className = 'flash-messages';
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'flash-message flash-' + type;
    toast.innerHTML =
      '<span>' + message.replace(/</g, '&lt;') + '</span>' +
      '<button class="close-flash" aria-label="Close">&times;</button>';

    container.appendChild(toast);

    // Close on button click
    toast.querySelector('.close-flash').addEventListener('click', function () {
      dismissToast(toast);
    });

    // Auto-dismiss after 3 seconds
    setTimeout(function () {
      dismissToast(toast);
    }, 3000);
  }

  function dismissToast(el) {
    if (!el || el.dataset.dismissed) return;
    el.dataset.dismissed = 'true';
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(function () { el.remove(); }, 300);
  }

  // Expose globally for inline usage
  window.showToast = showToast;

  // ============================================================
  //  10. SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================================
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var targetId = link.getAttribute('href');
    if (targetId === '#' || targetId.length < 2) return;

    var target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ============================================================
  //  11. FLASH MESSAGE AUTO-DISMISS
  // ============================================================
  (function initFlashDismiss() {
    document.querySelectorAll('.flash-message').forEach(function (msg) {
      // Close button
      var closeBtn = msg.querySelector('.close-flash');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          dismissToast(msg);
        });
      }

      // Auto-dismiss after 4 seconds
      setTimeout(function () {
        dismissToast(msg);
      }, 4000);
    });
  })();

  // ============================================================
  //  12. BACK TO TOP BUTTON
  // ============================================================
  (function initBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  // ============================================================
  //  13. QUANTITY SELECTOR ON PRODUCT PAGE
  // ============================================================
  (function initQuantitySelector() {
    document.querySelectorAll('.quantity-selector').forEach(function (selector) {
      var input = selector.querySelector('input');
      var minusBtn = selector.querySelector('button:first-of-type');
      var plusBtn = selector.querySelector('button:last-of-type');

      if (!input) return;

      var min = parseInt(input.min, 10) || 1;
      var max = parseInt(input.max, 10) || 999;

      if (minusBtn) {
        minusBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var val = parseInt(input.value, 10) || min;
          if (val > min) input.value = val - 1;
        });
      }

      if (plusBtn) {
        plusBtn.addEventListener('click', function (e) {
          e.preventDefault();
          var val = parseInt(input.value, 10) || min;
          if (val < max) input.value = val + 1;
        });
      }

      input.addEventListener('change', function () {
        var val = parseInt(input.value, 10);
        if (isNaN(val) || val < min) input.value = min;
        if (val > max) input.value = max;
      });
    });
  })();

  // ============================================================
  //  14. PRICE FILTER
  // ============================================================
  (function initPriceFilter() {
    var minInput = document.querySelector('.price-range input[name="min_price"], #min-price');
    var maxInput = document.querySelector('.price-range input[name="max_price"], #max-price');
    var minDisplay = document.querySelector('.price-min-val, .min-price-display');
    var maxDisplay = document.querySelector('.price-max-val, .max-price-display');
    var filterForm = document.querySelector('.filter-form, .shop-filters form');

    if (minInput && minDisplay) {
      minInput.addEventListener('input', function () {
        minDisplay.textContent = formatPrice(minInput.value);
      });
    }

    if (maxInput && maxDisplay) {
      maxInput.addEventListener('input', function () {
        maxDisplay.textContent = formatPrice(maxInput.value);
      });
    }

    // Submit filter form
    if (filterForm) {
      filterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var params = new URLSearchParams(new FormData(filterForm));
        // Remove empty params
        var cleanParams = new URLSearchParams();
        params.forEach(function (value, key) {
          if (value) cleanParams.set(key, value);
        });
        window.location.href = '/shop?' + cleanParams.toString();
      });
    }
  })();

  // ============================================================
  //  15. REVIEW STARS (Interactive Rating)
  // ============================================================
  (function initStarRating() {
    var starContainer = document.querySelector('.star-rating');
    if (!starContainer) return;

    var labels = starContainer.querySelectorAll('label');
    var inputs = starContainer.querySelectorAll('input');

    labels.forEach(function (label) {
      label.addEventListener('click', function () {
        var targetInput = document.getElementById(label.getAttribute('for'));
        if (targetInput) {
          targetInput.checked = true;
          // Update visual state: highlight stars up to the selected one
          var selectedVal = parseInt(targetInput.value, 10);
          labels.forEach(function (l) {
            var inp = document.getElementById(l.getAttribute('for'));
            if (inp) {
              var val = parseInt(inp.value, 10);
              l.classList.toggle('selected', val <= selectedVal);
            }
          });
        }
      });

      // Hover preview
      label.addEventListener('mouseenter', function () {
        var targetInput = document.getElementById(label.getAttribute('for'));
        if (!targetInput) return;
        var hoverVal = parseInt(targetInput.value, 10);
        labels.forEach(function (l) {
          var inp = document.getElementById(l.getAttribute('for'));
          if (inp) {
            var starVal = parseInt(inp.value, 10);
            l.style.color = starVal <= hoverVal ? 'var(--color-primary, #C5A55A)' : '';
          }
        });
      });
    });

    if (starContainer) {
      starContainer.addEventListener('mouseleave', function () {
        labels.forEach(function (l) { l.style.color = ''; });
      });
    }
  })();

  // ============================================================
  //  16. REVIEW FORM SUBMIT
  // ============================================================
  (function initReviewForm() {
    var form = document.querySelector('.review-form form, #review-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var productId = form.querySelector('[name="product_id"]');
      var ratingInput = form.querySelector('input[name="rating"]:checked');
      var comment = form.querySelector('[name="comment"], textarea');

      if (!ratingInput) {
        showToast('Please select a rating', 'error');
        return;
      }

      var body = {
        product_id: productId ? productId.value : '',
        rating: parseInt(ratingInput.value, 10),
        comment: comment ? comment.value.trim() : '',
        _csrf: getCsrfToken()
      };

      ajaxPost('/api/reviews', body)
        .then(function () {
          showToast('Review submitted! Thank you.', 'success');
          form.reset();
          // Reset star visual
          form.querySelectorAll('.star-rating label').forEach(function (l) {
            l.classList.remove('selected');
          });
        })
        .catch(function (err) {
          showToast(err.message || 'Could not submit review', 'error');
        });
    });
  })();

  // ============================================================
  //  17. WHATSAPP ORDER BUTTON
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.whatsapp-order-btn');
    if (!btn) return;

    e.preventDefault();

    var phone = btn.dataset.whatsapp || '';
    var productName = btn.dataset.product || 'this product';
    var productPrice = btn.dataset.price || '';

    var message = 'Hi! I\'m interested in ordering *' + productName + '*';
    if (productPrice) message += ' (Price: ' + formatPrice(productPrice) + ')';
    message += ' from Jewels by Iram. Please share more details.';

    var url = 'https://wa.me/' + phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener');
  });

  // ============================================================
  //  18. LAZY LOAD IMAGES
  // ============================================================
  (function initLazyLoad() {
    var lazyImages = document.querySelectorAll('img[data-src]');
    if (!lazyImages.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            img.src = img.dataset.src;
            if (img.dataset.srcset) img.srcset = img.dataset.srcset;
            img.removeAttribute('data-src');
            img.removeAttribute('data-srcset');
            observer.unobserve(img);
          }
        });
      }, { rootMargin: '100px 0px' });

      lazyImages.forEach(function (img) { observer.observe(img); });
    } else {
      // Fallback: load all immediately
      lazyImages.forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  })();

  // ============================================================
  //  19. HEADER SCROLL EFFECT
  // ============================================================
  (function initHeaderScroll() {
    var header = document.querySelector('.header');
    if (!header) return;

    function onScroll() {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // Run once on load
  })();

  // ============================================================
  //  20. ADMIN: CONFIRM DELETE
  // ============================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.confirm-delete, [data-confirm]');
    if (!btn) return;

    var message = btn.dataset.confirm || 'Are you sure you want to delete this? This action cannot be undone.';
    if (!confirm(message)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });

  // Also handle admin delete forms
  document.addEventListener('submit', function (e) {
    var form = e.target.closest('.delete-form, form[data-confirm-submit]');
    if (!form) return;

    var message = form.dataset.confirmSubmit || 'Are you sure you want to delete this? This action cannot be undone.';
    if (!confirm(message)) {
      e.preventDefault();
    }
  });

});

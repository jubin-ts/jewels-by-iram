// ===== Checkout Page JavaScript =====

function getCsrfToken() {
  var meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

document.addEventListener('DOMContentLoaded', function() {
  loadCheckoutSummary();
  setupCheckoutForm();
});

function loadCheckoutSummary() {
  fetch('/api/cart')
    .then(function(response) { return response.json(); })
    .then(function(cart) {
      if (!cart || cart.length === 0) {
        window.location.href = '/cart';
        return;
      }

      var checkoutItems = document.getElementById('checkoutItems');
      var checkoutTotal = document.getElementById('checkoutTotal');
      var html = '';
      var total = 0;

      cart.forEach(function(item) {
        var subtotal = item.price * item.quantity;
        total += subtotal;
        html += '<div class="checkout-item">';
        html += '<span>' + escapeHtml(item.name) + ' x' + item.quantity + '</span>';
        html += '<span>AED ' + subtotal.toFixed(2) + '</span>';
        html += '</div>';
      });

      if (checkoutItems) checkoutItems.innerHTML = html;
      if (checkoutTotal) checkoutTotal.textContent = 'AED ' + total.toFixed(2);
    });
}

function setupCheckoutForm() {
  var form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    var formData = {
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      email: document.getElementById('email').value.trim(),
      address: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value,
      orderType: document.getElementById('orderType').value,
      notes: document.getElementById('notes').value.trim()
    };

    fetch('/api/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
      body: JSON.stringify(formData)
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        // Redirect to WhatsApp with order details
        window.open(data.whatsappUrl, '_blank');

        // Show success message
        form.innerHTML = '<div style="text-align:center;padding:40px;">' +
          '<i class="fas fa-check-circle" style="font-size:48px;color:#2ecc71;margin-bottom:15px;"></i>' +
          '<h2 style="font-family:\'Cormorant Garamond\',serif;font-size:28px;margin-bottom:10px;">Order Placed!</h2>' +
          '<p style="color:#888;margin-bottom:5px;">Order Number: <strong>' + escapeHtml(data.orderNumber) + '</strong></p>' +
          '<p style="color:#888;margin-bottom:20px;">Total: AED ' + data.total.toFixed(2) + '</p>' +
          '<p style="color:#888;margin-bottom:25px;">Please complete your order by sending the message on WhatsApp.</p>' +
          '<a href="/" class="btn btn-primary">Back to Home</a>' +
          '</div>';

        // Update cart badge
        var badge = document.getElementById('cartBadge');
        if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
      } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Place Order & Send via WhatsApp';
        alert(data.error || 'Failed to place order. Please try again.');
      }
    })
    .catch(function() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check"></i> Place Order & Send via WhatsApp';
      alert('Something went wrong. Please try again.');
    });
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

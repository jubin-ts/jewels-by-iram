// ===== Cart Page JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
  loadCart();
});

function loadCart() {
  fetch('/api/cart')
    .then(function(response) { return response.json(); })
    .then(function(cart) {
      renderCart(cart);
    });
}

function renderCart(cart) {
  var cartEmpty = document.getElementById('cartEmpty');
  var cartLayout = document.getElementById('cartLayout');
  var cartItems = document.getElementById('cartItems');

  if (!cart || cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (cartLayout) cartLayout.style.display = 'none';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartLayout) cartLayout.style.display = 'grid';

  var html = '';
  var total = 0;

  cart.forEach(function(item) {
    var subtotal = item.price * item.quantity;
    total += subtotal;
    html += '<div class="cart-item">';
    html += '<div class="cart-item-img">';
    if (item.image) {
      html += '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.name) + '">';
    }
    html += '</div>';
    html += '<div class="cart-item-info">';
    html += '<h3>' + escapeHtml(item.name) + '</h3>';
    html += '<div class="price">AED ' + item.price.toFixed(2) + '</div>';
    html += '<div class="cart-item-actions">';
    html += '<div class="cart-item-qty">';
    html += '<button onclick="updateCartItem(' + item.productId + ', ' + (item.quantity - 1) + ')">-</button>';
    html += '<span>' + item.quantity + '</span>';
    html += '<button onclick="updateCartItem(' + item.productId + ', ' + (item.quantity + 1) + ')">+</button>';
    html += '</div>';
    html += '<button class="cart-item-remove" onclick="removeCartItem(' + item.productId + ')">Remove</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });

  if (cartItems) cartItems.innerHTML = html;
  var cartSubtotal = document.getElementById('cartSubtotal');
  var cartTotal = document.getElementById('cartTotal');
  if (cartSubtotal) cartSubtotal.textContent = 'AED ' + total.toFixed(2);
  if (cartTotal) cartTotal.textContent = 'AED ' + total.toFixed(2);
}

function updateCartItem(productId, quantity) {
  if (quantity <= 0) {
    removeCartItem(productId);
    return;
  }

  fetch('/api/cart/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: productId, quantity: quantity })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    if (data.success) {
      renderCart(data.cart);
      updateCartBadge(data.cartCount);
    }
  });
}

function removeCartItem(productId) {
  fetch('/api/cart/remove/' + productId, { method: 'DELETE' })
    .then(function(response) { return response.json(); })
    .then(function(data) {
      if (data.success) {
        renderCart(data.cart);
        updateCartBadge(data.cartCount);
        showToast('Item removed from bag');
      }
    });
}

function updateCartBadge(count) {
  var badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

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

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

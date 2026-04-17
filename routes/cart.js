'use strict';

const express = require('express');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf) {
  const router = express.Router();

  // View cart
  router.get('/', (req, res) => {
    const db = getDb();
    const identifier = req.session.user ? req.session.user.id : req.session.id;
    const field = req.session.user ? 'user_id' : 'session_id';
    const items = db.prepare(`SELECT ci.*, p.name, p.slug, p.price, p.image, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.${field} = ?`).all(identifier);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.render('pages/cart', { title: 'Shopping Cart - Jewels by Iram', items, total });
  });

  // Add to cart
  router.post('/add', validateCsrf, (req, res) => {
    const { product_id, quantity } = req.body;
    const qty = parseInt(quantity, 10) || 1;
    const db = getDb();

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(product_id);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/shop');
    }

    const identifier = req.session.user ? req.session.user.id : req.session.id;
    const field = req.session.user ? 'user_id' : 'session_id';

    const existing = db.prepare(`SELECT * FROM cart_items WHERE ${field} = ? AND product_id = ?`).get(identifier, product_id);
    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id);
    } else {
      db.prepare(`INSERT INTO cart_items (${field}, product_id, quantity) VALUES (?, ?, ?)`).run(identifier, product_id, qty);
    }

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      const count = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE ${field} = ?`).get(identifier);
      return res.json({ success: true, cartCount: count.count });
    }

    req.flash('success', product.name + ' added to cart!');
    res.redirect('/cart');
  });

  // Update cart quantity
  router.post('/update', validateCsrf, (req, res) => {
    const { item_id, quantity } = req.body;
    const qty = parseInt(quantity, 10);
    const db = getDb();

    if (qty <= 0) {
      db.prepare('DELETE FROM cart_items WHERE id = ?').run(item_id);
    } else {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, item_id);
    }

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true });
    }
    res.redirect('/cart');
  });

  // Remove from cart
  router.post('/remove', validateCsrf, (req, res) => {
    const { item_id } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(item_id);

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true });
    }
    req.flash('success', 'Item removed from cart');
    res.redirect('/cart');
  });

  // Checkout page
  router.get('/checkout', (req, res) => {
    const db = getDb();
    const identifier = req.session.user ? req.session.user.id : req.session.id;
    const field = req.session.user ? 'user_id' : 'session_id';
    const items = db.prepare(`SELECT ci.*, p.name, p.slug, p.price, p.image FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.${field} = ?`).all(identifier);

    if (items.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const userProfile = req.session.user ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id) : null;

    res.render('pages/checkout', { title: 'Checkout - Jewels by Iram', items, total, userProfile });
  });

  // Place order
  router.post('/checkout', validateCsrf, (req, res) => {
    const { customer_name, customer_email, customer_phone, shipping_address, city, pincode, payment_method, notes } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address) {
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/cart/checkout');
    }

    const db = getDb();
    const identifier = req.session.user ? req.session.user.id : req.session.id;
    const field = req.session.user ? 'user_id' : 'session_id';
    const items = db.prepare(`SELECT ci.*, p.name, p.price, p.image FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.${field} = ?`).all(identifier);

    if (items.length === 0) {
      req.flash('error', 'Your cart is empty');
      return res.redirect('/cart');
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderNumber = 'JBI-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const insertOrder = db.prepare('INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone, shipping_address, city, pincode, total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = insertOrder.run(orderNumber, req.session.user ? req.session.user.id : null, customer_name, customer_email, customer_phone, shipping_address, city || null, pincode || null, total, payment_method || 'cod', notes || null);

    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity) VALUES (?, ?, ?, ?, ?, ?)');
    for (const item of items) {
      insertItem.run(result.lastInsertRowid, item.product_id, item.name, item.image, item.price, item.quantity);
    }

    // Clear cart
    db.prepare(`DELETE FROM cart_items WHERE ${field} = ?`).run(identifier);

    req.flash('success', 'Order placed successfully! Your order number is ' + orderNumber);
    res.redirect('/orders/' + orderNumber);
  });

  return router;
};

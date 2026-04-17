'use strict';

const express = require('express');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf, requireAuth) {
  const router = express.Router();

  router.use(requireAuth);

  // View wishlist
  router.get('/', (req, res) => {
    const db = getDb();
    const items = db.prepare('SELECT w.*, p.name, p.slug, p.price, p.original_price, p.image, p.stock, c.name as category_name FROM wishlist w JOIN products p ON w.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id WHERE w.user_id = ? ORDER BY w.created_at DESC').all(req.session.user.id);
    res.render('pages/wishlist', { title: 'My Wishlist - Jewels by Iram', items });
  });

  // Add to wishlist
  router.post('/add', validateCsrf, (req, res) => {
    const { product_id } = req.body;
    const db = getDb();
    try {
      db.prepare('INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.session.user.id, product_id);
    } catch (e) {
      // Already in wishlist, ignore
    }
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true });
    }
    req.flash('success', 'Added to wishlist!');
    res.redirect('back');
  });

  // Remove from wishlist
  router.post('/remove', validateCsrf, (req, res) => {
    const { product_id } = req.body;
    const db = getDb();
    db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?').run(req.session.user.id, product_id);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success: true });
    }
    req.flash('success', 'Removed from wishlist');
    res.redirect('/wishlist');
  });

  return router;
};

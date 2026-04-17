'use strict';

const express = require('express');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf) {
  const router = express.Router();

  // Search API
  router.get('/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const db = getDb();
    const products = db.prepare("SELECT id, name, slug, price, image FROM products WHERE active = 1 AND (name LIKE ? OR description LIKE ?) LIMIT 8").all('%' + q + '%', '%' + q + '%');
    res.json(products);
  });

  // Add review
  router.post('/reviews', validateCsrf, (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Please login to add a review' });
    }
    const { product_id, rating, comment } = req.body;
    const ratingNum = parseInt(rating, 10);
    if (!product_id || !ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }
    const db = getDb();
    // Check if already reviewed
    const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?').get(req.session.user.id, product_id);
    if (existing) {
      db.prepare('UPDATE reviews SET rating = ?, comment = ? WHERE id = ?').run(ratingNum, comment || null, existing.id);
    } else {
      db.prepare('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)').run(product_id, req.session.user.id, ratingNum, comment || null);
    }
    res.json({ success: true });
  });

  return router;
};

'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Shop page - browse all products
router.get('/', (req, res) => {
  const db = getDb();
  const { category, sort, search, min_price, max_price } = req.query;

  let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1';
  const params = [];

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.material LIKE ?)';
    const searchTerm = '%' + search + '%';
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (min_price) {
    query += ' AND p.price >= ?';
    params.push(Number(min_price));
  }

  if (max_price) {
    query += ' AND p.price <= ?';
    params.push(Number(max_price));
  }

  switch (sort) {
    case 'price-low': query += ' ORDER BY p.price ASC'; break;
    case 'price-high': query += ' ORDER BY p.price DESC'; break;
    case 'newest': query += ' ORDER BY p.created_at DESC'; break;
    case 'name': query += ' ORDER BY p.name ASC'; break;
    default: query += ' ORDER BY p.featured DESC, p.created_at DESC';
  }

  const products = db.prepare(query).all(...params);
  const categories = db.prepare('SELECT * FROM categories').all();

  res.render('pages/shop', {
    title: category ? categories.find(c => c.slug === category)?.name + ' - Jewels by Iram' : 'Shop - Jewels by Iram',
    products,
    categories,
    currentCategory: category || '',
    currentSort: sort || '',
    searchQuery: search || '',
    minPrice: min_price || '',
    maxPrice: max_price || ''
  });
});

// Product detail page
router.get('/:slug', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.active = 1').get(req.params.slug);
  if (!product) {
    return res.status(404).render('pages/error', {
      title: 'Product Not Found',
      message: 'The product you are looking for does not exist.',
      user: req.session.user || null,
      cartCount: res.locals.cartCount,
      csrfToken: res.locals.csrfToken
    });
  }

  const related = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.id != ? AND p.active = 1 LIMIT 4').all(product.category_id, product.id);
  const reviews = db.prepare('SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC').all(product.id);
  const avgRating = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = ?').get(product.id);

  // Check if in wishlist
  let inWishlist = false;
  if (req.session.user) {
    const wl = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.session.user.id, product.id);
    inWishlist = !!wl;
  }

  res.render('pages/product', {
    title: product.name + ' - Jewels by Iram',
    product,
    related,
    reviews,
    avgRating: avgRating.avg ? Math.round(avgRating.avg * 10) / 10 : 0,
    reviewCount: avgRating.count,
    inWishlist
  });
});

module.exports = router;

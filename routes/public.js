const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// Home page
router.get('/', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  const featuredProducts = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug,
    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.featured = 1 AND p.in_stock = 1
    ORDER BY p.created_at DESC
    LIMIT 8
  `).all();

  res.render('index', {
    title: 'Jewels by Iram - Luxury Anti-Tarnish Jewelry',
    categories,
    featuredProducts
  });
});

// Shop page - all products or by category
router.get('/shop', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  const categorySlug = req.query.category;
  let products;
  let currentCategory = null;

  if (categorySlug) {
    currentCategory = db.prepare('SELECT * FROM categories WHERE slug = ?').get(categorySlug);
    if (currentCategory) {
      products = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
        (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND p.in_stock = 1
        ORDER BY p.created_at DESC
      `).all(currentCategory.id);
    } else {
      products = [];
    }
  } else {
    products = db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.in_stock = 1
      ORDER BY p.created_at DESC
    `).all();
  }

  res.render('shop', {
    title: currentCategory ? `${currentCategory.name} - Jewels by Iram` : 'Shop - Jewels by Iram',
    categories,
    products,
    currentCategory
  });
});

// Product detail page
router.get('/product/:slug', (req, res) => {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ?
  `).get(req.params.slug);

  if (!product) {
    return res.status(404).render('404', { title: 'Product Not Found' });
  }

  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order').all(product.id);
  const relatedProducts = db.prepare(`
    SELECT p.*,
    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM products p
    WHERE p.category_id = ? AND p.id != ? AND p.in_stock = 1
    ORDER BY RANDOM()
    LIMIT 4
  `).all(product.category_id, product.id);

  res.render('product', {
    title: `${product.name} - Jewels by Iram`,
    product,
    images,
    relatedProducts
  });
});

// Cart page
router.get('/cart', (req, res) => {
  res.render('cart', { title: 'Your Cart - Jewels by Iram' });
});

// Checkout page
router.get('/checkout', (req, res) => {
  if (!req.session.cart || req.session.cart.length === 0) {
    return res.redirect('/cart');
  }
  res.render('checkout', { title: 'Checkout - Jewels by Iram' });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact Us - Jewels by Iram' });
});

// About page
router.get('/about', (req, res) => {
  res.render('about', { title: 'About Us - Jewels by Iram' });
});

module.exports = router;

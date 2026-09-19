const express = require('express');
const router = express.Router();
const { getPool } = require('../database/db');

// Home page
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;
    const featuredProducts = (await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.featured = 1 AND p.in_stock = 1
      ORDER BY p.created_at DESC
      LIMIT 8
    `)).rows;

    res.render('index', {
      title: 'Jewels by Iram - Luxury Anti-Tarnish Jewelry',
      categories,
      featuredProducts
    });
  } catch (err) {
    next(err);
  }
});

// Shop page - all products or by category
router.get('/shop', async (req, res, next) => {
  try {
    const pool = getPool();
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;
    const categorySlug = req.query.category;
    let products;
    let currentCategory = null;

    if (categorySlug) {
      currentCategory = (await pool.query('SELECT * FROM categories WHERE slug = $1', [categorySlug])).rows[0];
      if (currentCategory) {
        products = (await pool.query(`
          SELECT p.*, c.name as category_name, c.slug as category_slug,
          (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
          FROM products p
          JOIN categories c ON p.category_id = c.id
          WHERE p.category_id = $1 AND p.in_stock = 1
          ORDER BY p.created_at DESC
        `, [currentCategory.id])).rows;
      } else {
        products = [];
      }
    } else {
      products = (await pool.query(`
        SELECT p.*, c.name as category_name, c.slug as category_slug,
        (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.in_stock = 1
        ORDER BY p.created_at DESC
      `)).rows;
    }

    res.render('shop', {
      title: currentCategory ? `${currentCategory.name} - Jewels by Iram` : 'Shop - Jewels by Iram',
      categories,
      products,
      currentCategory
    });
  } catch (err) {
    next(err);
  }
});

// Product detail page
router.get('/product/:slug', async (req, res, next) => {
  try {
    const pool = getPool();
    const product = (await pool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1
    `, [req.params.slug])).rows[0];

    if (!product) {
      return res.status(404).render('404', { title: 'Product Not Found' });
    }

    const images = (await pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order', [product.id])).rows;
    const relatedProducts = (await pool.query(`
      SELECT p.*,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      WHERE p.category_id = $1 AND p.id != $2 AND p.in_stock = 1
      ORDER BY RANDOM()
      LIMIT 4
    `, [product.category_id, product.id])).rows;

    res.render('product', {
      title: `${product.name} - Jewels by Iram`,
      product,
      images,
      relatedProducts
    });
  } catch (err) {
    next(err);
  }
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

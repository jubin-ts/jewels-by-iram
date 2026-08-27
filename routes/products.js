const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// Get all products (with optional category filter)
router.get('/', (req, res) => {
  const db = getDb();
  const categoryId = req.query.category;

  let products;
  if (categoryId) {
    products = db.prepare(`
      SELECT p.*, c.name as category_name,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.in_stock = 1
      ORDER BY p.created_at DESC
    `).all(categoryId);
  } else {
    products = db.prepare(`
      SELECT p.*, c.name as category_name,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.in_stock = 1
      ORDER BY p.created_at DESC
    `).all();
  }

  res.json(products);
});

// Get single product
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order').all(product.id);
  product.images = images;

  res.json(product);
});

// Get categories
router.get('/categories/all', (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  res.json(categories);
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getPool } = require('../database/db');

// Get all products (with optional category filter)
router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const categoryId = req.query.category;

    let products;
    if (categoryId) {
      products = (await pool.query(`
        SELECT p.*, c.name as category_name,
        (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = $1 AND p.in_stock = 1
        ORDER BY p.created_at DESC
      `, [categoryId])).rows;
    } else {
      products = (await pool.query(`
        SELECT p.*, c.name as category_name,
        (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.in_stock = 1
        ORDER BY p.created_at DESC
      `)).rows;
    }

    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Get single product
router.get('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const product = (await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [req.params.id])).rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const images = (await pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order', [product.id])).rows;
    product.images = images;

    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Get categories
router.get('/categories/all', async (req, res, next) => {
  try {
    const pool = getPool();
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

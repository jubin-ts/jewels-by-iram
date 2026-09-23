const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { getPool } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');
const { generateOrderPDF } = require('../utils/pdf');
const { saveImage, deleteImage } = require('../utils/imageStore');

// CSRF validation middleware
function validateCsrf(req, res, next) {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    return res.status(403).render('error', { title: 'Error', message: 'Invalid request. Please try again.' });
  }
  next();
}

// Multer configuration - files are held in memory so imageStore.js can hand
// them to Vercel Blob (or write them to disk locally); see utils/imageStore.js.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Admin login page
router.get('/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { title: 'Admin Login', error: null });
});

// Admin login handler
router.post('/login', validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const { username, password } = req.body;

    const admin = (await pool.query('SELECT * FROM admin_users WHERE username = $1', [username])).rows[0];
    // Always perform bcrypt comparison to prevent timing-based username enumeration
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';
    const isValid = bcrypt.compareSync(password || '', admin ? admin.password : dummyHash);
    if (!admin || !isValid) {
      return res.render('admin/login', { title: 'Admin Login', error: 'Invalid credentials' });
    }

    req.session.isAdmin = true;
    req.session.adminUsername = username;
    res.redirect('/admin/dashboard');
  } catch (err) {
    next(err);
  }
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminUsername = null;
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const productCount = (await pool.query('SELECT COUNT(*) as count FROM products')).rows[0].count;
    const orderCount = (await pool.query('SELECT COUNT(*) as count FROM orders')).rows[0].count;
    const categoryCount = (await pool.query('SELECT COUNT(*) as count FROM categories')).rows[0].count;
    const recentOrders = (await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5')).rows;

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      productCount,
      orderCount,
      categoryCount,
      recentOrders
    });
  } catch (err) {
    next(err);
  }
});

// Admin products list
router.get('/products', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const products = (await pool.query(`
      SELECT p.*, c.name as category_name,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `)).rows;
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;

    res.render('admin/products', { title: 'Manage Products', products, categories });
  } catch (err) {
    next(err);
  }
});

// Add product page
router.get('/products/add', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;
    res.render('admin/product-form', { title: 'Add Product', product: null, categories, images: [] });
  } catch (err) {
    next(err);
  }
});

// Edit product page
router.get('/products/edit/:id', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const product = (await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])).rows[0];
    if (!product) {
      return res.redirect('/admin/products');
    }
    const categories = (await pool.query('SELECT * FROM categories ORDER BY display_order')).rows;
    const images = (await pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order', [product.id])).rows;
    res.render('admin/product-form', { title: 'Edit Product', product, categories, images });
  } catch (err) {
    next(err);
  }
});

// Create product
router.post('/products/create', requireAdmin, upload.array('images', 10), validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description, price, wholesale_price, category_id, featured, in_stock, new_arrival } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const result = await pool.query(`
      INSERT INTO products (name, slug, description, price, wholesale_price, category_id, featured, in_stock, new_arrival)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [name, slug, description || '', parseFloat(price), wholesale_price ? parseFloat(wholesale_price) : null, parseInt(category_id, 10), featured ? 1 : 0, in_stock === '0' ? 0 : 1, new_arrival ? 1 : 0]);

    const productId = result.rows[0].id;

    // Save images
    if (req.files && req.files.length > 0) {
      let index = 0;
      for (const file of req.files) {
        const imagePath = await saveImage(file);
        await pool.query(
          'INSERT INTO product_images (product_id, image_path, is_primary, display_order) VALUES ($1, $2, $3, $4)',
          [productId, imagePath, index === 0 ? 1 : 0, index]
        );
        index++;
      }
    }

    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// Update product
router.post('/products/update/:id', requireAdmin, upload.array('images', 10), validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, description, price, wholesale_price, category_id, featured, in_stock, new_arrival } = req.body;
    const productId = req.params.id;

    const existing = (await pool.query('SELECT * FROM products WHERE id = $1', [productId])).rows[0];
    if (!existing) {
      return res.redirect('/admin/products');
    }

    await pool.query(`
      UPDATE products SET name = $1, description = $2, price = $3, wholesale_price = $4, category_id = $5, featured = $6, in_stock = $7, new_arrival = $8, updated_at = NOW()
      WHERE id = $9
    `, [name, description || '', parseFloat(price), wholesale_price ? parseFloat(wholesale_price) : null, parseInt(category_id, 10), featured ? 1 : 0, in_stock === '0' ? 0 : 1, new_arrival ? 1 : 0, productId]);

    // Save new images if uploaded
    if (req.files && req.files.length > 0) {
      const maxOrder = (await pool.query('SELECT MAX(display_order) as max_order FROM product_images WHERE product_id = $1', [productId])).rows[0];
      const startOrder = (maxOrder?.max_order || 0) + 1;
      const hasImages = (await pool.query('SELECT COUNT(*) as count FROM product_images WHERE product_id = $1', [productId])).rows[0];

      let index = 0;
      for (const file of req.files) {
        const imagePath = await saveImage(file);
        await pool.query(
          'INSERT INTO product_images (product_id, image_path, is_primary, display_order) VALUES ($1, $2, $3, $4)',
          [productId, imagePath, parseInt(hasImages.count, 10) === 0 && index === 0 ? 1 : 0, startOrder + index]
        );
        index++;
      }
    }

    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// Delete product
router.post('/products/delete/:id', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const images = (await pool.query('SELECT image_path FROM product_images WHERE product_id = $1', [req.params.id])).rows;

    for (const img of images) {
      await deleteImage(img.image_path);
    }

    await pool.query('DELETE FROM product_images WHERE product_id = $1', [req.params.id]);
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);

    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// Delete product image
router.post('/products/delete-image/:imageId', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const image = (await pool.query('SELECT * FROM product_images WHERE id = $1', [req.params.imageId])).rows[0];

    if (image) {
      await deleteImage(image.image_path);

      await pool.query('DELETE FROM product_images WHERE id = $1', [req.params.imageId]);

      // If this was the primary image, set another image as primary
      if (image.is_primary) {
        const nextImage = (await pool.query('SELECT id FROM product_images WHERE product_id = $1 ORDER BY display_order LIMIT 1', [image.product_id])).rows[0];
        if (nextImage) {
          await pool.query('UPDATE product_images SET is_primary = 1 WHERE id = $1', [nextImage.id]);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Set primary image
router.post('/products/set-primary-image/:imageId', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const image = (await pool.query('SELECT * FROM product_images WHERE id = $1', [req.params.imageId])).rows[0];

    if (image) {
      await pool.query('UPDATE product_images SET is_primary = 0 WHERE product_id = $1', [image.product_id]);
      await pool.query('UPDATE product_images SET is_primary = 1 WHERE id = $1', [req.params.imageId]);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Toggle in-stock / out-of-stock
router.post('/products/toggle-stock/:id', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE products SET in_stock = 1 - in_stock, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// Toggle new arrival
router.post('/products/toggle-new-arrival/:id', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE products SET new_arrival = 1 - new_arrival, updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
});

// Admin orders
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const orders = (await pool.query('SELECT * FROM orders ORDER BY created_at DESC')).rows;
    res.render('admin/orders', { title: 'Manage Orders', orders });
  } catch (err) {
    next(err);
  }
});

// Download order PDF
router.get('/orders/:id/pdf', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const order = (await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!order) {
      return res.redirect('/admin/orders');
    }
    const items = (await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id])).rows;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.order_number}.pdf`);
    generateOrderPDF(order, items, res);
  } catch (err) {
    next(err);
  }
});

// Order detail
router.get('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const pool = getPool();
    const order = (await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id])).rows[0];
    if (!order) {
      return res.redirect('/admin/orders');
    }
    const items = (await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id])).rows;
    res.render('admin/order-detail', { title: `Order ${order.order_number}`, order, items });
  } catch (err) {
    next(err);
  }
});

// Update order status
router.post('/orders/update-status/:id', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const { status } = req.body;
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Change admin password
router.post('/change-password', requireAdmin, validateCsrf, async (req, res, next) => {
  try {
    const pool = getPool();
    const { currentPassword, newPassword } = req.body;

    const admin = (await pool.query('SELECT * FROM admin_users WHERE username = $1', [req.session.adminUsername])).rows[0];
    if (!admin || !bcrypt.compareSync(currentPassword, admin.password)) {
      return res.json({ success: false, error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await pool.query('UPDATE admin_users SET password = $1 WHERE username = $2', [hashedPassword, req.session.adminUsername]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

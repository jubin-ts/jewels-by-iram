const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/db');
const { requireAdmin } = require('../middleware/auth');

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

// Multer configuration
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

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
router.post('/login', validateCsrf, (req, res) => {
  const db = getDb();
  const { username, password } = req.body;

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  // Always perform bcrypt comparison to prevent timing-based username enumeration
  const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012';
  const isValid = bcrypt.compareSync(password || '', admin ? admin.password : dummyHash);
  if (!admin || !isValid) {
    return res.render('admin/login', { title: 'Admin Login', error: 'Invalid credentials' });
  }

  req.session.isAdmin = true;
  req.session.adminUsername = username;
  res.redirect('/admin/dashboard');
});

// Admin logout
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminUsername = null;
  res.redirect('/admin/login');
});

// Admin dashboard
router.get('/dashboard', requireAdmin, (req, res) => {
  const db = getDb();
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    productCount,
    orderCount,
    categoryCount,
    recentOrders
  });
});

// Admin products list
router.get('/products', requireAdmin, (req, res) => {
  const db = getDb();
  const products = db.prepare(`
    SELECT p.*, c.name as category_name,
    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `).all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();

  res.render('admin/products', { title: 'Manage Products', products, categories });
});

// Add product page
router.get('/products/add', requireAdmin, (req, res) => {
  const db = getDb();
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  res.render('admin/product-form', { title: 'Add Product', product: null, categories, images: [] });
});

// Edit product page
router.get('/products/edit/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    return res.redirect('/admin/products');
  }
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order').all(product.id);
  res.render('admin/product-form', { title: 'Edit Product', product, categories, images });
});

// Create product
router.post('/products/create', requireAdmin, upload.array('images', 10), validateCsrf, (req, res) => {
  const db = getDb();
  const { name, description, price, wholesale_price, category_id, featured, in_stock } = req.body;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  const result = db.prepare(`
    INSERT INTO products (name, slug, description, price, wholesale_price, category_id, featured, in_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, slug, description || '', parseFloat(price), wholesale_price ? parseFloat(wholesale_price) : null, parseInt(category_id, 10), featured ? 1 : 0, in_stock !== undefined ? (in_stock ? 1 : 0) : 1);

  const productId = result.lastInsertRowid;

  // Save images
  if (req.files && req.files.length > 0) {
    const insertImage = db.prepare('INSERT INTO product_images (product_id, image_path, is_primary, display_order) VALUES (?, ?, ?, ?)');
    req.files.forEach((file, index) => {
      insertImage.run(productId, '/uploads/' + file.filename, index === 0 ? 1 : 0, index);
    });
  }

  res.redirect('/admin/products');
});

// Update product
router.post('/products/update/:id', requireAdmin, upload.array('images', 10), validateCsrf, (req, res) => {
  const db = getDb();
  const { name, description, price, wholesale_price, category_id, featured, in_stock } = req.body;
  const productId = req.params.id;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    return res.redirect('/admin/products');
  }

  db.prepare(`
    UPDATE products SET name = ?, description = ?, price = ?, wholesale_price = ?, category_id = ?, featured = ?, in_stock = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, description || '', parseFloat(price), wholesale_price ? parseFloat(wholesale_price) : null, parseInt(category_id, 10), featured ? 1 : 0, in_stock !== undefined ? (in_stock ? 1 : 0) : 1, productId);

  // Save new images if uploaded
  if (req.files && req.files.length > 0) {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max_order FROM product_images WHERE product_id = ?').get(productId);
    const startOrder = (maxOrder?.max_order || 0) + 1;
    const hasImages = db.prepare('SELECT COUNT(*) as count FROM product_images WHERE product_id = ?').get(productId);

    const insertImage = db.prepare('INSERT INTO product_images (product_id, image_path, is_primary, display_order) VALUES (?, ?, ?, ?)');
    req.files.forEach((file, index) => {
      insertImage.run(productId, '/uploads/' + file.filename, hasImages.count === 0 && index === 0 ? 1 : 0, startOrder + index);
    });
  }

  res.redirect('/admin/products');
});

// Delete product
router.post('/products/delete/:id', requireAdmin, validateCsrf, (req, res) => {
  const db = getDb();
  const images = db.prepare('SELECT image_path FROM product_images WHERE product_id = ?').all(req.params.id);

  // Delete image files
  for (const img of images) {
    const filePath = path.join(__dirname, '..', 'public', img.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

  res.redirect('/admin/products');
});

// Delete product image
router.post('/products/delete-image/:imageId', requireAdmin, validateCsrf, (req, res) => {
  const db = getDb();
  const image = db.prepare('SELECT * FROM product_images WHERE id = ?').get(req.params.imageId);

  if (image) {
    const filePath = path.join(__dirname, '..', 'public', image.image_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM product_images WHERE id = ?').run(req.params.imageId);

    // If this was the primary image, set another image as primary
    if (image.is_primary) {
      const nextImage = db.prepare('SELECT id FROM product_images WHERE product_id = ? ORDER BY display_order LIMIT 1').get(image.product_id);
      if (nextImage) {
        db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(nextImage.id);
      }
    }
  }

  res.json({ success: true });
});

// Set primary image
router.post('/products/set-primary-image/:imageId', requireAdmin, validateCsrf, (req, res) => {
  const db = getDb();
  const image = db.prepare('SELECT * FROM product_images WHERE id = ?').get(req.params.imageId);

  if (image) {
    db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(image.product_id);
    db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(req.params.imageId);
  }

  res.json({ success: true });
});

// Admin orders
router.get('/orders', requireAdmin, (req, res) => {
  const db = getDb();
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.render('admin/orders', { title: 'Manage Orders', orders });
});

// Order detail
router.get('/orders/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.redirect('/admin/orders');
  }
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.render('admin/order-detail', { title: `Order ${order.order_number}`, order, items });
});

// Update order status
router.post('/orders/update-status/:id', requireAdmin, validateCsrf, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

// Change admin password
router.post('/change-password', requireAdmin, validateCsrf, (req, res) => {
  const db = getDb();
  const { currentPassword, newPassword } = req.body;

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(req.session.adminUsername);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password)) {
    return res.json({ success: false, error: 'Current password is incorrect' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admin_users SET password = ? WHERE username = ?').run(hashedPassword, req.session.adminUsername);
  res.json({ success: true });
});

module.exports = router;

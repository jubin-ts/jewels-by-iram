'use strict';

const express = require('express');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf, requireAdmin) {
  const router = express.Router();

  router.use(requireAdmin);

  // Dashboard
  router.get('/', (req, res) => {
    const db = getDb();
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != ?').get('cancelled').total;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('customer').count;
    const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10').all();
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM contact_messages WHERE read = 0').get().count;

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Jewels by Iram',
      totalProducts, totalOrders, totalRevenue, totalUsers, recentOrders, totalMessages
    });
  });

  // Products management
  router.get('/products', (req, res) => {
    const db = getDb();
    const products = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC').all();
    const categories = db.prepare('SELECT * FROM categories').all();
    res.render('admin/products', { title: 'Manage Products - Jewels by Iram', products, categories });
  });

  // Add product form
  router.get('/products/new', (req, res) => {
    const db = getDb();
    const categories = db.prepare('SELECT * FROM categories').all();
    res.render('admin/product-form', { title: 'Add Product - Jewels by Iram', product: null, categories });
  });

  // Create product
  router.post('/products', validateCsrf, (req, res) => {
    const { name, description, price, original_price, category_id, image, material, weight, stock, featured, new_arrival, best_seller } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const db = getDb();
    db.prepare('INSERT INTO products (name, slug, description, price, original_price, category_id, image, material, weight, stock, featured, new_arrival, best_seller) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      name, slug, description, Number(price), original_price ? Number(original_price) : null, category_id, image, material || null, weight || null, stock ? Number(stock) : 10, featured ? 1 : 0, new_arrival ? 1 : 0, best_seller ? 1 : 0
    );
    req.flash('success', 'Product created successfully');
    res.redirect('/admin/products');
  });

  // Edit product form
  router.get('/products/:id/edit', (req, res) => {
    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    const categories = db.prepare('SELECT * FROM categories').all();
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }
    res.render('admin/product-form', { title: 'Edit Product - Jewels by Iram', product, categories });
  });

  // Update product
  router.post('/products/:id', validateCsrf, (req, res) => {
    const { name, description, price, original_price, category_id, image, material, weight, stock, featured, new_arrival, best_seller, active } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const db = getDb();
    db.prepare('UPDATE products SET name=?, slug=?, description=?, price=?, original_price=?, category_id=?, image=?, material=?, weight=?, stock=?, featured=?, new_arrival=?, best_seller=?, active=? WHERE id=?').run(
      name, slug, description, Number(price), original_price ? Number(original_price) : null, category_id, image, material || null, weight || null, stock ? Number(stock) : 10, featured ? 1 : 0, new_arrival ? 1 : 0, best_seller ? 1 : 0, active !== undefined ? (active ? 1 : 0) : 1, req.params.id
    );
    req.flash('success', 'Product updated successfully');
    res.redirect('/admin/products');
  });

  // Delete product
  router.post('/products/:id/delete', validateCsrf, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    req.flash('success', 'Product deleted');
    res.redirect('/admin/products');
  });

  // Orders management
  router.get('/orders', (req, res) => {
    const db = getDb();
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    res.render('admin/orders', { title: 'Manage Orders - Jewels by Iram', orders });
  });

  // Order detail
  router.get('/orders/:id', (req, res) => {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/orders');
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.render('admin/order-detail', { title: 'Order ' + order.order_number + ' - Jewels by Iram', order, items });
  });

  // Update order status
  router.post('/orders/:id/status', validateCsrf, (req, res) => {
    const { status } = req.body;
    const db = getDb();
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    req.flash('success', 'Order status updated');
    res.redirect('/admin/orders/' + req.params.id);
  });

  // Messages
  router.get('/messages', (req, res) => {
    const db = getDb();
    const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
    // Mark all as read
    db.prepare('UPDATE contact_messages SET read = 1 WHERE read = 0').run();
    res.render('admin/messages', { title: 'Messages - Jewels by Iram', messages });
  });

  return router;
};

'use strict';

const express = require('express');
const bcryptjs = require('bcryptjs');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf) {
  const router = express.Router();

  // Login page
  router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('pages/login', { title: 'Login - Jewels by Iram' });
  });

  // Login handler
  router.post('/login', validateCsrf, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      req.flash('error', 'Please provide email and password');
      return res.redirect('/login');
    }
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcryptjs.compareSync(password, user.password)) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }

    // Migrate cart items from session to user
    db.prepare('UPDATE cart_items SET user_id = ?, session_id = NULL WHERE session_id = ?').run(user.id, req.session.id);

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.flash('success', 'Welcome back, ' + user.name + '!');
    res.redirect(user.role === 'admin' ? '/admin' : '/');
  });

  // Register page
  router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('pages/register', { title: 'Register - Jewels by Iram' });
  });

  // Register handler
  router.post('/register', validateCsrf, (req, res) => {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/register');
    }
    if (password.length < 6) {
      req.flash('error', 'Password must be at least 6 characters');
      return res.redirect('/register');
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      req.flash('error', 'An account with this email already exists');
      return res.redirect('/register');
    }
    const hash = bcryptjs.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)').run(name, email, hash, phone || null);

    // Migrate cart
    db.prepare('UPDATE cart_items SET user_id = ?, session_id = NULL WHERE session_id = ?').run(result.lastInsertRowid, req.session.id);

    req.session.user = { id: result.lastInsertRowid, name, email, role: 'customer' };
    req.flash('success', 'Account created successfully! Welcome, ' + name + '!');
    res.redirect('/');
  });

  // Profile page
  router.get('/profile', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.session.user.id);
    res.render('pages/profile', { title: 'My Profile - Jewels by Iram', profile: user, orders });
  });

  // Update profile
  router.post('/profile', validateCsrf, (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { name, phone, address, city, pincode } = req.body;
    const db = getDb();
    db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, city = ?, pincode = ? WHERE id = ?').run(name, phone || null, address || null, city || null, pincode || null, req.session.user.id);
    req.session.user.name = name;
    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  });

  // Logout
  router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  return router;
};

'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Home page
router.get('/', (req, res) => {
  const db = getDb();
  const featured = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.featured = 1 AND p.active = 1 LIMIT 8').all();
  const newArrivals = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.new_arrival = 1 AND p.active = 1 LIMIT 8').all();
  const bestSellers = db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.best_seller = 1 AND p.active = 1 LIMIT 8').all();
  const categories = db.prepare('SELECT * FROM categories').all();

  res.render('pages/home', { title: 'Jewels by Iram - Exquisite Handcrafted Jewelry', featured, newArrivals, bestSellers, categories });
});

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', { title: 'About Us - Jewels by Iram' });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('pages/contact', { title: 'Contact Us - Jewels by Iram' });
});

// Contact form submission
router.post('/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    req.flash('error', 'Please fill in all required fields');
    return res.redirect('/contact');
  }
  const db = getDb();
  db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(name, email, phone || null, subject || null, message);
  req.flash('success', 'Thank you for your message! We will get back to you soon.');
  res.redirect('/contact');
});

// Newsletter subscription
router.post('/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email) {
    req.flash('error', 'Please provide your email address');
    return res.redirect('back');
  }
  req.flash('success', 'Thank you for subscribing to our newsletter!');
  const referer = req.get('Referer') || '/';
  res.redirect(referer);
});

module.exports = router;

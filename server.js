'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const helmet = require('helmet');
const Tokens = require('csrf');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const tokens = new Tokens();

// Initialize database
getDb();

// Security headers (allow inline styles/scripts for our templates, and images from same origin)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'jewels-by-iram-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Flash messages
app.use(flash());

// CSRF protection
app.use((req, res, next) => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }
  next();
});

function generateCsrfToken(req) {
  return tokens.create(req.session.csrfSecret);
}

function validateCsrf(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (!tokens.verify(req.session.csrfSecret, token)) {
    return res.status(403).render('pages/error', {
      title: 'Forbidden',
      message: 'Invalid CSRF token. Please try again.',
      user: req.session.user || null,
      cartCount: 0,
      csrfToken: generateCsrfToken(req)
    });
  }
  next();
}

// Cart count middleware
function getCartCount(req) {
  const db = getDb();
  const identifier = req.session.user ? req.session.user.id : req.session.id;
  const field = req.session.user ? 'user_id' : 'session_id';
  const row = db.prepare(`SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE ${field} = ?`).get(identifier);
  return row ? row.count : 0;
}

// Global template variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = generateCsrfToken(req);
  res.locals.cartCount = getCartCount(req);
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.whatsappNumber = process.env.WHATSAPP_NUMBER || '919876543210';
  next();
});

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please login to continue');
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('pages/error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.',
      user: req.session.user || null,
      cartCount: 0,
      csrfToken: generateCsrfToken(req)
    });
  }
  next();
}

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth')(validateCsrf));
app.use('/shop', require('./routes/shop'));
app.use('/cart', require('./routes/cart')(validateCsrf));
app.use('/wishlist', require('./routes/wishlist')(validateCsrf, requireAuth));
app.use('/orders', require('./routes/orders')(validateCsrf, requireAuth));
app.use('/admin', require('./routes/admin')(validateCsrf, requireAdmin));
app.use('/api', require('./routes/api')(validateCsrf));

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    user: req.session.user || null,
    cartCount: getCartCount(req),
    csrfToken: generateCsrfToken(req)
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', {
    title: 'Server Error',
    message: 'Something went wrong. Please try again later.',
    user: req.session.user || null,
    cartCount: 0,
    csrfToken: generateCsrfToken(req)
  });
});

app.listen(PORT, () => {
  console.log(`✨ Jewels by Iram is running at http://localhost:${PORT}`);
});

module.exports = app;

'use strict';

const express = require('express');
const { getDb } = require('../db/database');

module.exports = function (validateCsrf, requireAuth) {
  const router = express.Router();

  router.use(requireAuth);

  // Order confirmation / detail
  router.get('/:orderNumber', (req, res) => {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(req.params.orderNumber);
    if (!order) {
      return res.status(404).render('pages/error', {
        title: 'Order Not Found',
        message: 'The order you are looking for does not exist.',
        user: req.session.user || null,
        cartCount: res.locals.cartCount,
        csrfToken: res.locals.csrfToken
      });
    }
    // Only allow the owner or admin to view
    if (req.session.user.role !== 'admin' && order.user_id !== req.session.user.id) {
      return res.status(403).render('pages/error', {
        title: 'Access Denied',
        message: 'You do not have permission to view this order.',
        user: req.session.user,
        cartCount: res.locals.cartCount,
        csrfToken: res.locals.csrfToken
      });
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.render('pages/order', { title: 'Order ' + order.order_number + ' - Jewels by Iram', order, items });
  });

  return router;
};

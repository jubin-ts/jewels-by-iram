const express = require('express');
const router = express.Router();
const { getPool } = require('../database/db');
const { generateOrderPDF } = require('../utils/pdf');

const ZIINA_API_URL = 'https://api-v2.ziina.com/api/payment_intent';

// Create a payment intent and redirect to Ziina checkout
router.post('/create', async (req, res) => {
  const pool = getPool();
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  const order = (await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])).rows[0];
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const apiKey = process.env.ZIINA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const isTestMode = process.env.ZIINA_TEST_MODE === 'true';
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const response = await fetch(ZIINA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(order.total_amount * 100), // Convert to base units (fils)
        currency_code: 'AED',
        message: `Payment for Order ${order.order_number}`,
        success_url: `${baseUrl}/payment/success?order=${order.order_number}`,
        cancel_url: `${baseUrl}/payment/cancel?order=${order.order_number}`,
        failure_url: `${baseUrl}/payment/failure?order=${order.order_number}`,
        test: isTestMode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Ziina API error:', data);
      return res.status(502).json({ error: 'Payment gateway error. Please try again.' });
    }

    // Store payment intent ID with the order
    await pool.query('UPDATE orders SET payment_intent_id = $1, status = $2 WHERE id = $3', [data.id, 'payment_pending', order.id]);

    res.json({
      success: true,
      redirectUrl: data.redirect_url,
      paymentIntentId: data.id
    });
  } catch (error) {
    console.error('Payment creation failed:', error);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
});

// Payment success callback
router.get('/success', async (req, res, next) => {
  try {
    const pool = getPool();
    const { order: orderNumber } = req.query;

    if (orderNumber) {
      await pool.query('UPDATE orders SET status = $1 WHERE order_number = $2', ['paid', orderNumber]);
    }

    res.render('payment/success', {
      title: 'Payment Successful',
      orderNumber
    });
  } catch (err) {
    next(err);
  }
});

// Download invoice PDF (for customer after payment)
router.get('/invoice/:orderNumber', async (req, res, next) => {
  try {
    const pool = getPool();
    const order = (await pool.query('SELECT * FROM orders WHERE order_number = $1', [req.params.orderNumber])).rows[0];
    if (!order) {
      return res.status(404).render('error', { title: 'Error', message: 'Order not found' });
    }
    const items = (await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id])).rows;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.order_number}.pdf`);
    generateOrderPDF(order, items, res);
  } catch (err) {
    next(err);
  }
});

// Payment cancel callback
router.get('/cancel', (req, res) => {
  const { order: orderNumber } = req.query;

  res.render('payment/cancel', {
    title: 'Payment Cancelled',
    orderNumber
  });
});

// Payment failure callback
router.get('/failure', async (req, res, next) => {
  try {
    const pool = getPool();
    const { order: orderNumber } = req.query;

    if (orderNumber) {
      await pool.query('UPDATE orders SET status = $1 WHERE order_number = $2', ['payment_failed', orderNumber]);
    }

    res.render('payment/failure', {
      title: 'Payment Failed',
      orderNumber
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

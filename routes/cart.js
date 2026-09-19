const express = require('express');
const router = express.Router();
const { getPool } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// Get cart
router.get('/', (req, res) => {
  res.json(req.session.cart || []);
});

// Add to cart
router.post('/add', async (req, res, next) => {
  try {
    const pool = getPool();
    const { productId, quantity = 1 } = req.body;

    const product = (await pool.query(`
      SELECT p.*,
      (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p WHERE p.id = $1
    `, [productId])).rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const existingItem = req.session.cart.find(item => item.productId === product.id);
    if (existingItem) {
      existingItem.quantity += parseInt(quantity, 10);
    } else {
      req.session.cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.primary_image,
        slug: product.slug,
        quantity: parseInt(quantity, 10)
      });
    }

    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ success: true, cart: req.session.cart, cartCount });
  } catch (err) {
    next(err);
  }
});

// Update cart item quantity
router.put('/update', (req, res) => {
  const { productId, quantity } = req.body;

  if (!req.session.cart) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const item = req.session.cart.find(item => item.productId === parseInt(productId, 10));
  if (item) {
    if (parseInt(quantity, 10) <= 0) {
      req.session.cart = req.session.cart.filter(i => i.productId !== parseInt(productId, 10));
    } else {
      item.quantity = parseInt(quantity, 10);
    }
  }

  const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, cart: req.session.cart, cartCount });
});

// Remove from cart
router.delete('/remove/:productId', (req, res) => {
  if (!req.session.cart) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  req.session.cart = req.session.cart.filter(item => item.productId !== parseInt(req.params.productId, 10));
  const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, cart: req.session.cart, cartCount });
});

// Clear cart
router.delete('/clear', (req, res) => {
  req.session.cart = [];
  res.json({ success: true, cart: [], cartCount: 0 });
});

// Place order
router.post('/checkout', async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, phone, email, address, city, orderType, notes } = req.body;

    if (!req.session.cart || req.session.cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (!name || !phone || !address || !city) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    const orderNumber = 'JBI-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0, 4).toUpperCase();
    const totalAmount = req.session.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const client = await pool.connect();
    let orderId;
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(`
        INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, customer_address, city, order_type, total_amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [orderNumber, name, phone, email || '', address, city, orderType || 'retail', totalAmount, notes || '']);
      orderId = orderResult.rows[0].id;

      for (const item of req.session.cart) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
          VALUES ($1, $2, $3, $4, $5)
        `, [orderId, item.productId, item.name, item.quantity, item.price]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Build WhatsApp message
    let whatsappMsg = `🛍️ *New Order - ${orderNumber}*\n\n`;
    whatsappMsg += `*Customer:* ${name}\n`;
    whatsappMsg += `*Phone:* ${phone}\n`;
    if (email) whatsappMsg += `*Email:* ${email}\n`;
    whatsappMsg += `*Address:* ${address}, ${city}\n`;
    whatsappMsg += `*Order Type:* ${orderType || 'Retail'}\n\n`;
    whatsappMsg += `*Items:*\n`;
    for (const item of req.session.cart) {
      whatsappMsg += `• ${item.name} x${item.quantity} - AED ${(item.price * item.quantity).toFixed(2)}\n`;
    }
    whatsappMsg += `\n*Total: AED ${totalAmount.toFixed(2)}*`;
    if (notes) whatsappMsg += `\n\n*Notes:* ${notes}`;

    const whatsappUrl = `https://wa.me/971567241398?text=${encodeURIComponent(whatsappMsg)}`;

    // Clear cart
    req.session.cart = [];

    res.json({
      success: true,
      orderId,
      orderNumber,
      whatsappUrl,
      total: totalAmount
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

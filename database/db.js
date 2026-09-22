const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool;
let initPromise;

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

async function createSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL,
      wholesale_price REAL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      featured INTEGER DEFAULT 0,
      in_stock INTEGER DEFAULT 1,
      new_arrival INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      customer_address TEXT NOT NULL,
      city TEXT NOT NULL,
      order_type TEXT DEFAULT 'retail',
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_intent_id TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS new_arrival INTEGER DEFAULT 0;
  `);

  const adminExists = (await pool.query('SELECT id FROM admin_users WHERE username = $1', ['admin'])).rows[0];
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.query('INSERT INTO admin_users (username, password) VALUES ($1, $2)', ['admin', hashedPassword]);
  }

  const categoryCount = (await pool.query('SELECT COUNT(*) as count FROM categories')).rows[0];
  if (parseInt(categoryCount.count, 10) === 0) {
    const categories = [
      { name: 'Bracelets', slug: 'bracelets', description: 'Elegant anti-tarnish bracelets', display_order: 1 },
      { name: 'Bangles', slug: 'bangles', description: 'Stunning anti-tarnish bangles', display_order: 2 },
      { name: 'Rings', slug: 'rings', description: 'Beautiful anti-tarnish rings', display_order: 3 },
      { name: 'Necklaces', slug: 'necklaces', description: 'Exquisite anti-tarnish necklaces', display_order: 4 },
      { name: 'Anklets', slug: 'anklets', description: 'Graceful anti-tarnish anklets', display_order: 5 },
      { name: 'Nose Pins', slug: 'nose-pins', description: 'Delicate anti-tarnish nose pins', display_order: 6 },
      { name: 'Hip Chain', slug: 'hip-chain', description: 'Luxurious anti-tarnish hip chains', display_order: 7 },
      { name: 'Earrings', slug: 'earrings', description: 'Stunning anti-tarnish earrings', display_order: 8 },
      { name: 'Gift Hampers', slug: 'gift-hampers', description: 'Curated luxury jewelry gift hampers', display_order: 9 },
      { name: 'Kids Jewellery', slug: 'kids-jewellery', description: 'Playful anti-tarnish jewelry for kids', display_order: 10 },
      { name: "Men's Jewellery", slug: 'mens-jewellery', description: 'Anti-tarnish jewelry crafted for men', display_order: 11 }
    ];

    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (name, slug, description, display_order) VALUES ($1, $2, $3, $4)',
        [cat.name, cat.slug, cat.description, cat.display_order]
      );
    }
  }

  // Migration: rename 'Chains' to 'Necklaces' and add new categories if missing
  const chainsCategory = (await pool.query("SELECT id FROM categories WHERE slug = 'chains'")).rows[0];
  if (chainsCategory) {
    await pool.query("UPDATE categories SET name = 'Necklaces', slug = 'necklaces', description = 'Exquisite anti-tarnish necklaces' WHERE slug = 'chains'");
  }
  const earringsExists = (await pool.query("SELECT id FROM categories WHERE slug = 'earrings'")).rows[0];
  if (!earringsExists) {
    await pool.query("INSERT INTO categories (name, slug, description, display_order) VALUES ('Earrings', 'earrings', 'Stunning anti-tarnish earrings', 8)");
  }
  const giftHampersExists = (await pool.query("SELECT id FROM categories WHERE slug = 'gift-hampers'")).rows[0];
  if (!giftHampersExists) {
    await pool.query("INSERT INTO categories (name, slug, description, display_order) VALUES ('Gift Hampers', 'gift-hampers', 'Curated luxury jewelry gift hampers', 9)");
  }

  // Migration: rename 'Waist Chains' to 'Hip Chain'
  const waistChainsCategory = (await pool.query("SELECT id FROM categories WHERE slug = 'waist-chains'")).rows[0];
  if (waistChainsCategory) {
    await pool.query("UPDATE categories SET name = 'Hip Chain', slug = 'hip-chain', description = 'Luxurious anti-tarnish hip chains' WHERE slug = 'waist-chains'");
  }
  const kidsExists = (await pool.query("SELECT id FROM categories WHERE slug = 'kids-jewellery'")).rows[0];
  if (!kidsExists) {
    await pool.query("INSERT INTO categories (name, slug, description, display_order) VALUES ('Kids Jewellery', 'kids-jewellery', 'Playful anti-tarnish jewelry for kids', 10)");
  }
  const mensExists = (await pool.query("SELECT id FROM categories WHERE slug = 'mens-jewellery'")).rows[0];
  if (!mensExists) {
    await pool.query("INSERT INTO categories (name, slug, description, display_order) VALUES ('Men''s Jewellery', 'mens-jewellery', 'Anti-tarnish jewelry crafted for men', 11)");
  }
}

function initDatabase() {
  if (!initPromise) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable must be set (connect a Postgres database to this project).');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    initPromise = createSchema(pool);
  }
  return initPromise;
}

module.exports = { initDatabase, getPool };

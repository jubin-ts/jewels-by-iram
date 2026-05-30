const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

let db;

function initDatabase() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'jewels.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL NOT NULL,
      wholesale_price REAL,
      category_id INTEGER NOT NULL,
      featured INTEGER DEFAULT 0,
      in_stock INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if not exists
  const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  }

  // Add payment_intent_id column if not exists (migration)
  const columns = db.prepare("PRAGMA table_info(orders)").all();
  if (!columns.find(c => c.name === 'payment_intent_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN payment_intent_id TEXT');
  }

  // Seed default categories if not exists
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count === 0) {
    const categories = [
      { name: 'Bracelets', slug: 'bracelets', description: 'Elegant anti-tarnish bracelets', display_order: 1 },
      { name: 'Bangles', slug: 'bangles', description: 'Stunning anti-tarnish bangles', display_order: 2 },
      { name: 'Rings', slug: 'rings', description: 'Beautiful anti-tarnish rings', display_order: 3 },
      { name: 'Necklaces', slug: 'necklaces', description: 'Exquisite anti-tarnish necklaces', display_order: 4 },
      { name: 'Anklets', slug: 'anklets', description: 'Graceful anti-tarnish anklets', display_order: 5 },
      { name: 'Nose Pins', slug: 'nose-pins', description: 'Delicate anti-tarnish nose pins', display_order: 6 },
      { name: 'Waist Chains', slug: 'waist-chains', description: 'Luxurious anti-tarnish waist chains', display_order: 7 },
      { name: 'Earrings', slug: 'earrings', description: 'Stunning anti-tarnish earrings', display_order: 8 },
      { name: 'Gift Hampers', slug: 'gift-hampers', description: 'Curated luxury jewelry gift hampers', display_order: 9 },
    ];

    const insert = db.prepare('INSERT INTO categories (name, slug, description, display_order) VALUES (?, ?, ?, ?)');
    for (const cat of categories) {
      insert.run(cat.name, cat.slug, cat.description, cat.display_order);
    }
  }

  // Migration: Rename 'Chains' to 'Necklaces' and add new categories if missing
  const chainsCategory = db.prepare("SELECT id FROM categories WHERE slug = 'chains'").get();
  if (chainsCategory) {
    db.prepare("UPDATE categories SET name = 'Necklaces', slug = 'necklaces', description = 'Exquisite anti-tarnish necklaces' WHERE slug = 'chains'").run();
  }
  const earringsExists = db.prepare("SELECT id FROM categories WHERE slug = 'earrings'").get();
  if (!earringsExists) {
    db.prepare("INSERT INTO categories (name, slug, description, display_order) VALUES ('Earrings', 'earrings', 'Stunning anti-tarnish earrings', 8)").run();
  }
  const giftHampersExists = db.prepare("SELECT id FROM categories WHERE slug = 'gift-hampers'").get();
  if (!giftHampersExists) {
    db.prepare("INSERT INTO categories (name, slug, description, display_order) VALUES ('Gift Hampers', 'gift-hampers', 'Curated luxury jewelry gift hampers', 9)").run();
  }

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb };

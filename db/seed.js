'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcryptjs = require('bcryptjs');
const { getDb } = require('./database');

const db = getDb();

// Seed categories
const categories = [
  { name: 'Necklaces', slug: 'necklaces', description: 'Elegant necklaces crafted with precision and love', image: '/images/products/necklace-gold-traditional-1.jpeg' },
  { name: 'Earrings', slug: 'earrings', description: 'Stunning earrings for every occasion', image: '/images/products/earring-gold-jhumka-1.jpeg' },
  { name: 'Bracelets & Bangles', slug: 'bracelets-bangles', description: 'Beautiful bracelets and bangles to adorn your wrists', image: '/images/products/bracelet-gold-bangle-1.jpeg' },
  { name: 'Rings', slug: 'rings', description: 'Exquisite rings that speak elegance', image: '/images/products/ring-gold-solitaire-1.jpeg' },
  { name: 'Pendants', slug: 'pendants', description: 'Charming pendants for a delicate touch', image: '/images/products/pendant-gold-heart-1.jpeg' },
  { name: 'Jewelry Sets', slug: 'jewelry-sets', description: 'Complete jewelry sets for special occasions', image: '/images/products/set-bridal-gold-1.jpeg' },
];

const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, slug, description, image) VALUES (?, ?, ?, ?)');

for (const cat of categories) {
  insertCategory.run(cat.name, cat.slug, cat.description, cat.image);
}

console.log('✓ Categories seeded');

// Get category IDs
const getCatId = db.prepare('SELECT id FROM categories WHERE slug = ?');
const catIds = {};
for (const cat of categories) {
  const row = getCatId.get(cat.slug);
  if (row) catIds[cat.slug] = row.id;
}

// Seed products
const products = [
  // Necklaces
  { name: 'Royal Gold Traditional Necklace', slug: 'royal-gold-traditional-necklace', description: 'A magnificent traditional gold necklace featuring intricate handcrafted designs. Perfect for weddings and grand celebrations. This timeless piece showcases the finest craftsmanship with detailed filigree work.', price: 45999, original_price: 52999, category_id: catIds['necklaces'], image: '/images/products/necklace-gold-traditional-1.jpeg', material: '22K Gold', weight: '28g', featured: 1, best_seller: 1 },
  { name: 'Pearl Elegance Necklace', slug: 'pearl-elegance-necklace', description: 'An elegant pearl necklace with a sophisticated design. Features lustrous freshwater pearls strung on a delicate gold chain. Ideal for both formal events and everyday luxury.', price: 18999, original_price: 22999, category_id: catIds['necklaces'], image: '/images/products/necklace-pearl-elegant-2.jpeg', material: 'Pearls & Gold', weight: '15g', featured: 1, new_arrival: 1 },
  { name: 'Diamond Pendant Necklace', slug: 'diamond-pendant-necklace', description: 'A stunning diamond pendant necklace that adds sparkle to any outfit. Features a brilliant-cut diamond set in white gold with an adjustable chain for the perfect fit.', price: 35999, original_price: 41999, category_id: catIds['necklaces'], image: '/images/products/necklace-diamond-pendant-3.jpeg', material: '18K White Gold & Diamond', weight: '12g', new_arrival: 1 },
  { name: 'Layered Chain Necklace', slug: 'layered-chain-necklace', description: 'A trendy layered chain necklace combining multiple delicate chains at different lengths. This versatile piece transitions effortlessly from day to night.', price: 12999, original_price: 15999, category_id: catIds['necklaces'], image: '/images/products/necklace-layered-chain-4.jpeg', material: '18K Gold Plated', weight: '10g', new_arrival: 1 },
  { name: 'Gold Choker Necklace', slug: 'gold-choker-necklace', description: 'A stunning gold choker necklace with contemporary design elements. Sits perfectly on the collarbone for a dramatic yet sophisticated look. A must-have for the modern jewellery collection.', price: 28999, original_price: 33999, category_id: catIds['necklaces'], image: '/images/products/necklace-choker-gold-5.jpeg', material: '22K Gold', weight: '22g', best_seller: 1 },

  // Earrings
  { name: 'Gold Jhumka Earrings', slug: 'gold-jhumka-earrings', description: 'Classic Indian jhumka earrings in pure gold with delicate bell-shaped drops. Features traditional engravings and tiny gold beads. A timeless piece for festive occasions.', price: 16999, original_price: 19999, category_id: catIds['earrings'], image: '/images/products/earring-gold-jhumka-1.jpeg', material: '22K Gold', weight: '14g', featured: 1, best_seller: 1 },
  { name: 'Diamond Stud Earrings', slug: 'diamond-stud-earrings', description: 'Elegant diamond stud earrings featuring brilliant-cut diamonds in a classic four-prong setting. The perfect everyday luxury that adds subtle sparkle.', price: 24999, original_price: 28999, category_id: catIds['earrings'], image: '/images/products/earring-diamond-stud-2.jpeg', material: '18K White Gold & Diamond', weight: '6g', featured: 1 },
  { name: 'Pearl Drop Earrings', slug: 'pearl-drop-earrings', description: 'Graceful pearl drop earrings with lustrous South Sea pearls. The minimalist gold setting lets the natural beauty of the pearls take center stage.', price: 9999, original_price: 12999, category_id: catIds['earrings'], image: '/images/products/earring-pearl-drop-3.jpeg', material: 'Pearls & Gold', weight: '8g', new_arrival: 1 },
  { name: 'Chandbali Earrings', slug: 'chandbali-earrings', description: 'Exquisite chandbali earrings inspired by Mughal artistry. Features crescent moon shapes adorned with tiny pearls and meenakari work. Perfect for bridal and festive wear.', price: 21999, original_price: 25999, category_id: catIds['earrings'], image: '/images/products/earring-chandbali-4.jpeg', material: 'Gold & Pearls', weight: '16g', best_seller: 1 },
  { name: 'Gold Hoop Earrings', slug: 'gold-hoop-earrings', description: 'Sleek and modern gold hoop earrings with a polished finish. These versatile hoops are the perfect accessory for any occasion, from casual outings to formal events.', price: 8999, original_price: 10999, category_id: catIds['earrings'], image: '/images/products/earring-hoop-gold-5.jpeg', material: '18K Gold', weight: '7g', new_arrival: 1 },

  // Bracelets & Bangles
  { name: 'Gold Bangle Set', slug: 'gold-bangle-set', description: 'A set of exquisite gold bangles with intricate carvings and traditional patterns. Each bangle is handcrafted with attention to detail. Perfect for weddings and festive occasions.', price: 32999, original_price: 38999, category_id: catIds['bracelets-bangles'], image: '/images/products/bracelet-gold-bangle-1.jpeg', material: '22K Gold', weight: '35g', featured: 1, best_seller: 1 },
  { name: 'Diamond Tennis Bracelet', slug: 'diamond-tennis-bracelet', description: 'A classic diamond tennis bracelet featuring a continuous line of brilliant-cut diamonds set in white gold. The epitome of elegance and luxury.', price: 54999, original_price: 62999, category_id: catIds['bracelets-bangles'], image: '/images/products/bracelet-diamond-tennis-2.jpeg', material: '18K White Gold & Diamonds', weight: '18g', featured: 1 },
  { name: 'Charm Chain Bracelet', slug: 'charm-chain-bracelet', description: 'A delicate charm chain bracelet with miniature gold charms. Each charm is carefully crafted to represent luck, love, and prosperity. A meaningful gift for loved ones.', price: 11999, original_price: 14999, category_id: catIds['bracelets-bangles'], image: '/images/products/bracelet-charm-chain-3.jpeg', material: '18K Gold', weight: '9g', new_arrival: 1 },
  { name: 'Kundan Bangle Set', slug: 'kundan-bangle-set', description: 'Traditional kundan bangles featuring uncut polki diamonds set in gold. The vibrant meenakari work on the inside adds a splash of color. A royal accessory for special occasions.', price: 27999, original_price: 32999, category_id: catIds['bracelets-bangles'], image: '/images/products/bracelet-kundan-bangle-4.jpeg', material: 'Gold & Kundan', weight: '30g', best_seller: 1 },
  { name: 'Pearl String Bracelet', slug: 'pearl-string-bracelet', description: 'An elegant pearl string bracelet with a gold clasp. Features hand-selected freshwater pearls with beautiful lustre. A versatile piece that pairs beautifully with any outfit.', price: 7999, original_price: 9999, category_id: catIds['bracelets-bangles'], image: '/images/products/bracelet-pearl-string-5.jpeg', material: 'Pearls & Gold', weight: '8g', new_arrival: 1 },

  // Rings
  { name: 'Gold Solitaire Ring', slug: 'gold-solitaire-ring', description: 'A timeless gold solitaire ring featuring a brilliant-cut gemstone in a classic setting. The perfect symbol of enduring love and commitment.', price: 29999, original_price: 34999, category_id: catIds['rings'], image: '/images/products/ring-gold-solitaire-1.jpeg', material: '22K Gold & Diamond', weight: '8g', featured: 1, best_seller: 1 },
  { name: 'Diamond Band Ring', slug: 'diamond-band-ring', description: 'A sophisticated diamond band ring with channel-set diamonds across the band. Perfect as a wedding band or anniversary gift.', price: 22999, original_price: 26999, category_id: catIds['rings'], image: '/images/products/ring-diamond-band-2.jpeg', material: '18K White Gold & Diamonds', weight: '6g', featured: 1 },
  { name: 'Pearl Cocktail Ring', slug: 'pearl-cocktail-ring', description: 'A statement pearl cocktail ring featuring a large South Sea pearl surrounded by a halo of tiny diamonds. A conversation starter at any gathering.', price: 15999, original_price: 18999, category_id: catIds['rings'], image: '/images/products/ring-pearl-cocktail-3.jpeg', material: 'Gold, Pearl & Diamonds', weight: '10g', new_arrival: 1 },
  { name: 'Emerald Vintage Ring', slug: 'emerald-vintage-ring', description: 'A vintage-inspired ring featuring a vibrant emerald surrounded by diamond accents. The Art Deco design adds old-world charm to this stunning piece.', price: 19999, original_price: 23999, category_id: catIds['rings'], image: '/images/products/ring-emerald-vintage-4.jpeg', material: '18K Gold & Emerald', weight: '7g', new_arrival: 1 },

  // Pendants
  { name: 'Gold Heart Pendant', slug: 'gold-heart-pendant', description: 'A beautiful gold heart pendant symbolizing love and devotion. Features intricate detailing with a high-polish finish. Comes with an adjustable gold chain.', price: 8999, original_price: 10999, category_id: catIds['pendants'], image: '/images/products/pendant-gold-heart-1.jpeg', material: '18K Gold', weight: '5g', featured: 1, new_arrival: 1 },
  { name: 'Diamond Drop Pendant', slug: 'diamond-drop-pendant', description: 'An exquisite diamond drop pendant featuring a pear-shaped diamond in a delicate gold setting. The pendant catches light beautifully from every angle.', price: 26999, original_price: 31999, category_id: catIds['pendants'], image: '/images/products/pendant-diamond-drop-2.jpeg', material: '18K White Gold & Diamond', weight: '7g', best_seller: 1 },
  { name: 'Ruby Oval Pendant', slug: 'ruby-oval-pendant', description: 'A stunning oval ruby pendant encircled by diamonds. The deep red of the ruby contrasts beautifully with the white gold setting. A piece that exudes luxury.', price: 18999, original_price: 22999, category_id: catIds['pendants'], image: '/images/products/pendant-ruby-oval-3.jpeg', material: '18K Gold, Ruby & Diamonds', weight: '6g', new_arrival: 1 },

  // Jewelry Sets
  { name: 'Bridal Gold Set', slug: 'bridal-gold-set', description: 'A complete bridal jewelry set featuring a stunning necklace, matching earrings, and bangles. Crafted in traditional design with intricate gold work. The perfect ensemble for the bride.', price: 89999, original_price: 99999, category_id: catIds['jewelry-sets'], image: '/images/products/set-bridal-gold-1.jpeg', material: '22K Gold', weight: '85g', featured: 1, best_seller: 1 },
  { name: 'Pearl Necklace & Earring Set', slug: 'pearl-necklace-earring-set', description: 'A matching pearl necklace and earring set featuring lustrous freshwater pearls. The elegant design makes it perfect for weddings, parties, or special celebrations.', price: 24999, original_price: 29999, category_id: catIds['jewelry-sets'], image: '/images/products/set-pearl-necklace-earring-2.jpeg', material: 'Pearls & Gold', weight: '25g', new_arrival: 1 },
  { name: 'Kundan Complete Set', slug: 'kundan-complete-set', description: 'A magnificent kundan jewelry set including a choker necklace, statement earrings, maang tikka, and bangles. Features traditional polki diamonds and vibrant meenakari work. A royal ensemble.', price: 65999, original_price: 75999, category_id: catIds['jewelry-sets'], image: '/images/products/set-kundan-complete-3.jpeg', material: 'Gold & Kundan', weight: '65g', best_seller: 1 },
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (name, slug, description, price, original_price, category_id, image, material, weight, featured, new_arrival, best_seller)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of products) {
  insertProduct.run(p.name, p.slug, p.description, p.price, p.original_price, p.category_id, p.image, p.material, p.weight, p.featured || 0, p.new_arrival || 0, p.best_seller || 0);
}

console.log('✓ Products seeded (' + products.length + ' products)');

// Seed admin user
const adminEmail = process.env.ADMIN_EMAIL || 'admin@jewelsByIram.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const hash = bcryptjs.hashSync(adminPassword, 10);

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
insertUser.run('Admin', adminEmail, hash, 'admin');

console.log('✓ Admin user seeded (' + adminEmail + ')');
console.log('✓ Database seeding complete!');

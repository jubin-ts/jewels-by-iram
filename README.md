# Jewels by Iram

A luxury anti-tarnish jewelry brand website with e-commerce functionality, built with Node.js, Express, and SQLite.

## Features

- **Luxury Brand Website** - Elegant, responsive design with gold and black color scheme
- **Product Catalog** - Browse by categories: Bracelets, Bangles, Rings, Chains, Anklets, Nose Pins, Waist Chains
- **Shopping Cart** - Add to cart, update quantities, remove items
- **Order System** - Place orders with WhatsApp integration for order confirmation
- **Admin Panel** - Full product management (add, edit, delete products and images)
- **WhatsApp & Call Buttons** - Floating action buttons for instant contact
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Retail & Wholesale** - Support for both retail and wholesale orders
- **UAE Delivery** - Free delivery across all UAE emirates

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Visit the website
open http://localhost:3000
```

## Admin Panel

Access the admin panel at `/admin/login`

**Default credentials:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **Important:** Change the default admin password after first login.

### Admin Features
- Dashboard with statistics
- Add/Edit/Delete products with multiple images
- Set product prices (retail & wholesale)
- Manage product categories and stock status
- View and manage orders
- Update order status

## Contact Information

- **WhatsApp:** +971 56 724 1398
- **Phone:** +971 56 724 1398
- **Email:** info@jewelsbyiram.ae
- **Instagram:** [@jewels_by_iram.ae](https://www.instagram.com/jewels_by_iram.ae)

## Tech Stack

- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3)
- **Templates:** EJS
- **Authentication:** bcryptjs
- **File Upload:** Multer
- **Sessions:** express-session

## Project Structure

```
├── server.js              # Main server file
├── package.json           # Dependencies
├── database/
│   └── db.js              # Database initialization
├── routes/
│   ├── public.js          # Public page routes
│   ├── products.js        # Product API routes
│   ├── cart.js            # Cart & checkout routes
│   └── admin.js           # Admin panel routes
├── middleware/
│   └── auth.js            # Admin authentication
├── views/                 # EJS templates
│   ├── index.ejs          # Home page
│   ├── shop.ejs           # Shop page
│   ├── product.ejs        # Product detail
│   ├── cart.ejs           # Shopping cart
│   ├── checkout.ejs       # Checkout
│   ├── contact.ejs        # Contact page
│   ├── about.ejs          # About page
│   └── admin/             # Admin templates
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Client-side JavaScript
│   └── uploads/           # Product images (uploaded)
└── .gitignore
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `SESSION_SECRET` | (built-in) | Session encryption key |


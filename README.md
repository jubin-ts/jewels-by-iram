# Jewels by Iram

A luxury anti-tarnish jewelry brand website with e-commerce functionality, built with Node.js, Express, and Postgres.

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

Requires a Postgres database - this project is deployed with Vercel Postgres (Neon).
For local development, pull the project's env vars with the Vercel CLI
(`vercel env pull .env`) or copy `POSTGRES_URL` from the project's Storage tab
into a local `.env` file.

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
- **Database:** Postgres (Vercel Postgres / Neon, via `pg`)
- **Image storage:** Vercel Blob (local disk in development)
- **Templates:** EJS
- **Authentication:** bcryptjs
- **File Upload:** Multer
- **Sessions:** cookie-session (signed cookie, no server-side store)

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
| `SESSION_SECRET` | required in production | Session/cookie signing key - must be set to a fixed value in production, or every serverless cold start would generate its own and invalidate everyone else's sessions |
| `POSTGRES_URL` | required | Postgres connection string, set automatically by the Vercel Postgres integration |
| `BLOB_READ_WRITE_TOKEN` | optional | Vercel Blob token for product image uploads, set automatically once a Blob store is linked to the project. Falls back to local disk storage when unset (local dev only) |
| `ZIINA_API_KEY` | optional | Enables the "Pay Online" checkout option |


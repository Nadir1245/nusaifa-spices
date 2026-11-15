# NUSAIFA SPICES — Complete E-Commerce Platform & Admin Dashboard

A portable, production-ready bilingual (**English & বাংলা**) e-commerce platform and separate administrator dashboard built for **NUSAIFA SPICES** (Bangladesh-based Natural Spices, Organic Food, Herbal Products, and Superfoods).

## Key Architecture

- **Two Separate Applications, Single Secure Backend**:
  - **Customer Storefront (`/`)**: Bilingual EN/BN catalog, 5 curated categories (*Spices, Natural Food, Herbal Products, Organic Products, Superfoods*), product details, persistent shopping bag, Bangladesh-wide Cash on Delivery (COD) checkout with District & Upazila delivery charge calculation, customer registration/login, order history, live order tracking, and editable legal/brand pages.
  - **Admin Dashboard (`/admin`)**: Protected by JWT + `bcryptjs` password hashing + Role-Based Access Control (`role === 'admin'`). Includes Overview KPIs, Category Revenue analytics, Product & Stock CRUD with image uploads (`/api/admin/upload`), Order Status management with bilingual customer notifications, CSV export, Delivery Charge & Payment Gateway settings, Promotional Banners & Website CMS, and JSON Database Export/Restore.
- **100% Portable & Self-Hostable**:
  - Zero lock-in to any proprietary cloud provider.
  - Supports **PostgreSQL 15/16+** natively via `pg` Pool (`DATABASE_URL` or `PGHOST`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`) with high-volume transactional indexing (`db/migrations/001_initial_schema.sql`).
  - Automatically falls back to atomic local JSON file persistence (`data/nusaifa-db.json`) when running without an external PostgreSQL daemon for instant local evaluation.

---

## 1. Local Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, and PostgreSQL credentials

# 3. Run PostgreSQL schema migration (when PostgreSQL is configured)
npm run db:migrate

# 4. Start full-stack Express + Vite server on port 3000
npm run dev
```

Visit:
- **Customer Storefront**: `http://localhost:3000/`
- **Admin Dashboard**: `http://localhost:3000/admin`

---

## 2. Production Build & VPS Deployment (Ubuntu + Nginx + PM2 + PostgreSQL)

### Option A: Standard VPS Deployment (Ubuntu 22.04 / 24.04)

1. **Install Node.js 22 LTS & PostgreSQL**:
   ```bash
   sudo apt update && sudo apt install -y postgresql postgresql-contrib nginx
   ```

2. **Create PostgreSQL Database & User**:
   ```bash
   sudo -u postgres psql -c "CREATE USER nusaifa_user WITH PASSWORD 'your_strong_db_password';"
   sudo -u postgres psql -c "CREATE DATABASE nusaifa_spices OWNER nusaifa_user;"
   ```

3. **Configure `.env` in `/var/www/nusaifa-spices/.env`**:
   ```env
   NODE_ENV=production
   PORT=3000
   APP_URL=https://nusaifaspices.com
   JWT_SECRET=<generate-64-char-hex-secret>
   COOKIE_SECURE=true
   ADMIN_EMAIL=admin@nusaifaspices.com
   ADMIN_PASSWORD=<your-strong-admin-password>
   DATABASE_URL=postgresql://nusaifa_user:your_strong_db_password@localhost:5432/nusaifa_spices
   ```

4. **Install, Migrate & Build**:
   ```bash
   npm ci
   npm run db:migrate
   npm run build
   ```

5. **Run with PM2 Process Manager**:
   ```bash
   npm install -g pm2
   pm2 start "npx tsx server.ts" --name nusaifa-spices
   pm2 save && pm2 startup
   ```

6. **Nginx Reverse Proxy (`/etc/nginx/sites-available/nusaifaspices`)**:
   ```nginx
   server {
       listen 80;
       server_name nusaifaspices.com www.nusaifaspices.com;

       client_max_body_size 10M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Enable HTTPS with Certbot: `sudo certbot --nginx -d nusaifaspices.com -d www.nusaifaspices.com`

### Option B: Docker Compose Deployment

```bash
cp .env.example .env
# Set strong passwords in .env
docker compose up -d --build
```

---

## 3. Database Backup & Restore

### PostgreSQL CLI (`pg_dump` / `pg_restore`)

```bash
# Backup entire PostgreSQL database to compressed archive
pg_dump "$DATABASE_URL" -Fc -f nusaifa-backup-$(date +%F).dump

# Restore database from archive
pg_restore --clean --if-exists -d "$DATABASE_URL" nusaifa-backup-2026-11-14.dump
```

### Built-in Admin Panel Export / Restore
- Navigate to **Admin Dashboard → Reports & Backup**:
  - **Export Orders CSV**: Downloads full order ledger for accounting/courier reconciliation.
  - **Export Full DB JSON**: Downloads a complete portable JSON snapshot of categories, products, delivery settings, banners, CMS content, and orders.
  - **Restore JSON Backup**: Uploads a previously exported JSON snapshot to restore catalog & configuration.

---

## 4. bKash & Nagad Payment Gateway Integration

The platform includes an integration-ready payment configuration layer (`GET /api/payments/gateways` and Admin **Delivery & Pay** settings). Cash on Delivery (COD) is active immediately across all 64 districts. To activate live bKash or Nagad checkout, configure your merchant API credentials (`BKASH_APP_KEY`, `BKASH_APP_SECRET`, `NAGAD_MERCHANT_ID`, `NAGAD_MERCHANT_PRIVATE_KEY`) in `.env` and enable the corresponding gateway toggle in the Admin Dashboard.

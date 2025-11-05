# ZAB'S Store Backend Setup

## Overview

Medusa v2 e-commerce backend with Supabase PostgreSQL database, deployed on Railway.

## Environment Variables

Create `.env` file in `backend/` folder:

```env
# Database
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Redis
REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379

# Secrets
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret

# URLs
BACKEND_URL=https://backend-production-991f.up.railway.app
ADMIN_CORS=https://backend-production-991f.up.railway.app,http://localhost:9000
STORE_CORS=http://localhost:3000,https://your-frontend-url.com

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# File Storage (Supabase S3)
S3_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key

# Search (Optional)
MEILISEARCH_HOST=https://your-meilisearch-url
MEILISEARCH_ADMIN_KEY=your_admin_key

# Payment (Optional)
STRIPE_API_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Installation

```bash
cd backend
npm install
npm run db:migrate    # Run migrations
npm run seed          # Seed sample data (optional)
npm run dev           # Start development server
```

## Database Structure

Medusa v2 uses module-based architecture. Main tables:

- `customer` - Customer profiles
- `order` - Customer orders
- `product` - Products
- `cart` - Shopping carts
- `region` - Store regions
- `store` - Store configuration

## Key Features

### Custom API Routes

- `/store/customers` - Customer registration
- `/store/customers/me` - Current customer profile
- `/store/customers/me/orders` - Customer orders
- `/admin/custom` - Custom admin endpoints

### Modules

- **Email Notifications** (`src/modules/email-notifications/`)

  - Resend integration for transactional emails
  - Templates for order confirmation, invites, etc.

- **File Storage** (`src/modules/minio-file/`)
  - S3-compatible storage (Supabase Storage)
  - Product images, media uploads

### Subscribers

- `order-placed.ts` - Send email when order is placed
- `invite-created.ts` - Send invite emails

## Authentication

Medusa v2 uses built-in auth module with JWT tokens. Frontend uses Supabase Auth which syncs to customer table via database trigger.

## Deployment (Railway)

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

Railway configuration in `railway.json`:

- Build command: `npm run build`
- Start command: `npm run start`
- Port: 9000

## Troubleshooting

**Migration errors:**

```bash
npm run db:migrate -- --revert  # Revert last migration
npm run db:migrate              # Re-run migrations
```

**Database connection issues:**

- Check `DATABASE_URL` format includes `?pgbouncer=true`
- Verify Supabase connection pooling settings
- Check SSL/TLS configuration

**Email not sending:**

- Verify `RESEND_API_KEY` is set
- Check domain verification in Resend dashboard
- Look for email logs in Resend

**File upload errors:**

- Verify S3 credentials are correct
- Check bucket permissions in Supabase
- Ensure `forcePathStyle: true` in config

## API Documentation

- Admin: `http://localhost:9000/admin`
- Store: `http://localhost:9000/store`
- Health: `http://localhost:9000/health`

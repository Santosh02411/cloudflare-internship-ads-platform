# 🚀 Deployment Guide

Complete guide to deploying the Unified Social Media Ads SaaS Platform to production.

## Prerequisites

- Cloudflare account with Workers enabled
- GitHub account (for CI/CD)
- Domain (optional, can use Cloudflare domain)
- API keys from supported platforms (Meta, Google, TikTok, LinkedIn)

## Environment Setup

### 1. Cloudflare Account Configuration

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Database Setup

```bash
# Create D1 database for production
wrangler d1 create socialmediaads-prod

# Get database ID from output
# Update wrangler.toml with database_id

# Apply schema
wrangler d1 migrations apply socialmediaads-prod --file ./src/migrations/schema.sql
```

### 3. KV Namespace Setup

```bash
# Create KV namespaces
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE--preview"

# Get namespace IDs and update wrangler.toml
```

### 4. R2 Bucket Setup

```bash
# Create R2 bucket for media
wrangler r2 bucket create socialmediaads-media

# Create bucket binding in wrangler.toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "socialmediaads-media"
```

### 5. Queue Setup

```bash
# Queue is automatically created with Workers
# Configure in wrangler.toml:

[[queues.consumers]]
queue = "publish-queue"
service = "social-media-ads-backend"
```

### 6. Durable Objects Setup

```toml
# In wrangler.toml

[durable_objects]
bindings = [
  { name = "CAMPAIGN_ORCHESTRATOR", class_name = "CampaignOrchestrator", script_name = "social-media-ads-backend" },
  { name = "RATE_LIMITER", class_name = "RateLimiter", script_name = "social-media-ads-backend" }
]

# Also add migrations:
[[migrations]]
tag = "v1"
new_classes = ["CampaignOrchestrator", "RateLimiter"]
```

## Backend Deployment

### Production Configuration

Create `wrangler.toml`:

```toml
name = "social-media-ads-backend"
type = "service"
main = "src/index.js"
compatibility_date = "2024-01-01"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "socialmediaads-prod"
database_id = "your-d1-database-id"

# KV Namespace
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# R2 Bucket
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "socialmediaads-media"

# Queue
[[queues.consumers]]
queue = "publish-queue"
service = "social-media-ads-backend"

# Durable Objects
[durable_objects]
bindings = [
  { name = "CAMPAIGN_ORCHESTRATOR", class_name = "CampaignOrchestrator", script_name = "social-media-ads-backend" },
  { name = "RATE_LIMITER", class_name = "RateLimiter", script_name = "social-media-ads-backend" }
]

# Production Environment
[env.production]
route = "api.yourdomain.com/*"
vars = { ENVIRONMENT = "production" }

[env.production.secrets]
JWT_SECRET = "your-secure-jwt-secret"
OPENAI_API_KEY = "your-openai-api-key"

# Staging Environment
[env.staging]
route = "staging-api.yourdomain.com/*"
vars = { ENVIRONMENT = "staging" }

[env.staging.secrets]
JWT_SECRET = "your-staging-jwt-secret"
OPENAI_API_KEY = "your-staging-openai-api-key"
```

### Deploy Backend

```bash
cd backend

# Set secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put OPENAI_API_KEY --env production

# Deploy to production
npm run deploy:production

# Or deploy to staging
npm run deploy:staging

# Verify deployment
wrangler tail --env production
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel deploy --prod

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://api.yourdomain.com
```

### Option 2: Cloudflare Pages

```bash
cd frontend

# Build
npm run build

# Deploy using Wrangler
wrangler pages deploy out/

# Or use Cloudflare Dashboard → Pages → Create Project
```

### Option 3: Self-Hosted (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone your-repo
cd your-repo/frontend

# Install dependencies
npm install

# Build
npm run build

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start npm --name "social-ads" -- start
pm2 save

# Setup Nginx reverse proxy
sudo apt-get install nginx
# Configure /etc/nginx/sites-available/default
```

## Domain Configuration

### DNS Setup

```
# In Cloudflare DNS settings

API Subdomain:
api.yourdomain.com  CNAME  social-media-ads-backend.workers.dev

Frontend Domain (if using Vercel):
yourdomain.com      CNAME  yourdomain.vercel.app
```

### SSL/TLS

```bash
# Cloudflare handles SSL automatically
# Verify in Cloudflare Dashboard → SSL/TLS → Overview
# Select "Full (strict)" for maximum security
```

## Database Migration

### Backup Existing Data

```bash
# Export D1 data
wrangler d1 export socialmediaads-prod --output backup.sql

# Store backup securely
```

### Run Migrations

```bash
# Apply migrations in order
wrangler d1 migrations apply socialmediaads-prod

# Verify schema
wrangler d1 execute socialmediaads-prod --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Monitoring & Logging

### Setup Cloudflare Analytics

```bash
# View real-time logs
wrangler tail --env production

# Filter by status
wrangler tail --env production --status 4xx,5xx

# Search logs
wrangler tail --env production --search error
```

### Email Alerts

Configure in Cloudflare Dashboard:
- Notifications → Email → Enable alerts
- Alert on: Errors, High latency, Rate limiting

### Custom Monitoring

```bash
# Check backend health
curl https://api.yourdomain.com/health

# Expected response:
# {"success": true, "data": {"status": "ok", "timestamp": "2024-01-01T00:00:00Z"}}
```

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Deploy Backend
        working-directory: ./backend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          npm install
          npm run deploy:production

      - name: Deploy Frontend
        working-directory: ./frontend
        run: |
          npm install
          npm run build
          # Deploy to Vercel or Pages
```

## Performance Optimization

### Backend Optimization

```javascript
// Enable caching headers
response.headers.set('Cache-Control', 'public, max-age=3600');

// Use KV for frequent queries
await kv.cacheResponse('key', data, 3600);
```

### Frontend Optimization

```javascript
// Next.js image optimization
<Image
  src="/image.jpg"
  alt="description"
  width={1200}
  height={800}
  priority
/>

// Code splitting
const Component = dynamic(() => import('./component'), {
  loading: () => <div>Loading...</div>,
});
```

### Database Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_publishing_jobs_status ON publishing_jobs(status);

-- Monitor query performance
EXPLAIN QUERY PLAN SELECT * FROM campaigns WHERE user_id = ?;
```

## Security Hardening

### Set Security Headers

```toml
# In wrangler.toml route handler
```javascript
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-XSS-Protection', '1; mode=block');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
```

### Rate Limiting

Already implemented via Durable Objects RateLimiter.

### API Authentication

All endpoints require JWT token in Authorization header.

## Rollback Procedure

### If Deployment Fails

```bash
# Revert to previous version
wrangler rollback --env production

# Or manually deploy previous commit
git checkout previous-commit-hash
npm run deploy:production
```

### Database Rollback

```bash
# Restore from backup
sqlite3 backup.sql
# Then re-upload to D1
```

## Troubleshooting

### 500 Errors

```bash
# Check logs
wrangler tail --env production --status 500

# Check database connection
wrangler d1 execute socialmediaads-prod --command "SELECT 1"

# Check KV connection
wrangler kv:key list --binding=CACHE
```

### Timeout Issues

```bash
# Increase Workers timeout
# Note: Max 30s for Workers, 600s for Cron triggers

# Use Queue for long operations
await publishQueue.send(job);
```

### Memory Issues

```bash
# Check usage in Cloudflare Dashboard
# Optimize code to reduce memory footprint
# Consider using Durable Objects for state
```

## Maintenance

### Regular Tasks

- [ ] Monitor error rates daily
- [ ] Review usage analytics weekly
- [ ] Update dependencies monthly
- [ ] Backup database weekly
- [ ] Test disaster recovery quarterly
- [ ] Security audit semi-annually

### Update Process

```bash
# Development
git pull origin main
npm install
npm run dev

# Testing
npm test

# Staging deployment
git checkout staging
npm run deploy:staging

# Production deployment (after testing)
git checkout main
npm run deploy:production
```

## Support & Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)

---

**Last Updated**: January 2024

For issues or questions, please check the main README.md or create an issue in the repository.

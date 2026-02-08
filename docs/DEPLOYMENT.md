# OrbitABM Deployment Guide

Complete guide for deploying OrbitABM to production environments.

## 🚀 Quick Deploy (Vercel + Supabase)

### Prerequisites
- GitHub repository
- Vercel account
- Supabase project
- Domain name (optional)

### 1. Supabase Setup

**Create Project:**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to your users
4. Set strong database password

**Run Migration:**
1. Open SQL Editor in Supabase dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Execute the migration
4. Verify all tables are created

**Configure API Keys:**
1. Go to Settings → API
2. Copy Project URL
3. Copy anon/public key
4. Copy service_role key (for seeding)

### 2. Vercel Deployment

**Connect Repository:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select the `orbit` folder as root directory
4. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

**Environment Variables:**
Add these in Vercel dashboard → Settings → Environment Variables:

```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration (Optional)
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Feature Flags (Optional)
FEATURE_AUDIT_LOGS=true
FEATURE_DOCUMENT_INTELLIGENCE=true
FEATURE_EMAIL_TEMPLATES=true
```

**Deploy:**
1. Click "Deploy"
2. Wait for build completion
3. Test deployment URL

### 3. Seed Database

**Run Seeding Script:**
```bash
# Clone repository locally
git clone https://github.com/your-org/orbitabm.git
cd orbitabm/orbit

# Install dependencies
npm install

# Create .env.local with production keys
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key" >> .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" >> .env.local

# Run seeding
npm run seed
```

### 4. Custom Domain (Optional)

**Add Domain in Vercel:**
1. Go to project Settings → Domains
2. Add your domain name
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning

**DNS Configuration:**
```
Type: CNAME
Name: www (or @)
Value: cname.vercel-dns.com
```

## 🏗️ Manual Deployment

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**Build and Run:**
```bash
# Build image
docker build -t orbitabm .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  orbitabm
```

### VPS/Server Deployment

**System Requirements:**
- Ubuntu 20.04+ or similar
- Node.js 18+
- nginx (recommended)
- SSL certificate

**Installation Steps:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-org/orbitabm.git
cd orbitabm/orbit

# Install dependencies
npm ci --only=production

# Create environment file
sudo nano .env.local
# Add your environment variables

# Build application
npm run build

# Start with PM2
pm2 start npm --name "orbitabm" -- start
pm2 save
pm2 startup
```

**nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Environment Configuration

### Required Environment Variables

**Production Environment:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Optional: Custom Configuration
NEXT_PUBLIC_APP_NAME=OrbitABM
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Security Considerations:**
- Never commit `.env` files to version control
- Use different keys for staging/production
- Rotate keys regularly
- Restrict service role key usage

### Feature Flags

**Optional Environment Variables:**
```env
# Feature toggles
ENABLE_ANALYTICS=true
ENABLE_DEBUG_MODE=false
ENABLE_MAINTENANCE_MODE=false

# Performance settings
MAX_UPLOAD_SIZE=10485760
API_RATE_LIMIT=1000
```

## 📊 Monitoring & Analytics

### Application Monitoring

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

Add to `layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Error Tracking:**
```bash
npm install @sentry/nextjs
```

**Performance Monitoring:**
- Vercel Speed Insights
- Core Web Vitals tracking
- API response time monitoring
- Database query performance

### Database Monitoring

**Supabase Dashboard:**
- Query performance metrics
- Connection pool status
- Storage usage
- API request volume

**Custom Monitoring:**
```sql
-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

## 🔐 Security Configuration

### SSL/TLS Setup

**Vercel (Automatic):**
- SSL certificates automatically provisioned
- HTTP to HTTPS redirects enabled
- Security headers configured

**Manual SSL (Let's Encrypt):**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

**Next.js Configuration:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

### Database Security

**Row Level Security (Future):**
```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ... other tables

-- Create policies
CREATE POLICY "Users see own org data" ON companies
  FOR ALL USING (organization_id = current_setting('app.current_org_id')::uuid);
```

## 🔄 CI/CD Pipeline

### GitHub Actions

**Deployment Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Quality Gates

**Pre-deployment Checks:**
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build verification
npm run build

# Security audit
npm audit

# Bundle analysis
npm run analyze
```

## 📈 Performance Optimization

### Build Optimization

**Next.js Configuration:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizeImages: true
  },
  images: {
    domains: ['your-supabase-url.supabase.co']
  },
  compress: true,
  poweredByHeader: false
}
```

### Database Optimization

**Connection Pooling:**
```javascript
// lib/supabase/server.ts
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    global: {
      headers: { 'sb-pool-mode': 'transaction' }
    }
  }
)
```

**Query Optimization:**
- Use appropriate indexes
- Limit result sets
- Use pagination for large datasets
- Cache frequently accessed data

### CDN Configuration

**Static Asset Optimization:**
- Vercel Edge Network (automatic)
- Image optimization
- Font optimization
- JavaScript/CSS minification

## 🔧 Maintenance

### Regular Tasks

**Weekly:**
- Monitor error rates
- Check performance metrics
- Review security logs
- Update dependencies

**Monthly:**
- Database maintenance
- Security audit
- Backup verification
- Performance optimization

**Quarterly:**
- Dependency updates
- Security patches
- Feature flag cleanup
- Documentation updates

### Backup Strategy

**Database Backups:**
```bash
# Supabase automatic backups (enabled by default)
# Manual backup via CLI
supabase db dump --db-url "postgresql://..." > backup.sql

# Restore from backup
psql "postgresql://..." < backup.sql
```

**Application Backups:**
- Git repository (source code)
- Environment configurations
- Asset files (if any)
- Documentation

### Troubleshooting

**Common Issues:**
1. **Build failures**: Check Node.js version and dependencies
2. **Database connection**: Verify environment variables
3. **Performance issues**: Check query performance and indexes
4. **SSL certificate**: Verify domain configuration

**Debug Commands:**
```bash
# Check application logs
vercel logs your-deployment-url

# Database connection test
npm run db:test

# Performance analysis
npm run analyze
```

## 📞 Support & Maintenance

### Monitoring Alerts

**Set up alerts for:**
- Application errors (>1% error rate)
- Performance degradation (>2s response time)
- Database issues (connection failures)
- Security incidents (unusual access patterns)

### Maintenance Windows

**Recommended Schedule:**
- **Minor updates**: Rolling deployment (no downtime)
- **Major updates**: Scheduled maintenance window
- **Database migrations**: Low-traffic periods
- **Security patches**: Immediate deployment

### Support Contacts

**Production Issues:**
1. Check monitoring dashboards
2. Review error logs
3. Escalate to development team
4. Document incident for post-mortem

---

This deployment guide covers all aspects of getting OrbitABM running in production. For development setup, see the [Getting Started Guide](GETTING_STARTED.md).
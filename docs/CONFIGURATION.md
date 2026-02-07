# Configuration Guide

This guide covers environment configuration, feature flags, and system settings for OrbitABM.

## 🔧 Environment Variables

### Required Variables

#### Supabase Configuration
```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Anonymous Key (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Optional Variables

#### Development Settings
```env
# Environment mode
NODE_ENV=development|production|test

# Development port (default: 3000)
PORT=3000

# Enable debug logging
DEBUG=true

# Database connection timeout (milliseconds)
DB_TIMEOUT=5000
```

#### Feature Flags
```env
# Enable/disable features
FEATURE_BULK_IMPORT=true
FEATURE_DIGITAL_SNAPSHOTS=true
FEATURE_PE_TRACKING=true
FEATURE_CAMPAIGN_AUTOMATION=false

# UI Features
FEATURE_DARK_MODE=false
FEATURE_ADVANCED_FILTERS=true
FEATURE_EXPORT_EXCEL=true
```

#### Analytics & Monitoring
```env
# Google Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Sentry Error Tracking (optional)
SENTRY_DSN=https://your-sentry-dsn

# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true
```

#### Email Configuration (Future)
```env
# SMTP Settings (planned)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

## 📁 Configuration Files

### Next.js Configuration
**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Compiler
  experimental: {
    reactCompiler: true,
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

### TypeScript Configuration
**File**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### Tailwind Configuration
**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### ESLint Configuration
**File**: `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "rules": {
    "prefer-const": "error",
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-console": "warn"
  }
}
```

## 🗄️ Database Configuration

### Supabase Setup

#### 1. Project Creation
```bash
# Create new Supabase project
npx supabase projects create your-project-name

# Link to existing project
npx supabase link --project-ref your-project-ref
```

#### 2. Database Migrations
```bash
# Generate migration
npx supabase migration new initial_schema

# Apply migrations
npx supabase db push

# Reset database (development only)
npx supabase db reset
```

#### 3. Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create organization-based policies
CREATE POLICY "Organizations can only see their own data"
ON companies FOR ALL
USING (organization_id = auth.jwt() ->> 'organization_id');
```

### Connection Pooling
```sql
-- Supabase automatically handles connection pooling
-- Max connections: 60 (free tier), 200+ (paid tiers)
-- Connection timeout: 30 seconds
-- Idle timeout: 10 minutes
```

## 🔐 Security Configuration

### Authentication Settings
```typescript
// Supabase Auth Configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Recommended for web apps
  },
};
```

### CORS Configuration
```javascript
// Next.js API CORS (if needed)
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Handle request
}
```

### Content Security Policy
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              connect-src 'self' https://*.supabase.co;
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};
```

## 🚀 Performance Configuration

### Build Optimization
```javascript
// next.config.js
const nextConfig = {
  // Bundle analyzer
  bundleAnalyzer: {
    enabled: process.env.ANALYZE === 'true',
  },
  
  // Compression
  compress: true,
  
  // Static optimization
  trailingSlash: false,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
};
```

### Caching Strategy
```typescript
// API Route Caching
export async function GET(request: Request) {
  const data = await fetchData();
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Database Performance
```sql
-- Add indexes for common queries
CREATE INDEX idx_companies_organization_status 
ON companies(organization_id, status);

CREATE INDEX idx_campaigns_company_status 
ON campaigns(company_id, status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM companies 
WHERE organization_id = 'uuid' AND status = 'prospect';
```

## 🌍 Environment-Specific Settings

### Development Environment
```env
NODE_ENV=development
DEBUG=true
FEATURE_DEBUG_PANEL=true
ENABLE_MOCK_DATA=true
DISABLE_ANALYTICS=true
```

**Development Features:**
- Hot reload enabled
- Detailed error messages
- Debug logging
- Mock data generation
- Analytics disabled

### Staging Environment
```env
NODE_ENV=production
DEBUG=false
FEATURE_DEBUG_PANEL=false
ENABLE_MOCK_DATA=false
DISABLE_ANALYTICS=false
```

**Staging Features:**
- Production build
- Limited debug info
- Real data only
- Analytics enabled
- Performance monitoring

### Production Environment
```env
NODE_ENV=production
DEBUG=false
FEATURE_DEBUG_PANEL=false
ENABLE_MOCK_DATA=false
DISABLE_ANALYTICS=false
ENABLE_PERFORMANCE_MONITORING=true
```

**Production Features:**
- Optimized build
- Error reporting only
- Full analytics
- Performance monitoring
- Security headers

## 🔧 Feature Flags

### Implementation
```typescript
// lib/features.ts
export const features = {
  bulkImport: process.env.FEATURE_BULK_IMPORT === 'true',
  digitalSnapshots: process.env.FEATURE_DIGITAL_SNAPSHOTS === 'true',
  peTracking: process.env.FEATURE_PE_TRACKING === 'true',
  campaignAutomation: process.env.FEATURE_CAMPAIGN_AUTOMATION === 'true',
  darkMode: process.env.FEATURE_DARK_MODE === 'true',
  advancedFilters: process.env.FEATURE_ADVANCED_FILTERS === 'true',
  exportExcel: process.env.FEATURE_EXPORT_EXCEL === 'true',
};

// Usage in components
import { features } from '@/lib/features';

export default function ImportPage() {
  if (!features.bulkImport) {
    return <div>Feature not available</div>;
  }
  
  return <ImportComponent />;
}
```

### Available Features
- **FEATURE_BULK_IMPORT**: Enable CSV import functionality
- **FEATURE_DIGITAL_SNAPSHOTS**: Enable digital presence tracking
- **FEATURE_PE_TRACKING**: Enable private equity monitoring
- **FEATURE_CAMPAIGN_AUTOMATION**: Enable automated campaign sequences
- **FEATURE_DARK_MODE**: Enable dark mode UI
- **FEATURE_ADVANCED_FILTERS**: Enable advanced filtering options
- **FEATURE_EXPORT_EXCEL**: Enable Excel export functionality

## 📊 Monitoring Configuration

### Error Tracking
```typescript
// lib/sentry.ts (if using Sentry)
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}
```

### Performance Monitoring
```typescript
// lib/analytics.ts
export const trackEvent = (event: string, properties?: object) => {
  if (process.env.NODE_ENV === 'production' && !process.env.DISABLE_ANALYTICS) {
    // Send to analytics service
    console.log('Track:', event, properties);
  }
};
```

### Health Checks
```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    const { data, error } = await supabase
      .from('companies')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    }, { status: 500 });
  }
}
```

## 🔄 Configuration Management

### Environment File Hierarchy
1. `.env.local` (highest priority, git-ignored)
2. `.env.production` (production only)
3. `.env.development` (development only)
4. `.env` (default values, committed to git)

### Validation
```typescript
// lib/config.ts
import { z } from 'zod';

const configSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const config = configSchema.parse(process.env);
```

### Runtime Configuration
```typescript
// lib/runtime-config.ts
export const getRuntimeConfig = () => ({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  supportedFileTypes: process.env.SUPPORTED_FILE_TYPES?.split(',') || ['.csv'],
  features: {
    bulkImport: process.env.FEATURE_BULK_IMPORT === 'true',
    // ... other features
  },
});
```

## 🛠️ Troubleshooting

### Common Configuration Issues

#### Environment Variables Not Loading
```bash
# Check if variables are set
echo $NEXT_PUBLIC_SUPABASE_URL

# Restart development server
npm run dev
```

#### Database Connection Issues
```typescript
// Test connection
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Test query
const { data, error } = await supabase
  .from('companies')
  .select('count')
  .limit(1);

console.log('Connection test:', { data, error });
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Type check
npm run type-check
```

### Configuration Validation
```bash
# Check environment variables
npm run config:check

# Validate database schema
npm run db:validate

# Test API endpoints
npm run api:test
```

---

**Next Steps**: For deployment-specific configuration, see the [Deployment Guide](DEPLOYMENT.md).
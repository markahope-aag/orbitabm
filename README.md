# OrbitABM - Multi-Tenant ABM Campaign Intelligence Platform

OrbitABM is a comprehensive Account-Based Marketing (ABM) campaign intelligence platform designed for marketing agencies and their clients. It provides tools for managing target companies, tracking competitive landscapes, executing multi-touch campaigns, and measuring outcomes across multiple markets and verticals.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm (recommended) or yarn
- Supabase account with Authentication enabled
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/markahope-aag/orbitabm.git
   cd orbitabm/orbit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run database migrations**
   ```bash
   # Link to your Supabase project (extract project-ref from SUPABASE_URL)
   npx supabase link --project-ref your-project-ref
   
   # Push all migrations to your database (14 migration files)
   npx supabase db push
   
   # Verify migration success
   npx supabase migration list
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

8. **Create your account**
   - Click "Sign up here" on the login page
   - Fill in your email, password, and name
   - Check your email for the verification link
   - Click the verification link to activate your account
   - Sign in with your credentials

## 📋 Features

### Core Functionality
- **Secure Authentication** - Email/password login with protected routes
- **Organization Management** - Create, edit, and switch between organizations
- **Multi-tenant architecture** - Support for agencies and multiple clients
- **Company management** - Track prospects, targets, and competitors
- **Campaign orchestration** - Execute multi-touch ABM sequences
- **Competitive intelligence** - Monitor market landscapes and PE activity
- **Digital presence tracking** - Capture and analyze online footprints
- **Asset management** - Organize campaign materials and deliverables

### Key Modules

#### 🎯 Campaign Management
- **Playbook templates** - Reusable campaign sequences
- **Activity tracking** - Multi-channel touchpoint execution
- **Campaign board** - Kanban-style campaign visualization
- **Results tracking** - Outcome measurement and reporting

#### 🏢 Company Intelligence
- **Company profiles** - Comprehensive target company data
- **Market analysis** - Geographic market insights
- **Vertical tracking** - Industry-specific intelligence
- **PE consolidation** - Private equity activity monitoring

#### 📊 Data & Analytics
- **Dashboard** - Real-time campaign metrics
- **Digital snapshots** - Point-in-time digital presence data
- **Competitive landscapes** - Market positioning analysis
- **Import/Export** - CSV data management tools

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **Styling**: Tailwind CSS 4 with custom navy/cyan brand theme
- **UI Components**: Custom component library with Lucide icons (v0.563.0)
- **Notifications**: React Hot Toast with comprehensive error handling
- **Data Processing**: Papaparse for CSV handling
- **Drag & Drop**: @dnd-kit for campaign board
- **Authentication**: Supabase Auth with SSR support (@supabase/ssr v0.8.0)
- **Database**: PostgreSQL with comprehensive Row Level Security (RLS)
- **API**: RESTful API with OpenAPI/Swagger documentation
- **Security**: Comprehensive security headers, CSRF protection, rate limiting
- **Caching**: LRU cache with multi-layer optimization
- **Documentation**: Swagger UI with interactive API testing

### Project Structure
```
orbit/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # RESTful API endpoints
│   │   │   ├── activities/    # Activity management API
│   │   │   ├── assets/        # Asset management API
│   │   │   ├── audit-logs/    # Audit trail API
│   │   │   ├── campaigns/     # Campaign management API
│   │   │   ├── companies/     # Company management API (+ import)
│   │   │   ├── contacts/      # Contact management API
│   │   │   ├── digital-snapshots/ # Digital presence API
│   │   │   ├── document-templates/ # Document template API
│   │   │   ├── email-templates/    # Email template API
│   │   │   ├── generated-documents/ # Generated document API
│   │   │   ├── health/        # Health check endpoint
│   │   │   ├── markets/       # Market management API
│   │   │   ├── organizations/ # Organization management API
│   │   │   ├── performance/   # Performance monitoring API
│   │   │   ├── playbook-templates/ # Playbook template API
│   │   │   ├── playbook-steps/     # Playbook step API
│   │   │   ├── results/       # Campaign results API
│   │   │   ├── security/      # Security reporting API
│   │   │   └── verticals/     # Vertical management API
│   │   ├── activities/        # Activity management pages
│   │   ├── api-docs/          # Interactive API documentation
│   │   ├── assets/            # Asset management pages
│   │   ├── audit-log/         # Audit log viewer
│   │   ├── auth/              # Authentication pages (login, signup, etc.)
│   │   ├── campaign-board/    # Kanban-style campaign board
│   │   ├── campaigns/         # Campaign management pages
│   │   ├── companies/         # Company management pages (+ research)
│   │   ├── competitors/       # Competitive intelligence
│   │   ├── contacts/          # Contact management
│   │   ├── dashboard/         # Main dashboard
│   │   ├── documents/         # Document intelligence
│   │   ├── import/            # Data import interface
│   │   ├── markets/           # Market management
│   │   ├── organizations/     # Organization management
│   │   ├── pe-tracker/        # PE consolidation tracker
│   │   ├── playbooks/         # Playbook templates
│   │   ├── settings/          # Application settings
│   │   └── verticals/         # Vertical management
│   ├── components/            # React components
│   │   ├── audit/            # Audit log components
│   │   ├── auth/             # Authentication components
│   │   ├── campaign-board/   # Campaign board components
│   │   ├── import/           # Data import components
│   │   ├── layout/           # Layout and navigation
│   │   ├── organizations/    # Organization management
│   │   ├── research/         # Research document components
│   │   ├── sequence/         # Campaign sequence components
│   │   └── ui/               # Reusable UI components
│   └── lib/                  # Core utilities and configurations
│       ├── audit/            # Audit logging utilities
│       ├── auth/             # Authentication utilities
│       ├── cache/            # Multi-layer caching system
│       ├── context/          # React context providers
│       ├── hooks/            # Custom React hooks
│       ├── query/            # Query optimization utilities
│       ├── research/         # Research document utilities
│       ├── security/         # Security utilities (CSRF, rate limiting)
│       ├── sequence/         # Campaign sequence utilities
│       ├── supabase/         # Supabase client and queries
│       ├── swagger/          # OpenAPI documentation
│       ├── types/            # TypeScript type definitions
│       ├── utils/            # General utility functions
│       └── validations/      # Input validation schemas
├── docs/                     # Comprehensive documentation (20+ guides)
├── scripts/                  # Database seeding and utility scripts
└── supabase/                # Database migrations (14 migration files)
```

## 📚 Documentation

### User Guides
- [**Getting Started Guide**](docs/GETTING_STARTED.md) - Step-by-step setup and first use
- [**User Manual**](docs/USER_MANUAL.md) - Complete feature documentation
- [**Data Import Guide**](docs/DATA_IMPORT.md) - CSV import and data management

### Developer Documentation
- [**API Documentation**](docs/API.md) - REST API endpoints with OpenAPI/Swagger
- [**Architecture Guide**](docs/ARCHITECTURE.md) - System design and technical decisions
- [**Authentication System**](docs/AUTHENTICATION.md) - User authentication and security
- [**Security Model**](docs/SECURITY.md) - RLS policies and comprehensive security
- [**Organizations Management**](docs/ORGANIZATIONS.md) - Multi-tenant organization system
- [**Database Schema**](docs/DATABASE.md) - Complete schema with 20+ tables
- [**Component Library**](docs/COMPONENTS.md) - UI component reference
- [**Error Handling**](docs/ERROR_HANDLING.md) - Error handling and notifications
- [**Testing Guide**](docs/TESTING.md) - Comprehensive testing procedures
- [**Query Performance**](docs/QUERY_PERFORMANCE.md) - N+1 prevention and caching
- [**Security Headers**](docs/SECURITY_HEADERS.md) - XSS, CSRF, and security protection

### Operations
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment with Vercel/Supabase
- [**Configuration**](docs/CONFIGURATION.md) - Environment and feature configuration
- [**Environment Validation**](docs/ENVIRONMENT_VALIDATION.md) - Startup validation and health checks
- [**Migration Guide**](docs/MIGRATION_GUIDE.md) - Database migrations and upgrades
- [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [**CSRF Testing Guide**](docs/CSRF_TESTING_GUIDE.md) - Security testing procedures

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with initial data
- `npm run seed:templates` - Seed email and document templates

### Code Quality
- **TypeScript** - Full type safety
- **ESLint** - Code linting and formatting
- **Error Handling** - Comprehensive error management with toast notifications
- **Testing** - Quality checks before deployment

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm run start
```

## 📄 License

This project is proprietary software developed for Asymmetric Marketing and its clients.

## 🤝 Support

For support and questions:
- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Contact**: Reach out to the development team

## 🗺️ Roadmap

### Phase 1 (Complete ✅)
- ✅ Core platform infrastructure
- ✅ Company and campaign management
- ✅ Data import/export system
- ✅ Error handling and notifications
- ✅ Multi-tenant organization management
- ✅ Campaign board with Kanban interface
- ✅ Document intelligence system
- ✅ Email template management
- ✅ Audit logging system
- ✅ Row-level security implementation
- ✅ Authentication and authorization
- ✅ Research document generation with AI templates
- ✅ Campaign sequence automation with email templates
- ✅ Comprehensive audit logging system
- ✅ Security enhancements (CSRF, rate limiting, headers)
- ✅ Performance optimization with multi-layer caching

### Phase 2 (Complete ✅)
- ✅ Advanced RLS policies and security fixes
- ✅ Organization switching and context management
- ✅ Comprehensive API endpoints with OpenAPI docs
- ✅ Security headers and CSRF protection
- ✅ Rate limiting and performance optimization
- ✅ Audit logging system
- ✅ Query performance optimization with caching
- ✅ Environment validation and health checks

### Phase 3 (In Progress 🔄)
- 🔄 AI-powered content generation
- 🔄 Email integration and automation
- 🔄 Advanced analytics and reporting
- 📋 Mobile application
- 📋 Third-party integrations (CRM, email marketing)
- 📋 Advanced automation workflows
- 📋 Custom reporting dashboard
- 📋 White-label client portals

---

**OrbitABM** - Powering intelligent account-based marketing campaigns.
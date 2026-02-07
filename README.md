# OrbitABM - Multi-Tenant ABM Campaign Intelligence Platform

OrbitABM is a comprehensive Account-Based Marketing (ABM) campaign intelligence platform designed for marketing agencies and their clients. It provides tools for managing target companies, tracking competitive landscapes, executing multi-touch campaigns, and measuring outcomes across multiple markets and verticals.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
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
   
   # Push migrations to your database
   npx supabase db push
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
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom component library with Lucide icons
- **Notifications**: React Hot Toast
- **Data Processing**: Papaparse for CSV handling

### Project Structure
```
orbit/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard page
│   │   ├── companies/         # Company management
│   │   ├── campaigns/         # Campaign management
│   │   └── ...               # Other feature pages
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   └── import/           # Data import components
│   └── lib/                  # Utilities and configurations
│       ├── supabase/         # Supabase client and queries
│       ├── types/            # TypeScript type definitions
│       ├── utils/            # Utility functions
│       └── context/          # React context providers
├── docs/                     # Documentation
├── scripts/                  # Database and utility scripts
└── supabase/                # Database migrations
```

## 📚 Documentation

### User Guides
- [**Getting Started Guide**](docs/GETTING_STARTED.md) - Step-by-step setup and first use
- [**User Manual**](docs/USER_MANUAL.md) - Complete feature documentation
- [**Data Import Guide**](docs/DATA_IMPORT.md) - CSV import and data management

### Developer Documentation
- [**API Documentation**](docs/API.md) - REST API endpoints and usage
- [**Authentication System**](docs/AUTHENTICATION.md) - User authentication and security
- [**Security Model**](docs/SECURITY.md) - RLS policies and data protection
- [**Organizations Management**](docs/ORGANIZATIONS.md) - Multi-tenant organization system
- [**Database Schema**](docs/DATABASE.md) - Complete schema documentation
- [**Component Library**](docs/COMPONENTS.md) - UI component reference
- [**Error Handling**](docs/ERROR_HANDLING.md) - Error handling and notifications

### Operations
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment instructions
- [**Configuration**](docs/CONFIGURATION.md) - Environment and feature configuration
- [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed database with initial data

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

### Phase 1 (Complete)
- ✅ Core platform infrastructure
- ✅ Company and campaign management
- ✅ Data import/export system
- ✅ Error handling and notifications

### Phase 2 (Planned)
- 🔄 Authentication and authorization
- 🔄 Row-level security
- 🔄 AI-powered content generation
- 🔄 Email integration
- 🔄 Advanced analytics and reporting

### Phase 3 (Future)
- 📋 Mobile application
- 📋 Third-party integrations
- 📋 Advanced automation
- 📋 Custom reporting dashboard

---

**OrbitABM** - Powering intelligent account-based marketing campaigns.
# Changelog

All notable changes to OrbitABM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Performance optimizations for large datasets
- Advanced filtering capabilities
- Email integration features

### Changed
- Improved error handling throughout the application

### Fixed
- Minor UI/UX improvements

### Security
- Fixed overly permissive RLS policy for audit_logs table INSERT operations
- Restricted audit log creation to user's organization context

### Documentation
- Comprehensive documentation audit and updates across all 22+ documentation files
- Updated README.md with current project status and 51 API endpoints
- Enhanced API documentation with platform user management and import endpoints
- Updated architecture documentation with latest technology stack versions
- Enhanced security documentation with audit logs RLS policy fix details
- Updated database documentation with current 20 migration files
- Enhanced getting started guide with updated migration procedures
- Updated deployment guide with current migration workflow

## [2.1.0] - 2026-02-07

### Added
- **Audit Logging System**: Complete audit trail for all user actions
- **Campaign Sequence Automation**: Advanced campaign workflow management
- **Research Document Generation**: AI-powered research document creation
- **Email Template Management**: Campaign-scoped email templates with merge fields
- **Enhanced Security**: Profile creation triggers and improved RLS policies
- **Security Headers**: Comprehensive CSP, HSTS, XSS protection, frame options
- **CSRF Protection**: Double-submit cookie pattern with token validation
- **Rate Limiting**: Sliding window algorithm with configurable limits
- **Performance Monitoring**: Real-time query and cache metrics with analytics
- **Multi-layer Caching**: LRU cache with intelligent invalidation and optimization
- **Environment Validation**: Startup validation and health monitoring system
- **API Enhancements**: Health check, performance monitoring, and security reporting endpoints

### Changed
- **Database Schema**: Added audit_logs table and enhanced email templates
- **API Endpoints**: Extended API with audit logs and enhanced document management
- **UI Components**: Improved campaign board and research interfaces

### Fixed
- **Security**: Resolved all function search path security warnings
- **RLS Policies**: Comprehensive security policy implementation
- **Database Functions**: Enhanced function security with explicit search paths

## [2.0.0] - 2026-01-15

### Added
- **Document Intelligence System**: Template-based document generation
- **Email Templates**: Comprehensive email template management
- **Generated Documents**: AI-powered document creation and management
- **Campaign Board**: Drag-and-drop Kanban interface for campaign management
- **Organization Management**: Multi-tenant organization switching
- **Enhanced API**: Complete RESTful API with OpenAPI documentation

### Changed
- **Database Schema**: Major expansion with document intelligence tables
- **Authentication**: Enhanced auth system with organization context
- **UI/UX**: Complete redesign of campaign management interface
- **Security Model**: Comprehensive Row Level Security implementation

### Fixed
- **Performance**: Optimized database queries and indexes
- **Security**: Enhanced RLS policies and data isolation
- **Error Handling**: Comprehensive error management system

## [1.5.0] - 2025-12-01

### Added
- **Row Level Security**: Complete RLS implementation across all tables
- **Organization Context**: Multi-tenant organization switching
- **Error Handling**: Comprehensive toast notification system
- **Data Validation**: Enhanced input validation and error boundaries
- **API Documentation**: Complete API documentation with Swagger

### Changed
- **Security Model**: Enhanced security with organization-scoped access
- **Database**: Improved schema with proper constraints and indexes
- **UI Components**: Enhanced component library with better error handling

### Fixed
- **Security Vulnerabilities**: Resolved all security issues
- **Data Integrity**: Enhanced data validation and constraints
- **Performance**: Optimized queries and reduced load times

## [1.0.0] - 2025-10-15

### Added
- **Core Platform**: Initial release of OrbitABM platform
- **Campaign Management**: Complete campaign lifecycle management
- **Company Intelligence**: Comprehensive company and contact management
- **Playbook Templates**: Reusable campaign sequence templates
- **Data Import/Export**: CSV import and export functionality
- **Dashboard**: Real-time campaign metrics and analytics
- **Multi-tenant Architecture**: Organization-based data isolation

### Features
- **Companies**: Prospect and competitor management
- **Campaigns**: Multi-touch ABM campaign execution
- **Activities**: Individual touchpoint tracking
- **Markets**: Geographic market intelligence
- **Verticals**: Industry vertical classification
- **PE Tracking**: Private equity consolidation monitoring
- **Digital Snapshots**: Point-in-time digital presence tracking
- **Assets**: Campaign material management
- **Results**: Outcome tracking and reporting

### Technical
- **Next.js 16**: Modern React framework with App Router
- **Supabase**: PostgreSQL database with authentication
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Reusable UI component library

## [0.9.0] - 2025-09-01

### Added
- **Beta Release**: Initial beta version for internal testing
- **Core CRUD Operations**: Basic entity management
- **Database Schema**: Initial schema design and implementation
- **Authentication**: Basic user authentication system

### Changed
- **Architecture**: Established multi-tenant architecture patterns
- **Database Design**: Finalized schema relationships and constraints

## [0.1.0] - 2025-08-01

### Added
- **Project Initialization**: Initial project setup and scaffolding
- **Development Environment**: Development toolchain and configuration
- **Basic Structure**: Initial application structure and routing

---

## Release Notes

### Version 2.1.0 Highlights
This release focuses on advanced campaign automation and audit capabilities:

- **Complete Audit Trail**: Every user action is now logged for compliance and debugging
- **Advanced Campaign Sequences**: Enhanced workflow management with better automation
- **Research Intelligence**: AI-powered research document generation
- **Enhanced Security**: Comprehensive security improvements and RLS policy fixes

### Version 2.0.0 Highlights
Major release introducing document intelligence and enhanced campaign management:

- **Document Intelligence**: Template-based document generation system
- **Campaign Board**: Visual campaign management with drag-and-drop interface
- **Organization Management**: Seamless multi-tenant organization switching
- **Complete API**: RESTful API with comprehensive OpenAPI documentation

### Version 1.0.0 Highlights
Initial production release with core ABM platform functionality:

- **Complete ABM Platform**: End-to-end account-based marketing campaign management
- **Multi-tenant Architecture**: Support for agencies and multiple client organizations
- **Comprehensive Intelligence**: Company, market, and competitive intelligence
- **Campaign Automation**: Playbook-based campaign sequence execution

---

## Migration Notes

### Upgrading to 2.1.0
- New audit_logs table will be created automatically
- Enhanced email templates require database migration
- Profile creation triggers are automatically applied

### Upgrading to 2.0.0
- Document intelligence tables require database migration
- Organization context changes may require re-authentication
- Campaign board features require updated permissions

### Upgrading to 1.5.0
- Row Level Security policies require database migration
- Organization context implementation may affect existing sessions
- Enhanced error handling may change error response formats

### Upgrading to 1.0.0
- Complete database schema migration required
- Authentication system changes require user re-authentication
- Multi-tenant architecture requires organization assignment

---

For detailed upgrade instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).
For breaking changes and migration guides, see individual release documentation.
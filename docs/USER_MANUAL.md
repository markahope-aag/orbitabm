# OrbitABM User Manual

Complete guide to using all features of the OrbitABM platform.

## 🎯 Dashboard Overview

The Dashboard is your command center, providing real-time insights into campaign performance and upcoming activities.

### Key Metrics Cards
- **Active Campaigns**: Number of campaigns currently in progress
- **Activities Due This Week**: Scheduled touchpoints requiring attention
- **Overdue Activities**: Past-due activities needing immediate action
- **Pipeline Value**: Total value of signed contracts

### Activity Management
- **Upcoming Activities**: Next 7 days of scheduled touchpoints
- **Recent Results**: Latest campaign outcomes and wins
- **Campaigns at Risk**: Active campaigns with overdue activities

### Performance Insights
- **Campaigns by Status**: Visual breakdown of campaign pipeline
- **Markets Overview**: Activity levels across geographic markets

## 🏢 Company Management

### Company Profiles

**Basic Information:**
- Company name, website, and contact details
- Geographic market and industry vertical assignment
- Revenue estimates and employee count
- Ownership structure (independent, PE-backed, franchise, corporate)

**Classification System:**
- **Status**: prospect → target → active_campaign → client
- **Qualifying Tier**: top → qualified → borderline → excluded
- **Ownership Type**: independent, pe_backed, franchise, corporate

**Digital Presence Tracking:**
- Google and Yelp ratings and review counts
- Social media follower counts
- Domain authority and page speed metrics
- Website features (SSL, mobile responsive, online booking)

### Company Detail View

**Overview Tab:**
- Business details and certifications
- Latest digital snapshot data
- Primary contact information
- Additional contacts list

**Competitive Landscape Tab:**
- Companies in same market and vertical
- Comparative metrics (revenue, employees, digital presence)
- PE-backed competitor identification

**Campaigns Tab:**
- All campaigns targeting this company
- Campaign status and current step
- Historical campaign performance

**Digital History Tab:**
- Timeline of digital snapshots
- Change indicators showing improvements/declines
- Trend analysis over time

**Assets Tab:**
- Campaign materials created for this company
- Delivery status and engagement tracking

### Bulk Operations
- CSV import with column mapping
- Duplicate detection and handling
- Bulk status updates
- Export filtered data

## 🎯 Campaign Management

### Campaign Creation

**Setup Process:**
1. Select target company from database
2. Choose playbook template
3. Set start date and assignment
4. Auto-generate activity schedule
5. Customize sequence if needed

**Campaign Configuration:**
- **Name**: Descriptive campaign identifier
- **Target Company**: Primary prospect
- **Market/Vertical**: Geographic and industry context
- **Playbook**: Multi-touch sequence template
- **Assignment**: Team member responsible
- **Competitors**: Named competitors for positioning

### Campaign Execution

**Activity Timeline:**
- Chronological view of all campaign touchpoints
- Status indicators (scheduled, completed, overdue)
- Outcome tracking for each activity
- Notes and follow-up actions

**Activity Types:**
- **Mail**: Direct mail pieces and packages
- **Email**: Electronic outreach and follow-ups
- **LinkedIn**: Social selling and engagement
- **Phone**: Voice calls and voicemails
- **In-Person**: Meetings and presentations

**Status Management:**
- **Planned**: Campaign created but not started
- **Active**: Currently executing activities
- **Paused**: Temporarily suspended
- **Completed**: All activities finished
- **Won**: Successfully converted to client
- **Lost**: Prospect declined or unresponsive
- **Pivoted**: Moved to different target

### Campaign Board

**Kanban View:**
- Visual pipeline of all campaigns
- Drag-and-drop status updates
- Color-coded priority indicators
- Quick campaign details

**Filtering Options:**
- Market-based filtering
- Vertical-based filtering
- Assignment-based filtering
- Date range selection

## 📋 Playbook Management

### Template Creation

**Playbook Structure:**
- Name and description
- Vertical assignment (or cross-vertical)
- Total duration calculation
- Active/inactive status

**Step Configuration:**
- Sequential step numbering
- Day offset from campaign start
- Communication channel
- Required assets
- Pivot trigger designation

### Standard Playbooks

**HVAC ABM Sequence (35 days):**
1. Day 1: Strategic Blueprint Delivery (mail)
2. Day 3: LinkedIn Connection Request
3. Day 5: Email Follow-up Package Reference
4. Day 10: Website & SEO Audit Delivery (email)
5. Day 18: Local Market Presence Report (email)
6. Day 25: LinkedIn Content Engagement
7. Day 28: The Call (phone)
8. Day 35: Breakup Note + Pivot (mail)

### Customization Options
- Industry-specific sequences
- Channel preferences
- Asset requirements
- Timing adjustments
- Pivot conditions

## 📊 Intelligence & Analytics

### Market Intelligence

**Geographic Markets:**
- Market size and population data
- PE activity levels
- Company concentration
- Campaign performance by market

**Competitive Landscape:**
- Market share analysis
- Digital presence comparison
- PE consolidation tracking
- Competitive positioning

### Vertical Analysis

**Industry Verticals:**
- Revenue floor requirements
- Typical marketing budgets
- Key decision maker titles
- Tier classification system

**Performance Metrics:**
- Campaign success rates by vertical
- Average deal size
- Sales cycle length
- Competitive intensity

### PE Consolidation Tracking

**Platform Monitoring:**
- PE platform profiles
- Acquisition timelines
- Valuation estimates
- Brand portfolio tracking

**Market Impact:**
- Consolidation trends
- Competitive threats
- Opportunity identification
- Strategic positioning

## 🔄 Data Import & Export

### CSV Import Process

**Supported Entities:**
- Companies (prospects and competitors)
- Contacts (decision makers and influencers)
- Markets (geographic territories)
- Verticals (industry classifications)
- Digital Snapshots (online presence data)

**Import Workflow:**
1. **Entity Selection**: Choose data type to import
2. **File Upload**: Drag-and-drop or select CSV file
3. **Column Mapping**: Map CSV headers to database fields
4. **Validation**: Review data quality and conflicts
5. **Import Execution**: Process and load data
6. **Results Summary**: Review success/failure counts

**Data Validation:**
- Required field checking
- Format validation (emails, URLs, dates)
- Duplicate detection
- Lookup field matching

### Export Capabilities

**Export Options:**
- Filtered data export
- Complete entity export
- Custom column selection
- Multiple format support

**File Naming Convention:**
`{entity}_{organization}_{date}.csv`

Example: `companies_asymmetric_2024-02-07.csv`

## 👥 Contact Management

### Contact Profiles

**Basic Information:**
- Name and title
- Company association
- Contact details (email, phone, LinkedIn)
- Primary contact designation

**Relationship Tracking:**
- **Unknown**: No prior interaction
- **Identified**: Contact discovered
- **Connected**: Initial connection made
- **Engaged**: Active communication
- **Responsive**: Positive engagement
- **Meeting Held**: Face-to-face interaction
- **Client**: Successfully converted

### Contact Activities
- Activity history by contact
- Response tracking
- Engagement scoring
- Follow-up scheduling

## 📁 Asset Management

### Asset Types

**Campaign Materials:**
- **Blueprint**: Strategic analysis documents
- **Website Audit**: Technical assessment reports
- **Market Report**: Competitive landscape analysis
- **Landing Page**: Custom prospect pages
- **Breakup Note**: Final outreach communications
- **Proposal**: Formal service proposals

**Asset Status:**
- **Draft**: Work in progress
- **Ready**: Completed and approved
- **Delivered**: Sent to prospect
- **Viewed**: Engagement confirmed

### Asset Tracking
- Creation and delivery dates
- Engagement metrics
- Version control
- Campaign association

## 🔍 Search & Filtering

### Global Search
- Company name search
- Contact name search
- Campaign search
- Cross-entity search

### Advanced Filtering

**Company Filters:**
- Market assignment
- Vertical classification
- Status and tier
- Ownership type
- Revenue range
- Employee count

**Campaign Filters:**
- Status and stage
- Market and vertical
- Assignment
- Date ranges
- Playbook type

**Activity Filters:**
- Status and outcome
- Channel type
- Date ranges
- Assignment
- Company association

## 📈 Reporting & Analytics

### Standard Reports

**Campaign Performance:**
- Conversion rates by playbook
- Activity completion rates
- Response rates by channel
- Time to conversion

**Market Analysis:**
- Company distribution by market
- Campaign success by geography
- PE activity correlation
- Market penetration rates

**Competitive Intelligence:**
- Market share analysis
- Digital presence benchmarking
- PE consolidation impact
- Competitive response tracking

### Custom Analytics
- Filtered data views
- Export capabilities
- Trend analysis
- Performance comparisons

## ⚙️ Settings & Configuration

### Organization Management
- Multi-tenant switching
- Organization profiles
- User assignments
- Data isolation

### User Preferences
- Default filters
- Notification settings
- Display preferences
- Export formats

### System Configuration
- Playbook templates
- Status definitions
- Field customization
- Integration settings

## 🔔 Notifications & Alerts

### System Notifications
- Import completion status
- Error messages and warnings
- Success confirmations
- Validation alerts

### Activity Reminders
- Overdue activity alerts
- Upcoming activity notifications
- Campaign milestone alerts
- Result logging reminders

## 🆘 Troubleshooting

### Common Issues

**Data Import Problems:**
- CSV format validation
- Required field errors
- Duplicate handling
- Lookup failures

**Campaign Issues:**
- Activity scheduling problems
- Status update failures
- Assignment conflicts
- Playbook errors

**Performance Issues:**
- Large dataset handling
- Filter performance
- Export timeouts
- Search optimization

### Error Resolution
- Error message interpretation
- Data correction procedures
- System recovery steps
- Support escalation

---

This user manual covers all major features of OrbitABM. For specific technical issues, refer to the [Troubleshooting Guide](TROUBLESHOOTING.md) or [API Documentation](API.md) for integration details.
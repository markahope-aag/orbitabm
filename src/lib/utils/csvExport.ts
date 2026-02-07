/**
 * CSV Export Utility
 * 
 * Exports data arrays to CSV files with proper formatting and download handling.
 * Used by DataTable components to export filtered data.
 */

interface Column {
  key: string
  header: string
  render?: (row: any) => string | number | null
}

interface ExportOptions {
  filename?: string
  orgSlug?: string
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: Column[],
  entityName: string,
  options: ExportOptions = {}
) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Generate filename
  const date = new Date().toISOString().split('T')[0]
  const orgSlug = options.orgSlug || 'export'
  const filename = options.filename || `${entityName}_${orgSlug}_${date}.csv`

  // Create CSV headers
  const headers = columns.map(col => col.header)
  
  // Create CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      let value: any
      
      if (col.render) {
        value = col.render(row)
      } else {
        value = row[col.key]
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return ''
      }
      
      // Convert to string and escape quotes
      const stringValue = String(value)
      
      // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    })
  })

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Template generators for each entity type
export const csvTemplates = {
  companies: () => [
    {
      name: 'Example HVAC Company',
      market: 'Fort Wayne, IN',
      vertical: 'HVAC Companies',
      website: 'https://example-hvac.com',
      phone: '(260) 555-0123',
      address_line1: '123 Main Street',
      address_line2: 'Suite 100',
      city: 'Fort Wayne',
      state: 'IN',
      zip: '46802',
      estimated_revenue: '2500000',
      employee_count: '25',
      year_founded: '2010',
      ownership_type: 'private',
      qualifying_tier: 'tier_2',
      status: 'active',
      manufacturer_affiliations: 'Carrier, Trane',
      certifications: 'NATE Certified',
      awards: 'Best of Fort Wayne 2023',
      notes: 'Strong digital presence, active on social media'
    }
  ],

  contacts: () => [
    {
      first_name: 'John',
      last_name: 'Smith',
      company: 'Example HVAC Company',
      title: 'Owner',
      email: 'john@example-hvac.com',
      phone: '(260) 555-0123',
      linkedin_url: 'https://linkedin.com/in/johnsmith',
      is_primary: 'true',
      relationship_status: 'identified',
      notes: 'Decision maker for marketing initiatives'
    }
  ],

  markets: () => [
    {
      name: 'Example City, ST',
      state: 'ST',
      metro_population: '250000',
      market_size_estimate: 'medium',
      pe_activity_level: 'moderate',
      notes: 'Growing market with good HVAC demand'
    }
  ],

  verticals: () => [
    {
      name: 'Example Vertical',
      sector: 'Home Services',
      b2b_b2c: 'b2c',
      naics_code: '238220',
      revenue_floor: '2000000',
      typical_revenue_range: '$2M - $10M',
      typical_marketing_budget_pct: '3-5%',
      key_decision_maker_title: 'Owner/President',
      tier: 'tier_1',
      notes: 'High-value vertical with strong ROI potential'
    }
  ],

  digital_snapshots: () => [
    {
      company: 'Example HVAC Company',
      snapshot_date: '2026-02-07',
      google_rating: '4.5',
      google_review_count: '150',
      yelp_rating: '4.2',
      yelp_review_count: '45',
      bbb_rating: 'A+',
      facebook_followers: '1200',
      instagram_followers: '800',
      linkedin_followers: '300',
      domain_authority: '35',
      page_speed_mobile: '85',
      page_speed_desktop: '92',
      organic_keywords: '450',
      monthly_organic_traffic_est: '2500',
      has_blog: 'true',
      has_online_booking: 'true',
      has_live_chat: 'false',
      notes: 'Strong online presence across all channels'
    }
  ]
}

export function downloadTemplate(entityType: keyof typeof csvTemplates) {
  const template = csvTemplates[entityType]()
  const columns = Object.keys(template[0]).map(key => ({
    key,
    header: key
  }))
  
  exportToCSV(
    template as any,
    columns,
    entityType,
    { filename: `${entityType}_template.csv` }
  )
}
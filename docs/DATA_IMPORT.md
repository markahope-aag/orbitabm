# Data Import Guide

OrbitABM provides comprehensive CSV import functionality for bulk data management. This guide covers importing companies, contacts, and other data types.

## 🚀 Quick Start

1. Navigate to **Import Data** in the main navigation
2. Select your data type (Companies, Contacts, etc.)
3. Download the template CSV file
4. Fill in your data following the template format
5. Upload and import your file

## 📊 Supported Data Types

### Companies Import
- **Template**: Download from Import Data page
- **Required Fields**: `name`, `market`, `vertical`
- **Optional Fields**: `website`, `estimated_revenue`, `employee_count`, `status`, `qualifying_tier`, `ownership_type`, `notes`

### Contacts Import
- **Template**: Download from Import Data page
- **Required Fields**: `first_name`, `last_name`, `company_name`
- **Optional Fields**: `title`, `email`, `phone`, `linkedin_url`, `relationship_status`, `is_primary`

### Markets Import
- **Template**: Download from Import Data page
- **Required Fields**: `name`, `state`
- **Optional Fields**: `metro_population`, `market_size_estimate`, `pe_activity_level`

### Verticals Import
- **Template**: Download from Import Data page
- **Required Fields**: `name`, `sector`
- **Optional Fields**: `b2b_b2c`, `naics_code`, `revenue_floor`, `tier`

## 📋 CSV Format Requirements

### General Rules
- **Encoding**: UTF-8
- **Separator**: Comma (`,`)
- **Headers**: First row must contain column names (case-sensitive)
- **Empty Values**: Leave cells blank for optional fields
- **Text Encoding**: Use double quotes for text containing commas

### Company Import Format
```csv
name,market,vertical,website,estimated_revenue,employee_count,status,qualifying_tier,ownership_type,notes
"Acme HVAC","Fort Wayne, IN","HVAC Companies","https://acmehvac.com",2500000,25,prospect,top,independent,"High-quality lead"
"Smith Plumbing","Madison, WI","Plumbing Companies","https://smithplumbing.com",1800000,18,target,qualified,independent,
```

### Contact Import Format
```csv
first_name,last_name,company_name,title,email,phone,linkedin_url,relationship_status,is_primary
John,Doe,"Acme HVAC",CEO,john@acmehvac.com,555-0123,https://linkedin.com/in/johndoe,identified,true
Jane,Smith,"Smith Plumbing",Owner,jane@smithplumbing.com,555-0124,,engaged,true
```

## 🔍 Field Specifications

### Company Fields

#### Required Fields
- **name**: Company name (max 255 characters)
- **market**: Market name (must match existing market or will be created)
- **vertical**: Vertical name (must match existing vertical or will be created)

#### Optional Fields
- **website**: Full URL including https://
- **estimated_revenue**: Numeric value (no currency symbols)
- **employee_count**: Numeric value
- **status**: `prospect`, `target`, `client`, `competitor`, `lost`
- **qualifying_tier**: `unqualified`, `qualified`, `top`
- **ownership_type**: `independent`, `franchise`, `corporate`, `private_equity`
- **notes**: Free text (max 1000 characters)

### Contact Fields

#### Required Fields
- **first_name**: Contact's first name
- **last_name**: Contact's last name
- **company_name**: Must match existing company name exactly

#### Optional Fields
- **title**: Job title/position
- **email**: Valid email address
- **phone**: Phone number (any format)
- **linkedin_url**: Full LinkedIn profile URL
- **relationship_status**: `identified`, `engaged`, `qualified`, `opportunity`, `closed`
- **is_primary**: `true` or `false` (default: false)

## 🎯 Import Process

### Step 1: Prepare Data
1. **Download Template**: Get the correct CSV template from the Import Data page
2. **Fill Data**: Complete the template with your data
3. **Validate**: Check for required fields and correct formats
4. **Save**: Save as CSV with UTF-8 encoding

### Step 2: Upload File
1. **Select File**: Choose your prepared CSV file
2. **Preview**: Review the data preview to ensure correct parsing
3. **Map Fields**: Confirm field mappings (auto-detected from headers)
4. **Validate**: System validates data before import

### Step 3: Import Execution
1. **Process**: System processes each row
2. **Create References**: Auto-creates missing markets/verticals
3. **Handle Duplicates**: Skips or updates existing records
4. **Report Results**: Shows success/error summary

## ✅ Validation Rules

### Company Validation
- **Name**: Required, unique within organization
- **Market**: Must be valid market name
- **Vertical**: Must be valid vertical name
- **Website**: Must be valid URL format if provided
- **Revenue**: Must be positive number if provided
- **Employee Count**: Must be positive integer if provided
- **Status**: Must be valid status value
- **Email**: Must be valid email format if provided

### Contact Validation
- **Name**: First and last name required
- **Company**: Must reference existing company
- **Email**: Must be valid email format if provided
- **Phone**: No specific format required
- **LinkedIn**: Must be valid LinkedIn URL if provided

## 🚨 Error Handling

### Common Errors
- **Missing Required Fields**: Row skipped with error message
- **Invalid Data Types**: Row skipped with validation error
- **Duplicate Entries**: Handled based on import settings
- **Reference Errors**: Company not found for contact import

### Error Resolution
1. **Review Error Report**: Check detailed error messages
2. **Fix Data**: Correct issues in your CSV file
3. **Re-import**: Upload corrected file
4. **Partial Success**: Successfully imported rows remain in system

### Error Report Format
```
Row 3: Missing required field 'name'
Row 7: Invalid email format 'not-an-email'
Row 12: Company 'Unknown Corp' not found for contact import
```

## 🔄 Bulk Operations

### Large File Handling
- **Batch Processing**: Files processed in chunks of 100 records
- **Progress Tracking**: Real-time import progress display
- **Memory Management**: Efficient handling of large datasets
- **Timeout Protection**: Long imports handled gracefully

### Performance Tips
- **File Size**: Keep files under 10MB for best performance
- **Record Count**: Optimal batch size is 500-1000 records
- **Network**: Stable internet connection recommended
- **Browser**: Use modern browser for best experience

## 📈 Import Statistics

### Success Metrics
- **Total Rows**: Number of rows in CSV file
- **Successful Imports**: Records successfully created
- **Skipped Records**: Duplicates or invalid data
- **Created References**: New markets/verticals created
- **Processing Time**: Import duration

### Example Report
```
Import Complete!
- Total rows processed: 150
- Successfully imported: 142
- Skipped (duplicates): 5
- Errors: 3
- New markets created: 2
- New verticals created: 1
- Processing time: 12.3 seconds
```

## 🛠️ Troubleshooting

### File Upload Issues
- **File Too Large**: Split into smaller files
- **Invalid Format**: Ensure CSV format with UTF-8 encoding
- **Special Characters**: Use proper encoding for international characters
- **Browser Issues**: Try different browser or clear cache

### Data Issues
- **Encoding Problems**: Re-save file with UTF-8 encoding
- **Date Formats**: Use ISO format (YYYY-MM-DD)
- **Number Formats**: Remove currency symbols and commas
- **Boolean Values**: Use 'true'/'false' or '1'/'0'

### Import Failures
- **Network Timeout**: Try smaller file or better connection
- **Server Error**: Check system status or contact support
- **Validation Errors**: Review error report and fix data
- **Permission Issues**: Ensure proper organization access

## 🔒 Data Security

### Privacy Protection
- **Temporary Storage**: CSV files deleted after processing
- **Secure Upload**: HTTPS encrypted file transfer
- **Access Control**: Organization-level data isolation
- **Audit Trail**: Import activities logged for compliance

### Best Practices
- **Sensitive Data**: Avoid including sensitive information in notes
- **Data Validation**: Review data before import
- **Backup**: Keep original files as backup
- **Regular Imports**: Import data regularly to avoid large batches

## 📚 API Integration

### Programmatic Import
For automated imports, use the bulk import API endpoints:

```javascript
// Company bulk import
const response = await fetch('/api/companies/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    organization_id: 'your-org-id',
    data: [
      {
        name: 'Company 1',
        market: 'Market Name',
        vertical: 'Vertical Name'
      }
    ]
  })
});
```

See [API Documentation](API.md) for complete endpoint details.

## 🎓 Training Resources

### Video Tutorials
- Data Import Basics (Coming Soon)
- Advanced CSV Formatting (Coming Soon)
- Troubleshooting Common Issues (Coming Soon)

### Sample Files
- [Company Import Template](../templates/companies_template.csv)
- [Contact Import Template](../templates/contacts_template.csv)
- [Sample Data File](../templates/sample_companies.csv)

## 📞 Support

### Getting Help
- **Documentation**: Review this guide and [User Manual](USER_MANUAL.md)
- **Troubleshooting**: Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Support**: Contact development team for technical issues

### Common Questions
- **Q**: Can I import custom fields?
- **A**: Currently limited to predefined fields. Custom fields planned for future release.

- **Q**: What happens to duplicate records?
- **A**: Duplicates are skipped by default. Update functionality coming soon.

- **Q**: Can I schedule automatic imports?
- **A**: Not currently supported. API integration recommended for automated workflows.

---

**Next Steps**: After importing data, see the [User Manual](USER_MANUAL.md) for managing your imported records and creating campaigns.
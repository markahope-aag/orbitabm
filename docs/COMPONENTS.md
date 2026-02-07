# Component Library

OrbitABM uses a custom component library built with React, TypeScript, and Tailwind CSS. This guide documents all reusable UI components and their usage patterns.

## 🎨 Design System

### Color Palette
- **Primary**: Blue (`bg-blue-600`, `text-blue-600`)
- **Success**: Green (`bg-green-600`, `text-green-600`)
- **Warning**: Yellow (`bg-yellow-600`, `text-yellow-600`)
- **Error**: Red (`bg-red-600`, `text-red-600`)
- **Neutral**: Gray (`bg-gray-100`, `text-gray-900`)

### Typography
- **Headings**: `text-2xl font-bold`, `text-xl font-semibold`
- **Body**: `text-base`, `text-sm`
- **Labels**: `text-sm font-medium text-gray-700`

### Spacing
- **Padding**: `p-4`, `p-6`, `p-8`
- **Margins**: `mb-4`, `mb-6`, `mb-8`
- **Gaps**: `gap-4`, `gap-6`, `gap-8`

## 🧩 Core Components

### Layout Components

#### `<PageHeader>`
Page title and action buttons container.

```tsx
import { PageHeader } from '@/components/layout/PageHeader';

<PageHeader
  title="Companies"
  subtitle="Manage your target companies"
  action={
    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
      Add Company
    </button>
  }
/>
```

**Props:**
- `title: string` - Page title
- `subtitle?: string` - Optional subtitle
- `action?: ReactNode` - Action button(s)

#### `<Card>`
Container component with consistent styling.

```tsx
import { Card } from '@/components/ui/Card';

<Card>
  <Card.Header>
    <h3>Card Title</h3>
  </Card.Header>
  <Card.Content>
    <p>Card content goes here</p>
  </Card.Content>
</Card>
```

**Props:**
- `children: ReactNode` - Card content
- `className?: string` - Additional CSS classes

### Form Components

#### `<Input>`
Standard text input with label and validation.

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Company Name"
  name="name"
  value={value}
  onChange={handleChange}
  placeholder="Enter company name"
  required
  error={errors.name}
/>
```

**Props:**
- `label: string` - Input label
- `name: string` - Input name attribute
- `value: string` - Input value
- `onChange: (e: ChangeEvent<HTMLInputElement>) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `required?: boolean` - Required field indicator
- `error?: string` - Error message
- `type?: string` - Input type (default: 'text')

#### `<Select>`
Dropdown select component.

```tsx
import { Select } from '@/components/ui/Select';

<Select
  label="Status"
  name="status"
  value={status}
  onChange={handleStatusChange}
  options={[
    { value: 'prospect', label: 'Prospect' },
    { value: 'target', label: 'Target' },
    { value: 'client', label: 'Client' }
  ]}
  required
/>
```

**Props:**
- `label: string` - Select label
- `name: string` - Select name attribute
- `value: string` - Selected value
- `onChange: (e: ChangeEvent<HTMLSelectElement>) => void` - Change handler
- `options: Array<{value: string, label: string}>` - Select options
- `required?: boolean` - Required field indicator
- `placeholder?: string` - Placeholder option

#### `<TextArea>`
Multi-line text input component.

```tsx
import { TextArea } from '@/components/ui/TextArea';

<TextArea
  label="Notes"
  name="notes"
  value={notes}
  onChange={handleNotesChange}
  placeholder="Enter notes..."
  rows={4}
/>
```

**Props:**
- `label: string` - TextArea label
- `name: string` - TextArea name attribute
- `value: string` - TextArea value
- `onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `rows?: number` - Number of rows (default: 3)

### Button Components

#### `<Button>`
Primary button component with variants.

```tsx
import { Button } from '@/components/ui/Button';

<Button
  variant="primary"
  size="md"
  onClick={handleClick}
  disabled={loading}
  loading={loading}
>
  Save Changes
</Button>
```

**Props:**
- `variant: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style
- `size: 'sm' | 'md' | 'lg'` - Button size
- `onClick?: () => void` - Click handler
- `disabled?: boolean` - Disabled state
- `loading?: boolean` - Loading state with spinner
- `type?: 'button' | 'submit' | 'reset'` - Button type
- `children: ReactNode` - Button content

**Variants:**
- `primary`: Blue background, white text
- `secondary`: Gray background, dark text
- `danger`: Red background, white text
- `ghost`: Transparent background, colored text

#### `<IconButton>`
Button with icon only.

```tsx
import { IconButton } from '@/components/ui/IconButton';
import { Edit, Trash2 } from 'lucide-react';

<IconButton
  icon={<Edit size={16} />}
  onClick={handleEdit}
  variant="ghost"
  size="sm"
  title="Edit company"
/>
```

**Props:**
- `icon: ReactNode` - Icon element (usually from lucide-react)
- `onClick?: () => void` - Click handler
- `variant: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style
- `size: 'sm' | 'md' | 'lg'` - Button size
- `title?: string` - Tooltip text
- `disabled?: boolean` - Disabled state

### Data Display Components

#### `<Table>`
Data table with sorting and pagination.

```tsx
import { Table } from '@/components/ui/Table';

<Table
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'revenue', label: 'Revenue', sortable: true }
  ]}
  data={companies}
  onSort={handleSort}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  loading={loading}
  emptyMessage="No companies found"
/>
```

**Props:**
- `columns: Array<{key: string, label: string, sortable?: boolean}>` - Table columns
- `data: Array<Record<string, any>>` - Table data
- `onSort?: (column: string) => void` - Sort handler
- `sortColumn?: string` - Current sort column
- `sortDirection?: 'asc' | 'desc'` - Sort direction
- `loading?: boolean` - Loading state
- `emptyMessage?: string` - Message when no data

#### `<StatusBadge>`
Colored badge for status display.

```tsx
import { StatusBadge } from '@/components/ui/StatusBadge';

<StatusBadge
  status="prospect"
  variant="company"
/>
```

**Props:**
- `status: string` - Status value
- `variant: 'company' | 'campaign' | 'contact'` - Badge type for color mapping

**Status Colors:**
- Company: `prospect` (blue), `target` (green), `client` (purple), `competitor` (orange)
- Campaign: `planned` (gray), `active` (blue), `completed` (green), `paused` (yellow)
- Contact: `identified` (gray), `engaged` (blue), `qualified` (green)

#### `<MetricCard>`
Display key metrics with icons.

```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Building2 } from 'lucide-react';

<MetricCard
  title="Total Companies"
  value="1,234"
  change="+12%"
  changeType="positive"
  icon={<Building2 size={24} />}
/>
```

**Props:**
- `title: string` - Metric title
- `value: string | number` - Metric value
- `change?: string` - Change percentage
- `changeType?: 'positive' | 'negative' | 'neutral'` - Change indicator color
- `icon?: ReactNode` - Metric icon

### Navigation Components

#### `<Tabs>`
Tab navigation component.

```tsx
import { Tabs } from '@/components/ui/Tabs';

<Tabs
  tabs={[
    { id: 'overview', label: 'Overview', count: 12 },
    { id: 'companies', label: 'Companies', count: 156 },
    { id: 'contacts', label: 'Contacts', count: 89 }
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

**Props:**
- `tabs: Array<{id: string, label: string, count?: number}>` - Tab definitions
- `activeTab: string` - Currently active tab ID
- `onChange: (tabId: string) => void` - Tab change handler

#### `<Breadcrumb>`
Navigation breadcrumb component.

```tsx
import { Breadcrumb } from '@/components/ui/Breadcrumb';

<Breadcrumb
  items={[
    { label: 'Companies', href: '/companies' },
    { label: 'Acme HVAC', href: '/companies/123' },
    { label: 'Edit' }
  ]}
/>
```

**Props:**
- `items: Array<{label: string, href?: string}>` - Breadcrumb items

### Feedback Components

#### `<LoadingSpinner>`
Loading indicator component.

```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

<LoadingSpinner
  size="md"
  message="Loading companies..."
/>
```

**Props:**
- `size: 'sm' | 'md' | 'lg'` - Spinner size
- `message?: string` - Loading message

#### `<EmptyState>`
Empty state placeholder component.

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2 } from 'lucide-react';

<EmptyState
  icon={<Building2 size={48} />}
  title="No companies found"
  description="Get started by adding your first company"
  action={
    <Button onClick={handleAddCompany}>
      Add Company
    </Button>
  }
/>
```

**Props:**
- `icon: ReactNode` - Empty state icon
- `title: string` - Empty state title
- `description?: string` - Empty state description
- `action?: ReactNode` - Call-to-action button

### Import Components

#### `<FileUpload>`
File upload component with drag-and-drop.

```tsx
import { FileUpload } from '@/components/import/FileUpload';

<FileUpload
  accept=".csv"
  onFileSelect={handleFileSelect}
  loading={uploading}
  maxSize={10 * 1024 * 1024} // 10MB
/>
```

**Props:**
- `accept: string` - Accepted file types
- `onFileSelect: (file: File) => void` - File selection handler
- `loading?: boolean` - Upload loading state
- `maxSize?: number` - Maximum file size in bytes

#### `<DataPreview>`
Preview imported data before processing.

```tsx
import { DataPreview } from '@/components/import/DataPreview';

<DataPreview
  data={csvData}
  columns={detectedColumns}
  maxRows={5}
  onConfirm={handleImport}
  onCancel={handleCancel}
/>
```

**Props:**
- `data: Array<Record<string, any>>` - Preview data
- `columns: Array<string>` - Column names
- `maxRows?: number` - Maximum rows to show (default: 5)
- `onConfirm: () => void` - Confirm import handler
- `onCancel: () => void` - Cancel import handler

## 🎯 Usage Patterns

### Form Layouts
```tsx
// Standard form layout
<form onSubmit={handleSubmit} className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Input
      label="Company Name"
      name="name"
      value={formData.name}
      onChange={handleInputChange}
      required
    />
    <Select
      label="Status"
      name="status"
      value={formData.status}
      onChange={handleInputChange}
      options={statusOptions}
      required
    />
  </div>
  
  <TextArea
    label="Notes"
    name="notes"
    value={formData.notes}
    onChange={handleInputChange}
    rows={4}
  />
  
  <div className="flex justify-end space-x-4">
    <Button variant="secondary" onClick={handleCancel}>
      Cancel
    </Button>
    <Button type="submit" loading={saving}>
      Save Company
    </Button>
  </div>
</form>
```

### Data Tables
```tsx
// Table with actions
<div className="space-y-4">
  <PageHeader
    title="Companies"
    action={
      <Button onClick={handleAddCompany}>
        Add Company
      </Button>
    }
  />
  
  <Card>
    <Table
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status', label: 'Status' },
        { key: 'revenue', label: 'Revenue', sortable: true },
        { key: 'actions', label: 'Actions' }
      ]}
      data={companies.map(company => ({
        ...company,
        status: <StatusBadge status={company.status} variant="company" />,
        revenue: formatCurrency(company.estimated_revenue),
        actions: (
          <div className="flex space-x-2">
            <IconButton
              icon={<Edit size={16} />}
              onClick={() => handleEdit(company.id)}
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={<Trash2 size={16} />}
              onClick={() => handleDelete(company.id)}
              variant="danger"
              size="sm"
            />
          </div>
        )
      }))}
      loading={loading}
      emptyMessage="No companies found"
    />
  </Card>
</div>
```

### Dashboard Metrics
```tsx
// Metrics grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <MetricCard
    title="Total Companies"
    value={metrics.totalCompanies}
    change="+12%"
    changeType="positive"
    icon={<Building2 size={24} />}
  />
  <MetricCard
    title="Active Campaigns"
    value={metrics.activeCampaigns}
    change="+5%"
    changeType="positive"
    icon={<Target size={24} />}
  />
  <MetricCard
    title="Qualified Leads"
    value={metrics.qualifiedLeads}
    change="-3%"
    changeType="negative"
    icon={<Users size={24} />}
  />
  <MetricCard
    title="Conversion Rate"
    value={`${metrics.conversionRate}%`}
    change="+2%"
    changeType="positive"
    icon={<TrendingUp size={24} />}
  />
</div>
```

## 🎨 Styling Guidelines

### Consistent Spacing
- Use Tailwind's spacing scale: `space-y-4`, `space-x-4`
- Container padding: `p-6` for cards, `p-8` for pages
- Section margins: `mb-8` for major sections, `mb-4` for subsections

### Color Usage
- Primary actions: `bg-blue-600 hover:bg-blue-700`
- Destructive actions: `bg-red-600 hover:bg-red-700`
- Secondary actions: `bg-gray-200 hover:bg-gray-300`
- Text hierarchy: `text-gray-900` (primary), `text-gray-600` (secondary)

### Responsive Design
- Mobile-first approach: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Consistent breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Stack on mobile, grid on desktop

### Accessibility
- Semantic HTML elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## 🔧 Customization

### Extending Components
```tsx
// Custom button variant
const CustomButton = ({ children, ...props }) => (
  <Button
    {...props}
    className={`${props.className} custom-gradient-bg`}
  >
    {children}
  </Button>
);
```

### Theme Configuration
Components use CSS custom properties for theming:

```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #6b7280;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;
}
```

## 📚 Development Guidelines

### Component Structure
```tsx
// Component template
interface ComponentProps {
  // Props definition
}

export const Component: React.FC<ComponentProps> = ({
  // Destructured props
}) => {
  // Component logic
  
  return (
    // JSX structure
  );
};

// Default props (if needed)
Component.defaultProps = {
  // Default values
};
```

### TypeScript Usage
- Define prop interfaces
- Use proper type annotations
- Export component types for reuse
- Avoid `any` types

### Testing Components
```tsx
// Component test template
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });
});
```

---

**Next Steps**: For implementation examples, see the [User Manual](USER_MANUAL.md) or explore the source code in `/src/components/`.
import { LucideIcon } from 'lucide-react'

interface PageHeaderAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: PageHeaderAction
  children?: React.ReactNode
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        
        {action && (
          <button
            onClick={action.onClick}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              action.variant === 'secondary'
                ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-gray-500'
                : 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {action.icon && <action.icon className="h-4 w-4 mr-2" />}
            {action.label}
          </button>
        )}
      </div>
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}
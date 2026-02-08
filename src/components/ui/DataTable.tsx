'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/utils/csvExport'

interface Column<T = Record<string, unknown>> {
  key: string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  loading: boolean
  onRowClick?: (row: T) => void
  onAdd?: () => void
  addLabel?: string
  emptyMessage?: string
  searchable?: boolean
  searchFields?: string[]
  exportable?: boolean
  exportFilename?: string
  entityName?: string
  orgSlug?: string
  pageSize?: number
}

export function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
  columns,
  data,
  loading,
  onRowClick,
  onAdd,
  addLabel = "Add New",
  emptyMessage = "No data available",
  searchable = true,
  searchFields = [],
  exportable = true,
  exportFilename,
  entityName = 'data',
  orgSlug = 'export',
  pageSize: initialPageSize = 25
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize)

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchable) return data

    return data.filter((row) => {
      const fieldsToSearch = searchFields.length > 0 ? searchFields : columns.map(col => col.key)

      return fieldsToSearch.some(field => {
        const value = (row as Record<string, unknown>)[field]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, [data, searchTerm, searchFields, columns, searchable])

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key]
      const bValue = (b as Record<string, unknown>)[sortConfig.key]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredData, sortConfig])

  // Pagination
  const totalRows = sortedData.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleExport = () => {
    exportToCSV(
      sortedData as T[],
      columns.map(col => ({
        key: col.key,
        header: col.header,
        render: col.render ? (row: Record<string, unknown>) => {
          const rendered = col.render!(row as T)
          // Convert React nodes to strings for CSV
          if (typeof rendered === 'string' || typeof rendered === 'number') {
            return rendered
          }
          return String(rendered || '')
        } : undefined
      })),
      entityName,
      { filename: exportFilename, orgSlug }
    )
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronUp className="w-4 h-4 text-slate-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-navy-600" />
      : <ChevronDown className="w-4 h-4 text-navy-600" />
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-10 bg-slate-200 rounded w-80"></div>
              <div className="h-10 bg-slate-200 rounded w-32"></div>
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Header with search and add button */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex justify-between items-center">
          {searchable && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          )}
          {!searchable && <div></div>}
          
          <div className="flex items-center space-x-3">
            {exportable && sortedData.length > 0 && (
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}
            
            {onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{addLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 ${column.width || ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={(row as Record<string, unknown>).id as string || index}
                  className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''} ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-25'
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalRows > 0 && (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <span>Showing {startIndex + 1}–{Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1) }}
              className="ml-2 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-slate-700 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="p-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
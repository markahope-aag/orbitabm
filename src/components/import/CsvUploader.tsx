'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import { Upload, FileText, X } from 'lucide-react'

interface CsvUploaderProps {
  onDataParsed: (data: any[], headers: string[]) => void
  onError: (error: string) => void
}

export function CsvUploader({ onDataParsed, onError }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Please select a CSV file')
      return
    }

    setIsProcessing(true)
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        setIsProcessing(false)
        
        if (results.errors.length > 0) {
          const errorMessages = results.errors.map(err => err.message).join(', ')
          onError(`CSV parsing errors: ${errorMessages}`)
          return
        }

        if (results.data.length === 0) {
          onError('CSV file appears to be empty')
          return
        }

        const headers = results.meta.fields || []
        onDataParsed(results.data, headers)
      },
      error: (error) => {
        setIsProcessing(false)
        onError(`Failed to parse CSV: ${error.message}`)
      }
    })
  }, [onDataParsed, onError])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }, [processFile])

  const clearFile = () => {
    setFileName(null)
    setIsProcessing(false)
  }

  return (
    <div className="space-y-4">
      {!fileName ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging 
              ? 'border-cyan-500 bg-cyan-50' 
              : 'border-slate-300 hover:border-slate-400'
            }
          `}
        >
          <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-700">
              Drop your CSV file here
            </p>
            <p className="text-sm text-slate-500">
              or click to browse files
            </p>
          </div>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-slate-500" />
              <div>
                <p className="font-medium text-slate-900">{fileName}</p>
                {isProcessing && (
                  <p className="text-sm text-slate-500">Processing...</p>
                )}
              </div>
            </div>
            
            {!isProcessing && (
              <button
                onClick={clearFile}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {isProcessing && (
            <div className="mt-3">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full animate-pulse w-1/2"></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
'use client'

import React, { useState } from 'react'
import Link from 'next/link'

type UploadMode = 'full' | 'prices-only'

export default function UploadPage() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('full')
  const [ingredientsFile, setIngredientsFile] = useState<File | null>(null)
  const [allergiesFile, setAllergiesFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = (type: 'ingredients' | 'allergies', file: File | null) => {
    if (type === 'ingredients') {
      setIngredientsFile(file)
    } else {
      setAllergiesFile(file)
    }
    // Clear previous results when files change
    setUploadResult(null)
    setUploadError(null)
  }

  const handleUpload = async () => {
    if (!ingredientsFile) {
      setUploadError('Please select a prices Excel file')
      return
    }

    if (uploadMode === 'full' && !allergiesFile) {
      setUploadError('Please select both Excel files for full upload')
      return
    }

    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('ingredients', ingredientsFile)
      if (allergiesFile) {
        formData.append('allergies', allergiesFile)
      }
      formData.append('mode', uploadMode)

      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        if (uploadMode === 'prices-only') {
          setUploadResult(
            `Successfully updated prices for ${result.ingredientsProcessed} ingredients`
          )
        } else {
          setUploadResult(
            `Successfully processed ${result.ingredientsProcessed} ingredients and ${result.allergiesProcessed || 0} allergy records`
          )
        }
        // Clear file inputs after successful upload
        setIngredientsFile(null)
        setAllergiesFile(null)
        // Reset file input elements
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
        fileInputs.forEach(input => input.value = '')
      } else {
        setUploadError(result.message || 'Upload failed')
        if (result.errors && result.errors.length > 0) {
          setUploadError(result.message + '\n\nDetailed errors:\n' + result.errors.join('\n'))
        }
      }
    } catch (error) {
      setUploadError('Network error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/"
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Upload Excel Files</h2>
              <p className="mt-2 text-gray-600">
                Upload your ingredient prices and allergy information to populate the database
              </p>
            </div>

            {/* Upload Mode Selection */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setUploadMode('full')
                    setUploadResult(null)
                    setUploadError(null)
                  }}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    uploadMode === 'full'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">Full Upload</div>
                  <div className="text-xs mt-1">Prices + Allergies</div>
                </button>
                <button
                  onClick={() => {
                    setUploadMode('prices-only')
                    setAllergiesFile(null)
                    setUploadResult(null)
                    setUploadError(null)
                    // Reset allergies file input
                    const allergiesInput = document.querySelector('input[type="file"][data-type="allergies"]') as HTMLInputElement
                    if (allergiesInput) allergiesInput.value = ''
                  }}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    uploadMode === 'prices-only'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">Update Prices Only</div>
                  <div className="text-xs mt-1">For existing items</div>
                </button>
              </div>
              {uploadMode === 'prices-only' && (
                <p className="mt-3 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <strong>Note:</strong> This will update prices for existing ingredients based on product codes. New items will be added if they don't exist.
                </p>
              )}
            </div>
            
            <div className="space-y-8">
              {/* Ingredients File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Prices Excel File <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-10 h-10 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">Excel files (.xlsx, .xls)</p>
                      {ingredientsFile && (
                        <p className="mt-2 text-sm text-green-600 font-medium">
                          ✓ {ingredientsFile.name}
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileChange('ingredients', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              {/* Allergies File Upload */}
              {uploadMode === 'full' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Allergy Excel File <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-10 h-10 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Excel files (.xlsx, .xls)</p>
                        {allergiesFile && (
                          <p className="mt-2 text-sm text-green-600 font-medium">
                            ✓ {allergiesFile.name}
                          </p>
                        )}
                      </div>
                      <input
                        type="file"
                        data-type="allergies"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileChange('allergies', e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div className="text-center">
                <button
                  onClick={handleUpload}
                  disabled={!ingredientsFile || (uploadMode === 'full' && !allergiesFile) || uploading}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    uploadMode === 'prices-only' ? 'Update Prices' : 'Upload and Process Files'
                  )}
                </button>
              </div>

              {/* Result Messages */}
              {uploadResult && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        {uploadResult}
                      </p>
                      <div className="mt-2">
                        <Link
                          href="/ingredients"
                          className="text-sm font-medium text-green-600 hover:text-green-500"
                        >
                          View Ingredients →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800 whitespace-pre-line">
                        {uploadError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
                <h3 className="text-sm font-medium text-blue-800 mb-3">Expected File Format:</h3>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>Prices File:</strong> Code, Product Name, Weight, Unit, Price</p>
                  <p><strong>Allergy File:</strong> Code, Description, followed by allergy columns (Celery, Gluten, etc.)</p>
                  <p><strong>Allergy Values:</strong> Y/Yes = Contains, N/No = Doesn't contain, May/May Contain/P = May contain</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
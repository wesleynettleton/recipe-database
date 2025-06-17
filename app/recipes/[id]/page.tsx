'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Recipe {
  id: number
  name: string
  code: string | null
  servings: number
  instructions: string | null
  notes: string | null
  photo?: string
  createdAt: string
  totalCost: number | null
  costPerServing: number | null
  ingredients: RecipeIngredient[]
  allergies: string[]
}

interface RecipeIngredient {
  id: number
  originalProductCode: string
  quantity: number
  unit?: string
  notes?: string
  cost: number
  ingredientName: string
  ingredientSupplier: string
  ingredientPrice: number
  ingredientWeight: number
  ingredientUnit: string
  ingredientAllergies: string
  ingredient: {
    productCode: string
    name: string
    supplier: string
    price: number
    weight: number
    unit: string
    allergies: string[]
  }
}

export default function RecipeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const recipeId = params.id as string
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (recipeId) {
      fetchRecipe()
    }
  }, [recipeId])

  const fetchRecipe = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/recipes/${recipeId}`)
      
      if (!response.ok) {
        throw new Error('Recipe not found')
      }
      
      const data = await response.json()
      console.log('Recipe data from API:', data.recipe)
      console.log('First ingredient allergies:', data.recipe.ingredients[0]?.ingredientAllergies)
      setRecipe(data.recipe)
    } catch (error) {
      console.error('Error fetching recipe:', error)
      setError('Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleExportRecipe = async () => {
    try {
      setIsExporting(true)
      console.log('Starting export for recipe ID:', recipeId)
      
      const response = await fetch(`/api/recipes/export?recipeId=${recipeId}`)
      
      console.log('Export response status:', response.status)
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Export failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If we can't parse JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        console.error('Export failed:', errorMessage)
        throw new Error(errorMessage)
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from response headers or create one
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `recipe-${recipe?.code || recipe?.name}-${new Date().toISOString().split('T')[0]}.xlsx`
      
      console.log('Downloading file:', filename)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('Export completed successfully')
    } catch (error) {
      console.error('Error exporting recipe:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export recipe'
      alert(`Export failed: ${errorMessage}`)
    } finally {
      setIsExporting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const parseAllergies = (allergiesString: string) => {
    let allergies: { name: string; status: 'has' }[] = [];
    try {
      const parsed = JSON.parse(allergiesString);
      if (Array.isArray(parsed)) {
        allergies = parsed.map((a: string | { allergy: string; status: string }) => {
          if (typeof a === 'string') {
            // Handle 'allergy:status' format
            const [name, status] = a.split(':');
            return status === 'has' ? { name, status: 'has' } : null;
          } else if (typeof a === 'object' && a.allergy && a.status === 'has') {
            return { name: a.allergy, status: 'has' };
          }
          return null;
        }).filter(Boolean) as { name: string; status: 'has' }[];
      }
    } catch (e) {
      // fallback: return empty array
      allergies = [];
    }
    return allergies;
  }

  const getAllergyBadgeStyle = (status: 'has') => {
    return 'bg-red-100 text-red-800';
  }

  const getStatusPrefix = (status: 'has') => {
    return 'Contains ';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading recipe...</div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error || 'Recipe not found'}</div>
          <Link
            href="/recipes"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Recipes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/recipes"
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 7h18" />
                </svg>
                Back to Recipes
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recipe Details</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportRecipe}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe Info */}
          <div className={recipe.photo ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-grow">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">{recipe.name}</h2>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-500">Serves {recipe.servings}</span>
                  </div>
                </div>
              </div>

              {/* Recipe Code */}
              {recipe.code && (
                <div className="flex items-center space-x-4">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm font-medium">
                    {recipe.code}
                  </span>
                </div>
              )}
            </div>

            {/* Ingredients List */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ingredients</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Code
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                        Ingredient
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recipe.ingredients.map((ingredient, index) => {
                      const allergies = parseAllergies(ingredient.ingredientAllergies || '[]')
                      return (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{ingredient.originalProductCode}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{ingredient.ingredientName}</p>
                              {ingredient.notes && (
                                <p className="text-sm text-gray-500 italic mt-1">{ingredient.notes}</p>
                              )}
                              {allergies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {allergies.map((allergy, allergyIndex) => (
                                    <span
                                      key={allergyIndex}
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAllergyBadgeStyle(allergy.status)}`}
                                    >
                                      {getStatusPrefix(allergy.status)}{allergy.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">{ingredient.quantity}</span>
                              <span className="text-gray-500 ml-1">{ingredient.unit}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">£{(typeof ingredient.cost === 'number' ? ingredient.cost : parseFloat(String(ingredient.cost)) || 0).toFixed(2)}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        Total Cost:
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                        £{recipe.totalCost?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                        Cost per Serving:
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-900">
                        £{recipe.costPerServing?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Instructions */}
            {recipe.instructions && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Instructions</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{recipe.instructions}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {recipe.notes && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {recipe.photo && (
            <div className="space-y-6">
              {/* Recipe Photo */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recipe Photo</h3>
                <div className="aspect-square overflow-hidden rounded-lg">
                  <img
                    src={recipe.photo}
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
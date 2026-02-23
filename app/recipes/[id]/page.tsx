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
   // Derived sugar values from ingredients (not stored directly in DB)
  totalSugar?: number | null
  sugarPerServing?: number | null
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
  // Derived sugar values for this ingredient in the recipe
  sugarPer100g?: number
  sugar?: number
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
      console.log('Recipe totalCost field:', data.recipe.totalCost)
      console.log('Recipe costPerServing field:', data.recipe.costPerServing)
      console.log('All recipe fields:', Object.keys(data.recipe))
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
      
      const response = await fetch(`/api/recipes/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipe }),
      });
      
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

      // Create download link for PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from response headers or create one
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `recipe-${recipe?.code || recipe?.name}-${new Date().toISOString().split('T')[0]}.pdf`
      
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

  const parseAllergies = (allergies: any): { name: string; status: 'has' | 'may' }[] => {
    if (!allergies) return []
    
    if (typeof allergies === 'string') {
      try {
        const parsed = JSON.parse(allergies);
        if (Array.isArray(parsed)) {
            return parsed.map((a: string | { allergy: string, status: 'has' | 'may' }) => {
                if (typeof a === 'string') {
                    const [name, status] = a.split(':');
                    return { 
                        name: name.trim(), 
                        status: (status?.trim() || 'has') as 'has' | 'may' 
                    };
                }
                if (typeof a === 'object' && a.allergy) {
                    return {
                        name: a.allergy,
                        status: (a.status || 'has') as 'has' | 'may'
                    }
                }
                return null;
            }).filter(Boolean) as { name: string; status: 'has' | 'may' }[];
        }
      } catch {
        return allergies.split(',').map(a => {
          const [name, status] = a.split(':');
          return { name: name.trim(), status: (status?.trim() || 'has') as 'has' | 'may' };
        });
      }
    }
    
    if (Array.isArray(allergies)) {
      return allergies.map(a => {
        if (typeof a === 'string') {
          const [name, status] = a.split(':');
          return { name: name.trim(), status: (status?.trim() || 'has') as 'has' | 'may' };
        }
        if (typeof a === 'object' && a.allergy) {
          return { name: a.allergy, status: (a.status || 'has') as 'has' | 'may' };
        }
        return null;
      }).filter(Boolean) as { name: string; status: 'has' | 'may' }[];
    }
    
    return []
  }

  const getAllergyBadgeStyle = (status: 'has' | 'may') => {
    switch (status) {
      case 'has':
        return 'bg-red-100 text-red-800'
      case 'may':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusPrefix = (status: 'has' | 'may') => {
    switch (status) {
      case 'has':
        return 'Contains '
      case 'may':
        return 'May contain '
      default:
        return ''
    }
  }

  // Calculate unique allergies for the summary
  const allergySummary = recipe?.ingredients.reduce((acc, ingredient) => {
    const allergies = parseAllergies(ingredient.ingredientAllergies);
    allergies.forEach(allergy => {
      const existing = acc.get(allergy.name);
      // 'has' status has precedence over 'may'
      if (!existing || (existing === 'may' && allergy.status === 'has')) {
        acc.set(allergy.name, allergy.status);
      }
    });
    return acc;
  }, new Map<string, 'has' | 'may'>());

  const isDessert =
    !!recipe?.code && recipe.code.toUpperCase().startsWith('D');

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

              {/* Cost & sugar info (screen only, not included in PDF) */}
              {(recipe.totalCost !== null ||
                recipe.costPerServing !== null ||
                // Only show sugar info for desserts (codes starting with "D")
                (recipe.code && recipe.code.toUpperCase().startsWith('D') && recipe.sugarPerServing != null)) && (
                <div className="mt-4 text-sm text-gray-700 space-y-1">
                  {recipe.totalCost !== null && (
                    <p>
                      <span className="font-medium">Total cost:</span>{' '}
                      £{recipe.totalCost.toFixed(2)}
                    </p>
                  )}
                  {recipe.costPerServing !== null && (
                    <p>
                      <span className="font-medium">Cost per portion:</span>{' '}
                      £{recipe.costPerServing.toFixed(2)}
                    </p>
                  )}
                  {recipe.code &&
                    recipe.code.toUpperCase().startsWith('D') &&
                    recipe.sugarPerServing != null && (
                    <p>
                      <span className="font-medium">Sugar per portion:</span>{' '}
                      {recipe.sugarPerServing.toFixed(1)}g
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Ingredients List */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Ingredients</h2>
              {isDessert && (
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  {/* Empty space over ingredient names */}
                  <span className="flex-1" />
                  {/* Sugar column header aligned with sugar values */}
                  <span className="w-20 text-right">Sugar</span>
                  {/* Qty / cost headers aligned over right-hand data */}
                  <div className="flex items-center space-x-4 text-right">
                    <span>Qty</span>
                    <span>Cost</span>
                  </div>
                </div>
              )}
              <ul className="divide-y divide-gray-200">
                {recipe.ingredients.map((ing, index) => {
                  const ingredientAllergies = parseAllergies(ing.ingredientAllergies);
                  return (
                    <li key={index} className="py-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-normal text-gray-800">{ing.ingredientName}</p>
                          {ing.notes && <p className="text-xs text-gray-500 italic">"{ing.notes}"</p>}
                           {ingredientAllergies.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {ingredientAllergies.sort((a, b) => {
                                if (a.status === 'has' && b.status === 'may') return -1;
                                if (a.status === 'may' && b.status === 'has') return 1;
                                return a.name.localeCompare(b.name);
                              }).map(allergy => (
                                <span
                                  key={allergy.name}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAllergyBadgeStyle(allergy.status)}`}
                                >
                                  {getStatusPrefix(allergy.status)}{allergy.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isDessert && (
                          <div className="w-20 text-sm text-gray-700 text-right">
                            {ing.sugar != null ? `${ing.sugar.toFixed(1)}g` : '—'}
                          </div>
                        )}
                        <div className="flex items-center space-x-4 text-right">
                          <p className="text-sm font-normal text-black">
                            {ing.quantity} {ing.unit}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            £{ing.cost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
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

            {/* Allergy Summary */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Allergy Summary</h3>
              <div className="flex flex-wrap gap-2">
                {allergySummary && allergySummary.size > 0 ? (
                  Array.from(allergySummary.entries())
                    .map(([name, status]) => ({ name, status }))
                    .sort((a, b) => {
                      if (a.status === 'has' && b.status === 'may') return -1;
                      if (a.status === 'may' && b.status === 'has') return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map(allergy => (
                      <span
                        key={allergy.name}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getAllergyBadgeStyle(allergy.status)}`}
                      >
                        {getStatusPrefix(allergy.status)}{allergy.name}
                      </span>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">No allergen information available for this recipe.</p>
                )}
              </div>
            </div>

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
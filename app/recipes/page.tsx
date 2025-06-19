'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Recipe {
  id: number
  name: string
  code?: string
  servings: number
  instructions?: string
  photo?: string
  totalCost?: number
  costPerServing?: number
  createdAt: string
  menuName?: string
  weekStartDate?: string
}

export default function ViewRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRecipes(recipes)
    } else {
      const filtered = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (recipe.code && recipe.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recipe.instructions && recipe.instructions.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredRecipes(filtered)
    }
  }, [searchTerm, recipes])

  const fetchRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/recipes')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecipes(data.recipes || [])
        } else {
          setError(data.error || 'Failed to fetch recipes')
          setRecipes([])
        }
      } else {
        setError('Failed to fetch recipes')
        setRecipes([])
      }
    } catch (error) {
      console.error('Error fetching recipes:', error)
      setError('Failed to fetch recipes')
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipe = async (recipeId: number, recipeName: string) => {
    if (!confirm(`Are you sure you want to delete "${recipeName}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeletingId(recipeId)
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the recipe from the local state
        setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId))
        // Note: setFilteredRecipes will be updated by the useEffect hook
      } else {
        const data = await response.json()
        alert(`Failed to delete recipe: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('Failed to delete recipe. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
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
            <h1 className="text-2xl font-bold text-gray-900">View Recipes</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Search and Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                placeholder="Search recipes by name, code, or instructions..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/recipes/build"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              + New Recipe
            </Link>
          </div>
        </div>

        {/* Recipe Count */}
        <div className="mb-6">
          <div className="text-sm text-gray-600">
            {searchTerm ? `Found ${filteredRecipes.length} of ${recipes.length} recipes` : `${recipes.length} recipes`}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading recipes...</div>
          </div>
        )}

        {/* No Recipes State */}
        {!loading && recipes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No recipes found</div>
            <Link
              href="/recipes/build"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create your first recipe
            </Link>
          </div>
        )}

        {/* No Search Results */}
        {!loading && recipes.length > 0 && filteredRecipes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No recipes match your search "{searchTerm}"</div>
          </div>
        )}

        {/* Recipes Table */}
        {!loading && filteredRecipes.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Menu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        {recipe.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.menuName ? (
                        <Link href={`/menus/${recipe.weekStartDate}`} className="text-indigo-600 hover:text-indigo-900">
                          {recipe.menuName}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(recipe.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/recipes/${recipe.id}/edit`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                          disabled={deletingId === recipe.id}
                          className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === recipe.id ? (
                            <>
                              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Recipe {
  id: number
  name: string
  code?: string
  costPerServing?: number
}

interface CostDistribution {
  under1: number
  between1and2: number
  between2and3: number
  over3: number
}

interface Analytics {
  totalRecipes: number
  recipesWithCosts: number
  mostExpensive: Recipe | null
  leastExpensive: Recipe | null
  averageCost: number
  topExpensive: Recipe[]
  topCheapest: Recipe[]
  costDistribution: CostDistribution
}

export default function RecipeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/recipes/analytics')
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        setError(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('Failed to fetch analytics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const getDistributionPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">No analytics data available</div>
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
            <h1 className="text-2xl font-bold text-gray-900">Recipe Cost Analytics</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Recipes</h3>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalRecipes}</p>
            <p className="text-sm text-gray-600 mt-1">{analytics.recipesWithCosts} with cost data</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average Cost Per Serving</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.averageCost)}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Most Expensive</h3>
            {analytics.mostExpensive ? (
              <>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.mostExpensive.costPerServing || 0)}</p>
                <p className="text-sm text-gray-600 mt-1 truncate">{analytics.mostExpensive.name}</p>
              </>
            ) : (
              <p className="text-gray-400">No data</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Least Expensive</h3>
            {analytics.leastExpensive ? (
              <>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.leastExpensive.costPerServing || 0)}</p>
                <p className="text-sm text-gray-600 mt-1 truncate">{analytics.leastExpensive.name}</p>
              </>
            ) : (
              <p className="text-gray-400">No data</p>
            )}
          </div>
        </div>

        {/* Cost Distribution */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analytics.costDistribution.under1}</div>
              <div className="text-sm text-gray-600">Under £1</div>
              <div className="text-xs text-gray-500">{getDistributionPercentage(analytics.costDistribution.under1, analytics.recipesWithCosts)}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{analytics.costDistribution.between1and2}</div>
              <div className="text-sm text-gray-600">£1 - £2</div>
              <div className="text-xs text-gray-500">{getDistributionPercentage(analytics.costDistribution.between1and2, analytics.recipesWithCosts)}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{analytics.costDistribution.between2and3}</div>
              <div className="text-sm text-gray-600">£2 - £3</div>
              <div className="text-xs text-gray-500">{getDistributionPercentage(analytics.costDistribution.between2and3, analytics.recipesWithCosts)}%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analytics.costDistribution.over3}</div>
              <div className="text-sm text-gray-600">Over £3</div>
              <div className="text-xs text-gray-500">{getDistributionPercentage(analytics.costDistribution.over3, analytics.recipesWithCosts)}%</div>
            </div>
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Most Expensive Recipes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Most Expensive Recipes</h2>
            <div className="space-y-3">
              {analytics.topExpensive.map((recipe, index) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <Link 
                        href={`/recipes/${recipe.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {recipe.name}
                      </Link>
                    </div>
                    {recipe.code && (
                      <div className="text-sm text-gray-500">{recipe.code}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">{formatCurrency(recipe.costPerServing || 0)}</div>
                    <div className="text-xs text-gray-500">per serving</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Least Expensive Recipes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Least Expensive Recipes</h2>
            <div className="space-y-3">
              {analytics.topCheapest.map((recipe, index) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <Link 
                        href={`/recipes/${recipe.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {recipe.name}
                      </Link>
                    </div>
                    {recipe.code && (
                      <div className="text-sm text-gray-500">{recipe.code}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrency(recipe.costPerServing || 0)}</div>
                    <div className="text-xs text-gray-500">per serving</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
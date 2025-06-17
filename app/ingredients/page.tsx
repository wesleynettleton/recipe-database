'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface AllergyInfo {
  name: string;
  status: 'has' | 'no' | 'may';
}

interface IngredientWithAllergies {
  id: number
  productCode: string
  name: string
  supplier?: string
  weight?: number
  unit?: string
  price: number
  allergies: string[]
  createdAt: string
  updatedAt: string
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientWithAllergies[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAllergy, setSelectedAllergy] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')

  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/ingredients')
      if (!response.ok) {
        throw new Error('Failed to fetch ingredients')
      }
      const data = await response.json()
      setIngredients(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Parse allergy information with status
  const parseAllergies = (allergiesArray: string[]): AllergyInfo[] => {
    return allergiesArray.map(allergyString => {
      const [name, status] = allergyString.split(':');
      return {
        name,
        status: (status as 'has' | 'no' | 'may') || 'has'
      };
    });
  };

  // Get all unique allergies for filter dropdown (only 'has' and 'may' allergies)
  const allAllergies = useMemo(() => {
    const allergySet = new Set<string>();
    ingredients.forEach(ingredient => {
      const allergies = parseAllergies(ingredient.allergies);
      allergies.forEach(allergy => {
        if (allergy.status === 'has' || allergy.status === 'may') {
          allergySet.add(allergy.name);
        }
      });
    });
    return Array.from(allergySet).sort();
  }, [ingredients]);

  // Get all unique suppliers for filter dropdown
  const allSuppliers = Array.from(
    new Set(ingredients.map(ingredient => ingredient.supplier).filter(Boolean))
  ).sort()

  // Filter ingredients based on search term, selected allergy, and selected supplier
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = 
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ingredient.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    const allergies = parseAllergies(ingredient.allergies);
    const matchesAllergy = 
      !selectedAllergy || allergies.some(allergy => 
        allergy.name === selectedAllergy && (allergy.status === 'has' || allergy.status === 'may')
      );
    
    const matchesSupplier = 
      !selectedSupplier || ingredient.supplier === selectedSupplier
    
    return matchesSearch && matchesAllergy && matchesSupplier
  })

  // Function to get badge styling based on allergy status
  const getAllergyBadgeStyle = (status: 'has' | 'no' | 'may') => {
    switch (status) {
      case 'has':
        return 'bg-red-100 text-red-800';
      case 'may':
        return 'bg-yellow-100 text-yellow-800';
      case 'no':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to get status prefix
  const getStatusPrefix = (status: 'has' | 'no' | 'may') => {
    switch (status) {
      case 'has':
        return 'Contains ';
      case 'may':
        return 'May contain ';
      case 'no':
        return 'No ';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchIngredients}
          className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
        >
          Retry
        </button>
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
                href="/"
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ingredients</h1>
            <div className="w-48" /> {/* Spacer to balance the header */}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Ingredients Database</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all ingredients with their prices and allergy information.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {filteredIngredients.length} of {ingredients.length} ingredients
            </span>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search Ingredients
            </label>
            <input
              type="text"
              id="search"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
              placeholder="Search by name or product code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="allergy-filter" className="block text-sm font-medium text-gray-700">
              Filter by Allergy
            </label>
            <select
              id="allergy-filter"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedAllergy}
              onChange={(e) => setSelectedAllergy(e.target.value)}
            >
              <option value="">All ingredients</option>
              {allAllergies.map(allergy => (
                <option key={allergy} value={allergy}>
                  Contains {allergy}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="supplier-filter" className="block text-sm font-medium text-gray-700">
              Filter by Supplier
            </label>
            <select
              id="supplier-filter"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">All suppliers</option>
              {allSuppliers.map(supplier => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ingredients Table */}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Allergies
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                          {ingredients.length === 0 
                            ? 'No ingredients found. Please upload Excel files first.' 
                            : 'No ingredients match your search criteria.'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((ingredient) => (
                        <tr key={ingredient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {ingredient.productCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ingredient.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ingredient.supplier || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ingredient.weight ? ingredient.weight.toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ingredient.unit || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            £{(typeof ingredient.price === 'number' ? ingredient.price : parseFloat(String(ingredient.price)) || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {ingredient.allergies.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {parseAllergies(ingredient.allergies)
                                  .filter(allergy => allergy.status === 'has' || allergy.status === 'may')
                                  .map((allergyInfo, index) => (
                                  <span
                                    key={`${ingredient.id}-${allergyInfo.name}-${index}`}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAllergyBadgeStyle(allergyInfo.status)}`}
                                  >
                                    {getStatusPrefix(allergyInfo.status)}{allergyInfo.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No allergy data</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        {ingredients.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Summary</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-indigo-600">
                  {ingredients.length}
                </div>
                <div className="text-sm text-gray-500">Total Ingredients</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-red-600">
                  {allAllergies.length}
                </div>
                <div className="text-sm text-gray-500">Different Allergies</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-2xl font-bold text-green-600">
                  {ingredients.filter(i => {
                    const allergies = parseAllergies(i.allergies);
                    // Only count as allergy-free if all allergies have "no" status
                    return allergies.length > 0 && allergies.every(a => a.status === 'no');
                  }).length}
                </div>
                <div className="text-sm text-gray-500">Allergy-Free Items</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
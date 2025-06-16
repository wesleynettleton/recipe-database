'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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
}

interface RecipeIngredient {
  id: number
  productCode: string
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

interface IngredientWithAllergies {
  productCode: string
  name: string
  supplier: string
  price: number
  weight: number
  unit: string
  allergies: string[]
}

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  // Form state
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [recipeName, setRecipeName] = useState('')
  const [recipeCode, setRecipeCode] = useState('')
  const [servings, setServings] = useState(4)
  const [instructions, setInstructions] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  
  // Ingredient handling state
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [searchResults, setSearchResults] = useState<IngredientWithAllergies[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<RecipeIngredient[]>([])
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  
  // UI/Status state
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Refs for managing search behavior
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const programmaticChangeRef = useRef(false)

  // Load recipe data
  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/recipes/${recipeId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch recipe')
        }
        const data = await response.json()
        if (!data.recipe) {
          throw new Error('Recipe data not found')
        }
        setRecipe(data.recipe)
        // Populate form fields
        setRecipeName(data.recipe.name)
        setRecipeCode(data.recipe.code || '')
        setServings(data.recipe.servings)
        setInstructions(data.recipe.instructions || '')
        setRecipeNotes(data.recipe.notes || '')
        setPhoto(data.recipe.photo || '')
        setPhotoPreview(data.recipe.photo || '')
        setSelectedIngredients(data.recipe.ingredients)
      } catch (error) {
        console.error('Error fetching recipe:', error)
        setError('Failed to load recipe')
      } finally {
        setIsLoading(false)
      }
    }

    if (recipeId) {
      fetchRecipe()
    }
  }, [recipeId])

  // Calculate costs
  const totalCost = selectedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
  const costPerServing = servings > 0 ? totalCost / servings : 0

  // Handle ingredient search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (ingredientSearch.trim() === '') {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(ingredientSearch)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSearchResults(data.ingredients)
            setShowDropdown(true)
          }
        }
      } catch (error) {
        console.error('Error searching ingredients:', error)
      }
    }, 300)
  }, [ingredientSearch])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setPhoto(data.photoUrl)
        setPhotoPreview(data.photoUrl)
      } else {
        throw new Error('Failed to upload photo')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = () => {
    setPhoto('')
    setPhotoPreview('')
  }

  const addIngredient = () => {
    if (!quantity || !unit || searchResults.length === 0) return

    const selectedIngredient = searchResults[0]
    const quantityNum = parseFloat(quantity)
    if (isNaN(quantityNum) || quantityNum <= 0) return

    const cost = (selectedIngredient.price / selectedIngredient.weight) * quantityNum

    const newIngredient: RecipeIngredient = {
      id: 0, // This will be set by the server
      productCode: selectedIngredient.productCode,
      originalProductCode: selectedIngredient.productCode,
      quantity: quantityNum,
      unit,
      notes: notes || undefined,
      cost,
      ingredientName: selectedIngredient.name,
      ingredientSupplier: selectedIngredient.supplier,
      ingredientPrice: selectedIngredient.price,
      ingredientWeight: selectedIngredient.weight,
      ingredientUnit: selectedIngredient.unit,
      ingredientAllergies: JSON.stringify(selectedIngredient.allergies),
      ingredient: selectedIngredient
    }

    setSelectedIngredients(prev => [...prev, newIngredient])
    setIngredientSearch('')
    setQuantity('')
    setUnit('')
    setNotes('')
    setShowDropdown(false)
  }

  const removeIngredient = (index: number) => {
    setSelectedIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const updateRecipe = async () => {
    if (!recipeName || selectedIngredients.length === 0) {
      setSaveMessage('Please enter a recipe name and add at least one ingredient.')
      return
    }

    setIsSaving(true)
    setSaveMessage('')

    const ingredientsForApi = selectedIngredients.map(ing => ({
      id: ing.id, // Include the existing ID for updates
      recipeId: parseInt(recipeId),
      productCode: ing.productCode,
      originalProductCode: ing.originalProductCode,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
    }))

    const payload = {
      recipeName,
      recipeCode,
      servings,
      instructions,
      recipeNotes,
      photo,
      selectedIngredients: ingredientsForApi,
      totalCost,
      costPerServing,
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        setSaveMessage('Recipe updated successfully! Redirecting...')
        setTimeout(() => {
          router.push(`/recipes/${recipeId}`)
        }, 1500)
      } else {
        setSaveMessage(result.error || 'Failed to update recipe.')
      }
    } catch (error) {
      console.error('Error updating recipe:', error)
      setSaveMessage('An error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderIngredientList = () => (
    <ul className="divide-y divide-gray-200 mb-4">
      {selectedIngredients.map((ing, index) => (
        <li key={index} className="py-2 flex justify-between items-start">
          <div>
            <p className="font-semibold text-gray-800">{ing.ingredientName}</p>
            <p className="text-sm text-gray-600">{ing.quantity} {ing.unit}</p>
            {ing.notes && <p className="text-xs text-gray-500 italic">"{ing.notes}"</p>}
            {ing.ingredient?.allergies && (
              <div className="flex flex-wrap gap-1 mt-1">
                {ing.ingredient.allergies.map((allergy: string, allergyIndex: number) => {
                  const [name, status] = allergy.split(':')
                  if (status === 'has') {
                    return (
                      <span
                        key={allergyIndex}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                      >
                        Contains {name}
                      </span>
                    )
                  } else if (status === 'may') {
                    return (
                      <span
                        key={allergyIndex}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                      >
                        May contain {name}
                      </span>
                    )
                  }
                  // Skip 'no'
                  return null
                })}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">£{ing.cost.toFixed(2)}</p>
            <button onClick={() => removeIngredient(index)} className="text-xs text-red-500 hover:underline">Remove</button>
          </div>
        </li>
      ))}
    </ul>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading recipe...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/recipes" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              &larr; Back to Recipes
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Recipe: {recipe?.name}
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Recipe Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Details Form */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recipe Details</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipeName" className="block text-sm font-medium text-gray-700">Recipe Name</label>
                  <input
                    type="text"
                    id="recipeName"
                    value={recipeName}
                    onChange={e => setRecipeName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="recipeCode" className="block text-sm font-medium text-gray-700">Recipe Code (Optional)</label>
                    <input
                      type="text"
                      id="recipeCode"
                      value={recipeCode}
                      onChange={e => setRecipeCode(e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="servings" className="block text-sm font-medium text-gray-700">Servings</label>
                    <input
                      type="number"
                      id="servings"
                      value={servings}
                      onChange={e => setServings(Number(e.target.value))}
                      min="1"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions (Optional)</label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    rows={6}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="recipeNotes" className="block text-sm font-medium text-gray-700">Internal Notes (Optional)</label>
                  <textarea
                    id="recipeNotes"
                    value={recipeNotes}
                    onChange={e => setRecipeNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Photo (Optional)</h2>
              <div className="flex items-center space-x-4">
                {photoPreview ? (
                  <div className="w-32 h-32 rounded-md overflow-hidden bg-gray-100">
                    <img src={photoPreview} alt="Recipe preview" className="w-full h-full object-cover"/>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                    No photo
                  </div>
                )}
                <div className="space-y-2">
                  <input type="file" id="photo-upload" accept="image/*" onChange={handlePhotoUpload} className="hidden"/>
                  <button
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {photo && (
                    <button
                      onClick={removePhoto}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ingredient Adder */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Ingredients</h2>
              <div className="relative">
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  placeholder="Search for an ingredient..."
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                />
                {showDropdown && searchResults.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto"
                  >
                    {searchResults.map((ingredient, index) => (
                      <div
                        key={ingredient.productCode}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setIngredientSearch(ingredient.name)
                          setShowDropdown(false)
                        }}
                      >
                        <div className="font-medium text-gray-900">{ingredient.name}</div>
                        <div className="text-sm text-gray-500">
                          {ingredient.supplier} - £{ingredient.price.toFixed(2)} per {ingredient.weight}{ingredient.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm text-black"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="(e.g., g, ml, pcs)"
                    className="w-full border-gray-300 rounded-md shadow-sm text-black"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="(e.g., finely chopped)"
                    className="w-full border-gray-300 rounded-md shadow-sm text-black"
                  />
                </div>
              </div>
              <button
                onClick={addIngredient}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                + Add Ingredient
              </button>
            </div>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              
              {/* Ingredients List */}
              <h3 className="text-md font-medium text-gray-800 mb-2">Ingredients ({selectedIngredients.length})</h3>
              {renderIngredientList()}

              {/* Cost Summary */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-bold text-gray-900">£{totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Cost per Serving</span>
                  <span className="font-medium text-gray-900">£{costPerServing.toFixed(2)}</span>
                </div>
              </div>

              {/* Save Button */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={updateRecipe}
                  disabled={isSaving || !recipeName || selectedIngredients.length === 0}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition duration-300"
                >
                  {isSaving ? 'Saving...' : 'Update Recipe'}
                </button>
                {saveMessage && (
                  <p className="text-center text-gray-600 mt-4">{saveMessage}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
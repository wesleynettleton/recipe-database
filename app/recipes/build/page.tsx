'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface IngredientWithAllergies {
  id: number
  productCode: string
  name: string
  supplier?: string
  weight?: number
  unit?: string
  price: number
  allergies: string[]
}

interface RecipeIngredient {
  originalProductCode: string
  productCode: string
  name: string
  quantity: number
  unit?: string
  notes?: string
  price: number
  cost: number
  allergies: any[]
  pricePerUnit: number
  baseWeight?: number
  baseUnit?: string
}

function BuildRecipePageComponent() {
  const router = useRouter()

  // Form state
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  
  // Refs for managing search behavior
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const programmaticChangeRef = useRef(false)

  // Search for ingredients as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (programmaticChangeRef.current) {
      programmaticChangeRef.current = false
      return
    }

    if (ingredientSearch.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ingredients/search?q=${encodeURIComponent(ingredientSearch)}&limit=10`)
        const data = await response.json()
        setSearchResults(data.ingredients || [])
        setShowDropdown(true)
      } catch (error) {
        console.error('Error searching ingredients:', error)
      }
    }, 300)

    return () => clearTimeout(searchTimeoutRef.current)
  }, [ingredientSearch])

  // Close ingredient search dropdown when clicking outside
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

    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/upload/image', { method: 'POST', body: formData })
      const result = await response.json()

      if (response.ok) {
        setPhoto(result.path)
      } else {
        setSaveMessage(result.error || 'Failed to upload photo')
        setPhotoPreview('')
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      setSaveMessage('Failed to upload photo. Please try again.')
      setPhotoPreview('')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = () => {
    setPhoto('')
    setPhotoPreview('')
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const selectIngredient = (ingredient: IngredientWithAllergies) => {
    setIngredientSearch(ingredient.name)
    setShowDropdown(false)
    programmaticChangeRef.current = true
  }

  const addIngredient = () => {
    const selected = searchResults.find(ing => ing.name === ingredientSearch)
    if (!selected || !quantity) return

    const qty = parseFloat(quantity)
    const pricePerUnit = (selected.weight && selected.weight > 0)
      ? selected.price / selected.weight
      : selected.price
    const cost = qty * pricePerUnit

    const newIngredient: RecipeIngredient = {
      originalProductCode: selected.productCode,
      productCode: selected.productCode,
      name: selected.name,
      quantity: qty,
      unit: unit || selected.unit,
      notes,
      price: selected.price,
      cost,
      allergies: parseAllergies(selected.allergies),
      pricePerUnit,
      baseWeight: selected.weight,
      baseUnit: selected.unit,
    }

    setSelectedIngredients([...selectedIngredients, newIngredient])
    
    // Clear form
    setIngredientSearch('')
    setQuantity('')
    setUnit('')
    setNotes('')
  }

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index))
  }

  const totalCost = selectedIngredients.reduce((sum, ing) => sum + ing.cost, 0)
  const costPerServing = servings > 0 ? totalCost / servings : 0

  // Create a simple, unique list of all confirmed allergens from the selected ingredients.
  const declaredAllergies = new Set<string>()
  selectedIngredients.forEach(ing => {
    const ingredientAllergies = parseAllergies(ing.allergies)
    ingredientAllergies.forEach(allergy => {
      // We only show confirmed allergens ('has') to keep the display clear.
      if (allergy.status === 'has' && allergy.name) {
        declaredAllergies.add(allergy.name)
      }
    })
  })

  const saveRecipe = async () => {
    if (!recipeName || selectedIngredients.length === 0) {
      setSaveMessage('Please enter a recipe name and add at least one ingredient.')
      return
    }

    setIsSaving(true)
    setSaveMessage('')

    const ingredientsForApi = selectedIngredients.map(ing => ({
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
      const url = '/api/recipes'
      const method = 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok) {
        setSaveMessage(`Recipe saved successfully! Redirecting...`)
        setTimeout(() => {
          router.push(`/recipes/${result.recipe.id}`)
        }, 1500)
      } else {
        setSaveMessage(result.error || `Failed to save recipe.`)
      }
    } catch (error) {
      console.error(`Error saving recipe:`, error)
      setSaveMessage('An error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const parseAllergies = (allergies: any): { name: string; status: 'has' | 'may' }[] => {
    if (!allergies) return []
    if (typeof allergies === 'string') {
      try {
        const parsed = JSON.parse(allergies)
        // If parsing succeeds, it's likely a JSON string of our objects, so re-run with the parsed version
        if (Array.isArray(parsed)) {
            return parseAllergies(parsed)
        }
      } catch {
        // If it fails to parse, treat it as a simple comma-separated string, e.g., "Gluten,Soya"
        return allergies.split(',').map(name => ({ name: name.trim(), status: 'has' }))
      }
    }
    if (Array.isArray(allergies)) {
      return allergies.map(a => {
        if (typeof a === 'string') {
          // Handles simple strings from the initial search result, e.g., ["Gluten", "Soya"]
          return { name: a, status: 'has' }
        }
        if (typeof a === 'object' && a.name && a.status) {
          // Handles the internal format, e.g., [{ name: 'Gluten', status: 'has' }]
          return a
        }
        return null
      }).filter(a => a && a.name) as { name: string; status: 'has' | 'may' }[]
    }
    return []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href={"/recipes"} className="text-sm font-medium text-gray-500 hover:text-gray-700">
              &larr; Back to Recipes
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Build a New Recipe
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
            {/* ... form fields ... */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recipe Details</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipeName" className="block text-sm font-medium text-gray-700">Recipe Name</label>
                  <input type="text" id="recipeName" value={recipeName} onChange={e => setRecipeName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="recipeCode" className="block text-sm font-medium text-gray-700">Recipe Code (Optional)</label>
                    <input type="text" id="recipeCode" value={recipeCode} onChange={e => setRecipeCode(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black" />
                  </div>
                  <div>
                    <label htmlFor="servings" className="block text-sm font-medium text-gray-700">Servings</label>
                    <input type="number" id="servings" value={servings} onChange={e => setServings(Number(e.target.value))} min="1" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black" />
                  </div>
                </div>
                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions (Optional)</label>
                  <textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} rows={6} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"></textarea>
                </div>
                <div>
                  <label htmlFor="recipeNotes" className="block text-sm font-medium text-gray-700">Internal Notes (Optional)</label>
                  <textarea id="recipeNotes" value={recipeNotes} onChange={e => setRecipeNotes(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"></textarea>
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
                  <button onClick={() => document.getElementById('photo-upload')?.click()} disabled={isUploadingPhoto} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50">
                    {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {photo && <button onClick={removePhoto} className="text-sm text-red-600 hover:underline">Remove Photo</button>}
                </div>
              </div>
            </div>

            {/* Ingredient Adder */}
            <div className="bg-white p-6 rounded-lg shadow" ref={dropdownRef}>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add Ingredient</h2>
              <div className="relative">
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  placeholder="Search for an ingredient..."
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                />
                {showDropdown && searchResults.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                    {searchResults.map(ing => (
                      <li key={ing.id} onClick={() => selectIngredient(ing)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black">
                        {ing.name} ({ing.productCode})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm text-black" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input type="text" value={unit} onChange={e => setUnit(e.target.value)} placeholder="(e.g., g, ml, pcs)" className="w-full border-gray-300 rounded-md shadow-sm text-black" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="(e.g., finely chopped)" className="w-full border-gray-300 rounded-md shadow-sm text-black" />
                </div>
              </div>
              <button onClick={addIngredient} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
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
              <ul className="divide-y divide-gray-200 mb-4">
                {selectedIngredients.map((ing, index) => (
                  <li key={index} className="py-2 flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{ing.name}</p>
                      <p className="text-sm text-gray-600">{ing.quantity} {ing.unit}</p>
                      {ing.notes && <p className="text-xs text-gray-500 italic">"{ing.notes}"</p>}
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-medium text-gray-900">£{ing.cost.toFixed(2)}</p>
                       <button onClick={() => removeIngredient(index)} className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>

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

              {/* Allergy Summary */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                 <h3 className="text-md font-medium text-gray-800 mb-2">Allergy Information</h3>
                 <div className="flex flex-wrap gap-2">
                   {declaredAllergies.size > 0 ? (
                     Array.from(declaredAllergies).map(name => (
                       <span key={name} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                         {name}
                       </span>
                     ))
                   ) : (
                     <p className="text-sm text-gray-500">No allergens declared.</p>
                   )}
                 </div>
              </div>

              {/* Save Button */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={saveRecipe}
                  disabled={isSaving || !recipeName || selectedIngredients.length === 0}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition duration-300"
                >
                  {isSaving ? 'Saving...' : 'Save Recipe'}
                </button>
                {saveMessage && <p className="text-center text-gray-600 mt-4">{saveMessage}</p>}
              </div>

              {/* Recipe Summary */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Recipe Summary</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-semibold">£{totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Servings:</span>
                    <span className="font-semibold">{servings}</span>
                  </div>
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <span className="font-bold">Cost per Serving:</span>
                    <span className="font-bold">£{costPerServing.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BuildRecipePage() {
    return (
        <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
            <BuildRecipePageComponent />
        </Suspense>
    )
} 
'use client'

import React, { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Recipe {
  id: number
  name: string
  code: string
}

interface DayMenu {
  lunchOption1: Recipe | null
  lunchOption2: Recipe | null
  lunchOption3: Recipe | null
  servedWith123: Recipe | null
  dessertOptionD: Recipe | null
}

interface DailyOptions {
  option1: Recipe | null
  option2: Recipe | null
  option3: Recipe | null
  option4: Recipe | null
}

interface WeeklyMenu {
  monday: DayMenu
  tuesday: DayMenu
  wednesday: DayMenu
  thursday: DayMenu
  friday: DayMenu
  dailyOptions: DailyOptions
}

const initialDayMenu: DayMenu = {
  lunchOption1: null,
  lunchOption2: null,
  lunchOption3: null,
  servedWith123: null,
  dessertOptionD: null,
}

const initialWeeklyMenu: WeeklyMenu = {
  monday: { ...initialDayMenu },
  tuesday: { ...initialDayMenu },
  wednesday: { ...initialDayMenu },
  thursday: { ...initialDayMenu },
  friday: { ...initialDayMenu },
  dailyOptions: {
    option1: null,
    option2: null,
    option3: null,
    option4: null,
  },
}

function AutocompleteRecipeSelector({ 
  value, 
  onChange, 
  placeholder,
  label 
}: { 
  value: Recipe | null
  onChange: (recipe: Recipe | null) => void
  placeholder: string
  label: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Recipe[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setSearchTerm(value?.name || '')
  }, [value])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchTerm.trim().length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    if (value && value.name === searchTerm) {
        setShowDropdown(false);
        return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recipes?q=${encodeURIComponent(searchTerm)}`)
        const data = await response.json()
        if (data.success) {
          const results = data.recipes || []
          setSearchResults(results)
          setShowDropdown(results.length > 0)
        } else {
          setSearchResults([])
          setShowDropdown(false)
        }
      } catch (error) {
        console.error('Error searching recipes:', error)
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectRecipe = (recipe: Recipe) => {
    setSearchTerm(recipe.name)
    setShowDropdown(false)
    onChange(recipe)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)
    if (term === '') {
      onChange(null)
    }
  }

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-700 w-32 text-right">{label}:</label>
      <div className="relative flex-1" ref={dropdownRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map(recipe => (
              <div key={recipe.id} onClick={() => handleSelectRecipe(recipe)} className="px-3 py-2 cursor-pointer hover:bg-gray-100">
                <div className="font-medium text-gray-900">{recipe.name}</div>
                <div className="text-sm text-gray-500">{recipe.code}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BuildMenuPageComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [menuName, setMenuName] = useState('')
  const [menuDate, setMenuDate] = useState('')
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu>(initialWeeklyMenu)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
  const dailyOptionKeys = ['option1', 'option2', 'option3', 'option4'] as const

  const loadMenuForDate = async (date: string) => {
    setIsLoading(true)
    setError(null)
    try {
      console.log('[Menu Builder] Fetching menu for date:', date)
      const response = await fetch(`/api/menus?date=${date}`)
      if (response.ok) {
        const data = await response.json()
        console.log('[Menu Builder] API response:', data)
        if (data.success && data.menu) {
          setMenuName(data.menu.name || '')
          setWeeklyMenu(data.menu.weeklyMenu || initialWeeklyMenu)
          console.log('[Menu Builder] Loaded menu:', data.menu)
        } else {
          setMenuName('')
          setWeeklyMenu(initialWeeklyMenu)
          console.log('[Menu Builder] No menu found, resetting form')
        }
      } else {
        setError('Failed to load menu for the selected date.')
        setMenuName('')
        setWeeklyMenu(initialWeeklyMenu)
        console.log('[Menu Builder] API response not ok')
      }
    } catch (err) {
      setError('An error occurred while loading menu data.')
      setMenuName('')
      setWeeklyMenu(initialWeeklyMenu)
      console.error('[Menu Builder] Error loading menu:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      setMenuDate(dateParam);
      loadMenuForDate(dateParam);
    } else {
      setMenuName('');
      setWeeklyMenu(initialWeeklyMenu);
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      setMenuDate(monday.toISOString().split('T')[0]);
      setIsLoading(false);
    }
  }, [searchParams]);

  const handleDateChange = (newDate: string) => {
    router.push(`/menus/build?date=${newDate}`);
  }

  const handleSaveMenu = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: menuName, date: menuDate, weeklyMenu }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Menu saved successfully!`)
        router.push('/menus')
      } else {
        setError(result.details || 'Failed to save menu.')
      }
    } catch (err) {
      setError('An unexpected error occurred during save.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateDayMenu = (day: keyof Omit<WeeklyMenu, 'dailyOptions'>, field: keyof DayMenu, recipe: Recipe | null) => {
    setWeeklyMenu(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: recipe },
    }))
  }

  const updateDailyOption = (option: keyof DailyOptions, recipe: Recipe | null) => {
    setWeeklyMenu(prev => ({
      ...prev,
      dailyOptions: { ...prev.dailyOptions, [option]: recipe },
    }))
  }

  if (isLoading) return <div className="text-center p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
             <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Build / Edit Menu</h1>
            <div/>
          </div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 mb-1">Menu Name</label>
              <input
                id="menu-name"
                type="text"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="e.g., Summer Week 1"
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-black"
              />
            </div>
            <div>
              <label htmlFor="menu-date" className="block text-sm font-medium text-gray-700 mb-1">Menu Start Date (Monday)</label>
              <input
                id="menu-date"
                type="date"
                value={menuDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-black"
              />
            </div>
          </div>
        </div>

        {days.map(day => (
          <div key={day} className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 capitalize mb-4">{day.replace(/([A-Z])/g, ' $1')}</h2>
            <div className="space-y-4">
              <AutocompleteRecipeSelector label="Lunch Option 1" value={weeklyMenu[day].lunchOption1} onChange={(r) => updateDayMenu(day, 'lunchOption1', r)} placeholder="Search for a recipe..." />
              <AutocompleteRecipeSelector label="Lunch Option 2" value={weeklyMenu[day].lunchOption2} onChange={(r) => updateDayMenu(day, 'lunchOption2', r)} placeholder="Search for a recipe..." />
              <AutocompleteRecipeSelector label="Lunch Option 3" value={weeklyMenu[day].lunchOption3} onChange={(r) => updateDayMenu(day, 'lunchOption3', r)} placeholder="Search for a recipe..." />
              <AutocompleteRecipeSelector label="Served With" value={weeklyMenu[day].servedWith123} onChange={(r) => updateDayMenu(day, 'servedWith123', r)} placeholder="Search for a recipe..." />
              <AutocompleteRecipeSelector label="Dessert" value={weeklyMenu[day].dessertOptionD} onChange={(r) => updateDayMenu(day, 'dessertOptionD', r)} placeholder="Search for a recipe..." />
            </div>
          </div>
        ))}
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 capitalize mb-4">Daily Options</h2>
          <div className="space-y-4">
            {dailyOptionKeys.map((key, index) => (
              <AutocompleteRecipeSelector 
                key={key}
                label={`Daily Option ${index + 1}`} 
                value={weeklyMenu.dailyOptions[key]} 
                onChange={(r) => updateDailyOption(key, r)} 
                placeholder="Search for a recipe..." 
              />
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end items-center space-x-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <button
            onClick={handleSaveMenu}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isSaving ? 'Saving...' : 'Save Menu'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BuildMenuPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuildMenuPageComponent />
    </Suspense>
  )
} 
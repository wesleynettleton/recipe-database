'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

type RecipeRef = {
  id: number
  name: string
  code?: string | null
}

type SlotRef = {
  lunchOption1: RecipeRef | null
  lunchOption2: RecipeRef | null
  lunchOption3: RecipeRef | null
  servedWith123: RecipeRef | null
  dessertOptionD: RecipeRef | null
}

type WeeklyMenuRef = {
  monday: SlotRef
  tuesday: SlotRef
  wednesday: SlotRef
  thursday: SlotRef
  friday: SlotRef
}

type SlotIds = {
  lunchOption1: number | null
  lunchOption2: number | null
  lunchOption3: number | null
  servedWith123: number | null
  dessertOptionD: number | null
}

type WeeklyMenuIds = {
  monday: SlotIds
  tuesday: SlotIds
  wednesday: SlotIds
  thursday: SlotIds
  friday: SlotIds
}

const emptySlotRef: SlotRef = {
  lunchOption1: null,
  lunchOption2: null,
  lunchOption3: null,
  servedWith123: null,
  dessertOptionD: null,
}

const emptyWeekRef: WeeklyMenuRef = {
  monday: { ...emptySlotRef },
  tuesday: { ...emptySlotRef },
  wednesday: { ...emptySlotRef },
  thursday: { ...emptySlotRef },
  friday: { ...emptySlotRef },
}

function toWeekIds(week: WeeklyMenuRef): WeeklyMenuIds {
  const convertSlot = (s: SlotRef): SlotIds => ({
    lunchOption1: s.lunchOption1?.id ?? null,
    lunchOption2: s.lunchOption2?.id ?? null,
    lunchOption3: s.lunchOption3?.id ?? null,
    servedWith123: s.servedWith123?.id ?? null,
    dessertOptionD: s.dessertOptionD?.id ?? null,
  })

  return {
    monday: convertSlot(week.monday),
    tuesday: convertSlot(week.tuesday),
    wednesday: convertSlot(week.wednesday),
    thursday: convertSlot(week.thursday),
    friday: convertSlot(week.friday),
  }
}

function AutocompleteRecipeSelector({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: RecipeRef | null
  onChange: (recipe: RecipeRef | null) => void
  placeholder: string
  label: string
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<RecipeRef[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSearchTerm(value?.name ?? '')
  }, [value])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    const term = searchTerm.trim()
    if (term.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recipes?q=${encodeURIComponent(term)}`)
        const data = await response.json()
        if (data.success) {
          setSearchResults(data.recipes || [])
          setShowDropdown((data.recipes || []).length > 0)
        } else {
          setSearchResults([])
          setShowDropdown(false)
        }
      } catch {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (r: RecipeRef) => {
    setSearchTerm(r.name)
    setShowDropdown(false)
    onChange(r)
  }

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-700 w-28 text-right">{label}:</label>
      <div className="relative flex-1" ref={dropdownRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            const next = e.target.value
            setSearchTerm(next)
            if (next === '') onChange(null)
          }}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((r) => (
              <div
                key={r.id}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelect(r)}
              >
                <div className="font-medium text-gray-900">{r.name}</div>
                {r.code && <div className="text-sm text-gray-500">{r.code}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DaySelector({
  dayKey,
  value,
  onChange,
}: {
  dayKey: string
  value: SlotRef
  onChange: (next: SlotRef) => void
}) {
  const updateSlotField = (field: keyof SlotRef, nextValue: RecipeRef | null) => {
    onChange({ ...value, [field]: nextValue })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-3">{dayKey.toUpperCase()}</h3>
      <div className="space-y-3">
        <AutocompleteRecipeSelector
          value={value.lunchOption1}
          onChange={(r) => updateSlotField('lunchOption1', r)}
          label="Lunch 1"
          placeholder="Pick recipe"
        />
        <AutocompleteRecipeSelector
          value={value.lunchOption2}
          onChange={(r) => updateSlotField('lunchOption2', r)}
          label="Lunch 2"
          placeholder="Pick recipe"
        />
        <AutocompleteRecipeSelector
          value={value.lunchOption3}
          onChange={(r) => updateSlotField('lunchOption3', r)}
          label="Lunch 3"
          placeholder="Pick recipe"
        />
        <AutocompleteRecipeSelector
          value={value.servedWith123}
          onChange={(r) => updateSlotField('servedWith123', r)}
          label="Served w/123"
          placeholder="Pick recipe"
        />
        <AutocompleteRecipeSelector
          value={value.dessertOptionD}
          onChange={(r) => updateSlotField('dessertOptionD', r)}
          label="Dessert"
          placeholder="Pick recipe"
        />
      </div>
    </div>
  )
}

export default function MenuComplianceTesterPage() {
  const [schoolPhase, setSchoolPhase] = useState<'primary' | 'secondary'>('primary')
  const [vegetarianMode, setVegetarianMode] = useState(false)
  const [cycleMode, setCycleMode] = useState<'single' | 'threeWeek'>('single')

  const [week1, setWeek1] = useState<WeeklyMenuRef>(emptyWeekRef)
  const [week2, setWeek2] = useState<WeeklyMenuRef>(emptyWeekRef)
  const [week3, setWeek3] = useState<WeeklyMenuRef>(emptyWeekRef)

  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<any>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const effectiveWeek1Ids = useMemo(() => toWeekIds(week1), [week1])
  const effectiveWeek2Ids = useMemo(() => toWeekIds(week2), [week2])
  const effectiveWeek3Ids = useMemo(() => toWeekIds(week3), [week3])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsChecking(true)
      setCheckError(null)
      try {
        const payload: any = {
          week: effectiveWeek1Ids,
          settings: {
            schoolPhase,
            vegetarianMode,
            cycleMode,
          },
        }

        if (cycleMode === 'threeWeek') {
          payload.threeWeek = {
            week1: effectiveWeek1Ids,
            week2: effectiveWeek2Ids,
            week3: effectiveWeek3Ids,
          }
        }

        const response = await fetch('/api/menu-compliance/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Compliance check failed')
        }
        setCheckResult(data)
      } catch (e) {
        setCheckError(e instanceof Error ? e.message : 'Compliance check failed')
        setCheckResult(null)
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [effectiveWeek1Ids, effectiveWeek2Ids, effectiveWeek3Ids, schoolPhase, vegetarianMode, cycleMode])

  const status = checkResult?.status as 'pass' | 'fail' | 'manual' | undefined

  const statusClass =
    status === 'pass'
      ? 'bg-green-50 text-green-800 border-green-200'
      : status === 'fail'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-yellow-50 text-yellow-800 border-yellow-200'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <a href="/" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
                <span className="mr-2">&larr;</span> Back to Dashboard
              </a>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Compliance Tester</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">School phase</label>
                  <select
                    value={schoolPhase}
                    onChange={(e) => setSchoolPhase(e.target.value as any)}
                    className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cycle mode</label>
                  <select
                    value={cycleMode}
                    onChange={(e) => setCycleMode(e.target.value as any)}
                    className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-black"
                  >
                    <option value="single">Single week</option>
                    <option value="threeWeek">Strict 3-week cycle (oily fish)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input type="checkbox" checked={vegetarianMode} onChange={(e) => setVegetarianMode(e.target.checked)} />
                    <span>Vegetarian mode</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Week 1</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <DaySelector dayKey="monday" value={week1.monday} onChange={(next) => setWeek1((p) => ({ ...p, monday: next }))} />
                <DaySelector dayKey="tuesday" value={week1.tuesday} onChange={(next) => setWeek1((p) => ({ ...p, tuesday: next }))} />
                <DaySelector dayKey="wednesday" value={week1.wednesday} onChange={(next) => setWeek1((p) => ({ ...p, wednesday: next }))} />
                <DaySelector dayKey="thursday" value={week1.thursday} onChange={(next) => setWeek1((p) => ({ ...p, thursday: next }))} />
                <DaySelector dayKey="friday" value={week1.friday} onChange={(next) => setWeek1((p) => ({ ...p, friday: next }))} />
              </div>
            </div>

            {cycleMode === 'threeWeek' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 mt-2">Week 2</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <DaySelector dayKey="monday" value={week2.monday} onChange={(next) => setWeek2((p) => ({ ...p, monday: next }))} />
                  <DaySelector dayKey="tuesday" value={week2.tuesday} onChange={(next) => setWeek2((p) => ({ ...p, tuesday: next }))} />
                  <DaySelector dayKey="wednesday" value={week2.wednesday} onChange={(next) => setWeek2((p) => ({ ...p, wednesday: next }))} />
                  <DaySelector dayKey="thursday" value={week2.thursday} onChange={(next) => setWeek2((p) => ({ ...p, thursday: next }))} />
                  <DaySelector dayKey="friday" value={week2.friday} onChange={(next) => setWeek2((p) => ({ ...p, friday: next }))} />
                </div>

                <h2 className="text-lg font-medium text-gray-900 mt-2">Week 3</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <DaySelector dayKey="monday" value={week3.monday} onChange={(next) => setWeek3((p) => ({ ...p, monday: next }))} />
                  <DaySelector dayKey="tuesday" value={week3.tuesday} onChange={(next) => setWeek3((p) => ({ ...p, tuesday: next }))} />
                  <DaySelector dayKey="wednesday" value={week3.wednesday} onChange={(next) => setWeek3((p) => ({ ...p, wednesday: next }))} />
                  <DaySelector dayKey="thursday" value={week3.thursday} onChange={(next) => setWeek3((p) => ({ ...p, thursday: next }))} />
                  <DaySelector dayKey="friday" value={week3.friday} onChange={(next) => setWeek3((p) => ({ ...p, friday: next }))} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Compliance Result</h2>

              <div className={`border rounded-md p-4 ${statusClass}`}>
                {isChecking ? (
                  <p>Checking...</p>
                ) : status ? (
                  <p className="font-bold">
                    {status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'MANUAL REVIEW'}
                  </p>
                ) : (
                  <p>Pick recipes to see results.</p>
                )}
                {checkError && <p className="mt-2 text-sm">{checkError}</p>}
              </div>

              {checkResult?.ruleResults?.length > 0 && (
                <div className="mt-4 space-y-3">
                  {checkResult.ruleResults
                    .filter((r: any) => r.status === 'fail' || r.status === 'manual')
                    .map((r: any) => (
                      <div key={r.ruleId} className="border rounded-md p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900">{r.title}</div>
                          <div className="text-xs font-bold">
                            {r.status === 'fail' ? 'FAIL' : r.status === 'manual' ? 'MANUAL' : 'PASS'}
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 mt-1">{r.message}</div>
                      </div>
                    ))}

                  {checkResult.ruleResults.filter((r: any) => r.status === 'fail' || r.status === 'manual').length === 0 && (
                    <p className="text-sm text-gray-600">All enforced rules passed.</p>
                  )}
                </div>
              )}
            </div>

            {checkResult?.counts && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Debug counts</h2>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(checkResult.counts, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


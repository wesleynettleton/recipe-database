'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'



export default function HomePage() {
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [menusCount, setMenusCount] = useState(0);
  const [allergyTypesCount, setAllergyTypesCount] = useState(0);


  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [
          ingredientsRes,
          recipesRes,
          menusRes,
          allergiesRes
        ] = await Promise.all([
          fetch('/api/ingredients/count'),
          fetch('/api/recipes/count'),
          fetch('/api/menus/count'),
          fetch('/api/allergies/count')
        ]);

        const ingredientsData = await ingredientsRes.json();
        const recipesData = await recipesRes.json();
        const menusData = await menusRes.json();
        const allergiesData = await allergiesRes.json();

        setIngredientsCount(ingredientsData.count);
        setRecipesCount(recipesData.count);
        setMenusCount(menusData.count);
        setAllergyTypesCount(allergiesData.count);
      } catch (error) {
        console.error("Failed to fetch counts", error);
      }
    };

    fetchCounts();
  }, []);

  const navigationCards = [
    {
      title: 'Upload Data',
      description: 'Upload Excel files containing ingredient prices and allergy information',
      href: '/upload',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'View Ingredients',
      description: 'Browse and search through your ingredient database with pricing and allergy information',
      href: '/ingredients',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Build Recipe',
      description: 'Create new recipes using ingredients from your database',
      href: '/recipes/build',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'View Recipes',
      description: 'Browse and manage your collection of recipes',
      href: '/recipes',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Build Menu',
      description: 'Create menus by combining multiple recipes',
      href: '/menus/build',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'View Menus',
      description: 'Browse and manage your collection of menus',
      href: '/menus',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      title: 'Costing',
      description: 'View menu costs and per-portion pricing for budgeting and planning',
      href: '/costing',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'from-emerald-500 to-emerald-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Recipe Database
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Manage your ingredients, create recipes, and build menus all in one place. 
              Upload Excel files, track allergies, and organize your culinary workflow.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {navigationCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="relative p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${card.color} rounded-lg text-white mb-4`}>
                  {card.icon}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-gray-700">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-500 group-hover:text-gray-600">
                  {card.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-500">
                  <span>Get started</span>
                  <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Your Recipe Database
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Everything you need to manage ingredients, recipes, and menus
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{ingredientsCount}</div>
              <div className="mt-2 text-sm font-medium text-gray-900">Ingredients</div>
              <div className="text-xs text-gray-500">Upload from Excel</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{recipesCount}</div>
              <div className="mt-2 text-sm font-medium text-gray-900">Recipes</div>
              <div className="text-xs text-gray-500">Build & manage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{menusCount}</div>
              <div className="mt-2 text-sm font-medium text-gray-900">Menus</div>
              <div className="text-xs text-gray-500">Create & organize</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{allergyTypesCount}</div>
              <div className="mt-2 text-sm font-medium text-gray-900">Allergy Types</div>
              <div className="text-xs text-gray-500">Comprehensive tracking</div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
} 
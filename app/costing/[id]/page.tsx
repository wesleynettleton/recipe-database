'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface RecipeWithCosts {
  id: number;
  name: string;
  code: string;
  servings: number;
  instructions: string;
  notes: string;
  photo: string | null;
  costPerServing: number;
}

interface MenuDay {
  lunchOption1: RecipeWithCosts | null;
  lunchOption2: RecipeWithCosts | null;
  lunchOption3: RecipeWithCosts | null;
  servedWith123: RecipeWithCosts | null;
  dessertOptionD: RecipeWithCosts | null;
}

interface DailyOptions {
  option1: RecipeWithCosts | null;
  option2: RecipeWithCosts | null;
  option3: RecipeWithCosts | null;
  option4: RecipeWithCosts | null;
}

interface MenuWithCosts {
  id: number;
  name: string;
  weekStartDate: string;
  monday: MenuDay;
  tuesday: MenuDay;
  wednesday: MenuDay;
  thursday: MenuDay;
  friday: MenuDay;
  dailyOptions: DailyOptions;
  createdAt: string;
  updatedAt: string;
}

export default function MenuCostingDetailPage({ params }: { params: { id: string } }) {
  const [menu, setMenu] = useState<MenuWithCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMenuData();
  }, [params.id]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/menus/costing/${params.id}`);
      const data = await response.json();
      
      if (data.success) {
        setMenu(data.menu);
      } else {
        setError(data.error || 'Failed to fetch menu data');
      }
    } catch (error) {
      setError('Failed to fetch menu data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const renderRecipeWithCost = (recipe: RecipeWithCosts | null, title: string) => {
    if (!recipe) return null;
    
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
            <h5 className="text-lg font-medium text-gray-800 mb-2">{recipe.name}</h5>
            {recipe.code && (
              <p className="text-sm text-gray-500 mb-2">Code: {recipe.code}</p>
            )}
            <p className="text-sm text-gray-600 mb-2">Servings: {recipe.servings}</p>
            {recipe.instructions && (
              <p className="text-sm text-gray-600 mb-2">{recipe.instructions}</p>
            )}
            {recipe.notes && (
              <p className="text-sm text-gray-500 italic">{recipe.notes}</p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-emerald-600 mb-1">
              {formatCurrency(recipe.costPerServing)}
            </div>
            <div className="text-sm text-gray-500">per serving</div>
            <div className="text-lg font-semibold text-gray-700 mt-2">
              {formatCurrency(recipe.costPerServing * recipe.servings)}
            </div>
            <div className="text-xs text-gray-500">total cost</div>
          </div>
        </div>
      </div>
    );
  };

  const renderDay = (dayData: MenuDay, dayName: string) => {
    if (!dayData) return null;

    const dayCost = [
      dayData.lunchOption1?.costPerServing || 0,
      dayData.lunchOption2?.costPerServing || 0,
      dayData.lunchOption3?.costPerServing || 0,
      dayData.servedWith123?.costPerServing || 0,
      dayData.dessertOptionD?.costPerServing || 0
    ].reduce((sum, cost) => sum + cost, 0);

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{dayName}</h3>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-600">
              {formatCurrency(dayCost)}
            </div>
            <div className="text-sm text-gray-500">total per person</div>
          </div>
        </div>

        {renderRecipeWithCost(dayData.lunchOption1, 'Lunch Option 1')}
        {renderRecipeWithCost(dayData.lunchOption2, 'Lunch Option 2')}
        {renderRecipeWithCost(dayData.lunchOption3, 'Lunch Option 3')}
        {renderRecipeWithCost(dayData.servedWith123, 'Served With')}
        {renderRecipeWithCost(dayData.dessertOptionD, 'Dessert')}
      </div>
    );
  };

  const renderDailyOptions = (dailyOptions: DailyOptions) => {
    if (!dailyOptions) return null;

    const optionsCost = [
      dailyOptions.option1?.costPerServing || 0,
      dailyOptions.option2?.costPerServing || 0,
      dailyOptions.option3?.costPerServing || 0,
      dailyOptions.option4?.costPerServing || 0
    ].reduce((sum, cost) => sum + cost, 0);

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Daily Options</h3>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-600">
              {formatCurrency(optionsCost)}
            </div>
            <div className="text-sm text-gray-500">total per person</div>
          </div>
        </div>

        {renderRecipeWithCost(dailyOptions.option1, 'Option 1')}
        {renderRecipeWithCost(dailyOptions.option2, 'Option 2')}
        {renderRecipeWithCost(dailyOptions.option3, 'Option 3')}
        {renderRecipeWithCost(dailyOptions.option4, 'Option 4')}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading menu data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Menu not found</div>
      </div>
    );
  }

  // Calculate total weekly cost
  const totalWeeklyCost = [
    menu.monday, menu.tuesday, menu.wednesday, menu.thursday, menu.friday
  ].reduce((total, day) => {
    if (!day) return total;
    return total + [
      day.lunchOption1?.costPerServing || 0,
      day.lunchOption2?.costPerServing || 0,
      day.lunchOption3?.costPerServing || 0,
      day.servedWith123?.costPerServing || 0,
      day.dessertOptionD?.costPerServing || 0
    ].reduce((sum, cost) => sum + cost, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/costing"
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 7h18" />
                </svg>
                Back to Costing
              </Link>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{menu.name}</h1>
              <p className="text-sm text-gray-500">Week of {new Date(menu.weekStartDate).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalWeeklyCost)}
              </div>
              <div className="text-sm text-gray-500">total per person</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderDay(menu.monday, 'Monday')}
        {renderDay(menu.tuesday, 'Tuesday')}
        {renderDay(menu.wednesday, 'Wednesday')}
        {renderDay(menu.thursday, 'Thursday')}
        {renderDay(menu.friday, 'Friday')}
        {renderDailyOptions(menu.dailyOptions)}
      </div>
    </div>
  );
}

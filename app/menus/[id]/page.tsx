'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Recipe {
  id: number;
  name: string;
  code: string;
}

interface DailyMenu {
  lunchOption1: Recipe | null;
  lunchOption2: Recipe | null;
  lunchOption3: Recipe | null;
  servedWith123: Recipe | null;
  dessertOptionD: Recipe | null;
}

interface MenuData {
  id: number;
  name: string;
  weekStartDate: string;
  monday: DailyMenu | null;
  tuesday: DailyMenu | null;
  wednesday: DailyMenu | null;
  thursday: DailyMenu | null;
  friday: DailyMenu | null;
  dailyOptions: { [key: string]: Recipe | null };
}

const DayCard = ({ day, menu }: { day: string; menu: DailyMenu | null }) => {
  if (!menu) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-gray-800 capitalize">{day}</h3>
        <p className="text-gray-500 mt-2">No menu set for this day.</p>
      </div>
    );
  }

  const renderRecipe = (recipe: Recipe | null, label: string) => {
    if (!recipe) return null;
    return (
      <div>
        <span className="font-semibold">{label}:</span>
        <Link href={`/recipes/${recipe.id}`} className="ml-2 text-blue-600 hover:underline">
          {recipe.name} ({recipe.code})
        </Link>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-800 capitalize">{day}</h3>
      <div className="mt-4 space-y-2 text-gray-700">
        {renderRecipe(menu.lunchOption1, 'Lunch 1')}
        {renderRecipe(menu.lunchOption2, 'Lunch 2')}
        {renderRecipe(menu.lunchOption3, 'Lunch 3')}
        {renderRecipe(menu.servedWith123, 'Served With')}
        {renderRecipe(menu.dessertOptionD, 'Dessert')}
      </div>
    </div>
  );
};

export default function MenuDetailPage() {
  const params = useParams();
  const menuId = params.id as string;
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuId) return;

    const fetchMenu = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/menus/${menuId}`);
        const data = await response.json();
        if (data.success) {
          setMenu(data.menu);
        } else {
          setError(data.error || 'Failed to load menu.');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [menuId]);

  if (isLoading) {
    return <div className="text-center py-12">Loading menu details...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (!menu) {
    return <div className="text-center py-12">Menu not found.</div>;
  }
  
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/menus" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              &larr; Back to Menus
            </Link>
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">{menu.name}</h1>
                <p className="text-lg text-gray-600">Week of {formatDisplayDate(menu.weekStartDate)}</p>
            </div>
            <Link href={`/menus/build?date=${menu.weekStartDate}`} className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md">
              Edit Menu
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map(day => (
            <DayCard key={day} day={day} menu={menu[day as keyof MenuData] as DailyMenu | null} />
          ))}
        </div>

        {menu.dailyOptions && Object.values(menu.dailyOptions).some(r => r) && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-800">Daily Options</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
              {Object.values(menu.dailyOptions).map((recipe, index) => (
                recipe ? (
                  <Link key={recipe.id || index} href={`/recipes/${recipe.id}`} className="text-blue-600 hover:underline">
                    {recipe.name} ({recipe.code})
                  </Link>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
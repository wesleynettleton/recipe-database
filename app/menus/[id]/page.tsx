'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Allergy {
  name: string;
  status: 'has' | 'may';
}

interface RecipeIngredient {
  ingredientAllergies: string;
}

interface Recipe {
  id: number;
  name: string;
  code: string;
  ingredients: RecipeIngredient[];
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

const AllergySummaryCard = ({ menu }: { menu: MenuData }) => {
  const uniqueAllergies = new Map<string, 'has' | 'may'>();

  const processRecipe = (recipe: Recipe | null) => {
    if (!recipe || !recipe.ingredients) return;

    recipe.ingredients.forEach(ingredient => {
      try {
        const allergies: (string | { allergy: string, status: 'has' | 'may' })[] = 
          typeof ingredient.ingredientAllergies === 'string' 
            ? JSON.parse(ingredient.ingredientAllergies) 
            : ingredient.ingredientAllergies;

        if (Array.isArray(allergies)) {
          allergies.forEach(a => {
            let name = '';
            let status: 'has' | 'may' = 'has';

            if (typeof a === 'string') {
              const parts = a.split(':');
              name = parts[0]?.trim();
              status = (parts[1]?.trim() as 'has' | 'may') || 'has';
            } else if (typeof a === 'object' && a.allergy) {
              name = a.allergy;
              status = a.status || 'has';
            }

            if (name) {
              const existingStatus = uniqueAllergies.get(name);
              if (!existingStatus || (existingStatus === 'may' && status === 'has')) {
                uniqueAllergies.set(name, status);
              }
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse allergies from ingredient:', ingredient, e);
      }
    });
  };

  processRecipes(menu, processRecipe);

  if (uniqueAllergies.size === 0) {
    return null; // Don't render the card if there are no allergies
  }

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Weekly Allergy Summary</h3>
      <div className="flex flex-wrap gap-2">
        {Array.from(uniqueAllergies.entries()).map(([name, status]) => (
          <span
            key={name}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status === 'has'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {status === 'has' ? 'Contains ' : 'May contain '} {name}
          </span>
        ))}
      </div>
    </div>
  );
};

const processRecipes = (menu: MenuData, processRecipe: (recipe: Recipe) => void) => {
  if (!menu) return;

  Object.values(menu).forEach(day => {
    if (day && typeof day === 'object' && 'lunchOption1' in day) {
      const dailyMenu = day as DailyMenu;
      Object.values(dailyMenu).forEach(recipe => {
        if (recipe) processRecipe(recipe);
      });
    }
  });

  if (menu.dailyOptions) {
    Object.values(menu.dailyOptions).forEach(recipe => {
        if (recipe) processRecipe(recipe);
    });
  }
};

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (menuId) {
      fetch(`/api/menus/${menuId}`)
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || 'Menu not found') });
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setMenu(data.menu);
          } else {
            throw new Error(data.error || 'Failed to load menu');
          }
        })
        .catch(err => {
          setError(err.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [menuId]);

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
        const response = await fetch(`/api/menus/${menuId}/export-pdf`);
        if (!response.ok) {
            throw new Error('Failed to export PDF');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `menu_${menuId}.pdf`; // fallback filename
        if (contentDisposition) {
            const filenamePart = contentDisposition.split('filename=')[1];
            if (filenamePart) {
                filename = filenamePart.replace(/"/g, '');
            }
        }
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        console.error('Export PDF error:', error);
        setError((error as Error).message);
    } finally {
        setIsExportingPdf(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading menu...</p></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen"><p className="text-red-500">Error: {error}</p></div>;
  }

  if (!menu) {
    return <div className="flex justify-center items-center h-screen"><p>Menu not found.</p></div>;
  }

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            <div>
              <button
                  onClick={handleExportPdf}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={isExportingPdf}
              >
                  {isExportingPdf ? 'Exporting...' : 'Export to PDF'}
              </button>
              <Link href={`/menus/build?date=${menu.weekStartDate}`} className="ml-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md">
                Edit Menu
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {days.map(day => (
            <DayCard key={day} day={day} menu={menu[day as keyof MenuData] as DailyMenu | null} />
          ))}
        </div>

        {menu.dailyOptions && Object.keys(menu.dailyOptions).length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-800">Daily Options</h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
              {Object.entries(menu.dailyOptions).map(([key, recipe]) =>
                recipe ? (
                  <div key={key}>
                    <span className="font-semibold">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                    <Link href={`/recipes/${recipe.id}`} className="ml-2 text-blue-600 hover:underline">
                      {recipe.name} ({recipe.code})
                    </Link>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
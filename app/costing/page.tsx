'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface MenuCosting {
  id: number;
  name: string;
  weekStartDate: string;
}

export default function CostingPage() {
  const [menus, setMenus] = useState<MenuCosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCostingData();
  }, []);

  const fetchCostingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/menus/costing');
      const data = await response.json();
      
      if (data.success) {
        setMenus(data.menus);
      } else {
        setError(data.error || 'Failed to fetch costing data');
      }
    } catch (error) {
      setError('Failed to fetch costing data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading costing data...</div>
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
                Back to Home
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Costing</h1>
            <div className="flex gap-2">
              <Link
                href="/menus/build"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                + New Menu
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {menus.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No menus found</div>
            <Link
              href="/menus/build"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Build Your First Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {menus.map((menu) => (
              <Link
                key={menu.id}
                href={`/costing/${menu.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{menu.name}</h3>
                      <p className="text-sm text-gray-500">Week of {new Date(menu.weekStartDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

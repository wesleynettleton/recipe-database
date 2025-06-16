'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface MenuInfo {
  name: string;
  week_start_date: string;
}

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/menus/list');
        const data = await response.json();
        if (data.success) {
          setMenus(data.menus);
        } else {
          setError(data.error || 'Failed to fetch menus');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenus();
  }, []);
  
  const handleExport = (weekStartDate: string) => {
    window.location.href = `/api/menus/${weekStartDate}/export-allergies`;
  };

  const handleExportNoCode = (weekStartDate: string) => {
    window.location.href = `/api/menus/${weekStartDate}/export-allergies?includeCode=false`;
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
            <h1 className="text-2xl font-bold text-gray-900">All Menus</h1>
            <div className="flex items-center">
              <Link
                href="/menus/build"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Build New Menu
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading menus...</div>
        ) : error ? (
          <div className="text-center text-red-500">Error: {error}</div>
        ) : menus.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No menus found.</div>
            <p className="text-gray-400 mt-2">Get started by building your first weekly menu.</p>
            <Link
              href="/menus/build"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Build Menu
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {menus.map((menu) => (
                <li key={menu.week_start_date}>
                  <div className="flex items-center justify-between">
                    <Link href={`/menus/${menu.week_start_date}`} className="flex-grow">
                      <div className="px-4 py-4 sm:px-6 flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-full">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <p className="text-lg font-medium text-gray-900 truncate">{menu.name || 'Unnamed Menu'}</p>
                          <p className="text-sm text-gray-500">Week of {formatDisplayDate(menu.week_start_date)}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="px-4 sm:px-6 flex-shrink-0 space-x-2">
                      <button
                        onClick={() => handleExport(menu.week_start_date)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                      </button>
                      <button
                        onClick={() => handleExportNoCode(menu.week_start_date)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export (No Codes)
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 
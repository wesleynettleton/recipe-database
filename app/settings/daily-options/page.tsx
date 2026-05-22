'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AutocompleteRecipeSelector, { RecipeStub } from '../../components/AutocompleteRecipeSelector';
import { dailyOptionKeys } from '../../../lib/menuDailyOptions';

type DailyOptionsState = Record<string, RecipeStub | null>;

function buildEmptyDailyOptions(): DailyOptionsState {
  return Object.fromEntries(dailyOptionKeys().map((key) => [key, null]));
}

export default function DefaultDailyOptionsPage() {
  const [dailyOptions, setDailyOptions] = useState<DailyOptionsState>(buildEmptyDailyOptions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const optionKeys = dailyOptionKeys();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/daily-options');
        const data = await response.json();
        if (response.ok && data.success) {
          setDailyOptions({ ...buildEmptyDailyOptions(), ...(data.dailyOptions || {}) });
        } else {
          setError(data.error || 'Failed to load default daily options');
        }
      } catch {
        setError('Failed to load default daily options');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateOption = (key: string, recipe: RecipeStub | null) => {
    setDailyOptions((prev) => ({ ...prev, [key]: recipe }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/settings/daily-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyOptions }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDailyOptions({ ...buildEmptyDailyOptions(), ...(data.dailyOptions || {}) });
        setSuccess('Default daily options saved. New menus will use these recipes.');
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save default daily options');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Default Daily Options</h1>
            <div />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:px-8">
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <p className="text-sm text-gray-600 mb-6">
            These recipes appear automatically when you start a new menu for a week. If you change
            them on a specific menu and save, only that week is updated — other menus and future
            defaults are unaffected unless you save here again.
          </p>
          <div className="space-y-4">
            {optionKeys.map((key, index) => (
              <AutocompleteRecipeSelector
                key={key}
                label={`Daily Option ${index + 1}`}
                value={dailyOptions[key]}
                onChange={(recipe) => updateOption(key, recipe)}
                placeholder="Search for a recipe..."
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end items-center space-x-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>
    </div>
  );
}

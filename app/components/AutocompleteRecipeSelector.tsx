'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface RecipeStub {
  id: number;
  name: string;
  code: string;
}

export default function AutocompleteRecipeSelector({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: RecipeStub | null;
  onChange: (recipe: RecipeStub | null) => void;
  placeholder: string;
  label: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<RecipeStub[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value?.name || '');
  }, [value]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (value && value.name === searchTerm) {
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/recipes?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        if (data.success) {
          const results = data.recipes || [];
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        } else {
          setSearchResults([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error('Error searching recipes:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRecipe = (recipe: RecipeStub) => {
    setSearchTerm(recipe.name);
    setShowDropdown(false);
    onChange(recipe);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term === '') {
      onChange(null);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-700 w-32 text-right shrink-0">{label}:</label>
      <div className="relative flex-1" ref={dropdownRef}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full p-2 border border-gray-300 rounded-md text-sm text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                <div className="font-medium text-gray-900">{recipe.name}</div>
                <div className="text-sm text-gray-500">{recipe.code}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

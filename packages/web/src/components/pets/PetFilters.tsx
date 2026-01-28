'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { SPECIES_OPTIONS, AGE_OPTIONS, SIZE_OPTIONS, US_STATES } from '@palbase/shared';

export function PetFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page'); // Reset to page 1 on filter change
      router.push(`/pets?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', search || null);
  };

  const clearFilters = () => {
    router.push('/pets');
    setSearch('');
  };

  const hasFilters =
    searchParams.has('species') ||
    searchParams.has('age') ||
    searchParams.has('size') ||
    searchParams.has('state') ||
    searchParams.has('search');

  return (
    <div className="space-y-6">
      {/* Search */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or breed..."
            className="input pl-10"
          />
        </div>
      </form>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <X className="h-4 w-4" />
          Clear all filters
        </button>
      )}

      {/* Species */}
      <div>
        <h3 className="font-medium text-gray-900">Species</h3>
        <div className="mt-3 space-y-2">
          {SPECIES_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams.get('species')?.split(',').includes(option.value) || false}
                onChange={(e) => {
                  const current = searchParams.get('species')?.split(',') || [];
                  let newValue: string[];
                  if (e.target.checked) {
                    newValue = [...current, option.value];
                  } else {
                    newValue = current.filter((v) => v !== option.value);
                  }
                  updateFilter('species', newValue.length > 0 ? newValue.join(',') : null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Age */}
      <div>
        <h3 className="font-medium text-gray-900">Age</h3>
        <div className="mt-3 space-y-2">
          {AGE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams.get('age')?.split(',').includes(option.value) || false}
                onChange={(e) => {
                  const current = searchParams.get('age')?.split(',') || [];
                  let newValue: string[];
                  if (e.target.checked) {
                    newValue = [...current, option.value];
                  } else {
                    newValue = current.filter((v) => v !== option.value);
                  }
                  updateFilter('age', newValue.length > 0 ? newValue.join(',') : null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="font-medium text-gray-900">Size</h3>
        <div className="mt-3 space-y-2">
          {SIZE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams.get('size')?.split(',').includes(option.value) || false}
                onChange={(e) => {
                  const current = searchParams.get('size')?.split(',') || [];
                  let newValue: string[];
                  if (e.target.checked) {
                    newValue = [...current, option.value];
                  } else {
                    newValue = current.filter((v) => v !== option.value);
                  }
                  updateFilter('size', newValue.length > 0 ? newValue.join(',') : null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* State */}
      <div>
        <h3 className="font-medium text-gray-900">State</h3>
        <select
          value={searchParams.get('state') || ''}
          onChange={(e) => updateFilter('state', e.target.value || null)}
          className="input mt-3"
        >
          <option value="">All States</option>
          {US_STATES.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

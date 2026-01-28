'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SOURCE_OPTIONS } from '@palbase/shared';

export function PetFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/pets?${params.toString()}`);
  };

  return (
    <div className="mb-6 flex gap-4">
      <select
        className="input w-auto"
        value={searchParams.get('status') || ''}
        onChange={(e) => updateFilter('status', e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="adopted">Adopted</option>
        <option value="removed">Removed</option>
      </select>

      <select
        className="input w-auto"
        value={searchParams.get('source') || ''}
        onChange={(e) => updateFilter('source', e.target.value)}
      >
        <option value="">All Sources</option>
        {SOURCE_OPTIONS.map((source) => (
          <option key={source.value} value={source.value}>
            {source.label}
          </option>
        ))}
      </select>
    </div>
  );
}

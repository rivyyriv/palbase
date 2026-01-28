import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatAge, SOURCE_OPTIONS } from '@palbase/shared';
import type { Pet } from '@palbase/shared';
import { ExternalLink } from 'lucide-react';
import { PetFilters } from '@/components/pets/PetFilters';

interface SearchParams {
  status?: string;
  species?: string;
  source?: string;
  page?: string;
}

export default async function PetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const page = parseInt(params.page || '1', 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('pets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.species) {
    query = query.eq('species', params.species);
  }

  if (params.source) {
    query = query.eq('source', params.source);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: pets, count } = await query;
  const totalPages = Math.ceil((count || 0) / limit);

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    adopted: 'bg-blue-100 text-blue-700',
    removed: 'bg-red-100 text-red-700',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pet Listings</h1>
          <p className="text-gray-600">{count?.toLocaleString() || 0} total pets</p>
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="mb-6 h-10" />}>
        <PetFilters />
      </Suspense>

      <div className="card">
        {pets && pets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-medium text-gray-600">
                  <th className="px-6 py-3">Pet</th>
                  <th className="px-6 py-3">Species</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Added</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(pets as Pet[]).map((pet) => {
                  const sourceLabel = SOURCE_OPTIONS.find(s => s.value === pet.source)?.label || pet.source;

                  return (
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {pet.photos?.[0] && (
                              <Image
                                src={pet.photos[0]}
                                alt={pet.name}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{pet.name}</p>
                            <p className="text-sm text-gray-500">
                              {pet.breed || 'Unknown'} • {formatAge(pet.age)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {pet.species}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {sourceLabel}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {pet.location_city}, {pet.location_state}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusColors[pet.status]}`}>
                          {pet.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(pet.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={pet.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700"
                            title="View original listing"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No pets found matching your filters.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/pets?page=${page - 1}${params.status ? `&status=${params.status}` : ''}${params.source ? `&source=${params.source}` : ''}`}
                  className="btn-outline btn-sm"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/pets?page=${page + 1}${params.status ? `&status=${params.status}` : ''}${params.source ? `&source=${params.source}` : ''}`}
                  className="btn-outline btn-sm"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

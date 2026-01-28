import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PetCard } from '@/components/pets/PetCard';
import { PetFilters } from '@/components/pets/PetFilters';
import { Pagination } from '@/components/ui/Pagination';
import type { Pet, PetSpecies, PetAge, PetSize } from '@palbase/shared';

interface SearchParams {
  species?: string;
  age?: string;
  size?: string;
  state?: string;
  search?: string;
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
  const limit = 20;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('pets')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.species) {
    const species = params.species.split(',') as PetSpecies[];
    query = query.in('species', species);
  }

  if (params.age) {
    const ages = params.age.split(',') as PetAge[];
    query = query.in('age', ages);
  }

  if (params.size) {
    const sizes = params.size.split(',') as PetSize[];
    query = query.in('size', sizes);
  }

  if (params.state) {
    query = query.eq('location_state', params.state);
  }

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,breed.ilike.%${params.search}%`);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: pets, count } = await query;

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div className="py-8">
      <div className="container-app">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0">
            <Suspense fallback={<div>Loading filters...</div>}>
              <PetFilters />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {params.species
                  ? `${params.species.charAt(0).toUpperCase() + params.species.slice(1)}s for Adoption`
                  : 'All Pets'}
              </h1>
              <p className="text-sm text-gray-600">
                {count?.toLocaleString() || 0} pets found
              </p>
            </div>

            {/* Pet Grid */}
            {pets && pets.length > 0 ? (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(pets as Pet[]).map((pet) => (
                    <PetCard key={pet.id} pet={pet} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      baseUrl="/pets"
                      searchParams={params}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-gray-50 p-12 text-center">
                <h3 className="text-lg font-medium text-gray-900">No pets found</h3>
                <p className="mt-2 text-gray-600">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

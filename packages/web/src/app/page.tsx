import Link from 'next/link';
import { Search, Heart, MapPin, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PetCard } from '@/components/pets/PetCard';
import type { Pet } from '@palbase/shared';

export default async function HomePage() {
  const supabase = await createClient();
  
  // Fetch featured pets
  const { data: featuredPets } = await supabase
    .from('pets')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20">
        <div className="container-app">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Find Your Perfect
              <span className="text-primary-600"> Furry Friend</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Discover adoptable pets from shelters across the United States. 
              Every pet deserves a loving home, and your new best friend is waiting.
            </p>
            
            {/* Search Box */}
            <div className="mt-10">
              <Link
                href="/pets"
                className="btn-primary btn-lg inline-flex items-center gap-2"
              >
                <Search className="h-5 w-5" />
                Start Your Search
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary-600">50K+</div>
                <div className="text-sm text-gray-600">Pets Available</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">5</div>
                <div className="text-sm text-gray-600">Partner Networks</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary-600">50</div>
                <div className="text-sm text-gray-600">States Covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Pets */}
      <section className="py-16">
        <div className="container-app">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recently Added Pets</h2>
              <p className="mt-1 text-gray-600">New friends looking for their forever homes</p>
            </div>
            <Link
              href="/pets"
              className="hidden items-center gap-2 text-primary-600 hover:text-primary-700 sm:flex"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(featuredPets as Pet[] || []).map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>

          {(!featuredPets || featuredPets.length === 0) && (
            <div className="mt-8 rounded-xl bg-gray-50 p-8 text-center">
              <p className="text-gray-600">No pets available yet. Check back soon!</p>
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/pets"
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              View All Pets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-gray-900">How Palbase Works</h2>
            <p className="mt-2 text-gray-600">
              We aggregate pet listings from trusted shelters and rescues to help you find your perfect match.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <Search className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Browse & Filter</h3>
              <p className="mt-2 text-sm text-gray-600">
                Search through thousands of adoptable pets. Filter by species, breed, age, size, and location.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <Heart className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Save Favorites</h3>
              <p className="mt-2 text-sm text-gray-600">
                Create an account to save pets you love. Share them with family and friends.
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100">
                <MapPin className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Connect with Shelters</h3>
              <p className="mt-2 text-sm text-gray-600">
                Click through to the original shelter listing to start the adoption process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container-app">
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-12 text-center text-white">
            <h2 className="text-2xl font-bold">Ready to Find Your New Best Friend?</h2>
            <p className="mx-auto mt-2 max-w-lg text-primary-100">
              Thousands of pets are waiting for their forever homes. Start your search today.
            </p>
            <Link
              href="/pets"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              Find Pets Near You
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

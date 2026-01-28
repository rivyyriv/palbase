import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PetCard } from '@/components/pets/PetCard';
import type { Pet } from '@palbase/shared';

export default async function SavedPetsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login?redirect=/saved');
  }

  const { data: savedPets } = await supabase
    .from('saved_pets')
    .select(`
      id,
      created_at,
      pet:pets (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const pets = savedPets?.map(sp => ({ ...sp.pet, is_saved: true })) || [];

  return (
    <div className="py-8">
      <div className="container-app">
        <h1 className="text-2xl font-bold text-gray-900">Saved Pets</h1>
        <p className="mt-1 text-gray-600">
          Your favorite pets all in one place
        </p>

        {pets.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(pets as Pet[]).map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-xl bg-gray-50 p-12 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gray-200">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">No saved pets yet</h2>
            <p className="mt-2 text-gray-600">
              Start browsing and save pets you&apos;re interested in!
            </p>
            <Link
              href="/pets"
              className="mt-6 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              Find Pets
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

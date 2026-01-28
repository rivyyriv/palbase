'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { Pet, PetWithSaved } from '@palbase/shared';
import { formatAge, formatLocation } from '@palbase/shared';
import { createClient } from '@/lib/supabase/client';

interface PetCardProps {
  pet: Pet | PetWithSaved;
  showSaveButton?: boolean;
}

export function PetCard({ pet, showSaveButton = true }: PetCardProps) {
  const [isSaved, setIsSaved] = useState((pet as PetWithSaved).is_saved ?? false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login
        window.location.href = `/auth/login?redirect=/pets/${pet.id}`;
        return;
      }

      if (isSaved) {
        // Remove from saved
        await supabase
          .from('saved_pets')
          .delete()
          .eq('user_id', user.id)
          .eq('pet_id', pet.id);
        setIsSaved(false);
      } else {
        // Add to saved
        await supabase
          .from('saved_pets')
          .insert({ user_id: user.id, pet_id: pet.id });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving pet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const photoUrl = pet.photos?.[0] || '/placeholder-pet.jpg';
  const location = formatLocation(pet.location_city, pet.location_state);

  return (
    <Link href={`/pets/${pet.id}`} className="group">
      <div className="card transition-transform group-hover:-translate-y-1 group-hover:shadow-lg">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={photoUrl}
            alt={pet.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          
          {/* Save Button */}
          {showSaveButton && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-white ${
                isSaved ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'
              }`}
              aria-label={isSaved ? 'Remove from saved' : 'Save pet'}
            >
              <Heart
                className="h-5 w-5"
                fill={isSaved ? 'currentColor' : 'none'}
              />
            </button>
          )}

          {/* Species Badge */}
          <div className="absolute bottom-3 left-3">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium capitalize text-gray-700 shadow-sm">
              {pet.species}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {pet.name}
          </h3>
          
          <p className="mt-1 text-sm text-gray-600">
            {pet.breed || 'Unknown Breed'} • {formatAge(pet.age)}
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

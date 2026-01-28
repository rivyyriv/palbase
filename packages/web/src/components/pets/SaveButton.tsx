'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SaveButtonProps {
  petId: string;
}

export function SaveButton({ petId }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('saved_pets')
        .select('id')
        .eq('user_id', user.id)
        .eq('pet_id', petId)
        .single();

      setIsSaved(!!data);
      setIsLoading(false);
    };

    checkSaved();
  }, [petId, supabase]);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = `/auth/login?redirect=/pets/${petId}`;
      return;
    }

    setIsLoading(true);

    try {
      if (isSaved) {
        await supabase
          .from('saved_pets')
          .delete()
          .eq('user_id', user.id)
          .eq('pet_id', petId);
        setIsSaved(false);
      } else {
        await supabase
          .from('saved_pets')
          .insert({ user_id: user.id, pet_id: petId });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving pet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isLoading}
      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
        isSaved
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-gray-300 bg-white text-gray-600 hover:border-primary-600 hover:text-primary-600'
      }`}
      aria-label={isSaved ? 'Remove from saved' : 'Save pet'}
    >
      <Heart className="h-6 w-6" fill={isSaved ? 'currentColor' : 'none'} />
    </button>
  );
}

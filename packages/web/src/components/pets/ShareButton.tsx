'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import type { Pet } from '@palbase/shared';

interface ShareButtonProps {
  pet: Pet;
}

export function ShareButton({ pet }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${pet.name} - Adoptable ${pet.species} on Palbase`;
    const text = `Check out ${pet.name}, an adorable ${pet.breed || pet.species} looking for a forever home!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        // User cancelled or error - fall back to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-gray-600 hover:border-secondary-600 hover:text-secondary-600 transition-all"
      aria-label="Share pet"
    >
      {copied ? (
        <Check className="h-6 w-6 text-green-600" />
      ) : (
        <Share2 className="h-6 w-6" />
      )}
    </button>
  );
}

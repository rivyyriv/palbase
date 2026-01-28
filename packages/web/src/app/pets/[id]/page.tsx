import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, MapPin, ExternalLink, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SaveButton } from '@/components/pets/SaveButton';
import { ShareButton } from '@/components/pets/ShareButton';
import {
  formatAge,
  formatSize,
  formatLocation,
  formatAdoptionFee,
  formatRelativeTime,
  formatSpecies,
} from '@palbase/shared';
import type { Pet } from '@palbase/shared';

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single();

  if (!pet) {
    notFound();
  }

  const typedPet = pet as Pet;
  const photos = typedPet.photos?.length > 0 ? typedPet.photos : ['/placeholder-pet.jpg'];

  return (
    <div className="py-8">
      <div className="container-app">
        {/* Back Button */}
        <Link
          href="/pets"
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-primary-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Photos */}
          <div className="space-y-4">
            {/* Main Photo */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
              <Image
                src={photos[0]}
                alt={typedPet.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Thumbnail Gallery */}
            {photos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.slice(0, 4).map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <Image
                      src={photo}
                      alt={`${typedPet.name} photo ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 capitalize">
                  {formatSpecies(typedPet.species)}
                </span>
                <h1 className="mt-2 text-3xl font-bold text-gray-900">{typedPet.name}</h1>
                <p className="mt-1 text-lg text-gray-600">
                  {typedPet.breed || 'Unknown Breed'}
                  {typedPet.breed_secondary && ` / ${typedPet.breed_secondary}`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <SaveButton petId={typedPet.id} />
                <ShareButton pet={typedPet} />
              </div>
            </div>

            {/* Quick Info */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Age</div>
                <div className="font-medium text-gray-900">{formatAge(typedPet.age)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Size</div>
                <div className="font-medium text-gray-900">{formatSize(typedPet.size)}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Gender</div>
                <div className="font-medium text-gray-900 capitalize">{typedPet.gender}</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-sm text-gray-500">Fee</div>
                <div className="font-medium text-gray-900">{formatAdoptionFee(typedPet.adoption_fee)}</div>
              </div>
            </div>

            {/* Location */}
            <div className="mt-6 flex items-center gap-2 text-gray-600">
              <MapPin className="h-5 w-5" />
              <span>{formatLocation(typedPet.location_city, typedPet.location_state, typedPet.location_zip)}</span>
            </div>

            {/* Attributes */}
            <div className="mt-6">
              <h2 className="font-semibold text-gray-900">About {typedPet.name}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <AttributeBadge label="Good with kids" value={typedPet.good_with_kids} />
                <AttributeBadge label="Good with dogs" value={typedPet.good_with_dogs} />
                <AttributeBadge label="Good with cats" value={typedPet.good_with_cats} />
                <AttributeBadge label="House trained" value={typedPet.house_trained} />
                <AttributeBadge label="Spayed/Neutered" value={typedPet.spayed_neutered} />
                <AttributeBadge label="Special needs" value={typedPet.special_needs} />
              </div>
            </div>

            {/* Description */}
            {typedPet.description && (
              <div className="mt-6">
                <h2 className="font-semibold text-gray-900">Description</h2>
                <p className="mt-2 whitespace-pre-line text-gray-600">{typedPet.description}</p>
              </div>
            )}

            {/* Shelter Info */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">Shelter Information</h2>
              {typedPet.shelter_name && (
                <p className="mt-2 text-gray-700">{typedPet.shelter_name}</p>
              )}
              {typedPet.shelter_phone && (
                <p className="mt-1 text-sm text-gray-600">Phone: {typedPet.shelter_phone}</p>
              )}
              {typedPet.shelter_email && (
                <p className="mt-1 text-sm text-gray-600">Email: {typedPet.shelter_email}</p>
              )}

              {/* Original Listing Link */}
              <a
                href={typedPet.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700 transition-colors"
              >
                View Original Listing
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Meta Info */}
            <div className="mt-6 text-sm text-gray-500">
              <p>Listed {formatRelativeTime(typedPet.first_seen_at)}</p>
              <p>Source: {typedPet.source}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttributeBadge({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
        <span className="h-4 w-4 text-gray-400">?</span>
        {label}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        value
          ? 'bg-green-50 text-green-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {value ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      {label}
    </div>
  );
}

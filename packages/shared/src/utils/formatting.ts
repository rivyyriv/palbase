import { US_STATES } from '../constants';
import type { PetAge, PetSize, PetSpecies } from '../types';

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date string to relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

/**
 * Format location string from city, state, zip
 */
export function formatLocation(
  city?: string | null,
  state?: string | null,
  zip?: string | null
): string {
  const parts: string[] = [];
  
  if (city) parts.push(city);
  if (state) {
    const stateLabel = US_STATES.find(s => s.value === state)?.label || state;
    parts.push(stateLabel);
  }
  if (zip) parts.push(zip);
  
  return parts.join(', ') || 'Location unknown';
}

/**
 * Format pet age for display
 */
export function formatAge(age: PetAge | null): string {
  if (!age) return 'Unknown';
  const ageMap: Record<PetAge, string> = {
    baby: 'Baby',
    young: 'Young',
    adult: 'Adult',
    senior: 'Senior',
  };
  return ageMap[age];
}

/**
 * Format pet size for display
 */
export function formatSize(size: PetSize | null): string {
  if (!size) return 'Unknown';
  const sizeMap: Record<PetSize, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    xlarge: 'Extra Large',
  };
  return sizeMap[size];
}

/**
 * Format pet species for display
 */
export function formatSpecies(species: PetSpecies): string {
  const speciesMap: Record<PetSpecies, string> = {
    dog: 'Dog',
    cat: 'Cat',
    rabbit: 'Rabbit',
    bird: 'Bird',
    small_animal: 'Small Animal',
    horse: 'Horse',
    reptile: 'Reptile',
    fish: 'Fish',
    other: 'Other',
  };
  return speciesMap[species];
}

/**
 * Format adoption fee
 */
export function formatAdoptionFee(fee: number | null): string {
  if (fee === null || fee === undefined) return 'Contact for fee';
  if (fee === 0) return 'Free';
  return `$${fee.toFixed(2)}`;
}

/**
 * Format duration in milliseconds to human-readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

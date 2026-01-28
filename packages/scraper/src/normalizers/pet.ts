import type { PetAge, PetSize, PetGender, PetSpecies } from '@palbase/shared';

/**
 * Normalize pet age from various string formats
 */
export function normalizeAge(age: string | null | undefined): PetAge | null {
  if (!age) return null;
  
  const normalized = age.toLowerCase().trim();
  
  // Baby/puppy/kitten
  if (/baby|puppy|kitten|newborn|infant|neo/i.test(normalized)) {
    return 'baby';
  }
  
  // Young
  if (/young|juvenile|adolescent|teen/i.test(normalized)) {
    return 'young';
  }
  
  // Adult
  if (/adult|mature|grown/i.test(normalized)) {
    return 'adult';
  }
  
  // Senior
  if (/senior|elder|old|aged/i.test(normalized)) {
    return 'senior';
  }
  
  // Try to parse age in years
  const yearsMatch = normalized.match(/(\d+)\s*(year|yr)/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1], 10);
    if (years < 1) return 'baby';
    if (years < 3) return 'young';
    if (years < 8) return 'adult';
    return 'senior';
  }
  
  // Try months
  const monthsMatch = normalized.match(/(\d+)\s*(month|mo)/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    if (months < 6) return 'baby';
    if (months < 24) return 'young';
    return 'adult';
  }
  
  return null;
}

/**
 * Normalize pet size from various string formats
 */
export function normalizeSize(size: string | null | undefined): PetSize | null {
  if (!size) return null;
  
  const normalized = size.toLowerCase().trim();
  
  // Extra large
  if (/extra\s*large|xlarge|xl|giant|huge/i.test(normalized)) {
    return 'xlarge';
  }
  
  // Large
  if (/large|lg|big/i.test(normalized)) {
    return 'large';
  }
  
  // Medium
  if (/medium|med|md|average/i.test(normalized)) {
    return 'medium';
  }
  
  // Small
  if (/small|sm|tiny|petite|mini|toy/i.test(normalized)) {
    return 'small';
  }
  
  // Try to parse weight in pounds
  const weightMatch = normalized.match(/(\d+)\s*(lb|lbs|pound)/i);
  if (weightMatch) {
    const weight = parseInt(weightMatch[1], 10);
    if (weight < 20) return 'small';
    if (weight < 50) return 'medium';
    if (weight < 90) return 'large';
    return 'xlarge';
  }
  
  return null;
}

/**
 * Normalize pet gender from various string formats
 */
export function normalizeGender(gender: string | null | undefined): PetGender {
  if (!gender) return 'unknown';
  
  const normalized = gender.toLowerCase().trim();
  
  if (/male|boy|m\b|him|he\b/i.test(normalized)) {
    return 'male';
  }
  
  if (/female|girl|f\b|her|she\b/i.test(normalized)) {
    return 'female';
  }
  
  return 'unknown';
}

/**
 * Normalize pet species from various string formats
 */
export function normalizeSpecies(species: string | null | undefined): PetSpecies {
  if (!species) return 'other';
  
  const normalized = species.toLowerCase().trim();
  
  if (/dog|canine|puppy|pup/i.test(normalized)) {
    return 'dog';
  }
  
  if (/cat|feline|kitten|kitty/i.test(normalized)) {
    return 'cat';
  }
  
  if (/rabbit|bunny|hare/i.test(normalized)) {
    return 'rabbit';
  }
  
  if (/bird|avian|parrot|parakeet|cockatiel|finch|canary/i.test(normalized)) {
    return 'bird';
  }
  
  if (/small\s*(animal|pet)|hamster|gerbil|guinea\s*pig|ferret|chinchilla|rat|mouse|hedgehog/i.test(normalized)) {
    return 'small_animal';
  }
  
  if (/horse|equine|pony|mare|stallion|foal/i.test(normalized)) {
    return 'horse';
  }
  
  if (/reptile|lizard|snake|turtle|tortoise|gecko|iguana/i.test(normalized)) {
    return 'reptile';
  }
  
  if (/fish|aquatic/i.test(normalized)) {
    return 'fish';
  }
  
  return 'other';
}

/**
 * Normalize boolean values from various string formats
 */
export function normalizeBoolean(value: string | boolean | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  
  const normalized = value.toLowerCase().trim();
  
  if (/yes|true|1|y/i.test(normalized)) {
    return true;
  }
  
  if (/no|false|0|n/i.test(normalized)) {
    return false;
  }
  
  return null;
}

/**
 * Normalize breed name
 */
export function normalizeBreed(breed: string | null | undefined): string | null {
  if (!breed) return null;
  
  // Remove common prefixes/suffixes
  let normalized = breed.trim();
  normalized = normalized.replace(/^\s*(mix|mixed)\s*/i, '');
  normalized = normalized.replace(/\s*(mix|mixed)\s*$/i, '');
  
  // Capitalize each word
  normalized = normalized
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return normalized || null;
}

/**
 * Clean and normalize description text
 */
export function normalizeDescription(description: string | null | undefined): string | null {
  if (!description) return null;
  
  let cleaned = description.trim();
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  
  return cleaned || null;
}

/**
 * Extract and normalize adoption fee
 */
export function normalizeAdoptionFee(fee: string | number | null | undefined): number | null {
  if (fee === null || fee === undefined) return null;
  if (typeof fee === 'number') return fee;
  
  // Extract number from string
  const match = fee.match(/\$?\s*(\d+(?:\.\d{2})?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  
  return null;
}

/**
 * Normalize US state to 2-letter code
 */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    'washington dc': 'DC', 'washington d.c.': 'DC',
  };
  
  const normalized = state.toLowerCase().trim();
  
  // Already a 2-letter code
  if (/^[A-Z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }
  
  return stateMap[normalized] || null;
}

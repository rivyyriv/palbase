import type { PetSpecies, PetAge, PetSize, PetGender, ScrapeSource } from '../types';

export const SPECIES_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'bird', label: 'Bird' },
  { value: 'small_animal', label: 'Small Animal' },
  { value: 'horse', label: 'Horse' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'fish', label: 'Fish' },
  { value: 'other', label: 'Other' },
];

export const AGE_OPTIONS: { value: PetAge; label: string }[] = [
  { value: 'baby', label: 'Baby' },
  { value: 'young', label: 'Young' },
  { value: 'adult', label: 'Adult' },
  { value: 'senior', label: 'Senior' },
];

export const SIZE_OPTIONS: { value: PetSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra Large' },
];

export const GENDER_OPTIONS: { value: PetGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unknown', label: 'Unknown' },
];

export const SOURCE_OPTIONS: { value: ScrapeSource; label: string }[] = [
  { value: 'rescuegroups', label: 'RescueGroups' },
  { value: 'petfinder', label: 'Petfinder' },
  { value: 'adoptapet', label: 'Adopt-a-Pet' },
  { value: 'aspca', label: 'ASPCA' },
  { value: 'bestfriends', label: 'Best Friends' },
  { value: 'petsmart', label: 'PetSmart Charities' },
];

export const US_STATES: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington D.C.' },
];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

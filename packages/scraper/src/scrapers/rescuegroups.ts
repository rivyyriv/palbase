import { config } from '../config';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeSpecies,
  normalizeBreed,
  normalizeDescription,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert, PetSpecies } from '@palbase/shared';
import type { ScrapedPet, ScrapeResult } from './base';

/**
 * RescueGroups.org API-based data fetcher.
 * Uses their free public JSON API (no browser/Puppeteer needed).
 * 6,200+ shelters - upstream data source for Petfinder & AdoptAPet.
 */
export class RescueGroupsFetcher {
  readonly source: ScrapeSource = 'rescuegroups';
  private readonly apiBase = 'https://api.rescuegroups.org/v5';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.rescueGroups.apiKey;
    if (!this.apiKey) {
      throw new Error('RESCUEGROUPS_API_KEY is required');
    }
  }

  /**
   * No browser needed - just validate API key
   */
  async initialize(): Promise<void> {
    console.log('RescueGroups fetcher initialized (API-based, no browser needed)');
  }

  /**
   * No browser to clean up
   */
  async cleanup(): Promise<void> {
    // Nothing to clean up - pure HTTP
  }

  /**
   * Fetch available pets from RescueGroups API
   */
  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];

    const speciesToFetch: Array<{ view: string; species: PetSpecies }> = [
      { view: 'dogs', species: 'dog' },
      { view: 'cats', species: 'cat' },
    ];

    for (const { view, species } of speciesToFetch) {
      try {
        console.log(`Fetching RescueGroups available ${view}...`);
        const speciesPets = await this.fetchSpecies(view, species);
        pets.push(...speciesPets);
        console.log(`Got ${speciesPets.length} ${view} from RescueGroups`);
      } catch (error) {
        console.error(`Error fetching RescueGroups ${view}:`, error);
        errors.push({
          type: 'API_FETCH_ERROR',
          message: error instanceof Error ? error.message : String(error),
          url: `${this.apiBase}/public/animals/search/available/${view}/`,
        });
      }
    }

    return { pets, shelters, errors };
  }

  /**
   * Fetch a single species with pagination
   */
  private async fetchSpecies(viewName: string, species: PetSpecies): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];
    const maxPages = 20; // 250 per page * 20 = 5,000 pets max per species
    let page = 1;

    while (page <= maxPages) {
      try {
        const url = `${this.apiBase}/public/animals/search/available/${viewName}/?limit=250&page=${page}&sort=random`;
        console.log(`  Page ${page}: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Authorization': this.apiKey,
          },
        });

        if (response.status === 429) {
          console.warn('Rate limited by RescueGroups, waiting 10s...');
          await this.sleep(10000);
          continue; // Retry same page
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const json = await response.json();

        // Extract animals from JSON API response
        const animals = json.data;
        if (!animals || !Array.isArray(animals) || animals.length === 0) {
          console.log(`  No more animals on page ${page}`);
          break;
        }

        // Extract included data (breeds, colors, orgs, pictures, etc.)
        const included = json.included || [];
        const includedMap = new Map<string, any>();
        for (const item of included) {
          includedMap.set(`${item.type}-${item.id}`, item);
        }

        // Map each animal to our ScrapedPet format
        for (const animal of animals) {
          const pet = this.mapAnimalToPet(animal, includedMap, species);
          if (pet) {
            pets.push(pet);
          }
        }

        console.log(`  Got ${animals.length} animals (total: ${pets.length})`);

        // Check if there are more pages
        const meta = json.meta;
        if (meta && meta.pages && page >= meta.pages) {
          console.log(`  Reached last page (${meta.pages})`);
          break;
        }

        page++;

        // Rate limit between requests
        await this.sleep(500);

      } catch (error) {
        console.error(`  Error on page ${page}:`, error);
        break;
      }
    }

    return pets;
  }

  /**
   * Map a RescueGroups API animal to our ScrapedPet format
   */
  private mapAnimalToPet(
    animal: any,
    includedMap: Map<string, any>,
    defaultSpecies: PetSpecies
  ): ScrapedPet | null {
    const attrs = animal.attributes;
    if (!attrs || !attrs.name) return null;

    const id = animal.id;
    const relationships = animal.relationships || {};

    // Get breed from relationships
    let breedPrimary: string | null = null;
    let breedSecondary: string | null = null;
    if (relationships.breeds?.data) {
      const breedData = Array.isArray(relationships.breeds.data)
        ? relationships.breeds.data
        : [relationships.breeds.data];
      
      for (let i = 0; i < breedData.length; i++) {
        const breedRef = breedData[i];
        const breedObj = includedMap.get(`breeds-${breedRef.id}`);
        const breedName = breedObj?.attributes?.name || null;
        if (i === 0) breedPrimary = breedName;
        else if (i === 1) breedSecondary = breedName;
      }
    }

    // Get photos from relationships or attributes
    const photos: string[] = [];
    if (relationships.pictures?.data) {
      const picData = Array.isArray(relationships.pictures.data)
        ? relationships.pictures.data
        : [relationships.pictures.data];
      
      for (const picRef of picData) {
        const picObj = includedMap.get(`pictures-${picRef.id}`);
        if (picObj?.attributes) {
          const picUrl = picObj.attributes.large?.url
            || picObj.attributes.original?.url
            || picObj.attributes.small?.url;
          if (picUrl) photos.push(picUrl);
        }
      }
    }

    // Get organization info
    let shelterName: string | null = null;
    let shelterEmail: string | null = null;
    let shelterPhone: string | null = null;
    if (relationships.orgs?.data) {
      const orgData = Array.isArray(relationships.orgs.data)
        ? relationships.orgs.data[0]
        : relationships.orgs.data;
      if (orgData) {
        const orgObj = includedMap.get(`orgs-${orgData.id}`);
        if (orgObj?.attributes) {
          shelterName = orgObj.attributes.name || null;
          shelterEmail = orgObj.attributes.email || null;
          shelterPhone = orgObj.attributes.phone || null;
        }
      }
    }

    // Get species from relationships or default
    let speciesValue = defaultSpecies;
    if (relationships.species?.data) {
      const speciesData = Array.isArray(relationships.species.data)
        ? relationships.species.data[0]
        : relationships.species.data;
      if (speciesData) {
        const speciesObj = includedMap.get(`species-${speciesData.id}`);
        if (speciesObj?.attributes?.singular) {
          speciesValue = normalizeSpecies(speciesObj.attributes.singular);
        }
      }
    }

    // Get color
    let color: string | null = null;
    if (relationships.colors?.data) {
      const colorData = Array.isArray(relationships.colors.data)
        ? relationships.colors.data[0]
        : relationships.colors.data;
      if (colorData) {
        const colorObj = includedMap.get(`colors-${colorData.id}`);
        color = colorObj?.attributes?.name || null;
      }
    }

    // Build the source URL
    const sourceUrl = attrs.url || `https://www.rescuegroups.org/animals/${id}`;

    return {
      source_id: String(id),
      source_url: sourceUrl,
      shelter_id: null,
      name: attrs.name || 'Unknown',
      species: speciesValue,
      breed: normalizeBreed(breedPrimary),
      breed_secondary: breedSecondary,
      age: normalizeAge(attrs.ageGroup || attrs.ageString),
      size: normalizeSize(attrs.sizeGroup || attrs.sizeCurrent),
      gender: normalizeGender(attrs.sex),
      color,
      description: normalizeDescription(attrs.descriptionText || attrs.description),
      photos,
      location_city: attrs.locationCitystate?.split(',')[0]?.trim() || null,
      location_state: attrs.locationCitystate?.split(',')[1]?.trim() || attrs.locationState || null,
      location_zip: attrs.locationPostalcode || null,
      shelter_name: shelterName,
      shelter_email: shelterEmail,
      shelter_phone: shelterPhone,
      good_with_kids: attrs.isKidsOk ?? null,
      good_with_dogs: attrs.isDogsOk ?? null,
      good_with_cats: attrs.isCatsOk ?? null,
      house_trained: attrs.isHousetrained ?? null,
      spayed_neutered: attrs.isAltered ?? null,
      special_needs: attrs.isSpecialNeeds ?? null,
      adoption_fee: attrs.adoptionFeeString ? parseFloat(attrs.adoptionFeeString.replace(/[^0-9.]/g, '')) || null : null,
      status: 'active',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };
  }

  /**
   * Not needed for API-based fetcher
   */
  async parsePetPage(_url: string): Promise<ScrapedPet | null> {
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

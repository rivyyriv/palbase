import { BaseScraper, ScrapedPet, ScrapeResult } from './base';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeBreed,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert, PetSpecies } from '@palbase/shared';

interface PetfinderAnimal {
  id: number;
  type: string;
  species: string;
  breeds?: { primary?: string; secondary?: string; mixed?: boolean };
  age?: string;
  gender?: string;
  size?: string;
  name?: string;
  description?: string;
  photos?: Array<{ small?: string; medium?: string; large?: string; full?: string }>;
  status?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: {
      city?: string;
      state?: string;
      postcode?: string;
    };
  };
  organization_id?: string;
  url?: string;
  tags?: string[];
  environment?: { children?: boolean; dogs?: boolean; cats?: boolean };
  attributes?: {
    spayed_neutered?: boolean;
    house_trained?: boolean;
    special_needs?: boolean;
  };
}

export class PetfinderScraper extends BaseScraper {
  readonly source: ScrapeSource = 'petfinder';
  readonly baseUrl = 'https://www.petfinder.com';
  readonly robotsUrl = 'https://www.petfinder.com/robots.txt';

  private readonly speciesMap: Record<string, PetSpecies> = {
    dogs: 'dog',
    cats: 'cat',
    rabbits: 'rabbit',
    'small-furry': 'small_animal',
    horses: 'horse',
    birds: 'bird',
    'scales-fins-other': 'reptile',
    barnyard: 'other',
  };

  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];

    const speciesToScrape = ['dogs', 'cats'];

    for (const speciesKey of speciesToScrape) {
      try {
        console.log(`Scraping Petfinder ${speciesKey}...`);
        const species = this.speciesMap[speciesKey] || 'other';
        const speciesPets = await this.scrapeSpecies(speciesKey, species);
        pets.push(...speciesPets);
        console.log(`Found ${speciesPets.length} ${speciesKey} from Petfinder`);
      } catch (error) {
        console.error(`Error scraping Petfinder ${speciesKey}:`, error);
        errors.push({
          type: 'SPECIES_SCRAPE_ERROR',
          message: error instanceof Error ? error.message : String(error),
          url: `${this.baseUrl}/search/${speciesKey}-for-adoption/us/`,
        });
      }
    }

    return { pets, shelters, errors };
  }

  /**
   * Strategy: Navigate to the search page and intercept the XHR/fetch responses
   * that the React app makes to load pet data. This gives us structured JSON
   * without needing to parse the DOM.
   */
  private async scrapeSpecies(speciesKey: string, species: PetSpecies): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const maxPages = 3;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await this.createPage();
      let pagePets: ScrapedPet[] = [];

      try {
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        );

        // Collect API responses via network interception
        const capturedAnimals: PetfinderAnimal[] = [];

        await page.setRequestInterception(true);

        page.on('request', (req) => {
          // Let all requests through, we just want to observe responses
          req.continue();
        });

        page.on('response', async (response) => {
          try {
            const url = response.url();
            // Petfinder's React app fetches animal data from their internal API
            if (url.includes('/v2/animals') || url.includes('api.petfinder.com')) {
              const text = await response.text();
              try {
                const json = JSON.parse(text);
                if (json.animals && Array.isArray(json.animals)) {
                  console.log(`Intercepted API response with ${json.animals.length} animals`);
                  capturedAnimals.push(...json.animals);
                }
              } catch {
                // Not JSON or not the right response
              }
            }
          } catch {
            // Response body may not be available
          }
        });

        const listUrl = `${this.baseUrl}/search/${speciesKey}-for-adoption/us/?page=${pageNum}`;
        console.log(`Fetching: ${listUrl}`);

        await page.goto(listUrl, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        });

        // Wait for API data to arrive
        console.log('Waiting for data to load...');
        await this.sleep(5000);

        // If we captured API data, use it (structured JSON = best data)
        if (capturedAnimals.length > 0) {
          console.log(`Got ${capturedAnimals.length} animals from intercepted API calls`);
          
          for (const animal of capturedAnimals) {
            const pet = this.mapAnimalToPet(animal, species);
            if (pet) {
              pagePets.push(pet);
            }
          }
        } else {
          // Fallback: try to extract from DOM
          console.log('No API data intercepted, trying DOM extraction...');

          // Wait a bit more for content
          await page.waitForFunction(
            () => document.querySelectorAll('a[href*="/pet/"]').length > 0,
            { timeout: 15000 }
          ).catch(() => {});

          await this.sleep(2000);

          pagePets = await this.extractFromDOM(page, species);
        }

        console.log(`Found ${pagePets.length} pets on page ${pageNum}`);

        if (pagePets.length === 0) {
          console.log(`No pets found on page ${pageNum}, stopping`);
          break;
        }

        pets.push(...pagePets);

      } catch (error) {
        console.error(`Error on page ${pageNum}:`, error);
      } finally {
        try {
          if (!page.isClosed()) {
            await page.close();
          }
        } catch {
          console.log('Page already closed');
        }
      }

      await this.rateLimit();
    }

    return pets;
  }

  /**
   * Map a Petfinder API animal object to our ScrapedPet format
   */
  private mapAnimalToPet(animal: PetfinderAnimal, species: PetSpecies): ScrapedPet | null {
    if (!animal.id || !animal.name) return null;

    const photos: string[] = [];
    if (animal.photos) {
      for (const photo of animal.photos) {
        const url = photo.large || photo.full || photo.medium || photo.small;
        if (url) photos.push(url);
      }
    }

    return {
      source_id: String(animal.id),
      source_url: animal.url || `https://www.petfinder.com/pet/${animal.name}-${animal.id}/`,
      shelter_id: null,
      name: animal.name || 'Unknown',
      species,
      breed: normalizeBreed(animal.breeds?.primary || ''),
      breed_secondary: animal.breeds?.secondary || null,
      age: normalizeAge(animal.age || ''),
      size: normalizeSize(animal.size || ''),
      gender: normalizeGender(animal.gender || ''),
      color: null,
      description: animal.description || null,
      photos,
      location_city: animal.contact?.address?.city || null,
      location_state: animal.contact?.address?.state || null,
      location_zip: animal.contact?.address?.postcode || null,
      shelter_name: null,
      shelter_email: animal.contact?.email || null,
      shelter_phone: animal.contact?.phone || null,
      good_with_kids: animal.environment?.children ?? null,
      good_with_dogs: animal.environment?.dogs ?? null,
      good_with_cats: animal.environment?.cats ?? null,
      house_trained: animal.attributes?.house_trained ?? null,
      spayed_neutered: animal.attributes?.spayed_neutered ?? null,
      special_needs: animal.attributes?.special_needs ?? null,
      adoption_fee: null,
      status: 'active',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    };
  }

  /**
   * Fallback: extract pet data from the DOM
   */
  private async extractFromDOM(page: any, species: PetSpecies): Promise<ScrapedPet[]> {
    const petData = await page.evaluate(function() {
      var results: any[] = [];
      var petLinks = document.querySelectorAll('a[href*="/pet/"]');
      var processedUrls = new Set();

      petLinks.forEach(function(link: any) {
        var url = link.href;
        if (processedUrls.has(url)) return;
        processedUrls.add(url);

        var card = link.closest('[class*="tw-rounded-lg"]') || link.closest('[class*="overflow-hidden"]') || link.parentElement?.parentElement;
        if (!card) return;

        var cardText = card.textContent || '';

        // Name
        var name = '';
        var nameEl = card.querySelector('[class*="font-secondary"], [class*="font-bold"]');
        if (nameEl && nameEl.textContent) name = nameEl.textContent.trim();

        // Age
        var age = '';
        if (cardText.includes('Adult')) age = 'Adult';
        else if (cardText.includes('Young')) age = 'Young';
        else if (cardText.includes('Senior')) age = 'Senior';
        else if (cardText.includes('Baby') || cardText.includes('Puppy') || cardText.includes('Kitten')) age = 'Baby';

        // Gender
        var gender = '';
        if (cardText.includes('Female')) gender = 'Female';
        else if (cardText.includes('Male')) gender = 'Male';

        // Photo
        var photo = '';
        var imgEl = card.querySelector('img[src*="cloudfront"], img[src*="petfinder"]');
        if (imgEl) photo = imgEl.src || '';

        if (url && name && name !== 'Loading...' && name.length < 50) {
          results.push({ url, name, age, gender, photo });
        }
      });

      return results;
    });

    return petData.map((data: any) => {
      const sourceIdMatch = data.url.match(/\/pet\/[^/]+-(\d+)/);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : `pf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        source_id: sourceId,
        source_url: data.url,
        shelter_id: null,
        name: data.name || 'Unknown',
        species,
        breed: null,
        breed_secondary: null,
        age: normalizeAge(data.age),
        size: null,
        gender: normalizeGender(data.gender),
        color: null,
        description: null,
        photos: data.photo ? [data.photo] : [],
        location_city: null,
        location_state: null,
        location_zip: null,
        shelter_name: null,
        shelter_email: null,
        shelter_phone: null,
        good_with_kids: null,
        good_with_dogs: null,
        good_with_cats: null,
        house_trained: null,
        spayed_neutered: null,
        special_needs: null,
        adoption_fee: null,
        status: 'active' as const,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
    });
  }

  async parsePetPage(url: string): Promise<ScrapedPet | null> {
    // Not needed when using network interception approach
    return null;
  }
}

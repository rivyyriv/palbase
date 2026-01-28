import { BaseScraper, ScrapedPet, ScrapeResult } from './base';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeSpecies,
  normalizeBreed,
  normalizeDescription,
  normalizeState,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert, PetSpecies } from '@palbase/shared';

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

    // Scrape dogs and cats (most common)
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

  private async scrapeSpecies(speciesKey: string, species: PetSpecies): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.createPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      let pageNum = 1;
      const maxPages = 10; // Limit pages per species to be respectful

      while (pageNum <= maxPages) {
        const listUrl = `${this.baseUrl}/search/${speciesKey}-for-adoption/us/?page=${pageNum}`;
        console.log(`Fetching: ${listUrl}`);

        await page.goto(listUrl, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        });

        // Wait for pet cards to load
        await page.waitForSelector('[data-test="petCard"], .petCard, [class*="AnimalCard"]', { 
          timeout: 15000 
        }).catch(() => {});

        // Extract pet data from the page
        const petData = await page.evaluate(() => {
          const results: Array<{
            url: string;
            name: string;
            breed: string;
            age: string;
            gender: string;
            location: string;
            photo: string;
          }> = [];

          // Try multiple selectors for pet cards
          const cards = document.querySelectorAll('[data-test="petCard"], .petCard, [class*="AnimalCard"], article[class*="pet"]');
          
          cards.forEach((card) => {
            const link = card.querySelector('a[href*="/pet/"]') as HTMLAnchorElement | null;
            if (!link) return;

            const url = link.href;
            
            // Get pet name
            const nameEl = card.querySelector('[data-test="petCard-name"], h2, h3, [class*="name"]');
            const name = nameEl?.textContent?.trim() || '';

            // Get breed
            const breedEl = card.querySelector('[data-test="petCard-breeds"], [class*="breed"]');
            const breed = breedEl?.textContent?.trim() || '';

            // Get age
            const ageEl = card.querySelector('[data-test="petCard-age"], [class*="age"]');
            const age = ageEl?.textContent?.trim() || '';

            // Get gender (might be in details text)
            const detailsText = card.textContent || '';
            let gender = '';
            if (detailsText.includes('Female')) gender = 'Female';
            else if (detailsText.includes('Male')) gender = 'Male';

            // Get location
            const locationEl = card.querySelector('[data-test="petCard-location"], [class*="location"]');
            const location = locationEl?.textContent?.trim() || '';

            // Get photo
            const imgEl = card.querySelector('img') as HTMLImageElement | null;
            const photo = imgEl?.src || imgEl?.dataset?.src || '';

            if (url && name) {
              results.push({ url, name, breed, age, gender, location, photo });
            }
          });

          return results;
        });

        if (petData.length === 0) {
          console.log(`No pets found on page ${pageNum}, stopping`);
          break;
        }

        // Process each pet
        for (const data of petData) {
          // Extract source ID from URL: /pet/fluffy-123456789/
          const sourceIdMatch = data.url.match(/\/pet\/[^/]+-(\d+)/);
          const sourceId = sourceIdMatch ? sourceIdMatch[1] : `pf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Parse location
          const locationMatch = data.location.match(/([^,]+),\s*(\w{2})/);
          const city = locationMatch ? locationMatch[1].trim() : null;
          const state = locationMatch ? normalizeState(locationMatch[2]) : null;

          const pet: ScrapedPet = {
            source_id: sourceId,
            source_url: data.url,
            shelter_id: null,
            name: data.name || 'Unknown',
            species,
            breed: normalizeBreed(data.breed),
            breed_secondary: null,
            age: normalizeAge(data.age),
            size: null,
            gender: normalizeGender(data.gender),
            color: null,
            description: null,
            photos: data.photo ? [data.photo] : [],
            location_city: city,
            location_state: state,
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
            status: 'active',
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          };

          pets.push(pet);
        }

        // Check for next page
        const hasNextPage = await page.evaluate(() => {
          const nextBtn = document.querySelector('[data-test="pagination-next"]:not([disabled]), a[aria-label="Next"]');
          return !!nextBtn;
        });

        if (!hasNextPage) {
          console.log(`No more pages after page ${pageNum}`);
          break;
        }

        pageNum++;
        await this.rateLimit();
      }

    } finally {
      await page.close();
    }

    return pets;
  }

  async parsePetPage(url: string): Promise<ScrapedPet | null> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.createPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Extract source ID from URL
      const sourceIdMatch = url.match(/\/pet\/[^/]+-(\d+)/);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : `pf-${Date.now()}`;

      const petData = await page.evaluate(() => {
        const getText = (selectors: string): string => {
          for (const selector of selectors.split(',')) {
            const el = document.querySelector(selector.trim());
            if (el?.textContent?.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const name = getText('[data-test="pet-name"], h1, [class*="petName"]');
        const breed = getText('[data-test="pet-breed"], [class*="breed"]');
        const age = getText('[data-test="pet-age"], [class*="age"]');
        const size = getText('[data-test="pet-size"], [class*="size"]');
        const gender = getText('[data-test="pet-gender"], [class*="gender"]');
        const speciesText = getText('[data-test="pet-type"], [class*="species"]');
        const description = getText('[data-test="pet-description"], [class*="description"], [class*="story"]');
        const location = getText('[data-test="pet-location"], [class*="location"]');
        const shelterName = getText('[data-test="organization-name"], [class*="organizationName"], [class*="shelter"]');

        // Get photos
        const photos: string[] = [];
        document.querySelectorAll('[data-test="pet-photo"] img, [class*="petPhoto"] img, [class*="gallery"] img').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('placeholder')) {
            photos.push(src);
          }
        });

        // Check attributes
        const pageText = document.body.textContent?.toLowerCase() || '';

        return {
          name,
          breed,
          age,
          size,
          gender,
          speciesText,
          description,
          location,
          shelterName,
          photos,
          goodWithKids: pageText.includes('good with children') || pageText.includes('kids'),
          goodWithDogs: pageText.includes('good with dogs'),
          goodWithCats: pageText.includes('good with cats'),
          houseTrained: pageText.includes('house trained') || pageText.includes('housetrained'),
          spayedNeutered: pageText.includes('spayed') || pageText.includes('neutered'),
          specialNeeds: pageText.includes('special needs'),
        };
      });

      // Parse location
      const locationMatch = petData.location.match(/([^,]+),\s*(\w{2})/);
      const city = locationMatch ? locationMatch[1].trim() : null;
      const state = locationMatch ? normalizeState(locationMatch[2]) : null;

      return {
        source_id: sourceId,
        source_url: url,
        shelter_id: null,
        name: petData.name || 'Unknown',
        species: normalizeSpecies(petData.speciesText),
        breed: normalizeBreed(petData.breed),
        breed_secondary: null,
        age: normalizeAge(petData.age),
        size: normalizeSize(petData.size),
        gender: normalizeGender(petData.gender),
        color: null,
        description: normalizeDescription(petData.description),
        photos: petData.photos,
        location_city: city,
        location_state: state,
        location_zip: null,
        shelter_name: petData.shelterName || null,
        shelter_email: null,
        shelter_phone: null,
        good_with_kids: petData.goodWithKids || null,
        good_with_dogs: petData.goodWithDogs || null,
        good_with_cats: petData.goodWithCats || null,
        house_trained: petData.houseTrained || null,
        spayed_neutered: petData.spayedNeutered || null,
        special_needs: petData.specialNeeds || null,
        adoption_fee: null,
        status: 'active',
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

    } catch (error) {
      console.error(`Error parsing Petfinder pet page ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }
}

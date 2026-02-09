import { BaseScraper, ScrapedPet, ScrapeResult } from './base';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeBreed,
  normalizeState,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert, PetSpecies } from '@palbase/shared';

export class PetSmartScraper extends BaseScraper {
  readonly source: ScrapeSource = 'petsmart';
  readonly baseUrl = 'https://petsmartcharities.org';
  readonly robotsUrl = 'https://petsmartcharities.org/robots.txt';

  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];

    // Scrape dogs and cats from the main find-a-pet page
    const speciesToScrape: Array<{ filter: string; species: PetSpecies }> = [
      { filter: 'dogs', species: 'dog' },
      { filter: 'cats', species: 'cat' },
    ];

    for (const { filter, species } of speciesToScrape) {
      try {
        console.log(`Scraping PetSmart Charities ${filter}...`);
        const speciesPets = await this.scrapeSpecies(filter, species);
        pets.push(...speciesPets);
        console.log(`Found ${speciesPets.length} ${filter} from PetSmart Charities`);
      } catch (error) {
        console.error(`Error scraping PetSmart Charities ${filter}:`, error);
        errors.push({
          type: 'SPECIES_SCRAPE_ERROR',
          message: error instanceof Error ? error.message : String(error),
          url: `${this.baseUrl}/adopt-a-pet/find-a-pet`,
        });
      }
    }

    return { pets, shelters, errors };
  }

  private async scrapeSpecies(filter: string, species: PetSpecies): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.createPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const listUrl = `${this.baseUrl}/adopt-a-pet/find-a-pet`;
      console.log(`Navigating to: ${listUrl}`);

      await page.goto(listUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Click on the species filter (dogs or cats)
      try {
        await page.waitForSelector(`text=${filter}`, { timeout: 10000 });
        await page.click(`text=${filter}`);
        await new Promise(r => setTimeout(r, 2000));
      } catch {
        console.log(`Could not click ${filter} filter, proceeding anyway`);
      }

      // Wait for pet results
      await page.waitForSelector('a[href*="/find-a-pet/results/"]', { timeout: 15000 }).catch(() => {});

      let pageNum = 1;
      const maxPages = 10;

      while (pageNum <= maxPages) {
        // Extract pet data from current page
        const petData = await page.evaluate(() => {
          const results: Array<{
            url: string;
            name: string;
            breed: string;
            location: string;
          }> = [];

          // Find all pet links - based on the actual page structure
          const petLinks = document.querySelectorAll('a[href*="/find-a-pet/results/"]');

          petLinks.forEach((link) => {
            const href = (link as HTMLAnchorElement).href;
            if (!href || results.some((r) => r.url === href)) return;

            // Get the card/container
            const card = link.closest('div') || link.parentElement;
            if (!card) return;

            // Get pet name - look for h4 or strong element with name
            const nameEl = card.querySelector('h4, strong, [class*="name"]');
            const name = nameEl?.textContent?.trim() || '';

            // Get breed - usually after the name
            const cardText = card.textContent || '';
            const lines = cardText.split('\n').map((l: string) => l.trim()).filter(Boolean);
            let breed = '';
            // Look for breed line (usually the line after name or contains breed keywords)
            for (const line of lines) {
              if (line !== name && !line.includes('HI!') && !line.includes('learn more') && 
                  !line.match(/^[A-Z\s]+$/) && line.length > 2 && line.length < 50) {
                breed = line;
                break;
              }
            }

            // Get location - usually ALL CAPS city + state
            const locationMatch = cardText.match(/([A-Z][A-Za-z\s]+)\s+([A-Z]{2})/);
            const location = locationMatch ? `${locationMatch[1].trim()}, ${locationMatch[2]}` : '';

            if (href && name) {
              results.push({ url: href, name, breed, location });
            }
          });

          return results;
        });

        if (petData.length === 0) {
          console.log(`No pets found on page ${pageNum}`);
          break;
        }

        // Process each pet
        for (const data of petData) {
          // Extract source ID from URL: /find-a-pet/results/43702494
          const sourceIdMatch = data.url.match(/\/results\/(\d+)/);
          const sourceId = sourceIdMatch ? sourceIdMatch[1] : `ps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
            age: null,
            size: null,
            gender: 'unknown',
            color: null,
            description: null,
            photos: [],
            location_city: city,
            location_state: state,
            location_zip: null,
            shelter_name: 'PetSmart Charities Partner',
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

        // Try to go to next page
        const hasNextPage = await page.evaluate(() => {
          const nextBtn = document.querySelector('a[href*="page_number"]:not([disabled]), .pagination a:last-child');
          return !!nextBtn;
        });

        if (!hasNextPage) {
          console.log(`No more pages after ${pageNum}`);
          break;
        }

        // Click next page
        try {
          await page.click('a[href*="page_number"]:last-of-type, .pagination a:last-child');
          await new Promise(r => setTimeout(r, 2000));
          pageNum++;
        } catch {
          break;
        }
      }
    } finally {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch {
        console.log('Page already closed');
      }
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

      const sourceIdMatch = url.match(/\/results\/(\d+)/);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : `ps-${Date.now()}`;

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

        const name = getText('h1, h2, [class*="name"]');
        const breed = getText('[class*="breed"]');
        const location = getText('[class*="location"]');
        const description = getText('[class*="description"], [class*="about"], [class*="bio"]');

        const pageText = document.body.textContent?.toLowerCase() || '';

        let age = '';
        if (pageText.includes('puppy') || pageText.includes('kitten')) age = 'Baby';
        else if (pageText.includes('young')) age = 'Young';
        else if (pageText.includes('adult')) age = 'Adult';
        else if (pageText.includes('senior')) age = 'Senior';

        let gender = '';
        if (pageText.includes('female')) gender = 'Female';
        else if (pageText.includes('male')) gender = 'Male';

        let size = '';
        if (pageText.includes('x-large') || pageText.includes('extra large')) size = 'X-Large';
        else if (pageText.includes('large')) size = 'Large';
        else if (pageText.includes('medium')) size = 'Medium';
        else if (pageText.includes('small')) size = 'Small';

        let speciesText = '';
        if (pageText.includes('dog')) speciesText = 'Dog';
        else if (pageText.includes('cat')) speciesText = 'Cat';

        // Get photos
        const photos: string[] = [];
        document.querySelectorAll('img').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('logo') && !src.includes('icon') && (src.includes('pet') || src.includes('animal') || src.includes('adopt'))) {
            photos.push(src);
          }
        });

        return {
          name,
          breed,
          location,
          description,
          age,
          gender,
          size,
          speciesText,
          photos,
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
        species: petData.speciesText.toLowerCase() === 'cat' ? 'cat' : 'dog',
        breed: normalizeBreed(petData.breed),
        breed_secondary: null,
        age: normalizeAge(petData.age),
        size: normalizeSize(petData.size),
        gender: normalizeGender(petData.gender),
        color: null,
        description: petData.description || null,
        photos: petData.photos,
        location_city: city,
        location_state: state,
        location_zip: null,
        shelter_name: 'PetSmart Charities Partner',
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
    } catch (error) {
      console.error(`Error parsing PetSmart pet page ${url}:`, error);
      return null;
    } finally {
      try {
        if (!page.isClosed()) {
          await page.close();
        }
      } catch {
        console.log('Page already closed');
      }
    }
  }
}

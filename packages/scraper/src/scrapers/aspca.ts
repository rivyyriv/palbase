import { BaseScraper, ScrapedPet, ScrapeResult } from './base';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeBreed,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert, PetSpecies } from '@palbase/shared';

export class ASPCAScraper extends BaseScraper {
  readonly source: ScrapeSource = 'aspca';
  readonly baseUrl = 'https://www.aspca.org';
  readonly robotsUrl = 'https://www.aspca.org/robots.txt';

  // ASPCA's main adoption pages redirect to RescueGroups.org (another aggregator)
  // Their only direct adoption center is in NYC
  private readonly nycAdoptionUrl = 'https://www.aspca.org/nyc/aspca-adoption-center';

  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];

    // Add ASPCA NYC shelter
    shelters.push({
      source: this.source,
      source_id: 'aspca-nyc',
      name: 'ASPCA Adoption Center',
      email: null,
      phone: '212-876-7700',
      website: this.nycAdoptionUrl,
      address: '424 E 92nd St',
      city: 'New York',
      state: 'NY',
      zip: '10128',
    });

    // Scrape dogs and cats from NYC adoption center
    const speciesToScrape: Array<{ path: string; species: PetSpecies }> = [
      { path: 'adoptable-dogs', species: 'dog' },
      { path: 'adoptable-cats', species: 'cat' },
    ];

    for (const { path, species } of speciesToScrape) {
      try {
        console.log(`Scraping ASPCA NYC ${species}s...`);
        const speciesPets = await this.scrapeNYC(path, species);
        pets.push(...speciesPets);
        console.log(`Found ${speciesPets.length} ${species}s from ASPCA NYC`);
      } catch (error) {
        console.error(`Error scraping ASPCA NYC ${species}s:`, error);
        errors.push({
          type: 'NYC_SCRAPE_ERROR',
          message: error instanceof Error ? error.message : String(error),
          url: `${this.nycAdoptionUrl}/${path}`,
        });
      }
    }

    return { pets, shelters, errors };
  }

  private async scrapeNYC(path: string, species: PetSpecies): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.createPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const listUrl = `${this.nycAdoptionUrl}/${path}`;
      console.log(`Navigating to: ${listUrl}`);

      await page.goto(listUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for content to load
      await page.waitForSelector('a[href*="/nyc/adoption/"], .pet-card, .animal-card, [class*="pet"]', {
        timeout: 15000,
      }).catch(() => {});

      // Scroll to load all content
      let previousHeight = 0;
      let scrollAttempts = 0;

      while (scrollAttempts < 5) {
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) break;
        previousHeight = currentHeight;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1500));
        scrollAttempts++;
      }

      // Extract pet data
      const petData = await page.evaluate(() => {
        const results: Array<{
          url: string;
          name: string;
          breed: string;
          age: string;
          gender: string;
          photo: string;
        }> = [];

        // Look for pet links - ASPCA NYC format
        const petLinks = document.querySelectorAll('a[href*="/nyc/adoption/"], a[href*="/adoptable-"]');

        petLinks.forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          if (!href || results.some((r) => r.url === href)) return;

          const card = link.closest('article, .pet-card, .animal-card, div[class*="pet"]') || link.parentElement;
          if (!card) return;

          const cardText = card.textContent || '';

          // Get name
          const nameEl = card.querySelector('h2, h3, h4, [class*="name"]');
          const name = nameEl?.textContent?.trim() || '';

          // Get breed
          let breed = '';
          const breedEl = card.querySelector('[class*="breed"]');
          if (breedEl) {
            breed = breedEl.textContent?.trim() || '';
          }

          // Get age
          let age = '';
          const ageMatch = cardText.match(/(\d+)\s*(year|yr|month|mo|week)/i);
          if (ageMatch) {
            age = ageMatch[0];
          } else if (cardText.toLowerCase().includes('puppy') || cardText.toLowerCase().includes('kitten')) {
            age = 'Baby';
          }

          // Get gender
          let gender = '';
          if (cardText.includes('Female')) gender = 'Female';
          else if (cardText.includes('Male')) gender = 'Male';

          // Get photo
          const img = card.querySelector('img') as HTMLImageElement | null;
          const photo = img?.src || img?.dataset?.src || '';

          if (href && name) {
            results.push({ url: href, name, breed, age, gender, photo });
          }
        });

        return results;
      });

      // Process each pet
      for (const data of petData) {
        // Generate source ID from URL or name
        const urlParts = data.url.split('/');
        const sourceId = urlParts[urlParts.length - 1] || `aspca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
          location_city: 'New York',
          location_state: 'NY',
          location_zip: '10128',
          shelter_name: 'ASPCA Adoption Center',
          shelter_email: null,
          shelter_phone: '212-876-7700',
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

      const urlParts = url.split('/');
      const sourceId = urlParts[urlParts.length - 1] || `aspca-${Date.now()}`;

      const petData = await page.evaluate((pageUrl: string) => {
        const getText = (selectors: string): string => {
          for (const selector of selectors.split(',')) {
            const el = document.querySelector(selector.trim());
            if (el?.textContent?.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const name = getText('h1, [class*="petName"], [class*="name"]');
        const breed = getText('[class*="breed"]');
        const description = getText('[class*="description"], [class*="about"], [class*="bio"], .pet-story');

        const pageText = document.body.textContent?.toLowerCase() || '';

        let age = '';
        const ageMatch = pageText.match(/(\d+)\s*(year|yr|month|mo)/i);
        if (ageMatch) age = ageMatch[0];

        let gender = '';
        if (pageText.includes('female')) gender = 'Female';
        else if (pageText.includes('male')) gender = 'Male';

        let size = '';
        if (pageText.includes('large')) size = 'Large';
        else if (pageText.includes('medium')) size = 'Medium';
        else if (pageText.includes('small')) size = 'Small';

        let speciesText = '';
        if (pageUrl.includes('dog') || pageText.includes('dog')) speciesText = 'Dog';
        else if (pageUrl.includes('cat') || pageText.includes('cat')) speciesText = 'Cat';

        // Get photos
        const photos: string[] = [];
        document.querySelectorAll('.pet-photos img, .gallery img, img[src*="pet"], img[src*="animal"]').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('logo')) {
            photos.push(src);
          }
        });

        return { name, breed, description, age, gender, size, speciesText, photos };
      }, url);

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
        location_city: 'New York',
        location_state: 'NY',
        location_zip: '10128',
        shelter_name: 'ASPCA Adoption Center',
        shelter_email: null,
        shelter_phone: '212-876-7700',
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
      console.error(`Error parsing ASPCA pet page ${url}:`, error);
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

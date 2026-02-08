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

        // Wait for skeleton loaders to disappear and real content to appear
        // The site uses tw-animate-pulse class for loading skeletons
        console.log('Waiting for page content to load...');
        
        // Wait up to 30 seconds for actual pet data to load
        await page.waitForFunction(
          () => {
            // Check if there are links to pet profiles (real data)
            const petLinks = document.querySelectorAll('a[href*="/pet/"]');
            // Check if skeletons are still visible
            const skeletons = document.querySelectorAll('.tw-animate-pulse');
            // We want pet links and minimal skeletons
            return petLinks.length > 0 && skeletons.length < 5;
          },
          { timeout: 30000 }
        ).catch(() => {
          console.log('Timeout waiting for content, trying to extract anyway...');
        });

        // Additional wait for any final renders
        await this.sleep(2000);

        // Extract pet data from the page
        const petData = await page.evaluate(function() {
          var results = [];

          // Find all links to pet profiles - this is the most reliable selector
          var petLinks = document.querySelectorAll('a[href*="/pet/"]');
          var processedUrls = new Set();
          
          petLinks.forEach(function(link) {
            var url = (link as any).href;
            
            // Skip if we've already processed this pet
            if (processedUrls.has(url)) return;
            processedUrls.add(url);
            
            // The card is usually the parent container of the link
            var card = link.closest('[class*="tw-rounded-lg"]') || link.closest('[class*="overflow-hidden"]') || link.parentElement?.parentElement;
            if (!card) return;

            // Get pet name - usually in a prominent text element
            var name = '';
            var nameEl = card.querySelector('[class*="font-secondary"], [class*="font-bold"]');
            if (nameEl && nameEl.textContent) {
              name = nameEl.textContent.trim();
            }
            // Fallback: look for text that's NOT "View Profile" or "Fast Facts"
            if (!name) {
              var allText = card.querySelectorAll('span, div');
              for (var i = 0; i < allText.length; i++) {
                var t = allText[i].textContent?.trim() || '';
                if (t && t.length > 1 && t.length < 30 && 
                    !t.includes('VIEW') && !t.includes('FAST') && 
                    !t.includes('mile') && !t.includes('•')) {
                  name = t;
                  break;
                }
              }
            }

            // Get all text content for parsing
            var cardText = card.textContent || '';

            // Get breed - usually after age/gender line
            var breed = '';
            var breedMatch = cardText.match(/(?:Adult|Young|Senior|Baby|Puppy|Kitten)\s*•\s*(?:Male|Female)\s*\n?\s*([A-Za-z\s&]+(?:Breed|Mix)?)/i);
            if (breedMatch) {
              breed = breedMatch[1].trim();
            }

            // Get age
            var age = '';
            if (cardText.includes('Adult')) age = 'Adult';
            else if (cardText.includes('Young')) age = 'Young';
            else if (cardText.includes('Senior')) age = 'Senior';
            else if (cardText.includes('Baby') || cardText.includes('Puppy') || cardText.includes('Kitten')) age = 'Baby';

            // Get gender
            var gender = '';
            if (cardText.includes('Female')) gender = 'Female';
            else if (cardText.includes('Male')) gender = 'Male';

            // Get location - look for "X miles away" pattern
            var location = '';
            var locationMatch = cardText.match(/(\d+)\s*miles?\s*away/i);
            if (locationMatch) {
              location = locationMatch[0];
            }

            // Get photo
            var photo = '';
            var imgEl = card.querySelector('img[src*="cloudfront"], img[src*="petfinder"]');
            if (imgEl) {
              photo = (imgEl as any).src || '';
            }

            if (url && name && name !== 'Loading...') {
              results.push({ url: url, name: name, breed: breed, age: age, gender: gender, location: location, photo: photo });
            }
          });

          return results;
        });

        console.log(`Found ${petData.length} pets on page ${pageNum}`);

        if (petData.length === 0) {
          console.log(`No pets found on page ${pageNum}, stopping`);
          break;
        }

        // Process each pet
        for (const data of petData) {
          // Extract source ID from URL: /pet/fluffy-123456789/
          const sourceIdMatch = data.url.match(/\/pet\/[^/]+-(\d+)/);
          const sourceId = sourceIdMatch ? sourceIdMatch[1] : `pf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Parse location - might be "X miles away" which doesn't give us city/state
          // We'll leave these null and could enhance later
          const city = null;
          const state = null;

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

        // For now, limit to first page to test - pagination on this site is complex
        // The URL ?page=X approach may work, but let's verify data extraction first
        if (pageNum >= 3) {
          console.log('Limiting to 3 pages for now');
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

      const petData = await page.evaluate(function() {
        function getText(selectors) {
          var parts = selectors.split(',');
          for (var i = 0; i < parts.length; i++) {
            var el = document.querySelector(parts[i].trim());
            if (el && el.textContent && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        }

        var name = getText('[data-test="pet-name"], h1, [class*="petName"]');
        var breed = getText('[data-test="pet-breed"], [class*="breed"]');
        var age = getText('[data-test="pet-age"], [class*="age"]');
        var size = getText('[data-test="pet-size"], [class*="size"]');
        var gender = getText('[data-test="pet-gender"], [class*="gender"]');
        var speciesText = getText('[data-test="pet-type"], [class*="species"]');
        var description = getText('[data-test="pet-description"], [class*="description"], [class*="story"]');
        var location = getText('[data-test="pet-location"], [class*="location"]');
        var shelterName = getText('[data-test="organization-name"], [class*="organizationName"], [class*="shelter"]');

        // Get photos
        var photos = [];
        document.querySelectorAll('[data-test="pet-photo"] img, [class*="petPhoto"] img, [class*="gallery"] img').forEach(function(img) {
          var src = (img as any).src;
          if (src && !src.includes('placeholder')) {
            photos.push(src);
          }
        });

        // Check attributes
        var pageText = document.body.textContent ? document.body.textContent.toLowerCase() : '';

        return {
          name: name,
          breed: breed,
          age: age,
          size: size,
          gender: gender,
          speciesText: speciesText,
          description: description,
          location: location,
          shelterName: shelterName,
          photos: photos,
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

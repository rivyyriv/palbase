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

export class AdoptAPetScraper extends BaseScraper {
  readonly source: ScrapeSource = 'adoptapet';
  readonly baseUrl = 'https://www.adoptapet.com';
  readonly robotsUrl = 'https://www.adoptapet.com/robots.txt';

  // Major US cities to scrape from
  private readonly locations = [
    { city: 'new-york', state: 'new-york', stateCode: 'NY' },
    { city: 'los-angeles', state: 'california', stateCode: 'CA' },
    { city: 'chicago', state: 'illinois', stateCode: 'IL' },
    { city: 'houston', state: 'texas', stateCode: 'TX' },
    { city: 'phoenix', state: 'arizona', stateCode: 'AZ' },
  ];

  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];
    const seenPetIds = new Set<string>();

    // Scrape dogs and cats from multiple locations
    const speciesToScrape: Array<{ key: string; species: PetSpecies }> = [
      { key: 'dog', species: 'dog' },
      { key: 'cat', species: 'cat' },
    ];

    for (const { key, species } of speciesToScrape) {
      for (const location of this.locations) {
        try {
          console.log(`Scraping AdoptAPet ${key}s in ${location.city}, ${location.stateCode}...`);
          const locationPets = await this.scrapeLocation(key, species, location, seenPetIds);
          pets.push(...locationPets);
          console.log(`Found ${locationPets.length} ${key}s in ${location.city}`);
        } catch (error) {
          console.error(`Error scraping AdoptAPet ${location.city}:`, error);
          errors.push({
            type: 'LOCATION_SCRAPE_ERROR',
            message: error instanceof Error ? error.message : String(error),
            url: `${this.baseUrl}/s/adopt-a-${key}/${location.city}/${location.state}`,
          });
        }
      }
    }

    return { pets, shelters, errors };
  }

  private async scrapeLocation(
    speciesKey: string,
    species: PetSpecies,
    location: { city: string; state: string; stateCode: string },
    seenPetIds: Set<string>
  ): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.createPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const listUrl = `${this.baseUrl}/s/adopt-a-${speciesKey}/${location.city}/${location.state}`;
      console.log(`Navigating to: ${listUrl}`);

      await page.goto(listUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for pet results to load
      await page.waitForSelector('a[href*="/pet/"], .pet-card, [class*="PetCard"]', {
        timeout: 15000,
      }).catch(() => {});

      // Scroll to load more pets
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 5;

      while (scrollAttempts < maxScrollAttempts) {
        const currentHeight = await page.evaluate(function() { return document.body.scrollHeight; });

        if (currentHeight === previousHeight) {
          break;
        }

        previousHeight = currentHeight;
        await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
        await new Promise(r => setTimeout(r, 1500));
        scrollAttempts++;
      }

      // Extract pet data from the page
      const petData = await page.evaluate(function() {
        var results = [];

        // Find all pet links
        var petLinks = document.querySelectorAll('a[href*="/pet/"]');

        petLinks.forEach(function(link) {
          var href = (link as any).href;
          if (!href || results.some(function(r) { return r.url === href; })) return;

          // Find the card container
          var card = link.closest('[class*="pet"], [class*="card"], article') || link.parentElement;
          if (!card) return;

          // Get pet name from various possible locations
          var nameEl = card.querySelector('h2, h3, [class*="name"], [class*="title"]');
          var name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : '';

          // Get breed
          var breedEl = card.querySelector('[class*="breed"]');
          var breed = breedEl && breedEl.textContent ? breedEl.textContent.trim() : '';

          // Get details text
          var cardText = card.textContent || '';

          // Extract age
          var age = '';
          var ageMatch = cardText.match(/(\d+)\s*(year|yr|month|mo|week|wk)/i);
          if (ageMatch) {
            age = ageMatch[0];
          } else if (cardText.includes('Puppy') || cardText.includes('Kitten')) {
            age = 'Baby';
          } else if (cardText.includes('Young')) {
            age = 'Young';
          } else if (cardText.includes('Adult')) {
            age = 'Adult';
          } else if (cardText.includes('Senior')) {
            age = 'Senior';
          }

          // Extract gender
          var gender = '';
          if (cardText.includes('Female')) gender = 'Female';
          else if (cardText.includes('Male')) gender = 'Male';

          // Extract size
          var size = '';
          if (cardText.includes('Extra Large') || cardText.includes('XL')) size = 'X-Large';
          else if (cardText.includes('Large')) size = 'Large';
          else if (cardText.includes('Medium')) size = 'Medium';
          else if (cardText.includes('Small')) size = 'Small';

          // Get photo
          var img = card.querySelector('img');
          var photo = img ? (img.src || img.dataset.src || '') : '';

          if (href && name) {
            results.push({ url: href, name: name, breed: breed, age: age, gender: gender, size: size, photo: photo });
          }
        });

        return results;
      });

      // Process each pet
      for (const data of petData) {
        // Extract source ID from URL: /pet/43045869-new-york-...
        const sourceIdMatch = data.url.match(/\/pet\/(\d+)/);
        const sourceId = sourceIdMatch ? sourceIdMatch[1] : `aap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Skip if we've already seen this pet
        if (seenPetIds.has(sourceId)) continue;
        seenPetIds.add(sourceId);

        const pet: ScrapedPet = {
          source_id: sourceId,
          source_url: data.url,
          shelter_id: null,
          name: data.name || 'Unknown',
          species,
          breed: normalizeBreed(data.breed),
          breed_secondary: null,
          age: normalizeAge(data.age),
          size: normalizeSize(data.size),
          gender: normalizeGender(data.gender),
          color: null,
          description: null,
          photos: data.photo ? [data.photo] : [],
          location_city: location.city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          location_state: location.stateCode,
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

      const sourceIdMatch = url.match(/\/pet\/(\d+)/);
      const sourceId = sourceIdMatch ? sourceIdMatch[1] : `aap-${Date.now()}`;

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

        var name = getText('h1, [class*="petName"], [class*="name"]');
        var breed = getText('[class*="breed"]');
        var description = getText('[class*="description"], [class*="about"], [class*="bio"]');
        var shelterName = getText('[class*="shelter"], [class*="organization"]');
        var location = getText('[class*="location"]');

        var pageText = document.body.textContent ? document.body.textContent.toLowerCase() : '';

        // Extract structured info
        var age = '';
        var gender = '';
        var size = '';
        var speciesText = '';

        if (pageText.includes('puppy') || pageText.includes('kitten')) age = 'Baby';
        else if (pageText.includes('young')) age = 'Young';
        else if (pageText.includes('adult')) age = 'Adult';
        else if (pageText.includes('senior')) age = 'Senior';

        if (pageText.includes('female')) gender = 'Female';
        else if (pageText.includes('male')) gender = 'Male';

        if (pageText.includes('extra large') || pageText.includes('x-large')) size = 'X-Large';
        else if (pageText.includes('large')) size = 'Large';
        else if (pageText.includes('medium')) size = 'Medium';
        else if (pageText.includes('small')) size = 'Small';

        if (pageText.includes('dog')) speciesText = 'Dog';
        else if (pageText.includes('cat')) speciesText = 'Cat';

        // Get photos
        var photos = [];
        document.querySelectorAll('[class*="photo"] img, [class*="gallery"] img, [class*="image"] img').forEach(function(img) {
          var src = (img as any).src;
          if (src && !src.includes('placeholder') && !src.includes('logo')) {
            photos.push(src);
          }
        });

        return {
          name: name,
          breed: breed,
          description: description,
          shelterName: shelterName,
          location: location,
          age: age,
          gender: gender,
          size: size,
          speciesText: speciesText,
          photos: photos,
          goodWithKids: pageText.includes('good with kids') || pageText.includes('good with children'),
          goodWithDogs: pageText.includes('good with dogs'),
          goodWithCats: pageText.includes('good with cats'),
          houseTrained: pageText.includes('house trained') || pageText.includes('housetrained'),
          spayedNeutered: pageText.includes('spayed') || pageText.includes('neutered'),
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
        special_needs: null,
        adoption_fee: null,
        status: 'active',
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error parsing AdoptAPet pet page ${url}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }
}

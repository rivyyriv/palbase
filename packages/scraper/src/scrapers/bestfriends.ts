import { BaseScraper, ScrapedPet, ScrapeResult } from './base';
import {
  normalizeAge,
  normalizeSize,
  normalizeGender,
  normalizeSpecies,
  normalizeBreed,
  normalizeDescription,
} from '../normalizers/pet';
import type { ScrapeSource, ShelterInsert } from '@palbase/shared';

export class BestFriendsScraper extends BaseScraper {
  readonly source: ScrapeSource = 'bestfriends';
  readonly baseUrl = 'https://bestfriends.org';
  readonly robotsUrl = 'https://bestfriends.org/robots.txt';

  async scrape(): Promise<ScrapeResult> {
    const pets: ScrapedPet[] = [];
    const shelters: ShelterInsert[] = [];
    const errors: ScrapeResult['errors'] = [];

    // Add shelter info
    const shelter: ShelterInsert = {
      source: this.source,
      source_id: 'bestfriends-sanctuary',
      name: 'Best Friends Animal Sanctuary',
      email: null,
      phone: '435-644-2001',
      website: `${this.baseUrl}/adopt/adopt-our-sanctuary`,
      address: '5001 Angel Canyon Road',
      city: 'Kanab',
      state: 'UT',
      zip: '84741',
    };
    shelters.push(shelter);

    // Scrape the sanctuary adoption page - this is the main source
    try {
      console.log('Scraping Best Friends Sanctuary adoption page...');
      const sanctuaryPets = await this.scrapeSanctuaryPage();
      pets.push(...sanctuaryPets);
      console.log(`Found ${sanctuaryPets.length} pets from Best Friends Sanctuary`);
    } catch (error) {
      console.error('Error scraping Best Friends Sanctuary:', error);
      errors.push({
        type: 'SANCTUARY_PAGE_ERROR',
        message: error instanceof Error ? error.message : String(error),
        url: `${this.baseUrl}/adopt/adopt-our-sanctuary`,
      });
    }

    return { pets, shelters, errors };
  }

  private async scrapeSanctuaryPage(): Promise<ScrapedPet[]> {
    const pets: ScrapedPet[] = [];
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.createPage();
    
    try {
      // Set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const listUrl = `${this.baseUrl}/adopt/adopt-our-sanctuary`;
      console.log(`Navigating to: ${listUrl}`);
      
      await page.goto(listUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Wait for pet cards to load
      await page.waitForSelector('a[href*="/sanctuary/adopt/"]', { timeout: 30000 });

      // Scroll to load more pets (the page likely has infinite scroll or lazy loading)
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 10;

      while (scrollAttempts < maxScrollAttempts) {
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        
        if (currentHeight === previousHeight) {
          // Try clicking "Load More" button if it exists
          const loadMoreBtn = await page.$('button:has-text("Load More"), a:has-text("Load More"), [class*="load-more"]').catch(() => null);
          if (loadMoreBtn) {
            await loadMoreBtn.click();
            await new Promise(r => setTimeout(r, 2000));
          } else {
            break;
          }
        }
        
        previousHeight = currentHeight;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 1500));
        scrollAttempts++;
      }

      // Extract all pet links
      const petLinks = await page.evaluate(() => {
        const links: string[] = [];
        const anchors = document.querySelectorAll('a[href*="/sanctuary/adopt/"]');
        anchors.forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          if (href && !links.includes(href)) {
            links.push(href);
          }
        });
        return links;
      });

      console.log(`Found ${petLinks.length} pet links to process`);

      // Process each pet link (limit to avoid overloading)
      const linksToProcess = petLinks.slice(0, 100);
      
      for (const petUrl of linksToProcess) {
        try {
          await this.rateLimit();
          
          const pet = await this.scrapePetPage(page, petUrl);
          if (pet) {
            pets.push(pet);
            console.log(`Scraped: ${pet.name} (${pet.species})`);
          }
        } catch (error) {
          console.error(`Error scraping pet ${petUrl}:`, error);
        }
      }

    } finally {
      await page.close();
    }

    return pets;
  }

  private async scrapePetPage(page: any, url: string): Promise<ScrapedPet | null> {
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Extract the numeric ID from URL: /sanctuary/adopt/211446194/mayella
      const urlMatch = url.match(/\/sanctuary\/adopt\/(\d+)\/([^/]+)/);
      const sourceId = urlMatch ? urlMatch[1] : `bf-${Date.now()}`;
      const nameFromUrl = urlMatch ? urlMatch[2].replace(/-/g, ' ') : null;

      // Wait for content to load
      await page.waitForSelector('h1, [class*="pet-name"], [class*="animal-name"]', { timeout: 10000 }).catch(() => {});

      const petData = await page.evaluate(function() {
        // Helper to get text content safely
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

        // Get the name from page title or headers
        var name = getText('h1, .pet-name, .animal-name, [class*="pet-name"], [class*="animal-name"]');

        // Get all images
        var photos = [];
        document.querySelectorAll('img').forEach(function(img) {
          var src = img.src || img.dataset.src;
          if (src && (src.includes('animal') || src.includes('pet') || src.includes('adopt'))) {
            photos.push(src);
          }
        });

        // Try to find pet details from the page
        var pageText = document.body.innerText;
        
        // Extract species from page content
        var speciesText = '';
        var speciesPatterns = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Horse', 'Pig', 'Goat', 'Guinea Pig', 'Hamster', 'Turtle', 'Snake', 'Lizard'];
        for (var i = 0; i < speciesPatterns.length; i++) {
          if (pageText.toLowerCase().includes(speciesPatterns[i].toLowerCase())) {
            speciesText = speciesPatterns[i];
            break;
          }
        }

        // Extract breed - look for breed-related text
        var breed = '';
        var breedMatch = pageText.match(/(?:Breed|Looks like)[:\s]+([A-Za-z\s,]+?)(?:\n|$|\.)/i);
        if (breedMatch) {
          breed = breedMatch[1].trim();
        }

        // Extract age
        var age = '';
        var ageMatch = pageText.match(/(?:Age|Years?|Months?)[:\s]*(\d+\s*(?:years?|months?|yrs?|mos?)|\w+)/i);
        if (ageMatch) {
          age = ageMatch[1].trim();
        }
        // Also check for age categories
        if (pageText.includes('Baby')) age = age || 'Baby';
        if (pageText.includes('Young')) age = age || 'Young';
        if (pageText.includes('Adult')) age = age || 'Adult';
        if (pageText.includes('Senior')) age = age || 'Senior';

        // Extract size
        var size = '';
        if (pageText.includes('X-Large') || pageText.includes('Extra Large')) size = 'X-Large';
        else if (pageText.includes('Large')) size = 'Large';
        else if (pageText.includes('Medium')) size = 'Medium';
        else if (pageText.includes('Small')) size = 'Small';

        // Extract gender
        var gender = '';
        if (pageText.includes('Female')) gender = 'Female';
        else if (pageText.includes('Male')) gender = 'Male';

        // Extract color
        var color = '';
        var colorMatch = pageText.match(/(?:Color|Coat)[:\s]+([A-Za-z\s,/]+?)(?:\n|$|\.)/i);
        if (colorMatch) {
          color = colorMatch[1].trim();
        }

        // Extract description
        var descriptionEl = document.querySelector('[class*="description"], [class*="bio"], [class*="about"], .body-text, article p');
        var description = descriptionEl && descriptionEl.textContent ? descriptionEl.textContent.trim() : '';

        return {
          name: name,
          speciesText: speciesText,
          breed: breed,
          age: age,
          size: size,
          gender: gender,
          color: color,
          description: description,
          photos: photos,
        };
      });

      // Use name from URL if page didn't provide one
      const finalName = petData.name || (nameFromUrl ? this.capitalizeWords(nameFromUrl) : 'Unknown');

      const pet: ScrapedPet = {
        source_id: sourceId,
        source_url: url,
        shelter_id: null,
        name: finalName,
        species: normalizeSpecies(petData.speciesText) || 'other',
        breed: normalizeBreed(petData.breed),
        breed_secondary: null,
        age: normalizeAge(petData.age),
        size: normalizeSize(petData.size),
        gender: normalizeGender(petData.gender),
        color: petData.color || null,
        description: normalizeDescription(petData.description),
        photos: petData.photos.slice(0, 10), // Limit to 10 photos
        location_city: 'Kanab',
        location_state: 'UT',
        location_zip: '84741',
        shelter_name: 'Best Friends Animal Sanctuary',
        shelter_email: null,
        shelter_phone: '435-644-2001',
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

      return pet;

    } catch (error) {
      console.error(`Error parsing Best Friends pet page ${url}:`, error);
      return null;
    }
  }

  private capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async parsePetPage(url: string): Promise<ScrapedPet | null> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    
    const page = await this.createPage();
    try {
      return await this.scrapePetPage(page, url);
    } finally {
      await page.close();
    }
  }
}

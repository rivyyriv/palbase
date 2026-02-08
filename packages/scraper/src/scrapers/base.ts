import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import { config } from '../config';
import type { PetInsert, ScrapeSource, ShelterInsert } from '@palbase/shared';

export interface ScrapedPet extends Omit<PetInsert, 'source'> {
  shelter_source_id?: string;
}

export interface ScrapeResult {
  pets: ScrapedPet[];
  shelters: ShelterInsert[];
  errors: Array<{
    type: string;
    message: string;
    url?: string;
  }>;
}

export abstract class BaseScraper {
  abstract readonly source: ScrapeSource;
  abstract readonly baseUrl: string;
  abstract readonly robotsUrl: string;

  protected browser: Browser | null = null;
  protected robotsTxt: ReturnType<typeof robotsParser> | null = null;
  protected lastRequestTime = 0;

  /**
   * Initialize the scraper (browser, robots.txt, etc.)
   */
  async initialize(): Promise<void> {
    // Use Browserless.io if token is provided, otherwise launch local Chrome
    const browserlessToken = config.browserless.token;
    
    if (browserlessToken) {
      // Connect to Browserless.io cloud browser
      const browserWSEndpoint = `${config.browserless.endpoint}?token=${browserlessToken}`;
      console.log(`Connecting to Browserless.io...`);
      this.browser = await puppeteer.connect({ browserWSEndpoint });
      console.log(`Connected to Browserless.io`);
    } else {
      // Fallback to local Chrome (for local development)
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`Launching local browser...`);
      this.browser = await puppeteer.launch({
        headless: true,
        ...(executablePath && { executablePath }),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--single-process',
        ],
      });
    }

    // Fetch and parse robots.txt
    try {
      const response = await fetch(this.robotsUrl);
      const robotsText = await response.text();
      this.robotsTxt = robotsParser(this.robotsUrl, robotsText);
    } catch (error) {
      console.warn(`Could not fetch robots.txt for ${this.source}:`, error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      // For Browserless.io, disconnect instead of close to avoid terminating the remote browser
      if (config.browserless.token) {
        this.browser.disconnect();
      } else {
        await this.browser.close();
      }
      this.browser = null;
    }
  }

  /**
   * Check if a URL is allowed by robots.txt
   */
  protected isAllowed(url: string): boolean {
    if (!this.robotsTxt) return true;
    return this.robotsTxt.isAllowed(url, 'Palbase-Bot') ?? true;
  }

  /**
   * Get crawl delay from robots.txt
   */
  protected getCrawlDelay(): number {
    if (!this.robotsTxt) {
      return config.scraper.rateLimitMinMs;
    }
    const delay = this.robotsTxt.getCrawlDelay('Palbase-Bot');
    if (delay) {
      return delay * 1000; // Convert to ms
    }
    return config.scraper.rateLimitMinMs;
  }

  /**
   * Wait for rate limiting
   */
  protected async rateLimit(): Promise<void> {
    const now = Date.now();
    const minDelay = Math.max(this.getCrawlDelay(), config.scraper.rateLimitMinMs);
    const maxDelay = config.scraper.rateLimitMaxMs;
    const randomDelay = minDelay + Math.random() * (maxDelay - minDelay);
    
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < randomDelay) {
      await this.sleep(randomDelay - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a new browser page with common settings
   */
  protected async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Set user agent
    await page.setUserAgent(
      'Palbase-Bot/1.0 (Pet adoption aggregator; +https://palbase.com/bot)'
    );

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set timeout
    page.setDefaultTimeout(config.scraper.pageTimeout);
    page.setDefaultNavigationTimeout(config.scraper.pageTimeout);

    return page;
  }

  /**
   * Fetch a page and return cheerio instance
   */
  protected async fetchPage(url: string): Promise<cheerio.CheerioAPI | null> {
    if (!this.isAllowed(url)) {
      console.warn(`URL blocked by robots.txt: ${url}`);
      return null;
    }

    await this.rateLimit();

    const page = await this.createPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const html = await page.content();
      return cheerio.load(html);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Fetch static HTML (no JS rendering needed)
   */
  protected async fetchStatic(url: string): Promise<cheerio.CheerioAPI | null> {
    if (!this.isAllowed(url)) {
      console.warn(`URL blocked by robots.txt: ${url}`);
      return null;
    }

    await this.rateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Palbase-Bot/1.0 (Pet adoption aggregator; +https://palbase.com/bot)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return cheerio.load(html);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  /**
   * Main scrape method - to be implemented by each scraper
   */
  abstract scrape(): Promise<ScrapeResult>;

  /**
   * Parse a single pet listing page
   */
  abstract parsePetPage(url: string): Promise<ScrapedPet | null>;
}

import { config, validateConfig } from './config';
import { startWorker, stopWorker, addAllScrapeJobs, addScrapeJob } from './jobs/queue';
import { startScheduler, stopScheduler } from './scheduler';
import type { ScrapeSource } from '@palbase/shared';

async function main(): Promise<void> {
  console.log('Starting Palbase Scraper Service...');

  // Validate configuration
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }

  // Start the job worker
  startWorker();

  // Start the scheduler
  startScheduler();

  console.log(`Scraper service running on port ${config.port}`);
  console.log('Press Ctrl+C to stop');

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    stopScheduler();
    await stopWorker();
    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Simple HTTP server for health checks and manual triggers
  const http = await import('http');
  
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${config.port}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // Trigger all scrapes
    if (url.pathname === '/api/scrape/all' && req.method === 'POST') {
      try {
        await addAllScrapeJobs('manual');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'All scrape jobs queued' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to queue jobs' }));
      }
      return;
    }

    // Trigger single source scrape
    const scrapeMatch = url.pathname.match(/^\/api\/scrape\/(\w+)$/);
    if (scrapeMatch && req.method === 'POST') {
      const source = scrapeMatch[1] as ScrapeSource;
      const validSources = ['rescuegroups', 'petfinder', 'adoptapet', 'aspca', 'bestfriends', 'petsmart'];
      
      if (!validSources.includes(source)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Invalid source: ${source}` }));
        return;
      }

      try {
        const job = await addScrapeJob(source, 'manual');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: `Scrape job queued for ${source}`, jobId: job.id }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to queue job' }));
      }
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(config.port, () => {
    console.log(`HTTP server listening on port ${config.port}`);
  });
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

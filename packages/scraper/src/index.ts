import { config, validateConfig } from './config';
import { runSync } from './sync';
import { startScheduler, stopScheduler } from './scheduler';

async function main(): Promise<void> {
  console.log('Starting Palbase Sync Service...');

  // Validate configuration
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }

  // Start the scheduler (daily cron)
  startScheduler();

  console.log(`Sync service running on port ${config.port}`);
  console.log('Press Ctrl+C to stop');

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    stopScheduler();
    console.log('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Track sync state
  let isSyncing = false;

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

    // Trigger sync (manual)
    if (url.pathname === '/api/sync' && req.method === 'POST') {
      if (isSyncing) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sync already in progress' }));
        return;
      }

      // Run sync in background
      isSyncing = true;
      runSync('manual')
        .then((result) => {
          console.log('Manual sync completed:', result);
        })
        .catch((error) => {
          console.error('Manual sync failed:', error);
        })
        .finally(() => {
          isSyncing = false;
        });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Sync started' }));
      return;
    }

    // Backward compatibility: /api/scrape/all and /api/scrape/rescuegroups both trigger sync
    if (
      (url.pathname === '/api/scrape/all' || url.pathname === '/api/scrape/rescuegroups') &&
      req.method === 'POST'
    ) {
      if (isSyncing) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Sync already in progress' }));
        return;
      }

      isSyncing = true;
      runSync('manual')
        .then((result) => {
          console.log('Manual sync completed:', result);
        })
        .catch((error) => {
          console.error('Manual sync failed:', error);
        })
        .finally(() => {
          isSyncing = false;
        });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Sync started' }));
      return;
    }

    // Sync status
    if (url.pathname === '/api/sync/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ syncing: isSyncing }));
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

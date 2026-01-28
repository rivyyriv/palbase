'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { SOURCE_OPTIONS } from '@palbase/shared';

const SCRAPER_API_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || 'http://localhost:4000';

export function ScrapeActions() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const triggerScrape = async (source: string | 'all') => {
    setIsLoading(source);
    setMessage(null);

    try {
      const endpoint = source === 'all' 
        ? `${SCRAPER_API_URL}/api/scrape/all`
        : `${SCRAPER_API_URL}/api/scrape/${source}`;

      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setMessage(`Scrape job queued: ${data.message || 'Success'}`);
      } else {
        setMessage(`Error: ${data.error || 'Failed to queue scrape'}`);
      }
    } catch (error) {
      setMessage('Error: Could not connect to scraper service');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Scrape Controls</h2>
      
      {message && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          message.startsWith('Error') 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => triggerScrape('all')}
          disabled={isLoading !== null}
          className="btn-primary btn-md gap-2"
        >
          {isLoading === 'all' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run All Scrapes
        </button>

        {SOURCE_OPTIONS.map((source) => (
          <button
            key={source.value}
            onClick={() => triggerScrape(source.value)}
            disabled={isLoading !== null}
            className="btn-outline btn-md gap-2"
          >
            {isLoading === source.value ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {source.label}
          </button>
        ))}
      </div>
    </div>
  );
}

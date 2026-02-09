'use client';

import { useState } from 'react';
import { Play, Loader2, RefreshCw } from 'lucide-react';

const SYNC_API_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || 'http://localhost:4000';

export function ScrapeActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const triggerSync = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${SYNC_API_URL}/api/sync`, { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setMessage(`Sync started: ${data.message || 'Fetching pets from RescueGroups...'}`);
      } else {
        setMessage(`Error: ${data.error || 'Failed to start sync'}`);
      }
    } catch (error) {
      setMessage('Error: Could not connect to sync service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Sync Controls</h2>
      
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
          onClick={triggerSync}
          disabled={isLoading}
          className="btn-primary btn-md gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Now
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Fetches adoptable pets from RescueGroups.org (6,200+ shelters). Runs automatically daily at 3 AM.
      </p>
    </div>
  );
}

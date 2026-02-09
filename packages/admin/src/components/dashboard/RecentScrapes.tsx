import { formatDate, formatDuration, SOURCE_OPTIONS } from '@palbase/shared';
import type { ScrapeLog } from '@palbase/shared';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';

interface RecentScrapesProps {
  scrapes: ScrapeLog[];
}

const statusIcons = {
  completed: CheckCircle,
  failed: XCircle,
  running: Play,
  pending: Clock,
};

const statusColors = {
  completed: 'text-green-600',
  failed: 'text-red-600',
  running: 'text-blue-600',
  pending: 'text-yellow-600',
};

export function RecentScrapes({ scrapes }: RecentScrapesProps) {
  return (
    <div className="card">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Syncs</h2>
      </div>

      {scrapes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-medium text-gray-600">
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Pets Found</th>
                <th className="px-6 py-3">Added</th>
                <th className="px-6 py-3">Removed</th>
                <th className="px-6 py-3">Errors</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scrapes.map((scrape) => {
                const StatusIcon = statusIcons[scrape.status];
                const sourceLabel = SOURCE_OPTIONS.find(s => s.value === scrape.source)?.label || scrape.source;

                return (
                  <tr key={scrape.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sourceLabel}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 ${statusColors[scrape.status]}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm capitalize">{scrape.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scrape.pets_found.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600">
                      +{scrape.pets_added.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      -{scrape.pets_removed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scrape.error_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scrape.duration_ms ? formatDuration(scrape.duration_ms) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(scrape.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-gray-500">
          No syncs yet. Click &quot;Sync Now&quot; to fetch pets from RescueGroups.
        </div>
      )}
    </div>
  );
}

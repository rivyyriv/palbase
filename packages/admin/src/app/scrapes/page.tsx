import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDuration, SOURCE_OPTIONS } from '@palbase/shared';
import type { ScrapeLog } from '@palbase/shared';
import { CheckCircle, XCircle, Clock, Play, AlertTriangle } from 'lucide-react';

export default async function ScrapesPage() {
  const supabase = await createClient();

  const { data: scrapes } = await supabase
    .from('scrape_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const statusIcons: Record<string, typeof CheckCircle> = {
    completed: CheckCircle,
    failed: XCircle,
    running: Play,
    pending: Clock,
  };

  const statusColors: Record<string, string> = {
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    running: 'text-blue-600 bg-blue-50',
    pending: 'text-yellow-600 bg-yellow-50',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Scrape History</h1>
        <p className="text-gray-600">View all scrape job history and logs</p>
      </div>

      <div className="card">
        {scrapes && scrapes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-medium text-gray-600">
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Triggered By</th>
                  <th className="px-6 py-3">Pets Found</th>
                  <th className="px-6 py-3">Added/Removed</th>
                  <th className="px-6 py-3">Errors</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(scrapes as ScrapeLog[]).map((scrape) => {
                  const StatusIcon = statusIcons[scrape.status] || Clock;
                  const sourceLabel = SOURCE_OPTIONS.find(s => s.value === scrape.source)?.label || scrape.source;

                  return (
                    <tr key={scrape.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sourceLabel}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[scrape.status]}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span className="capitalize">{scrape.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {scrape.triggered_by || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {scrape.pets_found.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="text-green-600">+{scrape.pets_added}</span>
                        {' / '}
                        <span className="text-red-600">-{scrape.pets_removed}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {scrape.error_count > 0 ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            {scrape.error_count}
                          </span>
                        ) : (
                          <span className="text-gray-500">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {scrape.duration_ms ? formatDuration(scrape.duration_ms) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(scrape.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/scrapes/${scrape.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            No scrape jobs found. Run a scrape from the dashboard.
          </div>
        )}
      </div>
    </div>
  );
}

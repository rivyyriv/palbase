import { createClient } from '@/lib/supabase/server';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentScrapes } from '@/components/dashboard/RecentScrapes';
import { ScrapeActions } from '@/components/dashboard/ScrapeActions';
import { PawPrint, Users, Building2, Activity } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch stats
  const [petsResult, usersResult, sheltersResult, scrapesResult] = await Promise.all([
    supabase.from('pets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('shelters').select('*', { count: 'exact', head: true }),
    supabase.from('scrape_logs').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  const stats = {
    activePets: petsResult.count || 0,
    totalUsers: usersResult.count || 0,
    totalShelters: sheltersResult.count || 0,
    recentScrapes: scrapesResult.data || [],
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your pet adoption platform</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Pets"
          value={stats.activePets.toLocaleString()}
          icon={PawPrint}
          color="indigo"
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Shelters"
          value={stats.totalShelters.toLocaleString()}
          icon={Building2}
          color="blue"
        />
        <StatsCard
          title="Recent Scrapes"
          value={stats.recentScrapes.length.toString()}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Scrape Actions */}
      <div className="mb-8">
        <ScrapeActions />
      </div>

      {/* Recent Scrapes */}
      <RecentScrapes scrapes={stats.recentScrapes} />
    </div>
  );
}

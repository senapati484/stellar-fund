'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CampaignCard } from '@/components/CampaignCard';
import { UserOnboardingBanner } from '@/components/UserOnboardingBanner';
import { SkeletonLoader, EmptyState, Button } from '@/components/ui';
import { Campaign } from '@/lib/contract-client';
import { useWallet } from '@/components/WalletProvider';

export default function Home() {
  const router = useRouter();
  const { publicKey, isConnected } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalRaised: 0,
    totalDonors: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, []);

  useEffect(() => {
    if (isConnected && publicKey) {
      setShowOnboarding(true);
    }
  }, [isConnected, publicKey]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCampaigns([]);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStats({
        activeCampaigns: 3,
        totalRaised: 1500,
        totalDonors: 42,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter === 'all') return true;
    if (filter === 'active') return campaign.active;
    if (filter === 'completed') return !campaign.active;
    return true;
  });

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 max-w-7xl mx-auto w-full">
        {!isConnected && (
          <div className="animate-fade-in bg-surface border border-borderInner rounded-2xl shadow-sm py-16 sm:py-20 text-center px-4 mb-10">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium text-textMain mb-4">
              StellarFund
            </h1>
            <p className="text-textMuted text-base mb-8">
              Fund ideas. Support builders. On Stellar testnet.
            </p>
            <Button onClick={() => {}} variant="primary" className="px-8 py-3">
              Connect Wallet
            </Button>
            <p className="text-xs text-textMuted mt-4">
              No registration needed. Just a Stellar wallet.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 animate-slide-up stagger-2">
          <div className="bg-surface border border-borderInner rounded-xl p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Active Campaigns</p>
            {statsLoading ? (
              <SkeletonLoader height="h-8" width="w-20" />
            ) : (
              <p className="text-2xl font-semibold text-textMain">{stats.activeCampaigns}</p>
            )}
          </div>
          <div className="bg-surface border border-borderInner rounded-xl p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Total Raised (XLM)</p>
            {statsLoading ? (
              <SkeletonLoader height="h-8" width="w-20" />
            ) : (
              <p className="text-2xl font-semibold text-textMain">{stats.totalRaised}</p>
            )}
          </div>
          <div className="bg-surface border border-borderInner rounded-xl p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Total Donors</p>
            {statsLoading ? (
              <SkeletonLoader height="h-8" width="w-20" />
            ) : (
              <p className="text-2xl font-semibold text-textMain">{stats.totalDonors}</p>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-borderInner text-textMuted hover:text-textMain'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Campaign Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonLoader key={i} height="h-48" rounded="rounded-xl" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No campaigns yet"
            description="Be the first to launch a campaign."
            action={
              <Button onClick={() => router.push('/create')} variant="primary">
                Create Campaign
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => router.push(`/campaign/${campaign.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {showOnboarding && isConnected && (
        <UserOnboardingBanner
          publicKey={publicKey}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
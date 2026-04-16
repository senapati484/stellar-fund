'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CampaignCard } from '@/components/CampaignCard';
import { UserOnboardingBanner } from '@/components/UserOnboardingBanner';
import { SkeletonLoader, EmptyState, Button } from '@/components/ui';
import { useCampaigns } from '@/components/CampaignProvider';
import { useWallet } from '@/components/WalletProvider';

export default function Home() {
  const router = useRouter();
  const { publicKey, isConnected } = useWallet();
  const { campaigns, getDonations } = useCampaigns();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (isConnected && publicKey) {
      setShowOnboarding(true);
    }
  }, [isConnected, publicKey]);

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter === 'all') return true;
    if (filter === 'active') return campaign.active;
    if (filter === 'completed') return !campaign.active;
    return true;
  });

  // Calculate donor counts for each campaign
  const campaignDonorCounts = filteredCampaigns.reduce((acc, campaign) => {
    const donations = getDonations(campaign.id);
    acc[campaign.id] = donations.length;
    return acc;
  }, {} as Record<number, number>);

  const stats = {
    activeCampaigns: campaigns.filter(c => c.active).length,
    totalRaised: campaigns.reduce((sum, c) => sum + c.raised, 0),
    totalDonors: filteredCampaigns.reduce((sum, c) => sum + (campaignDonorCounts[c.id] || 0), 0),
  };

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
            <Button onClick={() => {}} variant="primary" className="px-6 py-3">
              Connect Wallet
            </Button>
            <p className="text-xs text-textMuted mt-4">
              No registration needed. Just a Stellar wallet.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 animate-slide-up stagger-2">
          <div className="bg-surface border border-borderInner rounded-lg p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Active Campaigns</p>
            <p className="text-2xl font-semibold text-textMain">{stats.activeCampaigns}</p>
          </div>
          <div className="bg-surface border border-borderInner rounded-lg p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Total Raised (XLM)</p>
            <p className="text-2xl font-semibold text-textMain">{stats.totalRaised.toFixed(2)}</p>
          </div>
          <div className="bg-surface border border-borderInner rounded-lg p-5">
            <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Total Donors</p>
            <p className="text-2xl font-semibold text-textMain">{stats.totalDonors}</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                filter === filterOption
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface border border-borderInner text-textMuted hover:border-primary hover:shadow-sm'
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
        ) : filteredCampaigns.length === 0 ? (
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
                donorCount={campaignDonorCounts[campaign.id] || 0}
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
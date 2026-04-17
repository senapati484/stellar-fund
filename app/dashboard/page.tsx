'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CampaignCard } from '@/components/CampaignCard';
import { SkeletonLoader, EmptyState, Button } from '@/components/ui';
import { useCampaigns } from '@/components/CampaignProvider';
import { useWallet } from '@/components/WalletProvider';
import { stellar } from '@/lib/stellar-helper';

export default function DashboardPage() {
  const router = useRouter();
  const { publicKey, isConnected } = useWallet();
  const { campaigns, updateCampaign, clearCampaigns, getDonations } = useCampaigns();
  const [loading, setLoading] = useState(false);

  const userCampaigns = publicKey
    ? campaigns.filter(c => c.owner === publicKey)
    : [];

  // Calculate donor counts for each campaign
  const campaignDonorCounts = userCampaigns.reduce((acc, campaign) => {
    const donations = getDonations(campaign.id);
    acc[campaign.id] = donations.length;
    return acc;
  }, {} as Record<number, number>);

  const totalRaised = userCampaigns.reduce((sum, c) => sum + c.raised, 0);
  const activeCampaigns = userCampaigns.filter(c => c.active).length;
  const totalDonors = userCampaigns.reduce((sum, c) => sum + (campaignDonorCounts[c.id] || 0), 0);

  const handleWithdraw = async (campaignId: number) => {
    if (!publicKey) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to withdraw:', error);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {!isConnected ? (
          <div className="claude-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">👤</span>
            </div>
            <h2 className="font-serif text-2xl font-medium text-textMain mb-2">
              Connect Wallet to View Your Dashboard
            </h2>
            <p className="text-textMuted text-sm mb-6">
              Link your Stellar wallet to manage your campaigns.
            </p>
            <button
              onClick={() => {}}
              className="claude-button-primary px-4 py-2 rounded-lg"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-textMain mb-1">
                  Dashboard
                </h1>
                <p className="text-textMuted text-sm">Manage your campaigns and track performance</p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/create')}
                  variant="primary"
                  className="px-6 py-2.5"
                >
                  + New Campaign
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface border border-borderInner rounded-xl p-6 hover:border-borderOuter hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-textMuted text-xs font-medium uppercase tracking-wider">Campaigns</span>
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-textMain">{userCampaigns.length}</p>
                <p className="text-textMuted text-xs mt-1">Total created</p>
              </div>
              <div className="bg-surface border border-borderInner rounded-xl p-6 hover:border-borderOuter hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-textMuted text-xs font-medium uppercase tracking-wider">Total Raised</span>
                  <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-success">{totalRaised.toFixed(2)}</p>
                <p className="text-textMuted text-xs mt-1">XLM raised</p>
              </div>
              <div className="bg-surface border border-borderInner rounded-xl p-6 hover:border-borderOuter hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-textMuted text-xs font-medium uppercase tracking-wider">Active</span>
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                    <span className="text-lg">🔥</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-textMain">{activeCampaigns}</p>
                <p className="text-textMuted text-xs mt-1">Currently active</p>
              </div>
              <div className="bg-surface border border-borderInner rounded-xl p-6 hover:border-borderOuter hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-textMuted text-xs font-medium uppercase tracking-wider">Donors</span>
                  <div className="w-8 h-8 rounded-lg bg-[#FDF2F8] flex items-center justify-center">
                    <span className="text-lg">❤️</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-textMain">{totalDonors}</p>
                <p className="text-textMuted text-xs mt-1">Total supporters</p>
              </div>
            </div>

            {/* Campaigns Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl font-semibold text-textMain">Your Campaigns</h2>
                <Button
                  onClick={() => {
                    if (confirm('Clear all campaigns and donations? This will delete all test data.')) {
                      clearCampaigns();
                    }
                  }}
                  variant="ghost"
                  className="text-xs px-3 py-1.5"
                >
                  Clear All Data
                </Button>
              </div>

              {loading ? (
                <SkeletonLoader count={3} height="h-32" />
              ) : userCampaigns.length === 0 ? (
                <div className="bg-surface border border-borderInner rounded-xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🚀</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-textMain mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-textMuted text-sm mb-6 max-w-md mx-auto">
                    Start your first crowdfunding campaign and raise funds for your project on Stellar testnet.
                  </p>
                  <Button onClick={() => router.push('/create')} variant="primary">
                    Create Your First Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userCampaigns.map((campaign) => {
                    const progressPercent = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
                    const donorCount = campaignDonorCounts[campaign.id] || 0;
                    const daysLeft = Math.max(0, Math.ceil((campaign.deadline - Date.now() / 1000) / 86400));

                    return (
                      <div key={campaign.id} className="bg-surface border border-borderInner rounded-xl p-6 hover:border-borderOuter hover:shadow-md transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1">
                                <h3 className="font-serif text-lg font-semibold text-textMain mb-1 truncate">
                                  {campaign.title}
                                </h3>
                                <p className="text-textMuted text-sm line-clamp-2">{campaign.description}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {campaign.active ? (
                                  <span className="bg-[#ECFDF5] text-[#059669] text-xs font-medium px-2.5 py-1 rounded-full">
                                    Active
                                  </span>
                                ) : (
                                  <span className="bg-[#F3F4F6] text-[#666666] text-xs font-medium px-2.5 py-1 rounded-full">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-success font-semibold">{campaign.raised.toFixed(2)} XLM raised</span>
                                <span className="text-textMuted">of {campaign.goal.toFixed(2)} XLM</span>
                              </div>
                              <div className="w-full bg-borderInner rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-success to-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Stats Row */}
                            <div className="flex flex-wrap gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-textMuted">❤️</span>
                                <span className="text-textMain font-medium">{donorCount} donor{donorCount !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-textMuted">📅</span>
                                <span className={`font-medium ${daysLeft <= 3 ? 'text-error' : 'text-textMain'}`}>
                                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0">
                            <Button
                              onClick={() => router.push(`/campaign/${campaign.id}`)}
                              variant="primary"
                              className="px-5 py-2"
                            >
                              View
                            </Button>
                            {campaign.raised > 0 && !campaign.withdrawn && (
                              <Button
                                onClick={() => handleWithdraw(campaign.id)}
                                variant="secondary"
                                className="px-5 py-2"
                              >
                                Withdraw
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { DonationForm } from '@/components/DonationForm';
import { CampaignStatusBadge, FundingProgressBar, SkeletonLoader, EmptyState, Button, ShareButton } from '@/components/ui';
import { Donation } from '@/lib/contract-client';
import { useCampaigns } from '@/components/CampaignProvider';
import { stellar } from '@/lib/stellar-helper';
import { useWallet } from '@/components/WalletProvider';

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { publicKey, isConnected } = useWallet();
  const { getCampaign, campaigns, updateCampaign, getDonations, addDonation } = useCampaigns();

  console.log('Campaign page - id:', id, 'campaigns:', campaigns);

  const campaign = id ? campaigns.find(c => c.id === parseInt(id)) : undefined;
  const donations = campaign ? getDonations(campaign.id) : [];
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDonateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDonate = (amount: number, message: string = '') => {
    if (!campaign) return;

    // Update campaign raised amount
    updateCampaign(campaign.id, {
      raised: campaign.raised + amount,
    });

    // Add donation record
    addDonation({
      campaignId: campaign.id,
      donor: publicKey,
      amount,
      message,
    });
  };

  const handleWithdraw = async () => {
    if (!campaign) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to withdraw:', error);
    }
  };

  const getDaysLeft = () => {
    if (!campaign) return 0;
    return Math.max(0, Math.ceil((campaign.deadline - Date.now() / 1000) / 86400));
  };

  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() / 1000) - timestamp);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!campaign) {
    return (
      <div className="min-h-full flex flex-col bg-background">
        <Navbar />
        <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
          <EmptyState
            icon="❌"
            title="Campaign not found"
            description="This campaign may have been deleted or the ID is incorrect."
            action={
              <Button onClick={() => router.push('/')} variant="secondary" className="px-6 py-3">
                ← Browse
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const daysLeft = getDaysLeft();

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        {/* Campaign Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-serif font-medium text-textMain leading-tight">
                {campaign.title}
              </h1>
              <div className="mt-3 flex items-center gap-3">
                <CampaignStatusBadge
                  active={campaign.active}
                  withdrawn={campaign.withdrawn}
                  daysLeft={daysLeft}
                />
                <span className="text-textMuted text-sm">
                  by {stellar.formatAddress(campaign.owner, 4, 4)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-borderInner rounded-lg p-6 mb-6">
            <FundingProgressBar
              raised={campaign.raised}
              goal={campaign.goal}
              animated={true}
              size="lg"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6">
              <div className="text-center sm:text-left">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Raised</p>
                <p className="text-success font-semibold text-2xl">
                  {campaign.raised.toFixed(2)} XLM
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Goal</p>
                <p className="text-textMain font-semibold text-2xl">
                  {campaign.goal.toFixed(2)} XLM
                </p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Donors</p>
                <p className="text-textMain font-semibold text-2xl">{donations.length}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Days Left</p>
                <p
                  className={`font-semibold text-2xl ${
                    daysLeft <= 3 && campaign.active ? 'text-error' : 'text-textMain'
                  }`}
                >
                  {daysLeft}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="bg-surface border border-borderInner rounded-lg p-6 sm:p-8">
              <h2 className="font-serif text-2xl text-textMain mb-4">About this Campaign</h2>
              <p className="text-textMuted leading-relaxed whitespace-pre-wrap text-base">
                {campaign.description}
              </p>
            </div>

            {/* Donors List Card */}
            <div className="bg-surface border border-borderInner rounded-lg p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-serif text-2xl text-textMain">Supporters</h2>
                <span className="bg-[#F5F5F5] text-textMuted text-xs font-medium px-3 py-1 rounded-full">
                  {donations.length}
                </span>
              </div>

              {donations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-textMuted text-base">Be the first to donate!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation, index) => (
                    <div key={index} className="flex items-start justify-between py-4 border-b border-borderInner last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                            <span className="text-xs font-medium text-textMuted">
                              {stellar.formatAddress(donation.donor, 2, 2)}
                            </span>
                          </div>
                          <p className="text-textMain text-sm font-medium">
                            {stellar.formatAddress(donation.donor, 4, 4)}
                          </p>
                        </div>
                        {donation.message && (
                          <p className="text-textMuted text-sm mt-2 pl-10">{donation.message}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-success font-semibold text-base">
                          {donation.amount.toFixed(2)} XLM
                        </p>
                        <p className="text-textMuted text-xs mt-1">{getRelativeTime(donation.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-4">
            {isConnected && campaign.active ? (
              <DonationForm
                campaign={campaign}
                publicKey={publicKey}
                onSuccess={handleDonateSuccess}
                onDonate={(amount, message) => handleDonate(amount, message)}
              />
            ) : (
              <div className="claude-card p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔗</span>
                </div>
                <p className="text-textMuted text-base mb-4">Connect wallet to donate</p>
                <Button onClick={() => {}} variant="primary" fullWidth className="px-6 py-3">
                  Connect Wallet
                </Button>
              </div>
            )}

            {/* Creator Card */}
            <div className="claude-card p-5">
              <p className="text-textMuted text-xs uppercase tracking-wider mb-3">Created by</p>
              <p className="font-mono text-sm text-textMain bg-[#F5F5F5] p-3 rounded-lg">
                {stellar.formatAddress(campaign.owner, 6, 4)}
              </p>
              <a
                href={stellar.getExplorerLink(campaign.owner, 'account')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs font-medium mt-3 inline-block hover:underline"
              >
                View on Explorer →
              </a>
            </div>

            {/* Share Card */}
            <div className="claude-card p-5">
              <p className="text-textMuted text-xs uppercase tracking-wider mb-3">Share this campaign</p>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={campaign.title}
              />
              <p className="text-textMuted text-xs mt-3">Help this campaign reach its goal</p>
            </div>

            {/* Withdraw Card */}
            {isConnected && publicKey === campaign.owner && (
              <div className="claude-card p-5 border-2 border-borderOuter">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-3">Your Campaign</p>
                {campaign.withdrawn ? (
                  <p className="text-textMuted text-sm">Already withdrawn</p>
                ) : campaign.raised === 0 ? (
                  <p className="text-textMuted text-sm">No funds to withdraw</p>
                ) : (
                  <Button
                    onClick={handleWithdraw}
                    variant="primary"
                    fullWidth
                    disabled={campaign.withdrawn || campaign.raised === 0}
                    className="px-6 py-3"
                  >
                    Withdraw {stellar.formatXLM(campaign.raised)} XLM
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
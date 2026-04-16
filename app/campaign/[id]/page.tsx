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
  const { getCampaign } = useCampaigns();

  const campaign = id ? getCampaign(parseInt(id)) : undefined;
  const [donations, setDonations] = useState<Donation[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadDonations();
  }, [id, refreshTrigger]);

  const loadDonations = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDonations([]);
    } catch (error) {
      console.error('Failed to load donations:', error);
      setDonations([]);
    }
  };

  const handleDonateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
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
              <Button onClick={() => router.push('/')} variant="secondary">
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

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
        {/* Campaign Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl sm:text-4xl font-serif font-medium text-textMain">
              {campaign.title}
            </h1>
            <CampaignStatusBadge
              active={campaign.active}
              withdrawn={campaign.withdrawn}
              daysLeft={daysLeft}
            />
          </div>

          <FundingProgressBar
            raised={campaign.raised}
            goal={campaign.goal}
            animated={true}
            size="lg"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Raised</p>
              <p className="text-fundGreen font-semibold text-lg">
                {stellar.formatXLM(campaign.raised)} XLM
              </p>
            </div>
            <div>
              <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Goal</p>
              <p className="text-textMain font-semibold text-lg">
                {stellar.formatXLM(campaign.goal)} XLM
              </p>
            </div>
            <div>
              <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Donors</p>
              <p className="text-textMain font-semibold text-lg">{donations.length}</p>
            </div>
            <div>
              <p className="text-textMuted text-xs uppercase tracking-wider mb-1">Days Left</p>
              <p
                className={`font-semibold text-lg ${
                  daysLeft <= 3 && campaign.active ? 'text-error' : 'text-textMain'
                }`}
              >
                {daysLeft}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Description Card */}
            <div className="bg-surface border border-borderInner rounded-xl p-5 sm:p-6">
              <h2 className="font-serif text-xl text-textMain mb-4">About this Campaign</h2>
              <p className="text-textMuted leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>

            {/* Donors List Card */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-serif text-xl text-textMain">Supporters</h2>
                <span className="bg-surface border border-borderInner text-textMuted text-xs font-medium px-2 py-0.5 rounded-full">
                  {donations.length}
                </span>
              </div>

              {donations.length === 0 ? (
                <p className="text-textMuted text-sm">Be the first to donate!</p>
              ) : (
                <div className="space-y-3">
                  {donations.map((donation, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-borderInner last:border-0">
                      <div className="flex-1">
                        <p className="text-textMain text-sm font-medium">
                          {stellar.formatAddress(donation.donor, 4, 4)}
                        </p>
                        {donation.message && (
                          <p className="text-textMuted text-xs mt-0.5">{donation.message}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-fundGreen font-medium text-sm">
                          {stellar.formatXLM(donation.amount)} XLM
                        </p>
                        <p className="text-textMuted text-xs">{getRelativeTime(donation.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            {isConnected && campaign.active ? (
              <DonationForm
                campaign={campaign}
                publicKey={publicKey}
                onSuccess={handleDonateSuccess}
              />
            ) : (
              <div className="claude-card p-5 text-center">
                <p className="text-textMuted text-sm mb-4">Connect wallet to donate</p>
                <Button onClick={() => {}} variant="primary" fullWidth>
                  Connect Wallet
                </Button>
              </div>
            )}

            {/* Creator Card */}
            <div className="claude-card p-4 mt-4">
              <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Created by</p>
              <p className="font-mono text-sm text-textMain">
                {stellar.formatAddress(campaign.owner, 6, 4)}
              </p>
              <a
                href={stellar.getExplorerLink(campaign.owner, 'account')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs font-medium mt-2 inline-block hover:underline"
              >
                View on Explorer
              </a>
            </div>

            {/* Share Card */}
            <div className="claude-card p-4 mt-4">
              <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Share this campaign</p>
              <ShareButton
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={campaign.title}
              />
              <p className="text-textMuted text-xs mt-2">Help this campaign reach its goal</p>
            </div>

            {/* Withdraw Card */}
            {isConnected && publicKey === campaign.owner && (
              <div className="claude-card p-4 mt-4 border-borderOuter">
                <p className="text-textMuted text-xs uppercase tracking-wider mb-2">Your Campaign</p>
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
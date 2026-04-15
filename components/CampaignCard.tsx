'use client';

import { Campaign } from '@/lib/contract-client';
import { FundingProgressBar, CampaignStatusBadge } from './ui';
import { stellar } from '@/lib/stellar-helper';
import { FaClock, FaUser, FaHeart } from 'react-icons/fa';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
  compact?: boolean;
}

export function CampaignCard({ campaign, onClick, compact = false }: CampaignCardProps) {
  const daysLeft = Math.max(0, Math.ceil((campaign.deadline - Date.now() / 1000) / 86400));
  const progressPercent = Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="claude-card cursor-pointer group p-3 hover:border-borderOuter hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-textMain font-serif font-medium text-sm tracking-tight truncate">
              {campaign.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-fundLight text-fundGreen text-xs font-medium px-2 py-1 rounded-full">
              {progressPercent}%
            </div>
            <CampaignStatusBadge
              active={campaign.active}
              withdrawn={campaign.withdrawn}
              daysLeft={daysLeft}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="claude-card cursor-pointer group p-5 hover:border-borderOuter hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-textMain font-serif font-medium text-lg tracking-tight flex-1">
          {campaign.title}
        </h3>
        <CampaignStatusBadge
          active={campaign.active}
          withdrawn={campaign.withdrawn}
          daysLeft={daysLeft}
        />
      </div>

      <p className="text-textMuted text-sm leading-relaxed line-clamp-2 mt-2 mb-4">
        {campaign.description}
      </p>

      <FundingProgressBar
        raised={campaign.raised}
        goal={campaign.goal}
        animated={true}
        size="md"
      />

      <div className="flex justify-between text-xs text-textMuted mt-4">
        <div className="flex items-center gap-1.5">
          <FaUser className="w-3 h-3" />
          <span>{stellar.formatAddress(campaign.owner, 4, 4)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FaHeart className="w-3 h-3" />
          <span>— donors</span>
        </div>
        <div
          className={`flex items-center gap-1.5 ${
            daysLeft <= 3 && campaign.active
              ? 'text-error'
              : !campaign.active
              ? 'text-textMuted'
              : ''
          }`}
        >
          <FaClock className="w-3 h-3" />
          <span>{daysLeft} days left</span>
        </div>
      </div>

      <div className="text-accent text-xs font-medium mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
        View Campaign →
      </div>
    </div>
  );
}

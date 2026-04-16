'use client';

import { useState, useEffect } from 'react';
import { stellar } from '@/lib/stellar-helper';

interface UserOnboardingBannerProps {
  publicKey: string;
  onDismiss: () => void;
}

export function UserOnboardingBanner({ publicKey, onDismiss }: UserOnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('sf_onboarding_dismissed');
    if (hasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handlePrimaryClick = () => {
    localStorage.setItem('sf_onboarding_dismissed', 'true');
    setDismissed(true);
    onDismiss();
    const googleFormUrl = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || 'https://forms.gle/REPLACE_WITH_YOUR_FORM';
    window.open(googleFormUrl, '_blank');
  };

  const handleSecondaryClick = () => {
    onDismiss();
  };

  const handleClose = () => {
    localStorage.setItem('sf_onboarding_dismissed', 'true');
    setDismissed(true);
    onDismiss();
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm animate-slide-up">
      <div className="bg-[#333333] text-white rounded-lg p-4 border border-borderOuter shadow-lg">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-sm font-medium">👋 Welcome!</h3>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white text-sm leading-none ml-2"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-white/80 leading-relaxed mb-3">
          Help us improve StellarFund by sharing your feedback.
        </p>

        <div className="flex gap-2 mb-3">
          <button
            onClick={handlePrimaryClick}
            className="bg-primary text-white rounded px-3 py-1.5 text-xs font-medium flex-1"
          >
            Share Feedback
          </button>
          <button
            onClick={handleSecondaryClick}
            className="text-white/60 hover:text-white text-xs px-2"
          >
            Later
          </button>
        </div>

        <p className="text-[10px] text-white/40">
          Takes 30 seconds • Data stored in Google Sheets
        </p>
      </div>
    </div>
  );
}

export function useOnboardingDismissed(): boolean {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('sf_onboarding_dismissed');
    setDismissed(!!hasDismissed);
  }, []);

  return dismissed;
}

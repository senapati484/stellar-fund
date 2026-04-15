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
    <div className="fixed bottom-0 left-0 right-0 z-40 md:bottom-auto md:top-16 animate-slide-up">
      <div className="bg-[#24211D] text-white rounded-t-2xl p-5 sm:p-6 border-t-2 border-primary shadow-2xl">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-lg">👋 Welcome to StellarFund!</h3>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-white/80 leading-relaxed mt-2 mb-4">
          You've connected your Stellar testnet wallet. Before you start, we'd love to know who you are so we can make StellarFund better.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={handlePrimaryClick}
            className="bg-primary text-white rounded-lg px-5 py-2.5 text-sm font-medium w-full sm:auto"
          >
            📝 Share Feedback & Register
          </button>
          <button
            onClick={handleSecondaryClick}
            className="text-white/60 hover:text-white text-sm w-full sm:auto"
          >
            Maybe later
          </button>
        </div>

        <p className="text-xs text-white/50 mb-2">
          Takes 30 seconds. Your wallet address is:{' '}
          <span className="font-mono">{stellar.formatAddress(publicKey, 6, 4)}</span>
        </p>

        <p className="text-white/40 text-xs">
          Your data is stored in Google Sheets and only used for this bootcamp.
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

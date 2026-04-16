'use client';

import { WalletProvider } from './WalletProvider';
import { CampaignProvider } from './CampaignProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CampaignProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </CampaignProvider>
  );
}
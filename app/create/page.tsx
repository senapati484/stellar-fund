'use client';

import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { useWallet } from '@/components/WalletProvider';
import { FaPlus } from 'react-icons/fa';

export default function CreatePage() {
  const router = useRouter();
  const { publicKey, isConnected } = useWallet();

  const handleSuccess = (id: string) => {
    router.push(`/campaign/${id}`);
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar />

      <main className="max-w-[640px] mx-auto px-4 sm:px-6 py-10">
        {!isConnected ? (
          <div className="claude-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
              <FaPlus className="text-primary w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl font-medium text-textMain mb-2">
              Connect Wallet to Create a Campaign
            </h2>
            <p className="text-textMuted text-sm mb-6">
              Link your Stellar wallet to launch your first campaign.
            </p>
            <button
              onClick={() => {}}
              className="claude-button-primary px-4 py-2 rounded-lg"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-3xl font-medium text-textMain tracking-tight mb-2">
              Launch a Campaign
            </h1>
            <p className="text-textMuted text-sm mb-8">
              Your campaign is stored on Soroban smart contract.
            </p>
            <CreateCampaignForm
              publicKey={publicKey}
              onSuccess={handleSuccess}
            />
          </div>
        )}
      </main>
    </div>
  );
}
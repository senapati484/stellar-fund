'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { CreateCampaignForm } from '@/components/CreateCampaignForm';
import { FaPlus } from 'react-icons/fa';

export default function CreatePage() {
  const router = useRouter();
  const [publicKey, setPublicKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = (key: string) => {
    setPublicKey(key);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setPublicKey('');
    setIsConnected(false);
  };

  const handleSuccess = (id: number) => {
    router.push(`/campaign/${id}`);
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      <Navbar
        publicKey={publicKey}
        isConnected={isConnected}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <main className="max-w-[640px] mx-auto px-4 sm:px-6 py-10">
        {!isConnected ? (
          <div className="claude-card text-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-[#F4F2EC] flex items-center justify-center mx-auto mb-4">
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
              className="claude-button-primary px-8 py-3"
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

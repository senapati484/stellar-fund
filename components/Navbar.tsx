'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { stellar, WalletNotFoundError, WalletRejectedError } from '@/lib/stellar-helper';
import { Alert, Button, LoadingSpinner } from './ui';
import { FaHome, FaPlus, FaUser } from 'react-icons/fa';

interface NavbarProps {
  publicKey: string;
  isConnected: boolean;
  onConnect: (key: string) => void;
  onDisconnect: () => void;
}

export function Navbar({ publicKey, isConnected, onConnect, onDisconnect }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string; hint?: string } | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setAlert(null);

    try {
      const key = await stellar.connectWallet();
      onConnect(key);
    } catch (error) {
      if (error instanceof WalletNotFoundError) {
        setAlert({
          type: 'warning',
          message: 'No wallet found. Install Freighter.',
          hint: 'Download Freighter from https://freighter.app',
        });
      } else if (error instanceof WalletRejectedError) {
        setAlert({
          type: 'info',
          message: 'Connection cancelled.',
        });
      } else {
        setAlert({
          type: 'error',
          message: 'Failed to connect wallet.',
          hint: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    stellar.disconnect();
    onDisconnect();
  };

  const navLinks = [
    { name: 'Browse', path: '/' },
    { name: 'Create', path: '/create' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  const mobileTabs = [
    { name: 'Browse', path: '/', icon: FaHome },
    { name: 'Create', path: '/create', icon: FaPlus },
    { name: 'Dashboard', path: '/dashboard', icon: FaUser },
  ];

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="hidden md:flex sticky top-0 h-[60px] bg-background/80 backdrop-blur-md border-b border-borderOuter items-center px-6 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-8">
          <div className="w-7 h-7 bg-textMain rounded-sm" />
          <div>
            <h1 className="font-serif font-medium text-lg text-textMain">StellarFund</h1>
            <span className="text-[10px] font-mono text-textMuted">Testnet</span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <button
                key={link.name}
                onClick={() => router.push(link.path)}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-textMain border-b-2 border-primary pb-1'
                    : 'text-textMuted hover:text-textMain pb-1'
                }`}
              >
                {link.name}
              </button>
            );
          })}
        </div>

        {/* Right Side */}
        <div className="ml-auto flex items-center gap-3">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="bg-surface border border-borderInner rounded-lg px-3 py-1.5">
                <span className="text-xs font-mono text-textMain">
                  {stellar.formatAddress(publicKey, 4, 4)}
                </span>
              </div>
              <Button onClick={handleDisconnect} variant="secondary" size="sm">
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} variant="primary" loading={connecting}>
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="md:hidden sticky top-0 h-[56px] bg-background/80 backdrop-blur-md border-b border-borderOuter items-center px-4 z-50">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-textMain rounded-sm" />
            <div>
              <h1 className="font-serif font-medium text-base text-textMain">StellarFund</h1>
              <span className="text-[9px] font-mono text-textMuted">Testnet</span>
            </div>
          </div>

          {/* Connect Button */}
          {isConnected ? (
            <Button onClick={handleDisconnect} variant="secondary" size="sm">
              {stellar.formatAddress(publicKey, 3, 3)}
            </Button>
          ) : (
            <Button onClick={handleConnect} variant="primary" size="sm" loading={connecting}>
              {connecting ? <LoadingSpinner size="sm" color="white" /> : 'Connect'}
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-background/95 backdrop-blur border-t border-borderOuter flex items-center justify-around z-50 mobile-safe">
        {mobileTabs.map((tab) => {
          const isActive = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-textMuted'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Error Alert */}
      {alert && (
        <div className="animate-slide-up">
          <Alert
            type={alert.type}
            message={alert.message}
            hint={alert.hint}
            onClose={() => setAlert(null)}
          />
        </div>
      )}
    </>
  );
}

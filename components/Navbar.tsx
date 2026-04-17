'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from './WalletProvider';
import { Alert, Button, LoadingSpinner } from './ui';
import { FaHome, FaPlus, FaUser, FaStar } from 'react-icons/fa';
import { stellar } from '@/lib/stellar-helper';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { publicKey, isConnected, isConnecting, connect, disconnect, error } = useWallet();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {}
  };

  const handleDisconnect = async () => {
    await disconnect();
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
      <nav className="hidden md:flex sticky top-0 h-[72px] bg-background/95 backdrop-blur-md border-b border-borderOuter items-center px-8 z-50">
        {/* Logo Area - Improved spacing and design */}
        <div className="flex items-center gap-3 mr-12">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <FaStar className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif font-medium text-xl text-textMain leading-tight">StellarFund</h1>
            <span className="text-[10px] font-mono text-textMuted uppercase tracking-wide">Testnet</span>
          </div>
        </div>

        {/* Nav Links - Better spacing */}
        <div className="flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <button
                key={link.name}
                onClick={() => router.push(link.path)}
                className={`text-sm font-medium transition-all px-2 py-2 rounded-md ${
                  isActive
                    ? 'text-primary bg-primary/5'
                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                }`}
              >
                {link.name}
              </button>
            );
          })}
        </div>

        {/* Right Side - Better spacing */}
        <div className="ml-auto flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="bg-surface border border-borderInner rounded-lg px-4 py-2">
                <span className="text-xs font-mono text-textMain">
                  {stellar.formatAddress(publicKey, 4, 4)}
                </span>
              </div>
              <Button onClick={handleDisconnect} variant="secondary" className="text-sm px-5 py-2.5">
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} variant="primary" loading={isConnecting} className="px-5 py-2.5">
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <nav className="md:hidden sticky top-0 h-[60px] bg-background/95 backdrop-blur-md border-b border-borderOuter items-center px-4 z-50">
        <div className="flex items-center justify-between h-full">
          {/* Logo - Improved spacing */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <FaStar className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-serif font-medium text-base text-textMain leading-tight">StellarFund</h1>
              <span className="text-[9px] font-mono text-textMuted uppercase tracking-wide">Testnet</span>
            </div>
          </div>

          {/* Connect Button */}
          {isConnected ? (
            <Button onClick={handleDisconnect} variant="secondary" className="text-xs px-4 py-2">
              {stellar.formatAddress(publicKey, 3, 3)}
            </Button>
          ) : (
            <Button onClick={handleConnect} variant="primary" className="text-xs px-4 py-2" loading={isConnecting}>
              {isConnecting ? <LoadingSpinner size="sm" color="white" /> : 'Connect'}
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
      {error && (
        <div className="animate-slide-up">
          <Alert
            type="warning"
            message={error}
            hint="Download Freighter from https://freighter.app"
            onClose={() => {}}
          />
        </div>
      )}
    </>
  );
}
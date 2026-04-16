'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { stellar, WalletNotFoundError, WalletRejectedError } from '@/lib/stellar-helper';
import { isConnected, getAddress } from '@stellar/freighter-api';

interface WalletState {
  publicKey: string;
  isConnected: boolean;
  isConnecting: boolean;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    publicKey: '',
    isConnected: false,
    isConnecting: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const connected = await isConnected();
      if (connected) {
        const { address } = await getAddress();
        if (address) {
          setState({
            publicKey: address,
            isConnected: true,
            isConnecting: false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to check wallet status:', err);
    }
  };

  const connect = async () => {
    setState(prev => ({ ...prev, isConnecting: true }));
    setError(null);

    try {
      const key = await stellar.connectWallet();
      setState({
        publicKey: key,
        isConnected: true,
        isConnecting: false,
      });
    } catch (err) {
      setState(prev => ({ ...prev, isConnecting: false }));
      
      if (err instanceof WalletNotFoundError) {
        setError('No wallet found. Install Freighter.');
      } else if (err instanceof WalletRejectedError) {
        setError('Connection cancelled.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect');
      }
      throw err;
    }
  };

  const disconnect = async () => {
    stellar.disconnect();
    setState({
      publicKey: '',
      isConnected: false,
      isConnecting: false,
    });
    setError(null);
  };

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, error }}>
      {children}
    </WalletContext.Provider>
  );
}
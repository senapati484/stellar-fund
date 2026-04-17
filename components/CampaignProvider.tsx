'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { FundContractClient, Campaign as ContractCampaign, Donation as ContractDonation } from '@/lib/contract-client';

export interface Campaign extends ContractCampaign {}

export interface Donation extends ContractDonation {}

interface CampaignContextType {
  campaigns: Campaign[];
  donations: Donation[];
  loading: boolean;
  error: string | null;
  refreshCampaigns: () => Promise<void>;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => Promise<number>;
  getCampaign: (id: number) => Campaign | undefined;
  updateCampaign: (id: number, updates: Partial<Campaign>) => void;
  clearCampaigns: () => void;
  addDonation: (donation: Omit<Donation, 'timestamp'>) => Promise<void>;
  getDonations: (campaignId: number) => Promise<Donation[]>;
  clearDonations: () => void;
}

const CampaignContext = createContext<CampaignContextType | null>(null);

export function useCampaigns() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return context;
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<FundContractClient | null>(null);

  // Initialize contract client - DISABLED due to testnet issues
  // Using localStorage-only mode for now
  useEffect(() => {
    console.log('Blockchain integration disabled - using localStorage mode');
    setError('Demo mode: Using local storage. Campaigns are NOT shared across users.');
    // Don't initialize blockchain client
    setClient(null);
  }, []);

  // Fetch campaigns from blockchain - shared across all users
  const refreshCampaigns = useCallback(async () => {
    if (!client) {
      // Fallback to localStorage if no client
      const stored = localStorage.getItem('sf_campaigns');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCampaigns(parsed);
        } catch (err) {
          console.error('Failed to load from localStorage:', err);
        }
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { campaigns: fetchedCampaigns } = await client.getAllCampaigns(true);
      setCampaigns(fetchedCampaigns);
      setError(null);
      
      // Also cache in localStorage for offline access
      localStorage.setItem('sf_campaigns', JSON.stringify(fetchedCampaigns));
    } catch (err) {
      console.error('Failed to fetch campaigns from blockchain:', err);
      // Fallback to localStorage
      const stored = localStorage.getItem('sf_campaigns');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCampaigns(parsed);
        } catch (e) {
          console.error('Failed to load from localStorage:', e);
        }
      }
      setError('Could not connect to blockchain. Showing cached data.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Load campaigns on mount
  useEffect(() => {
    refreshCampaigns();
    
    // Refresh every 30 seconds to keep data in sync
    const interval = setInterval(refreshCampaigns, 30000);
    return () => clearInterval(interval);
  }, [refreshCampaigns]);

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => {
    // Create campaign in localStorage (demo mode)
    const id = Date.now();
    const newCampaign: Campaign = {
      title: String(campaignData.title || ''),
      description: String(campaignData.description || ''),
      goal: Number(campaignData.goal) || 0,
      deadline: Number(campaignData.deadline) || 0,
      owner: String(campaignData.owner || ''),
      id,
      raised: 0,
      active: true,
      withdrawn: false,
      createdAt: Math.floor(Date.now() / 1000),
      capDonationsAtGoal: campaignData.capDonationsAtGoal ?? true,
    };

    const updatedCampaigns = [...campaigns, newCampaign];
    setCampaigns(updatedCampaigns);
    localStorage.setItem('sf_campaigns', JSON.stringify(updatedCampaigns));
    
    return id;
  };

  const getCampaign = (id: number) => {
    return campaigns.find(c => c.id === id);
  };

  const updateCampaign = (id: number, updates: Partial<Campaign>) => {
    console.log('Updating campaign:', id, 'with updates:', updates);
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          console.log('Campaign after update:', updated);
          return updated;
        }
        return c;
      });

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sf_campaigns', JSON.stringify(updatedCampaigns));
        console.log('Updated campaigns saved to localStorage:', updatedCampaigns);
      }

      return updatedCampaigns;
    });
  };

  const clearCampaigns = () => {
    setCampaigns([]);
    setDonations([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sf_campaigns');
      localStorage.removeItem('sf_donations');
      console.log('Campaigns and donations cleared from localStorage');
    }
  };

  const addDonation = async (donationData: Omit<Donation, 'timestamp'>) => {
    // Record donation in localStorage (demo mode)
    const newDonation: Donation = {
      ...donationData,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const updatedDonations = [...donations, newDonation];
    setDonations(updatedDonations);
    localStorage.setItem('sf_donations', JSON.stringify(updatedDonations));

    // Update campaign raised amount
    const campaign = campaigns.find(c => c.id === donationData.campaignId);
    if (campaign) {
      const updatedCampaigns = campaigns.map(c => 
        c.id === donationData.campaignId 
          ? { ...c, raised: c.raised + donationData.amount }
          : c
      );
      setCampaigns(updatedCampaigns);
      localStorage.setItem('sf_campaigns', JSON.stringify(updatedCampaigns));
    }
  };

  const getDonations = async (campaignId: number): Promise<Donation[]> => {
    // Return donations from localStorage (demo mode)
    return donations.filter(d => d.campaignId === campaignId);
  };

  const clearDonations = () => {
    setDonations([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sf_donations');
      console.log('Donations cleared from localStorage');
    }
  };

  return (
    <CampaignContext.Provider value={{ 
      campaigns, 
      donations, 
      loading,
      error,
      refreshCampaigns,
      addCampaign, 
      getCampaign, 
      updateCampaign, 
      clearCampaigns, 
      addDonation, 
      getDonations, 
      clearDonations 
    }}>
      {children}
    </CampaignContext.Provider>
  );
}
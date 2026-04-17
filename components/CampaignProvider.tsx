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

  // Initialize contract client
  useEffect(() => {
    try {
      const fundClient = new FundContractClient((progress) => {
        console.log('Contract progress:', progress);
      });
      setClient(fundClient);
    } catch (err) {
      console.error('Failed to initialize contract client:', err);
      setError('Blockchain contract not available. Using local storage mode.');
    }
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
    if (!client) {
      throw new Error('Blockchain contract not available');
    }

    try {
      // Calculate duration from deadline
      const durationDays = Math.ceil((campaignData.deadline - Math.floor(Date.now() / 1000)) / (24 * 60 * 60));
      
      // Create campaign on blockchain
      await client.createCampaign({
        ownerKey: campaignData.owner,
        title: campaignData.title,
        description: campaignData.description,
        goalXlm: campaignData.goal,
        durationDays: Math.max(1, durationDays)
      });

      // Refresh to get the new campaign from blockchain
      await refreshCampaigns();
      
      // Return a generated ID (actual ID comes from blockchain)
      return Date.now();
    } catch (err) {
      console.error('Failed to create campaign on blockchain:', err);
      throw err;
    }
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
    if (!client) {
      throw new Error('Blockchain contract not available');
    }

    try {
      // Submit donation to blockchain using recordDonation
      await client.recordDonation({
        donorKey: donationData.donor,
        campaignId: donationData.campaignId,
        amountXlm: donationData.amount,
        message: donationData.message
      });

      // Refresh campaigns to get updated raised amount
      await refreshCampaigns();
    } catch (err) {
      console.error('Failed to submit donation to blockchain:', err);
      throw err;
    }
  };

  const getDonations = async (campaignId: number): Promise<Donation[]> => {
    if (!client) {
      // Fallback to localStorage
      return donations.filter(d => d.campaignId === campaignId);
    }

    try {
      const { donations: fetchedDonations } = await client.getDonations(campaignId, true);
      return fetchedDonations;
    } catch (err) {
      console.error('Failed to fetch donations from blockchain:', err);
      // Fallback to localStorage
      return donations.filter(d => d.campaignId === campaignId);
    }
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
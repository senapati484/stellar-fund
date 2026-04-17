'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { FundContractClient, Campaign as ContractCampaign, Donation as ContractDonation } from '@/lib/contract-client';

export interface Campaign extends ContractCampaign {}

export interface Donation extends ContractDonation {}

interface CampaignContextType {
  campaigns: Campaign[];
  donations: Donation[];
  loading: boolean;
  error: string | null;
  client: FundContractClient | null;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => Promise<string>;
  addDonation: (donation: Omit<Donation, 'timestamp'>) => Promise<void>;
  getDonations: (campaignId: string) => Promise<Donation[]>;
  getCampaign: (id: string) => Campaign | undefined;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  refreshCampaigns: () => Promise<void>;
  clearCampaigns: () => void;
  clearDonations: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

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
  const clientRef = useRef<FundContractClient | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  // Initialize blockchain contract client
  useEffect(() => {
    try {
      console.log('Initializing FundContractClient...');
      console.log('Contract ID:', process.env.NEXT_PUBLIC_CONTRACT_ID);
      const fundClient = new FundContractClient((progress) => {
        console.log('Contract progress:', progress);
      });
      setClient(fundClient);
      setError(null);
      console.log('FundContractClient initialized successfully');
    } catch (err) {
      console.error('Failed to initialize contract client:', err);
      setError('Failed to connect to blockchain. Check contract ID.');
    }
  }, []);

  // Fetch campaigns from blockchain - shared across all users
  const refreshCampaigns = useCallback(async () => {
    if (!clientRef.current) {
      console.log('refreshCampaigns: client not ready yet');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching campaigns from blockchain...');
      const { campaigns: fetchedCampaigns } = await clientRef.current.getAllCampaigns();
      console.log('Campaigns loaded from blockchain:', fetchedCampaigns.length, fetchedCampaigns);
      setCampaigns(fetchedCampaigns);
    } catch (err) {
      console.error('Failed to fetch campaigns from blockchain:', err);
      setError('Failed to load campaigns from blockchain.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when client becomes available
  useEffect(() => {
    if (client) {
      console.log('Client available, fetching campaigns...');
      refreshCampaigns();
    }
  }, [client, refreshCampaigns]);

  // Set up polling interval
  useEffect(() => {
    const interval = setInterval(refreshCampaigns, 30000);
    return () => clearInterval(interval);
  }, [refreshCampaigns]);

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => {
    if (!clientRef.current) {
      throw new Error('Blockchain contract not available');
    }

    try {
      // Calculate duration from deadline
      const durationDays = Math.ceil((campaignData.deadline - Math.floor(Date.now() / 1000)) / (24 * 60 * 60));

      // Create campaign on blockchain and get the real campaign ID
      const campaignId = await clientRef.current.createCampaign({
        ownerKey: campaignData.owner,
        title: campaignData.title,
        description: campaignData.description,
        goalXlm: campaignData.goal,
        durationDays: Math.max(1, durationDays)
      });

      // Refresh to get the new campaign from blockchain
      await refreshCampaigns();

      // Return the actual campaign ID from the blockchain (not a fake timestamp)
      return campaignId;
    } catch (err) {
      console.error('Failed to create campaign on blockchain:', err);
      throw err;
    }
  };

  const getCampaign = (id: string) => {
    return campaigns.find(c => String(c.id) === id);
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    console.log('Updating campaign:', id, 'with updates:', updates);
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(c => {
        if (String(c.id) === id) {
          const updated = { ...c, ...updates };
          console.log('Campaign after update:', updated);
          return updated;
        }
        return c;
      });

      return updatedCampaigns;
    });
  };

  const clearCampaigns = () => {
    setCampaigns([]);
    setDonations([]);
  };

  const addDonation = async (donationData: Omit<Donation, 'timestamp'>) => {
    if (!clientRef.current) {
      throw new Error('Blockchain contract not available');
    }

    try {
      // Submit donation to blockchain using recordDonation
      await clientRef.current.recordDonation({
        donorKey: donationData.donor,
        campaignId: donationData.campaignId as unknown as number,
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

  const getDonations = async (campaignId: string): Promise<Donation[]> => {
    if (!clientRef.current) {
      throw new Error('Blockchain contract not available');
    }

    try {
      const { donations: fetchedDonations } = await clientRef.current.getDonations(campaignId, true);
      return fetchedDonations;
    } catch (err) {
      console.error('Failed to fetch donations from blockchain:', err);
      return [];
    }
  };

  const clearDonations = () => {
    setDonations([]);
  };

  return (
    <CampaignContext.Provider value={{ 
      campaigns, 
      donations, 
      loading,
      error,
      client,
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
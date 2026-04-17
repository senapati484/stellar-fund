'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { FundContractClient, Campaign as ContractCampaign, Donation as ContractDonation } from '@/lib/contract-client';
import { supabase, type CampaignRow, type DonationRow, TABLES } from '@/lib/supabase';

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

  // Initialize data source - try Supabase first, fallback to localStorage
  useEffect(() => {
    const initDataSource = async () => {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('Using Supabase for shared data');
        setError(null);
      } else {
        console.log('Supabase not configured - using localStorage (data not shared)');
        setError('Supabase not configured. Using localStorage - campaigns are NOT shared across users.');
      }
    };
    initDataSource();
  }, []);

  // Fetch campaigns from Supabase - shared across all users
  const refreshCampaigns = useCallback(async () => {
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await (supabase as any)
          .from(TABLES.CAMPAIGNS)
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          const campaigns = data.map((row: CampaignRow) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            goal: row.goal,
            raised: row.raised,
            deadline: row.deadline,
            owner: row.owner,
            active: row.active,
            withdrawn: row.withdrawn,
            createdAt: row.created_at,
            capDonationsAtGoal: row.cap_donations_at_goal,
          }));
          setCampaigns(campaigns);
          console.log('Campaigns loaded from Supabase:', campaigns.length);
        }
      } catch (err) {
        console.error('Failed to fetch campaigns from Supabase:', err);
        setError('Failed to load campaigns from Supabase. Using localStorage.');
        // Fallback to localStorage
        const stored = localStorage.getItem('sf_campaigns');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setCampaigns(parsed);
          } catch (e) {
            console.error('Failed to parse campaigns from localStorage:', e);
          }
        }
      }
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('sf_campaigns');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCampaigns(parsed);
        } catch (err) {
          console.error('Failed to parse campaigns from localStorage:', err);
        }
      }
    }
    setLoading(false);
  }, []);

  // Load campaigns on mount
  useEffect(() => {
    refreshCampaigns();
    
    // Refresh every 30 seconds to keep data in sync
    const interval = setInterval(refreshCampaigns, 30000);
    return () => clearInterval(interval);
  }, [refreshCampaigns]);

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => {
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

    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { error } = await (supabase as any).from(TABLES.CAMPAIGNS).insert({
          id,
          title: newCampaign.title,
          description: newCampaign.description,
          goal: newCampaign.goal,
          raised: newCampaign.raised,
          deadline: newCampaign.deadline,
          owner: newCampaign.owner,
          active: newCampaign.active,
          withdrawn: newCampaign.withdrawn,
          created_at: newCampaign.createdAt,
          cap_donations_at_goal: newCampaign.capDonationsAtGoal,
        });
        
        if (error) throw error;
        
        // Refresh to get the new campaign
        await refreshCampaigns();
      } catch (err) {
        console.error('Failed to add campaign to Supabase:', err);
        throw err;
      }
    } else {
      // Fallback to localStorage
      const updatedCampaigns = [...campaigns, newCampaign];
      setCampaigns(updatedCampaigns);
      localStorage.setItem('sf_campaigns', JSON.stringify(updatedCampaigns));
    }
    
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
    const newDonation: Donation = {
      ...donationData,
      timestamp: Math.floor(Date.now() / 1000),
    };

    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        // Add donation to Supabase
        const { error: donationError } = await (supabase as any).from(TABLES.DONATIONS).insert({
          id: Date.now(),
          campaign_id: newDonation.campaignId,
          donor: newDonation.donor,
          amount: newDonation.amount,
          message: newDonation.message,
          timestamp: newDonation.timestamp,
        });
        
        if (donationError) throw donationError;
        
        // Update campaign raised amount
        const campaign = campaigns.find(c => c.id === donationData.campaignId);
        if (campaign) {
          const { error: updateError } = await (supabase as any)
            .from(TABLES.CAMPAIGNS)
            .update({ raised: campaign.raised + donationData.amount })
            .eq('id', donationData.campaignId);
          
          if (updateError) throw updateError;
          
          // Refresh campaigns to get updated data
          await refreshCampaigns();
        }
      } catch (err) {
        console.error('Failed to add donation to Supabase:', err);
        throw err;
      }
    } else {
      // Fallback to localStorage
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
    }
  };

  const getDonations = async (campaignId: number): Promise<Donation[]> => {
    if (supabase && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { data, error } = await (supabase as any)
          .from(TABLES.DONATIONS)
          .select('*')
          .eq('campaign_id', campaignId)
          .order('timestamp', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          return data.map((row: DonationRow) => ({
            id: row.id,
            campaignId: row.campaign_id,
            donor: row.donor,
            amount: row.amount,
            message: row.message,
            timestamp: row.timestamp,
          }));
        }
        return [];
      } catch (err) {
        console.error('Failed to fetch donations from Supabase:', err);
        return donations.filter(d => d.campaignId === campaignId);
      }
    }
    
    // Fallback to localStorage
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
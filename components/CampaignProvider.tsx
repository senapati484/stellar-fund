'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Campaign {
  id: number;
  title: string;
  description: string;
  goal: number;
  raised: number;
  deadline: number;
  owner: string;
  active: boolean;
  withdrawn: boolean;
  createdAt: number;
}

export interface Donation {
  campaignId: number;
  donor: string;
  amount: number;
  message: string;
  timestamp: number;
}

interface CampaignContextType {
  campaigns: Campaign[];
  donations: Donation[];
  addCampaign: (campaign: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => number;
  getCampaign: (id: number) => Campaign | undefined;
  updateCampaign: (id: number, updates: Partial<Campaign>) => void;
  clearCampaigns: () => void;
  addDonation: (donation: Omit<Donation, 'timestamp'>) => void;
  getDonations: (campaignId: number) => Donation[];
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

  useEffect(() => {
    // Load campaigns from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sf_campaigns');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('Campaigns loaded from localStorage:', parsed);
          // Validate and fix corrupted data
          const validated = parsed.map((c: any) => ({
            id: Number(c.id) || Date.now(),
            title: String(c.title || ''),
            description: String(c.description || ''),
            goal: Number(c.goal) || 0,
            raised: Number(c.raised) || 0,
            deadline: Number(c.deadline) || 0,
            owner: String(c.owner || ''),
            active: Boolean(c.active),
            withdrawn: Boolean(c.withdrawn),
            createdAt: Number(c.createdAt) || Math.floor(Date.now() / 1000),
          }));
          console.log('Validated campaigns:', validated);
          setCampaigns(validated);
        } catch (err) {
          console.error('Failed to load campaigns:', err);
          // Clear corrupted data
          localStorage.removeItem('sf_campaigns');
        }
      }

      // Load donations from localStorage
      const storedDonations = localStorage.getItem('sf_donations');
      if (storedDonations) {
        try {
          const parsed = JSON.parse(storedDonations);
          console.log('Donations loaded from localStorage:', parsed);
          setDonations(parsed);
        } catch (err) {
          console.error('Failed to load donations:', err);
          localStorage.removeItem('sf_donations');
        }
      }
    }
  }, []);

  const addCampaign = (campaignData: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => {
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
    };

    console.log('New campaign being added:', newCampaign);
    console.log('Goal value type:', typeof newCampaign.goal, 'value:', newCampaign.goal);

    const updatedCampaigns = [...campaigns, newCampaign];
    setCampaigns(updatedCampaigns);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_campaigns', JSON.stringify(updatedCampaigns));
      console.log('Campaigns saved to localStorage:', updatedCampaigns);

      // Verify save
      const verify = localStorage.getItem('sf_campaigns');
      console.log('Verification - localStorage contains:', verify);
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

  const addDonation = (donationData: Omit<Donation, 'timestamp'>) => {
    const newDonation: Donation = {
      ...donationData,
      timestamp: Math.floor(Date.now() / 1000),
    };

    console.log('New donation being added:', newDonation);

    const updatedDonations = [...donations, newDonation];
    setDonations(updatedDonations);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_donations', JSON.stringify(updatedDonations));
      console.log('Donations saved to localStorage:', updatedDonations);
    }
  };

  const getDonations = (campaignId: number) => {
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
    <CampaignContext.Provider value={{ campaigns, donations, addCampaign, getCampaign, updateCampaign, clearCampaigns, addDonation, getDonations, clearDonations }}>
      {children}
    </CampaignContext.Provider>
  );
}
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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

interface CampaignContextType {
  campaigns: Campaign[];
  addCampaign: (campaign: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => number;
  getCampaign: (id: number) => Campaign | undefined;
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

  const addCampaign = (campaignData: Omit<Campaign, 'id' | 'raised' | 'active' | 'withdrawn' | 'createdAt'>) => {
    const id = Date.now();
    const newCampaign: Campaign = {
      ...campaignData,
      id,
      raised: 0,
      active: true,
      withdrawn: false,
      createdAt: Math.floor(Date.now() / 1000),
    };
    setCampaigns(prev => [...prev, newCampaign]);
    return id;
  };

  const getCampaign = (id: number) => {
    return campaigns.find(c => c.id === id);
  };

  return (
    <CampaignContext.Provider value={{ campaigns, addCampaign, getCampaign }}>
      {children}
    </CampaignContext.Provider>
  );
}
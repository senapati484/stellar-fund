import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Support both new PUBLISHABLE_KEY and legacy ANON_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials not set. Using localStorage fallback.');
}

export const supabase = supabaseInstance;

export interface CampaignRow {
  id: number;
  title: string;
  description: string;
  goal: number;
  raised: number;
  deadline: number;
  owner: string;
  active: boolean;
  withdrawn: boolean;
  created_at: number;
  cap_donations_at_goal: boolean;
}

export interface DonationRow {
  id: number;
  campaign_id: number;
  donor: string;
  amount: number;
  message: string;
  timestamp: number;
}

// Table names for stellar_fund collection (using underscores for PostgreSQL compatibility)
export const TABLES = {
  CAMPAIGNS: 'stellar_fund_campaigns',
  DONATIONS: 'stellar_fund_donations',
} as const;

/**
 * Type definitions for Canopy Mobile App
 * Mirrored from new-frontend/src/lib/api/types.ts
 */

export interface Plot {
  id: number;
  pda: string;
  plot_pda: string;
  name: string;
  title?: string;
  short_description?: string;
  long_description?: string;
  // Database field names (from API)
  description_short?: string;
  description_long?: string;
  valuation?: string;
  target_raise?: string;
  sub_status?: string;
  image_url?: string;
  status: PlotStatus;
  allocation: string;
  minimum_investment: string;
  start_date: string | null;
  end_date: string | null;
  grove_id: number;
  growth_cycle_id: number;
  created_at: string;
  updated_at: string;
  grove_name?: string;
  growth_cycle_name?: string;
  seedling_name?: string;
  investor_count?: number;
  total_raised?: string;
}

export type PlotStatus =
  | 'Offered'
  | 'Accepted'
  | 'InterestGathering'
  | 'Allocating'
  | 'Collecting'
  | 'Deposited'
  | 'Cancelled'
  | 'Concluded';

export interface Opportunity {
  id: number;
  title: string;
  shortDescription: string;
  longDescription: string;
  valuation: string;
  amountRaising: string;
  status: string;
  statusColor: string;
  subStatus: string;
  closes: string;
  image: string;
  target: string;
  group: string;
  collected: string;
  minimumInvestment?: string;
  investorCount?: number;
}

export function plotToOpportunity(plot: Plot): Opportunity {
  const statusColorMap: Record<PlotStatus, string> = {
    Offered: '#6B7280',
    Accepted: '#3B82F6',
    InterestGathering: '#10B981',
    Allocating: '#F59E0B',
    Collecting: '#8B5CF6',
    Deposited: '#06B6D4',
    Cancelled: '#EF4444',
    Concluded: '#6B7280',
  };

  return {
    id: plot.id,
    title: plot.title || plot.name,
    shortDescription: plot.short_description || plot.description_short || '',
    longDescription: plot.long_description || plot.description_long || '',
    valuation: plot.valuation || '0',
    amountRaising: plot.allocation,
    status: plot.status,
    statusColor: statusColorMap[plot.status],
    subStatus: plot.sub_status || '',
    closes: plot.end_date || '',
    image: plot.image_url || '',
    target: plot.target_raise || plot.allocation,
    group: plot.grove_name || '',
    collected: plot.total_raised || '0',
    minimumInvestment: plot.minimum_investment,
    investorCount: plot.investor_count,
  };
}

export interface Investment {
  id: number;
  user_id: number;
  plot_id: number;
  plot_pda: string;
  member_pubkey: string;
  requested_allotment: string;
  allotment: string;
  deposit_amount: string;
  status: InvestmentStatus;
  nft_receipt_mint: string | null;
  nft_receipt_account: string | null;
  platform_fees_paid: string;
  grove_fees_paid: string;
  created_at: string;
  updated_at: string;
  plot_name?: string;
  plot_status?: PlotStatus;
  grove_name?: string;
  growth_cycle_name?: string;
  external_user_id?: string;
  wallet_address?: string;
}

export type InvestmentStatus = 'Interested' | 'Allocated' | 'Deposited' | 'Rejected' | 'Refunded';

export interface InvestmentSummary {
  total_investments: number;
  unique_plots: number;
  interested_count: number;
  allocated_count: number;
  deposited_count: number;
  total_requested: string;
  total_allocated: string;
  total_deposited: string;
  total_platform_fees: string;
  total_grove_fees: string;
}

export interface User {
  id: number;
  external_user_id: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface UserDashboard {
  user: {
    id: number;
    externalUserId: string;
    walletAddress: string;
    createdAt: string;
  };
  summary: InvestmentSummary;
  activeInvestments: Investment[];
  recentActivity: Activity[];
}

export interface Activity {
  id: number;
  status: string;
  updated_at: string;
  deposit_amount?: string;
  plot_name: string;
  activity_type: string;
}

export interface Portfolio {
  summary: {
    totalInvested: number;
    totalPositions: number;
    activePlots: number;
    totalTokensClaimed: number;
  };
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  id: number;
  deposit_amount: string;
  status: InvestmentStatus;
  plot_name: string;
  plot_status: PlotStatus;
  growth_cycle_name: string;
  seedling_name: string;
  nft_receipt_mint: string | null;
  total_tokens: string | null;
  claimed_tokens: string | null;
  claim_status: TgeClaimStatus | null;
  token_symbol: string | null;
}

export type TgeClaimStatus = 'Pending' | 'Claimed' | 'Expired';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// Navigation types
export type RootStackParamList = {
  Landing: undefined;
  Terms: undefined;
  MainTabs: undefined;
  OpportunityDetails: { pda: string };
  Invest: { pda: string; title: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Opportunities: undefined;
  Investments: undefined;
  Settings: undefined;
};

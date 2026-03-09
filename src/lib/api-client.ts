/**
 * Mobile API Client
 *
 * HTTP client for Canopy backend API calls.
 * Solana operations are handled by @canopyfi/sdk
 */

import { captureError, addBreadcrumb } from './sentry';
import { logger } from './logger';

// Types matching backend API responses
export type PlotStatus =
  | 'Offered'
  | 'Accepted'
  | 'InterestGathering'
  | 'Allocating'
  | 'Collecting'
  | 'Deposited'
  | 'Cancelled'
  | 'Concluded';

export type InvestmentStatus = 'Interested' | 'Allocated' | 'Deposited' | 'Rejected' | 'Refunded';

export interface Plot {
  id: number;
  pda: string;
  plot_pda: string;
  name: string;
  // Database field names from API
  description_short?: string;
  description_long?: string;
  title?: string;
  short_description?: string;
  long_description?: string;
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
  platform_fee_bps?: number;
  grove_fee_bps?: number;
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
}

export interface User {
  id: number;
  external_user_id: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

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

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public endpoint?: string,
    public method?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      endpoint: this.endpoint,
      method: this.method,
    };
  }
}

interface ApiResponse<T> {
  data: T;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export class CanopyApiClient {
  public readonly baseUrl: string;
  private apiKey?: string;
  private accessToken?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token || undefined;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    logger.debug(`[API] ${options?.method || 'GET'} ${url}`);

    const method = options?.method || 'GET';
    addBreadcrumb(`API ${method} ${endpoint}`, 'http', { url });

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
      });
    } catch (fetchError) {
      logger.error(`[API] Network error for ${url}:`, fetchError);

      // Create a detailed error for Sentry
      const networkError = new Error(
        `Network request failed: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }`
      );

      captureError(networkError, {
        operation: 'api_request',
        component: 'CanopyApiClient',
        extra: {
          endpoint,
          method,
          baseUrl: this.baseUrl,
          fullUrl: url,
          errorType: fetchError instanceof Error ? fetchError.name : typeof fetchError,
          originalError: fetchError instanceof Error ? fetchError.message : String(fetchError),
        },
      });

      throw fetchError;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: { message: 'Invalid JSON response' } };
    }

    if (!response.ok) {
      const errorMessage = data.error?.message || data.message || 'Request failed';
      const errorCode = data.error?.code || data.code || 'UNKNOWN_ERROR';
      console.error(`[API] ${method} ${url} failed:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        code: errorCode,
      });

      const apiError = new ApiError(errorMessage, response.status, errorCode, endpoint, method);

      // Only capture 5xx errors and unexpected 4xx errors (not 401/403/404)
      if (
        response.status >= 500 ||
        (response.status >= 400 && ![401, 403, 404].includes(response.status))
      ) {
        captureError(apiError, {
          operation: 'api_request',
          component: 'CanopyApiClient',
          extra: {
            endpoint,
            method,
            statusCode: response.status,
            statusText: response.statusText,
            errorCode,
            responseData: data,
          },
        });
      }

      throw apiError;
    }

    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value);
            }
            return acc;
          },
          {} as Record<string, string>
        )
      ).toString();
      url = `${endpoint}?${queryString}`;
    }

    const response = await this.request<T>(url, { method: 'GET' });
    return response.data;
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response.data;
  }

  // Plot endpoints
  async getPlots(options?: {
    status?: PlotStatus;
    grove_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<Plot[]> {
    return this.get<Plot[]>('/api/plots', options as Record<string, unknown>);
  }

  async getPlot(id: number): Promise<Plot> {
    return this.get<Plot>(`/api/plots/${id}`);
  }

  async getPlotByPda(pda: string): Promise<Plot | null> {
    try {
      // API returns { database: {...}, onChain: {...} }, we want the database record
      const response = await this.get<{ database: Plot; onChain: unknown }>(
        `/api/plots/pda/${pda}`
      );
      return response.database;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getActivePlots(): Promise<Plot[]> {
    return this.getPlots({ status: 'InterestGathering', limit: 50 });
  }

  /**
   * Get plots filtered by user's NFT collections
   * This returns only plots the user has access to based on their holdings
   */
  async getPlotsByCollections(matricaCollectionIds: string[]): Promise<Plot[]> {
    if (matricaCollectionIds.length === 0) {
      return [];
    }
    return this.post<Plot[]>('/api/plots/by-collections', { matricaCollectionIds });
  }

  // Investment endpoints - uses Matrica user ID (externalUserId), not wallet address
  async getUserInvestments(externalUserId: string): Promise<Investment[]> {
    return this.get<Investment[]>(`/api/investments/user/${externalUserId}`);
  }

  async getInvestmentSummary(externalUserId: string): Promise<InvestmentSummary> {
    return this.get<InvestmentSummary>(`/api/investments/user/${externalUserId}/summary`);
  }

  async recordInterest(data: {
    plotId: number;
    walletAddress: string;
    amount: string;
    txSignature: string;
  }): Promise<Investment> {
    return this.post<Investment>('/api/investments/indicate', data);
  }

  async recordDeposit(data: {
    investmentId: number;
    txSignature: string;
    receiptMint: string;
  }): Promise<Investment> {
    return this.post<Investment>('/api/investments/deposit', data);
  }

  // User endpoints
  async getOrCreateUser(walletAddress: string, externalUserId?: string): Promise<User> {
    return this.post<User>('/api/users', { walletAddress, externalUserId });
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    try {
      return await this.get<User>(`/api/users/${walletAddress}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get user's NFT collection IDs from Matrica via backend
   * Backend uses server-side Matrica API key
   */
  async getUserCollections(externalUserId: string): Promise<string[]> {
    try {
      const response = await this.get<{ collectionIds: string[] }>(
        `/api/users/${externalUserId}/collections`
      );
      return response.collectionIds || [];
    } catch (error) {
      console.error('[API] Failed to fetch user collections:', error);
      return [];
    }
  }
}

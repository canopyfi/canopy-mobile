/**
 * API Client re-export
 *
 * Re-exports from api-client.ts for backwards compatibility.
 * New code should import directly from './api-client' or './matrica-auth'.
 */

export {
  CanopyApiClient,
  ApiError,
  type Plot,
  type Investment,
  type User,
  type InvestmentSummary,
  type PlotStatus,
  type InvestmentStatus,
} from './api-client';

export { MatricaAuthClient, type MatricaProfile, type MatricaConfig } from './matrica-auth';

// Default API client instance
import { CanopyApiClient, type PlotStatus } from './api-client';

const API_BASE_URL = __DEV__ ? 'http://localhost:3000' : 'https://api.canopy.app';

export const apiClient = new CanopyApiClient(API_BASE_URL);

// Convenience functions using default client
export async function getPlots(options?: {
  status?: PlotStatus;
  grove_id?: number;
  limit?: number;
  offset?: number;
}) {
  return apiClient.getPlots(options);
}

export async function getPlot(id: number) {
  return apiClient.getPlot(id);
}

export async function getActivePlots() {
  return apiClient.getActivePlots();
}

export async function getUserInvestments(walletAddress: string) {
  return apiClient.getUserInvestments(walletAddress);
}

export async function getInvestmentSummary(walletAddress: string) {
  return apiClient.getInvestmentSummary(walletAddress);
}

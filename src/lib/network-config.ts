/**
 * Network Configuration for Canopy Mobile App
 *
 * In development (__DEV__ = true):
 *   - Users can switch between mainnet, devnet, and local
 *   - Network selection is saved to device storage
 *
 * In production (__DEV__ = false):
 *   - Only mainnet is available
 *   - Network selection UI is hidden
 */

export type NetworkType = 'mainnet' | 'devnet' | 'local';

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  apiUrl: string;
  programId: string;
  usdcMint: string;
  // Matrica OAuth settings per environment
  matricaClientId: string;
  matricaCallbackUrl: string;
}

// Get the local machine IP from environment or use localhost
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.50.207';

// Matrica OAuth credentials - two apps: production and development
const MATRICA_PROD_CLIENT_ID = process.env.EXPO_PUBLIC_MATRICA_PROD_CLIENT_ID || '';
const MATRICA_DEV_CLIENT_ID = process.env.EXPO_PUBLIC_MATRICA_DEV_CLIENT_ID || '';

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    rpcUrl: process.env.EXPO_PUBLIC_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    apiUrl: process.env.EXPO_PUBLIC_MAINNET_API_URL || 'https://api.canopy.trade',
    programId:
      process.env.EXPO_PUBLIC_MAINNET_PROGRAM_ID || 'canopYNMusfENJfeHfVqwvME3Z724EFnrfzRs9Bn8gE',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    // Production Matrica OAuth app (canopy.trade)
    matricaClientId: MATRICA_PROD_CLIENT_ID,
    matricaCallbackUrl: 'https://canopy.trade/auth/mobile-callback',
  },
  devnet: {
    name: 'Devnet',
    rpcUrl: process.env.EXPO_PUBLIC_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
    apiUrl: process.env.EXPO_PUBLIC_DEVNET_API_URL || 'https://api.canopy.camp',
    programId:
      process.env.EXPO_PUBLIC_DEVNET_PROGRAM_ID || 'CNPYPRHDLsJwKsHULPfSTEiTPrAup41ZRR7TGeK3cn5G',
    usdcMint: 'ENT1vsb8yJBTc3GKBPExFtRptBMUZd6qEFkPaoUk5w9M', // Canopy Test Dollars
    // Development Matrica OAuth app (canopy.camp)
    matricaClientId: MATRICA_DEV_CLIENT_ID,
    matricaCallbackUrl: 'https://canopy.camp/auth/mobile-callback',
  },
  local: {
    name: 'Local',
    rpcUrl: `http://${LOCAL_IP}:8899`,
    apiUrl: `http://${LOCAL_IP}:3002`,
    programId:
      process.env.EXPO_PUBLIC_LOCAL_PROGRAM_ID || 'CNpYpdAvW86xMdz93bn6BHSc8YNv3QTpmpUUjU9w4Rdu',
    usdcMint: '', // Will be set dynamically from platform config
    // Use devnet Matrica OAuth - callback at canopy.camp redirects to native app, then app hits local API
    matricaClientId: MATRICA_DEV_CLIENT_ID,
    matricaCallbackUrl: 'https://canopy.camp/auth/mobile-callback',
  },
};

/**
 * Get available networks based on build type
 * Production builds only show mainnet
 * Development builds show all networks
 */
export function getAvailableNetworks(): NetworkType[] {
  if (__DEV__) {
    return ['mainnet', 'devnet', 'local'];
  }
  return ['mainnet'];
}

/**
 * Get the default network based on build type
 */
export function getDefaultNetwork(): NetworkType {
  if (__DEV__) {
    // In dev, default to devnet for safety
    return 'devnet';
  }
  return 'mainnet';
}

/**
 * Check if network selection is enabled
 */
export function isNetworkSelectionEnabled(): boolean {
  return __DEV__;
}

/**
 * Get network config by type
 */
export function getNetworkConfig(network: NetworkType): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

/**
 * Get display info for network (for UI)
 */
export function getNetworkDisplayInfo(network: NetworkType): {
  label: string;
  color: string;
  icon: string;
} {
  switch (network) {
    case 'mainnet':
      return { label: 'Mainnet', color: '#10B981', icon: 'globe' };
    case 'devnet':
      return { label: 'Devnet', color: '#F59E0B', icon: 'flask' };
    case 'local':
      return { label: 'Local', color: '#6366F1', icon: 'laptop' };
  }
}

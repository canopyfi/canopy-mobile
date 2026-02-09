import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  NetworkType,
  NetworkConfig,
  getNetworkConfig,
  getDefaultNetwork,
  getAvailableNetworks,
  isNetworkSelectionEnabled,
  getNetworkDisplayInfo,
} from '../lib/network-config';
import { logger } from '../lib/logger';

const NETWORK_STORAGE_KEY = 'canopy_selected_network';

interface NetworkContextState {
  // Current network
  network: NetworkType;
  networkConfig: NetworkConfig;

  // Network info
  availableNetworks: NetworkType[];
  isNetworkSelectionEnabled: boolean;

  // Methods
  setNetwork: (network: NetworkType) => Promise<void>;
  getDisplayInfo: (network: NetworkType) => { label: string; color: string; icon: string };

  // Loading state
  isLoading: boolean;
}

const NetworkContext = createContext<NetworkContextState | null>(null);

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [network, setNetworkState] = useState<NetworkType>(getDefaultNetwork());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved network on mount
  useEffect(() => {
    const loadNetwork = async () => {
      try {
        const savedNetwork = await SecureStore.getItemAsync(NETWORK_STORAGE_KEY);
        if (savedNetwork && getAvailableNetworks().includes(savedNetwork as NetworkType)) {
          setNetworkState(savedNetwork as NetworkType);
          logger.debug('[Network] Loaded saved network:', savedNetwork);
        } else {
          logger.debug('[Network] Using default network:', getDefaultNetwork());
        }
      } catch (error) {
        logger.error('[Network] Failed to load saved network:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNetwork();
  }, []);

  const setNetwork = useCallback(async (newNetwork: NetworkType) => {
    // Validate network is available
    if (!getAvailableNetworks().includes(newNetwork)) {
      console.warn('[Network] Network not available:', newNetwork);
      return;
    }

    setNetworkState(newNetwork);

    try {
      await SecureStore.setItemAsync(NETWORK_STORAGE_KEY, newNetwork);
      logger.debug('[Network] Saved network:', newNetwork);
    } catch (error) {
      logger.error('[Network] Failed to save network:', error);
    }
  }, []);

  const getDisplayInfo = useCallback((net: NetworkType) => {
    return getNetworkDisplayInfo(net);
  }, []);

  const value: NetworkContextState = {
    network,
    networkConfig: getNetworkConfig(network),
    availableNetworks: getAvailableNetworks(),
    isNetworkSelectionEnabled: isNetworkSelectionEnabled(),
    setNetwork,
    getDisplayInfo,
    isLoading,
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextState {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

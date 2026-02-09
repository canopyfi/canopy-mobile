import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { NetworkProvider, useNetwork } from '../NetworkContext';

// Test component that uses the context
function TestComponent() {
  const { network, networkConfig, availableNetworks, isNetworkSelectionEnabled, isLoading } =
    useNetwork();

  return (
    <>
      <Text testID="network">{network}</Text>
      <Text testID="networkName">{networkConfig.name}</Text>
      <Text testID="availableCount">{availableNetworks.length}</Text>
      <Text testID="selectionEnabled">{String(isNetworkSelectionEnabled)}</Text>
      <Text testID="isLoading">{String(isLoading)}</Text>
    </>
  );
}

// Test component for setNetwork
function SetNetworkTestComponent() {
  const { network, setNetwork } = useNetwork();
  const [error, setError] = React.useState<string | null>(null);

  const handleSetNetwork = async (newNetwork: 'mainnet' | 'devnet' | 'local') => {
    try {
      await setNetwork(newNetwork);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <>
      <Text testID="network">{network}</Text>
      <Text testID="error">{error || ''}</Text>
      <Text testID="setMainnet" onPress={() => handleSetNetwork('mainnet')}>
        Set Mainnet
      </Text>
      <Text testID="setDevnet" onPress={() => handleSetNetwork('devnet')}>
        Set Devnet
      </Text>
    </>
  );
}

describe('NetworkContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('NetworkProvider', () => {
    it('should render children', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('network')).toBeTruthy();
      });
    });

    it('should provide default network (devnet in dev mode)', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('network').props.children).toBe('devnet');
    });

    it('should provide network config', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('networkName').props.children).toBe('Devnet');
    });

    it('should provide available networks', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      // In dev mode, should have mainnet, devnet, local
      expect(parseInt(getByTestId('availableCount').props.children)).toBe(3);
    });

    it('should enable network selection in dev mode', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('selectionEnabled').props.children).toBe('true');
    });

    it('should load saved network from storage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('mainnet');

      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('network').props.children).toBe('mainnet');
    });

    it('should use default network if saved network is invalid', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('invalid-network');

      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      expect(getByTestId('network').props.children).toBe('devnet');
    });

    it('should handle storage errors gracefully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { getByTestId } = render(
        <NetworkProvider>
          <TestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('isLoading').props.children).toBe('false');
      });

      // Should fall back to default network
      expect(getByTestId('network').props.children).toBe('devnet');
    });
  });

  describe('setNetwork', () => {
    it('should update network state', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <SetNetworkTestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('network').props.children).toBe('devnet');
      });

      await act(async () => {
        getByTestId('setMainnet').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('network').props.children).toBe('mainnet');
      });
    });

    it('should persist network to storage', async () => {
      const { getByTestId } = render(
        <NetworkProvider>
          <SetNetworkTestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('network').props.children).toBe('devnet');
      });

      await act(async () => {
        getByTestId('setMainnet').props.onPress();
      });

      await waitFor(() => {
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith('canopy_selected_network', 'mainnet');
      });
    });

    it('should handle storage save errors gracefully', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Save error'));

      const { getByTestId } = render(
        <NetworkProvider>
          <SetNetworkTestComponent />
        </NetworkProvider>
      );

      await waitFor(() => {
        expect(getByTestId('network').props.children).toBe('devnet');
      });

      // Should still update state even if storage fails
      await act(async () => {
        getByTestId('setMainnet').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('network').props.children).toBe('mainnet');
      });
    });
  });

  describe('useNetwork hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNetwork must be used within a NetworkProvider');

      consoleSpy.mockRestore();
    });
  });
});

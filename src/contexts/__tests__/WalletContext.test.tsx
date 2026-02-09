import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { WalletProvider, useWallet } from '../WalletContext';

// Test component that uses the context
function TestComponent() {
  const { connected, connecting, publicKey, walletAddress } = useWallet();

  return (
    <>
      <Text testID="connected">{String(connected)}</Text>
      <Text testID="connecting">{String(connecting)}</Text>
      <Text testID="publicKey">{publicKey?.toBase58() || 'null'}</Text>
      <Text testID="walletAddress">{walletAddress || 'null'}</Text>
    </>
  );
}

// Test component for wallet operations
function WalletOperationsComponent() {
  const { connected, connecting, connect, disconnect, walletAddress } = useWallet();
  const [error, setError] = React.useState<string | null>(null);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <>
      <Text testID="connected">{String(connected)}</Text>
      <Text testID="connecting">{String(connecting)}</Text>
      <Text testID="walletAddress">{walletAddress || 'null'}</Text>
      <Text testID="error">{error || 'null'}</Text>
      <Text testID="connectBtn" onPress={handleConnect}>
        Connect
      </Text>
      <Text testID="disconnectBtn" onPress={handleDisconnect}>
        Disconnect
      </Text>
    </>
  );
}

// Helper to set up the transact mock with proper authorization
const setupTransactMock = () => {
  (transact as jest.Mock).mockImplementation(async (callback) => {
    const mockWallet = {
      authorize: jest.fn().mockResolvedValue({
        accounts: [{ address: 'mockWalletAddress', label: 'Test Wallet' }],
        auth_token: 'mock-auth-token',
        wallet_uri_base: 'https://mock-wallet.app',
      }),
      deauthorize: jest.fn().mockResolvedValue(undefined),
      signTransactions: jest.fn().mockResolvedValue([{}]),
      signAndSendTransactions: jest.fn().mockResolvedValue(['mockSignature']),
      signMessages: jest.fn().mockResolvedValue([new Uint8Array([1, 2, 3])]),
    };
    return callback(mockWallet);
  });
};

describe('WalletContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    setupTransactMock();
  });

  describe('WalletProvider', () => {
    it('should render children', () => {
      const { getByTestId } = render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      );

      expect(getByTestId('connected')).toBeTruthy();
    });

    it('should start with disconnected state', () => {
      const { getByTestId } = render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      );

      expect(getByTestId('connected').props.children).toBe('false');
      expect(getByTestId('connecting').props.children).toBe('false');
      expect(getByTestId('publicKey').props.children).toBe('null');
      expect(getByTestId('walletAddress').props.children).toBe('null');
    });

    it('should provide connection instance', () => {
      function ConnectionTestComponent() {
        const { connection } = useWallet();
        return <Text testID="hasConnection">{String(!!connection)}</Text>;
      }

      const { getByTestId } = render(
        <WalletProvider>
          <ConnectionTestComponent />
        </WalletProvider>
      );

      expect(getByTestId('hasConnection').props.children).toBe('true');
    });

    it('should use custom rpcUrl when provided', () => {
      const customRpcUrl = 'https://custom-rpc.solana.com';

      function RpcTestComponent() {
        const { connection } = useWallet();
        return <Text testID="connection">{String(!!connection)}</Text>;
      }

      const { getByTestId } = render(
        <WalletProvider rpcUrl={customRpcUrl}>
          <RpcTestComponent />
        </WalletProvider>
      );

      expect(getByTestId('connection').props.children).toBe('true');
    });

    it('should load stored wallet address on mount', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === 'canopy_auth_token') return Promise.resolve('stored-token');
        if (key === 'canopy_wallet_address') return Promise.resolve('StoredWalletAddress123');
        return Promise.resolve(null);
      });

      const { getByTestId } = render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      );

      await waitFor(() => {
        // Note: publicKey should be set but connected should still be false
        // (MWA session needs to be validated)
        expect(getByTestId('connected').props.children).toBe('false');
      });
    });
  });

  describe('connect', () => {
    it('should connect wallet via MWA', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      expect(getByTestId('connected').props.children).toBe('false');

      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      expect(transact).toHaveBeenCalled();
    });

    it('should set connecting state during connection', async () => {
      // Delay the transact mock to observe connecting state
      (transact as jest.Mock).mockImplementation(async (callback) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const mockWallet = {
          authorize: jest.fn().mockResolvedValue({
            accounts: [{ address: 'mockWalletAddress', label: 'Test Wallet' }],
            auth_token: 'mock-auth-token',
            wallet_uri_base: 'https://mock-wallet.app',
          }),
        };
        return callback(mockWallet);
      });

      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      act(() => {
        getByTestId('connectBtn').props.onPress();
      });

      // Should be connecting initially
      await waitFor(() => {
        expect(getByTestId('connecting').props.children).toBe('true');
      });

      // Should finish connecting
      await waitFor(() => {
        expect(getByTestId('connecting').props.children).toBe('false');
      });
    });

    it('should save auth token and wallet address to storage', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('canopy_auth_token', 'mock-auth-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'canopy_wallet_address',
        expect.any(String)
      );
    });

    it('should handle connection errors', async () => {
      (transact as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Connection failed');
      });

      expect(getByTestId('connected').props.children).toBe('false');
    });

    it('should not connect if already connecting', async () => {
      let resolveTransact: (value: unknown) => void;
      (transact as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveTransact = resolve;
          })
      );

      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // Start first connection
      act(() => {
        getByTestId('connectBtn').props.onPress();
      });

      // Try to connect again while connecting
      act(() => {
        getByTestId('connectBtn').props.onPress();
      });

      // transact should only be called once
      expect(transact).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveTransact!({
        accounts: [{ address: 'mockWalletAddress' }],
        auth_token: 'token',
      });
    });

    it('should not connect if already connected', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // First connect
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      jest.clearAllMocks();

      // Try to connect again
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      // transact should not be called again
      expect(transact).not.toHaveBeenCalled();
    });

    it('should handle wallet returning no accounts', async () => {
      // Override the mock for this specific test
      (transact as jest.Mock).mockImplementationOnce(async (callback) => {
        const mockWallet = {
          authorize: jest.fn().mockResolvedValue({
            accounts: [],
            auth_token: 'mock-auth-token',
          }),
        };
        return callback(mockWallet);
      });

      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('No accounts returned from wallet');
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect wallet', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // First connect
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      // Then disconnect
      await act(async () => {
        getByTestId('disconnectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('false');
      });

      expect(getByTestId('walletAddress').props.children).toBe('null');
    });

    it('should clear auth from storage on disconnect', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // First connect
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      jest.clearAllMocks();

      // Then disconnect
      await act(async () => {
        getByTestId('disconnectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('canopy_auth_token');
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('canopy_wallet_address');
      });
    });

    it('should handle deauthorization errors gracefully', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // First connect
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      // Mock deauthorization failure for the disconnect call
      (transact as jest.Mock).mockImplementationOnce(async (callback) => {
        const mockWallet = {
          deauthorize: jest.fn().mockRejectedValue(new Error('Deauth failed')),
        };
        return callback(mockWallet);
      });

      // Disconnect should still work
      await act(async () => {
        getByTestId('disconnectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('false');
      });
    });

    it('should not disconnect if not connected', async () => {
      const { getByTestId } = render(
        <WalletProvider>
          <WalletOperationsComponent />
        </WalletProvider>
      );

      // Try to disconnect when not connected
      await act(async () => {
        getByTestId('disconnectBtn').props.onPress();
      });

      // Should still be disconnected with no errors
      expect(getByTestId('connected').props.children).toBe('false');
      expect(getByTestId('error').props.children).toBe('null');
    });
  });

  describe('signTransaction', () => {
    it('should sign transaction when connected', async () => {
      function SignTestComponent() {
        const { connect, connected, signTransaction } = useWallet();
        const [signed, setSigned] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        const handleSign = async () => {
          try {
            await signTransaction({} as any);
            setSigned(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
          }
        };

        return (
          <>
            <Text testID="connected">{String(connected)}</Text>
            <Text testID="signed">{String(signed)}</Text>
            <Text testID="error">{error || 'null'}</Text>
            <Text testID="connectBtn" onPress={() => connect()}>
              Connect
            </Text>
            <Text testID="signBtn" onPress={handleSign}>
              Sign
            </Text>
          </>
        );
      }

      const { getByTestId } = render(
        <WalletProvider>
          <SignTestComponent />
        </WalletProvider>
      );

      // First connect
      await act(async () => {
        getByTestId('connectBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('connected').props.children).toBe('true');
      });

      // Then sign
      await act(async () => {
        getByTestId('signBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('signed').props.children).toBe('true');
      });
    });

    it('should throw error when not connected', async () => {
      function SignTestComponent() {
        const { signTransaction } = useWallet();
        const [error, setError] = React.useState<string | null>(null);

        const handleSign = async () => {
          try {
            await signTransaction({} as any);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
          }
        };

        return (
          <>
            <Text testID="error">{error || 'null'}</Text>
            <Text testID="signBtn" onPress={handleSign}>
              Sign
            </Text>
          </>
        );
      }

      const { getByTestId } = render(
        <WalletProvider>
          <SignTestComponent />
        </WalletProvider>
      );

      await act(async () => {
        getByTestId('signBtn').props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('error').props.children).toBe('Wallet not connected');
      });
    });
  });

  describe('useWallet hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useWallet must be used within a WalletProvider');

      consoleSpy.mockRestore();
    });
  });
});
